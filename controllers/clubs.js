const Club = require("../models/Club");

exports.createClub = async (req, res) => {
  try {
    const { naam, locatie, clublogo, trainer } = req.body;

    if (!naam || !locatie || !trainer) {
      return res.status(400).json({ message: "Alle velden zijn verplicht" });
    }

    const newClub = new Club({
      naam,
      locatie,
      clublogo,
      trainer,
      leden: [trainer], // Eigenaar wordt automatisch lid
    });

    await newClub.save();
    res.status(201).json({ message: "Club aangemaakt", club: newClub });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Fout bij het aanmaken van de club", error });
  }
};

exports.createMultipleClubs = async (req, res) => {
  try {
    const clubsData = req.body; // Verwacht een array van clubs

    if (!Array.isArray(clubsData) || clubsData.length === 0) {
      return res
        .status(400)
        .json({ message: "Een array met clubs is verplicht" });
    }

    const createdClubs = [];

    for (const clubData of clubsData) {
      const { naam, locatie, clublogo, trainer } = clubData;

      // Controleer verplichte velden
      if (!naam || !locatie || !trainer) {
        return res.status(400).json({ message: "Alle velden zijn verplicht" });
      }

      // Controleer of de club al bestaat
      const existingClub = await Club.findOne({ naam });
      if (existingClub) {
        return res.status(400).json({ message: `Club ${naam} bestaat al` });
      }

      const newClub = new Club({
        naam,
        locatie,
        clublogo,
        trainer,
        leden: [trainer], // Trainer wordt automatisch lid
      });

      await newClub.save();
      createdClubs.push(newClub);
    }

    res.status(201).json({
      message: "Clubs succesvol aangemaakt",
      clubs: createdClubs,
    });
  } catch (error) {
    console.error("Fout bij het maken van clubs:", error.message);
    res.status(500).json({ message: "Serverfout", error: error.message });
  }
};

exports.getAllClubs = async (req, res) => {
  try {
    const clubs = await Club.find().populate("leden", "voornaam achternaam");
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ message: "Serverfout", error });
  }
};

exports.getClubById = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id).populate("leden");
    if (!club) return res.status(404).json({ message: "Club niet gevonden" });
    res.json(club);
  } catch (error) {
    res.status(500).json({ message: "Serverfout", error });
  }
};
