const Match = require("../models/Match");
const User = require("../models/User");
const Club = require("../models/Club");
const Event = require("../models/Event");
const bcrypt = require("bcryptjs");

exports.importMatchmaking = async (req, res) => {
  try {
    const { eventId, matchesData } = req.body;

    // Validate input
    if (!eventId || !matchesData || !Array.isArray(matchesData)) {
      return res.status(400).json({
        message: "Event ID en matches data zijn verplicht",
      });
    }

    // 1. Validate event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        message: "Event niet gevonden",
      });
    }

    // Check if event already has matchmaking
    if (event.hasMatchmaking) {
      return res.status(400).json({
        message: "Dit event heeft al matchmaking",
      });
    }

    const createdMatches = [];
    const errors = [];

    // 2. Process each match
    for (const matchData of matchesData) {
      try {
        // Validate match data
        if (
          !matchData.fighter1 ||
          !matchData.fighter2 ||
          !matchData.weightClass
        ) {
          errors.push({
            match: matchData,
            error:
              "Ongeldige match data: vechters en gewichtsklasse zijn verplicht",
          });
          continue;
        }

        // Find or create fighters
        const [fighter1, fighter2] = await Promise.all([
          findOrCreateUser(matchData.fighter1),
          findOrCreateUser(matchData.fighter2),
        ]);

        // Create match
        const match = new Match({
          eventId,
          fighter1: fighter1._id,
          fighter2: fighter2._id,
          weightClass: matchData.weightClass,
          rounds: matchData.rounds || 3,
        });

        await match.save();
        event.matchmaking.push(match._id);
        createdMatches.push(match);
      } catch (error) {
        errors.push({
          match: matchData,
          error: error.message,
        });
      }
    }

    // Update event if any matches were created
    if (createdMatches.length > 0) {
      event.hasMatchmaking = true;
      await event.save();
    }

    res.status(201).json({
      message: `${createdMatches.length} match(es) succesvol geïmporteerd`,
      createdMatches,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Fout bij importeren matchmaking:", error);
    res.status(500).json({
      message: "Serverfout bij importeren matchmaking",
      error: error.message,
    });
  }
};

async function findOrCreateUser(fighterData) {
  if (!fighterData.voornaam || !fighterData.achternaam || !fighterData.club) {
    throw new Error(
      "Ongeldige vechter data: voornaam, achternaam en club zijn verplicht"
    );
  }

  // Search for existing user by name and club (case-insensitive)
  let user = await User.findOne({
    $and: [
      {
        $or: [
          { voornaam: new RegExp(`^${fighterData.voornaam}$`, "i") },
          { achternaam: new RegExp(`^${fighterData.achternaam}$`, "i") },
        ],
      },
      { "club.naam": new RegExp(`^${fighterData.club}$`, "i") },
    ],
  }).populate("club");

  if (!user) {
    // Find or create club
    let club = await Club.findOne({
      naam: new RegExp(`^${fighterData.club}$`, "i"),
    });

    if (!club) {
      club = new Club({
        naam: fighterData.club,
        // Add default club fields if needed
        status: "Actief",
      });
      await club.save();
    }

    // Generate unique email
    const baseEmail = `${fighterData.voornaam.toLowerCase()}.${fighterData.achternaam.toLowerCase()}`;
    let email = `${baseEmail}@temp.com`;
    let counter = 1;

    // Ensure email uniqueness
    while (await User.findOne({ email })) {
      email = `${baseEmail}${counter}@temp.com`;
      counter++;
    }

    // Create user
    user = new User({
      voornaam: fighterData.voornaam,
      achternaam: fighterData.achternaam,
      email,
      wachtwoord: await bcrypt.hash("tempPassword", 10),
      club: club._id,
      role: "Vechter",
      geboortedatum: new Date(), // Default date, should be updated later
      vechterInfo: {
        fightingReady: true,
        // Add other required vechterInfo fields
      },
    });

    await user.save();

    // Add user to club
    club.leden.push(user._id);
    await club.save();
  }

  return user;
}
