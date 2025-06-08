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

// Create Single User (Aangepaste versie)
exports.createUser = async (req, res) => {
  try {
    const {
      voornaam,
      achternaam,
      email,
      wachtwoord,
      geboortedatum,
      licentieNummer,
      vervalDatum,
      vechterInfo,
      club,
      role = "Vechter", // Default naar Vechter
    } = req.body;

    // Basis validaties voor alle gebruikers
    if (!voornaam || !achternaam || !email || !wachtwoord || !geboortedatum) {
      return res.status(400).json({ message: "Ontbrekende verplichte velden" });
    }

    // Rol-specifieke validaties
    if (role === "Vechter") {
      if (!licentieNummer) {
        return res
          .status(400)
          .json({ message: "Licentienummer is verplicht voor vechters" });
      }

      // Controleer uniek licentienummer alleen voor vechters
      const existingLicense = await User.findOne({
        "vechterInfo.licentieNummer": licentieNummer,
      });
      if (existingLicense) {
        return res
          .status(400)
          .json({ message: "Licentienummer al geregistreerd" });
      }
    }

    // Algemene email check
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email al in gebruik" });
    }

    // Maak gebruiker aan
    const hashedPassword = await bcrypt.hash(wachtwoord, 10);
    const userData = {
      voornaam,
      achternaam,
      email,
      wachtwoord: hashedPassword,
      geboortedatum: new Date(geboortedatum),
      role,
      club,
    };

    // Voeg rol-specifieke data toe
    if (role === "Vechter") {
      userData.vechterInfo = {
        ...vechterInfo,
        licentieNummer,
        vervalDatum: new Date(vervalDatum),
        fightingReady: new Date(vervalDatum) > new Date(),
      };
    } else if (role === "Trainer") {
      userData.trainerInfo = req.body.trainerInfo;
    } else if (role === "VKBMO-lid") {
      userData.vkbmoLidInfo = req.body.vkbmoLidInfo;
    }

    const newUser = new User(userData);
    await newUser.save();

    // Voeg gebruiker toe aan club
    if (club) {
      const existingClub = await Club.findById(club);
      if (existingClub) {
        existingClub.leden.push(newUser._id);
        await existingClub.save();
      }
    }

    res.status(201).json({
      message: `${role} succesvol geregistreerd`,
      userId: newUser._id,
    });
  } catch (error) {
    console.error("Fout:", error);
    res.status(500).json({ message: "Serverfout" });
  }
};

// Create Multiple Users (Aangepaste versie)
exports.createMultipleUsers = async (req, res) => {
  try {
    const usersData = req.body;

    if (!Array.isArray(usersData) || usersData.length === 0) {
      return res.status(400).json({ message: "Ongeldige gebruikersdata" });
    }

    const createdUsers = [];
    const clubUpdates = {};

    for (const userData of usersData) {
      const {
        voornaam,
        achternaam,
        email,
        wachtwoord,
        geboortedatum,
        licentieNummer,
        vervalDatum,
        vechterInfo,
        club,
        role = "Vechter",
      } = userData;

      // Basis validatie
      if (!voornaam || !achternaam || !email || !wachtwoord || !geboortedatum) {
        continue;
      }

      // Rol-specifieke validatie
      if (role === "Vechter" && !licentieNummer) {
        continue;
      }

      // Controleer unieke velden
      const existingUser = await User.findOne({ email });
      if (existingUser) continue;

      if (role === "Vechter") {
        const existingLicense = await User.findOne({
          "vechterInfo.licentieNummer": licentieNummer,
        });
        if (existingLicense) continue;
      }

      // Maak gebruiker
      const hashedPassword = await bcrypt.hash(wachtwoord, 10);
      const newUserData = {
        voornaam,
        achternaam,
        email,
        wachtwoord: hashedPassword,
        geboortedatum: new Date(geboortedatum),
        role,
        club,
      };

      if (role === "Vechter") {
        newUserData.vechterInfo = {
          ...vechterInfo,
          licentieNummer,
          vervalDatum: new Date(vervalDatum),
          fightingReady: new Date(vervalDatum) > new Date(),
        };
      }

      const newUser = new User(newUserData);
      await newUser.save();
      createdUsers.push(newUser);

      // Update club
      if (club) {
        if (!clubUpdates[club]) clubUpdates[club] = [];
        clubUpdates[club].push(newUser._id);
      }
    }

    // Update clubs
    for (const [clubId, userIds] of Object.entries(clubUpdates)) {
      await Club.findByIdAndUpdate(
        clubId,
        { $push: { leden: { $each: userIds } } },
        { new: true }
      );
    }

    res.status(201).json({
      message: `${createdUsers.length} gebruiker(s) aangemaakt`,
      users: createdUsers,
    });
  } catch (error) {
    console.error("Fout:", error);
    res.status(500).json({ message: "Serverfout" });
  }
};

// Voegt een nieuw gevecht toe aan beide vechters (Pre-fight)
exports.plannenGevecht = async (req, res) => {
  try {
    const { id } = req.params; // Vechter-ID
    const { tegenstanderId, datum, event, locatie } = req.body;

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

// Verwijdert een specifieke user
exports.deleteUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Zoek en verwijder de gebruiker
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: "Gebruiker niet gevonden." });
    }

    // Als de gebruiker bij een club zat, verwijder deze uit de club
    if (deletedUser.club) {
      await Club.findByIdAndUpdate(deletedUser.club, {
        $pull: { leden: deletedUser._id },
      });
    }

    res.status(200).json({
      message: "Gebruiker succesvol verwijderd",
      deletedUser: {
        id: deletedUser._id,
        voornaam: deletedUser.voornaam,
        achternaam: deletedUser.achternaam,
        email: deletedUser.email,
      },
    });
  } catch (error) {
    console.error("Fout bij verwijderen gebruiker:", error);
    res.status(500).json({ message: "Serverfout", error: error.message });
  }
};

// controllers/users.js
const User = require("../models/User"); // of waar jouw User-model staat

/**
 * Update een user op basis van req.params.id
 */
exports.updateMe = async (req, res) => {
  try {
    const userId = req.user.id; // req.user wordt gezet door je authenticate middleware
    const updates = req.body;
    const updated = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
      context: "query"
    }).select("-wachtwoord");

    if (!updated) {
      return res.status(404).json({ error: "User niet gevonden" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Error in updateMe:", err);
    res.status(500).json({ error: "Er ging iets mis op de server" });
  }
};

module.exports = exports;
