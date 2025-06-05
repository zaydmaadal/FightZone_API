const Match = require("../models/Match");
const User = require("../models/User");
const Event = require("../models/Event");

// Create a new match
exports.createMatch = async (req, res) => {
  try {
    const { eventId, fighter1, fighter2, weightClass, rounds } = req.body;

    // Validate required fields
    if (!eventId || !fighter1 || !fighter2 || !weightClass) {
      return res.status(400).json({
        message: "Event ID, beide vechters en gewichtsklasse zijn verplicht",
      });
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event niet gevonden" });
    }

    // Check if fighters exist and are actually fighters
    const [fighter1Data, fighter2Data] = await Promise.all([
      User.findOne({ _id: fighter1, role: "Vechter" }),
      User.findOne({ _id: fighter2, role: "Vechter" }),
    ]);

    if (!fighter1Data || !fighter2Data) {
      return res.status(404).json({
        message: "Een of beide vechters niet gevonden of zijn geen vechters",
      });
    }

    // Check if fighters are not the same person
    if (fighter1 === fighter2) {
      return res.status(400).json({
        message: "Een vechter kan niet tegen zichzelf vechten",
      });
    }

    // Create the match
    const match = new Match({
      eventId,
      fighter1,
      fighter2,
      weightClass,
      rounds: rounds || 3,
    });

    await match.save();

    res.status(201).json({
      message: "Match succesvol aangemaakt",
      match,
    });
  } catch (error) {
    console.error("Fout bij aanmaken match:", error);
    res.status(500).json({
      message: "Serverfout bij aanmaken match",
      error: error.message,
    });
  }
};

// Get all matches
exports.getAllMatches = async (req, res) => {
  try {
    const matches = await Match.find()
      .populate("eventId", "naam datum locatie")
      .populate("fighter1", "voornaam achternaam")
      .populate("fighter2", "voornaam achternaam");

    res.status(200).json(matches);
  } catch (error) {
    console.error("Fout bij ophalen matches:", error);
    res.status(500).json({
      message: "Serverfout bij ophalen matches",
      error: error.message,
    });
  }
};

// Get match by ID
exports.getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate("eventId", "naam datum locatie")
      .populate("fighter1", "voornaam achternaam")
      .populate("fighter2", "voornaam achternaam");

    if (!match) {
      return res.status(404).json({ message: "Match niet gevonden" });
    }

    res.status(200).json(match);
  } catch (error) {
    console.error("Fout bij ophalen match:", error);
    res.status(500).json({
      message: "Serverfout bij ophalen match",
      error: error.message,
    });
  }
};

// Update match
exports.updateMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow updating certain fields
    delete updateData.eventId;
    delete updateData.fighter1;
    delete updateData.fighter2;
    delete updateData.createdAt;

    const match = await Match.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate("eventId", "naam datum locatie")
      .populate("fighter1", "voornaam achternaam")
      .populate("fighter2", "voornaam achternaam");

    if (!match) {
      return res.status(404).json({ message: "Match niet gevonden" });
    }

    res.status(200).json({
      message: "Match succesvol bijgewerkt",
      match,
    });
  } catch (error) {
    console.error("Fout bij bijwerken match:", error);
    res.status(500).json({
      message: "Serverfout bij bijwerken match",
      error: error.message,
    });
  }
};

// Delete match
exports.deleteMatch = async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);

    if (!match) {
      return res.status(404).json({ message: "Match niet gevonden" });
    }

    res.status(200).json({
      message: "Match succesvol verwijderd",
      deletedMatch: {
        id: match._id,
        eventId: match.eventId,
        fighter1: match.fighter1,
        fighter2: match.fighter2,
      },
    });
  } catch (error) {
    console.error("Fout bij verwijderen match:", error);
    res.status(500).json({
      message: "Serverfout bij verwijderen match",
      error: error.message,
    });
  }
};
