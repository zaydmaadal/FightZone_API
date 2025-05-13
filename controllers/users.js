const User = require("../models/User");
const Club = require("../models/Club");
const bcrypt = require("bcryptjs");

// Haalt alle users op
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    console.log("Gebruikers in de database:", users);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Haalt een specifieke user op
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "Gebruiker niet gevonden." });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.createUser = async (req, res) => {
  try {
    const trainer = await User.findById(req.user.id).populate("club");

    // Valideer trainer
    if (!trainer || trainer.role !== "Trainer") {
      return res
        .status(403)
        .json({ message: "Alleen trainers kunnen vechters aanmaken" });
    }

    const {
      voornaam,
      achternaam,
      email,
      wachtwoord,
      geboortedatum,
      licentieNummer,
      vervalDatum,
      vechterInfo,
    } = req.body;

    // Basis validaties
    const requiredFields = [
      "voornaam",
      "achternaam",
      "email",
      "wachtwoord",
      "geboortedatum",
      "licentieNummer",
      "vervalDatum",
    ];
    const missing = requiredFields.filter((field) => !req.body[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        message: `Ontbrekende velden: ${missing.join(", ")}`,
      });
    }

    // Controleer unieke velden
    const [existingEmail, existingLicense] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ "vechterInfo.licentieNummer": licentieNummer }),
    ]);

    if (existingEmail) {
      return res.status(400).json({ message: "Email al in gebruik" });
    }
    if (existingLicense) {
      return res
        .status(400)
        .json({ message: "Licentienummer al geregistreerd" });
    }

    // Maak gebruiker aan
    const hashedPassword = await bcrypt.hash(wachtwoord, 10);

    const newUser = new User({
      voornaam,
      achternaam,
      email,
      wachtwoord: hashedPassword,
      geboortedatum: new Date(geboortedatum),
      role: "Vechter",
      club: trainer.club._id,
      vechterInfo: {
        ...vechterInfo,
        licentieNummer,
        vervalDatum: new Date(vervalDatum),
        fightingReady: new Date(vervalDatum) > new Date(),
      },
    });

    await newUser.save();

    // Update club leden
    await Club.findByIdAndUpdate(trainer.club._id, {
      $addToSet: { leden: newUser._id },
    });

    res.status(201).json({
      message: "Vechter succesvol geregistreerd",
      user: {
        _id: newUser._id,
        voornaam: newUser.voornaam,
        achternaam: newUser.achternaam,
        email: newUser.email,
        licentieNummer: newUser.vechterInfo.licentieNummer,
      },
    });
  } catch (error) {
    console.error("Registratiefout:", error);
    res.status(500).json({
      message: error.message || "Serverfout tijdens registratie",
    });
  }
};
exports.createMultipleUsers = async (req, res) => {
  try {
    const usersData = req.body; // Verwacht een array van gebruikers

    if (!Array.isArray(usersData) || usersData.length === 0) {
      return res
        .status(400)
        .json({ message: "Een array met gebruikers is verplicht" });
    }

    const createdUsers = [];

    for (const userData of usersData) {
      const {
        voornaam,
        achternaam,
        email,
        wachtwoord,
        geboortedatum,
        role,
        club,
        profielfoto,
        vechterInfo,
        trainerInfo,
        vkbmoLidInfo,
      } = userData;

      // Controleer verplichte velden
      if (!voornaam || !achternaam || !email || !wachtwoord || !role) {
        return res.status(400).json({ message: "Alle velden zijn verplicht" });
      }

      // Controleer of de gebruiker al bestaat
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: `Email ${email} is al in gebruik` });
      }

      // Wachtwoord hashen
      const hashedPassword = await bcrypt.hash(wachtwoord, 10);

      const newUser = new User({
        voornaam,
        achternaam,
        email,
        wachtwoord: hashedPassword,
        geboortedatum,
        role,
        club,
        profielfoto,
      });

      // Voeg rol-specifieke informatie toe
      if (role === "Vechter") {
        newUser.vechterInfo = vechterInfo;
      } else if (role === "Trainer") {
        newUser.trainerInfo = trainerInfo;
      } else if (role === "VKBMO-lid") {
        newUser.vkbmoLidInfo = vkbmoLidInfo;
      }

      await newUser.save();
      createdUsers.push(newUser);
    }

    res.status(201).json({
      message: "Gebruikers succesvol aangemaakt",
      users: createdUsers,
    });
  } catch (error) {
    console.error("Fout bij het maken van gebruikers:", error.message);
    res.status(500).json({ message: "Serverfout", error: error.message });
  }
};

// Voegt een nieuw gevecht toe aan beide vechters (Pre-fight)
exports.plannenGevecht = async (req, res) => {
  try {
    const { id } = req.params; // Vechter-ID
    const { tegenstanderId, datum, event, locatie, knockout } = req.body;

    // Controleer of alle benodigde gegevens zijn verstrekt
    if (!tegenstanderId || !datum || !event || !locatie) {
      return res.status(400).json({
        message: "Tegenstander-ID en datum zijn verplicht.",
      });
    }

    // Vechter ophalen
    const vechter = await User.findById(id);

    if (!vechter || vechter.role !== "Vechter") {
      return res.status(404).json({ message: "Vechter niet gevonden." });
    }

    // Controleer of de tegenstander bestaat
    const tegenstander = await User.findById(tegenstanderId);

    if (!tegenstander || tegenstander.role !== "Vechter") {
      return res.status(404).json({ message: "Tegenstander niet gevonden." });
    }

    // Nieuw gevecht toevoegen aan de geschiedenis van beide vechters
    const nieuwGevecht = {
      tegenstander: tegenstanderId,
      datum: new Date(datum),
      event,
      locatie,
      resultaat: "Nog niet beoordeeld", // Resultaat nog niet bekend
      knockout,
    };

    // Voeg gevecht toe aan de vechter
    vechter.vechterInfo.fights.push(nieuwGevecht);

    // Voeg gevecht toe aan de tegenstander
    const nieuwGevechtTegenstander = {
      tegenstander: vechter._id,
      datum: new Date(datum),
      resultaat: "Nog niet beoordeeld", // Resultaat nog niet bekend
    };
    tegenstander.vechterInfo.fights.push(nieuwGevechtTegenstander);

    // Opslaan van beide vechters met bijgewerkte gevechten
    await vechter.save();
    await tegenstander.save();

    res.status(200).json({
      message: "Gevecht succesvol gepland voor beide vechters.",
      vechter,
      tegenstander,
    });
  } catch (error) {
    console.error("Fout bij het plannen van gevecht:", error.message);
    res.status(500).json({ message: "Serverfout", error: error.message });
  }
};

// Bijwerkt het resultaat van een gevecht na het gevecht
exports.updateGevechtResultaat = async (req, res) => {
  try {
    const { id, gevechtId } = req.params; // Haal het ID van de gebruiker en het gevecht op
    const { resultaat } = req.body;

    if (!resultaat) {
      return res.status(400).json({ message: "Resultaat is verplicht." });
    }

    // Zoek de vechter
    const vechter = await User.findOne(
      { _id: id, "vechterInfo.fights._id": gevechtId } // Zoek op gebruiker en gevecht-ID
    );

    if (!vechter) {
      console.log("Vechter niet gevonden.");
      return res.status(404).json({ message: "Vechter niet gevonden." });
    }

    // Zoek het specifieke gevecht
    const gevecht = vechter.vechterInfo.fights.find(
      (f) => f._id.toString() === gevechtId
    );

    if (!gevecht) {
      console.log("Gevecht niet gevonden.");
      return res.status(404).json({ message: "Gevecht niet gevonden." });
    }

    // Zoek de tegenstander
    const tegenstander = await User.findOne({
      _id: gevecht.tegenstander,
      "vechterInfo.fights": {
        $elemMatch: { tegenstander: vechter._id, datum: gevecht.datum },
      },
    });

    if (!tegenstander) {
      console.log("Tegenstander niet gevonden.");
      return res.status(404).json({ message: "Tegenstander niet gevonden." });
    }

    // Zoek het gevecht bij de tegenstander
    const tegenstanderGevecht = tegenstander.vechterInfo.fights.find(
      (f) =>
        f.tegenstander.toString() === vechter._id.toString() &&
        f.datum.toString() === gevecht.datum.toString()
    );

    if (!tegenstanderGevecht) {
      console.log("Gevecht niet gevonden bij de tegenstander.");
      return res
        .status(404)
        .json({ message: "Gevecht niet gevonden bij de tegenstander." });
    }

    // Resultaten instellen
    let tegenstanderResultaat;
    if (resultaat === "Winnaar") {
      tegenstanderResultaat = "Verliezer";
    } else if (resultaat === "Verliezer") {
      tegenstanderResultaat = "Winnaar";
    } else if (resultaat === "Gelijkstand") {
      tegenstanderResultaat = "Gelijkstand";
    } else {
      return res.status(400).json({ message: "Ongeldig resultaat opgegeven." });
    }

    // Update het resultaat
    gevecht.resultaat = resultaat;
    tegenstanderGevecht.resultaat = tegenstanderResultaat;

    // Sla de wijzigingen op
    await vechter.save();
    await tegenstander.save();

    res.status(200).json({
      message: "Resultaat succesvol bijgewerkt voor beide vechters.",
      vechter,
      tegenstander,
    });
  } catch (error) {
    console.error(
      "Fout bij het bijwerken van gevechtresultaat:",
      error.message
    );
    res.status(500).json({ message: "Serverfout", error: error.message });
  }
};
