const User = require("../models/User");

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

// Voegt een nieuwe user toe
exports.createUser = async (req, res) => {
  try {
    const { naam, email, wachtwoord, geboortedatum, role, vechterInfo } =
      req.body;

    if (!naam || !email || !wachtwoord || !role) {
      return res.status(400).json({ message: "Alle velden zijn verplicht" });
    }

    // Controleer of de gebruiker al bestaat
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is al in gebruik" });
    }

    // Nieuwe gebruiker aanmaken
    const user = new User({
      naam,
      email,
      wachtwoord,
      geboortedatum,
      role,
      vechterInfo: role === "Vechter" ? vechterInfo : undefined,
    });

    // Sla op in de database
    await user.save();

    res.status(201).json({
      message: "Gebruiker succesvol aangemaakt",
      user,
    });
  } catch (error) {
    console.error("Fout bij het maken van gebruiker:", error.message);
    res.status(500).json({ message: "Serverfout", error: error.message });
  }
};

// Voegt een nieuw gevecht toe aan beide vechters (Pre-fight)
exports.plannenGevecht = async (req, res) => {
  try {
    const { id } = req.params; // Vechter-ID
    const { tegenstanderId, datum } = req.body;

    // Controleer of alle benodigde gegevens zijn verstrekt
    if (!tegenstanderId || !datum) {
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
    const { id } = req.params; // Gevecht-ID
    const { resultaat } = req.body;

    if (!resultaat) {
      return res.status(400).json({ message: "Resultaat is verplicht." });
    }

    // Zoek het gevecht op basis van het ID
    const gevecht = await User.aggregate([
      { $unwind: "$vechterInfo.fights" },
      { $match: { "vechterInfo.fights._id": mongoose.Types.ObjectId(id) } },
    ]);

    if (!gevecht || gevecht.length === 0) {
      return res.status(404).json({ message: "Gevecht niet gevonden." });
    }

    // Update het resultaat van het gevecht
    gevecht[0].vechterInfo.fights[0].resultaat = resultaat;

    // Sla de bijgewerkte gevechten op
    await gevecht[0].save();

    res.status(200).json({
      message: "Resultaat succesvol bijgewerkt voor het gevecht.",
      gevecht,
    });
  } catch (error) {
    console.error(
      "Fout bij het bijwerken van gevechtresultaat:",
      error.message
    );
    res.status(500).json({ message: "Serverfout", error: error.message });
  }
};
