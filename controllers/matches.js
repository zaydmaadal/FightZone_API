const Match = require("../models/Match");
const User = require("../models/User");
const Event = require("../models/Event");

// Create a new match
exports.createMatch = async (req, res) => {
  try {
    const { eventId, fighters, rounds } = req.body;

    // Validate required fields
    if (
      !eventId ||
      !fighters ||
      !Array.isArray(fighters) ||
      fighters.length !== 2
    ) {
      return res.status(400).json({
        message: "Event ID en beide vechters zijn verplicht",
      });
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event niet gevonden" });
    }

    // Validate fighters array
    for (const fighter of fighters) {
      if (!fighter.user || !fighter.weight) {
        return res.status(400).json({
          message: "Elke vechter moet een user ID en gewicht hebben",
        });
      }
    }

    // Check if fighters exist and are actually fighters
    const [fighter1Data, fighter2Data] = await Promise.all([
      User.findOne({ _id: fighters[0].user, role: "Vechter" }),
      User.findOne({ _id: fighters[1].user, role: "Vechter" }),
    ]);

    if (!fighter1Data || !fighter2Data) {
      return res.status(404).json({
        message: "Een of beide vechters niet gevonden of zijn geen vechters",
      });
    }

    // Check if fighters are not the same person
    if (fighters[0].user === fighters[1].user) {
      return res.status(400).json({
        message: "Een vechter kan niet tegen zichzelf vechten",
      });
    }

    // Create the match with new schema
    const match = new Match({
      eventId,
      fighters: [
        {
          user: fighters[0].user,
          weight: fighters[0].weight,
          weightConfirmed: false,
        },
        {
          user: fighters[1].user,
          weight: fighters[1].weight,
          weightConfirmed: false,
        },
      ],
      rounds: rounds || 3,
    });

    await match.save();

    // Add match to event's matchmaking array
    event.matchmaking.push(match._id);
    event.hasMatchmaking = true;
    await event.save();

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
      .populate("fighters.user", "voornaam achternaam club")
      .sort({ createdAt: -1 });

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
      .populate("fighters.user", "voornaam achternaam club");

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
    delete updateData.fighters;
    delete updateData.createdAt;

    const match = await Match.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate("eventId", "naam datum locatie")
      .populate("fighters.user", "voornaam achternaam club");

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
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: "Match niet gevonden" });
    }

    // Remove match from event's matchmaking array
    const event = await Event.findById(match.eventId);
    if (event) {
      event.matchmaking = event.matchmaking.filter(
        (id) => id.toString() !== match._id.toString()
      );
      if (event.matchmaking.length === 0) {
        event.hasMatchmaking = false;
      }
      await event.save();
    }

    await match.deleteOne();

    res.status(200).json({
      message: "Match succesvol verwijderd",
      deletedMatch: {
        id: match._id,
        eventId: match.eventId,
        fighters: match.fighters,
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
