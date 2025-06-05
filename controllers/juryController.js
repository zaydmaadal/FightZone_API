const Match = require("../models/Match");
const Event = require("../models/Event");

// Get all matches for an event
exports.getEventMatches = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Validate event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        message: "Event niet gevonden",
      });
    }

    const matches = await Match.find({ eventId })
      .populate("eventId", "naam datum locatie")
      .populate("fighter1", "voornaam achternaam club")
      .populate("fighter2", "voornaam achternaam club")
      .sort({ createdAt: 1 });

    res.status(200).json({
      event: {
        id: event._id,
        naam: event.naam,
        datum: event.datum,
        locatie: event.locatie,
      },
      matches,
    });
  } catch (error) {
    console.error("Fout bij ophalen event matches:", error);
    res.status(500).json({
      message: "Serverfout bij ophalen event matches",
      error: error.message,
    });
  }
};

// Confirm fighter weight
exports.confirmWeight = async (req, res) => {
  try {
    const { matchId, fighterNumber } = req.params;

    // Validate fighter number
    if (!["1", "2"].includes(fighterNumber)) {
      return res.status(400).json({
        message: "Ongeldig vechter nummer. Moet 1 of 2 zijn.",
      });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        message: "Match niet gevonden",
      });
    }

    // Update weight confirmation
    if (fighterNumber === "1") {
      match.weight1Confirmed = true;
    } else {
      match.weight2Confirmed = true;
    }

    await match.save();

    res.status(200).json({
      message: `Gewicht vechter ${fighterNumber} bevestigd`,
      match,
    });
  } catch (error) {
    console.error("Fout bij bevestigen gewicht:", error);
    res.status(500).json({
      message: "Serverfout bij bevestigen gewicht",
      error: error.message,
    });
  }
};

// Set match result
exports.setResult = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { result } = req.body;

    // Validate result
    if (!["Pending", "Fighter1", "Fighter2", "Draw"].includes(result)) {
      return res.status(400).json({
        message:
          "Ongeldig resultaat. Moet een van de volgende zijn: Pending, Fighter1, Fighter2, Draw",
      });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        message: "Match niet gevonden",
      });
    }

    // Check if both weights are confirmed
    if (!match.weight1Confirmed || !match.weight2Confirmed) {
      return res.status(400).json({
        message: "Beide vechters moeten eerst hun gewicht bevestigen",
      });
    }

    // Update result
    match.result = result;
    await match.save();

    res.status(200).json({
      message: "Resultaat succesvol bijgewerkt",
      match,
    });
  } catch (error) {
    console.error("Fout bij instellen resultaat:", error);
    res.status(500).json({
      message: "Serverfout bij instellen resultaat",
      error: error.message,
    });
  }
};
