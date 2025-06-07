const Match = require("../models/Match");
const User = require("../models/User");
const Club = require("../models/Club");
const Event = require("../models/Event");
const bcrypt = require("bcryptjs");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const winston = require("winston");

// Configure logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: "logs/import-error.log",
      level: "error",
    }),
    new winston.transports.File({ filename: "logs/import-combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

// Validation schemas
const fighterSchema = {
  name: { required: true, type: "string", minLength: 2 },
  club: { required: true, type: "string", minLength: 2 },
  weight: { required: true, type: "number", min: 0, max: 300 },
};

const matchSchema = {
  weightClass: { required: true, type: "string", minLength: 2 },
  rounds: { required: false, type: "number", min: 1, max: 5, default: 3 },
};

// Validation helper
function validateData(data, schema) {
  const errors = [];
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    if (rules.required && !value) {
      errors.push(`${field} is verplicht`);
      continue;
    }

    if (value) {
      if (rules.type === "number" && isNaN(Number(value))) {
        errors.push(`${field} moet een nummer zijn`);
      } else if (rules.type === "string" && typeof value !== "string") {
        errors.push(`${field} moet tekst zijn`);
      }

      if (rules.minLength && value.length < rules.minLength) {
        errors.push(
          `${field} moet minimaal ${rules.minLength} karakters bevatten`
        );
      }

      if (rules.min !== undefined && Number(value) < rules.min) {
        errors.push(`${field} moet minimaal ${rules.min} zijn`);
      }

      if (rules.max !== undefined && Number(value) > rules.max) {
        errors.push(`${field} mag maximaal ${rules.max} zijn`);
      }
    }
  }
  return errors;
}

// Helper function to parse simple result
function parseSimpleResult(resultString, fighter1Id, fighter2Id) {
  if (!resultString) return { winner: null };

  const normalized = resultString.trim().toUpperCase();

  return {
    winner: normalized.startsWith("R")
      ? fighter1Id
      : normalized.startsWith("B")
      ? fighter2Id
      : null,
  };
}

exports.importMatchmaking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    logger.info("Starting matchmaking import", {
      fileName: req.file?.originalname,
    });

    // Basic validations
    if (!req.file) {
      logger.warn("Import failed: No file provided");
      return res.status(400).json({
        message: "Excel bestand is verplicht",
        code: "NO_FILE",
      });
    }

    // Excel processing
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);

    // Validate worksheet
    if (!worksheet) {
      logger.error("Import failed: Invalid Excel file - no worksheet found");
      return res.status(400).json({
        message: "Ongeldig Excel bestand - geen werkblad gevonden",
        code: "INVALID_EXCEL",
      });
    }

    // Extract event title from the first row
    const firstRow = worksheet.getRow(1);
    const eventTitle = firstRow.getCell(1).value?.toString().trim();

    if (!eventTitle) {
      logger.error("Import failed: Event title not found in Excel");
      return res.status(400).json({
        message: "Event titel niet gevonden in Excel bestand",
        code: "EVENT_TITLE_MISSING",
      });
    }

    // Find event by title
    const event = await Event.findOne({ title: eventTitle }).session(session);

    if (!event) {
      logger.warn("Import failed: Event not found", { eventTitle });
      return res.status(404).json({
        message: `Event niet gevonden met titel: ${eventTitle}`,
        code: "EVENT_NOT_FOUND",
      });
    }

    if (event.hasMatchmaking) {
      logger.warn("Import failed: Event already has matchmaking", {
        eventTitle,
      });
      return res.status(400).json({
        message: "Event heeft al matchmaking",
        code: "EVENT_HAS_MATCHMAKING",
      });
    }

    const createdMatches = [];
    const errors = [];

    // Process each row starting from row 3 (header is row 2)
    for (let rowNumber = 3; rowNumber <= worksheet.rowCount; rowNumber++) {
      try {
        const row = worksheet.getRow(rowNumber);
        const rowData = row.values.slice(1);

        // Skip empty rows/breaks
        if (rowData.length < 14 || !rowData[4]) continue;

        const [
          _, // Ignore row number
          __, // Ignore weight class
          ___, // Ignore style
          ____, // Ignore rounds
          fighter1Name, // Column 5: Fighter 1 name
          fighter1Club, // Column 6: Club 1
          fighter1Weight, // Column 7: Weight 1
          age1, // Ignore age 1
          vs, // Ignore "VS"
          fighter2Name, // Column 10: Fighter 2 name
          fighter2Club, // Column 11: Club 2
          fighter2Weight, // Column 12: Weight 2
          age2, // Ignore age 2
          result, // Column 14: Basic result (R/B/DRAW)
        ] = rowData;

        // Validate required fields
        if (!fighter1Name || !fighter2Name || !fighter1Club || !fighter2Club) {
          throw new Error("Ontbrekende vechtergegevens");
        }

        // Process fighters
        const [fighter1, fighter2] = await Promise.all([
          findOrCreateUser(
            {
              fullName: fighter1Name.toString().trim(),
              club: fighter1Club.toString().trim(),
              weight: parseFloat(fighter1Weight.toString().replace(",", ".")),
            },
            session
          ),
          findOrCreateUser(
            {
              fullName: fighter2Name.toString().trim(),
              club: fighter2Club.toString().trim(),
              weight: parseFloat(fighter2Weight.toString().replace(",", ".")),
            },
            session
          ),
        ]);

        // Create match
        const resultData = parseSimpleResult(
          result?.toString(),
          fighter1._id,
          fighter2._id
        );

        const match = new Match({
          eventId: event._id,
          fighters: [
            {
              user: fighter1._id,
              weight: parseFloat(fighter1Weight.toString().replace(",", ".")),
              weightConfirmed: true,
            },
            {
              user: fighter2._id,
              weight: parseFloat(fighter2Weight.toString().replace(",", ".")),
              weightConfirmed: true,
            },
          ],
          winner: resultData.winner,
        });

        await match.save({ session });
        createdMatches.push(match);

        logger.info("Match created successfully", {
          rowNumber,
          matchId: match._id,
          fighters: [fighter1._id, fighter2._id],
          winner: resultData.winner,
        });
      } catch (error) {
        errors.push({ row: rowNumber, error: error.message });
        logger.error("Error processing row", {
          rowNumber,
          error: error.message,
          stack: error.stack,
        });
      }
    }

    // Update event if any matches were created
    if (createdMatches.length > 0) {
      event.hasMatchmaking = true;
      event.matchmaking.push(...createdMatches.map((m) => m._id));
      await event.save({ session });

      logger.info("Event updated with matchmaking", {
        eventId: event._id,
        matchCount: createdMatches.length,
      });
    }

    await session.commitTransaction();

    res.status(201).json({
      message: `${createdMatches.length} matches geïmporteerd voor event '${eventTitle}'`,
      createdMatches: createdMatches.length,
      errors: errors.length,
      eventId: event._id,
      eventTitle,
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error("Import failed with error", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      message: "Import mislukt",
      error: error.message,
      code: "SERVER_ERROR",
    });
  } finally {
    session.endSession();
  }
};

async function findOrCreateUser(fighterData, session) {
  try {
    // Split full name into first and last name
    const nameParts = fighterData.fullName.split(" ");
    const voornaam = nameParts[0];
    const achternaam = nameParts.slice(1).join(" ");

    // Search for existing user by name and club (case-insensitive)
    let user = await User.findOne({
      $and: [
        {
          $or: [
            { voornaam: new RegExp(`^${voornaam}$`, "i") },
            { achternaam: new RegExp(`^${achternaam}$`, "i") },
          ],
        },
        { "club.naam": new RegExp(`^${fighterData.club}$`, "i") },
      ],
    })
      .populate("club")
      .session(session);

    if (!user) {
      // Find or create club
      let club = await Club.findOne({
        naam: new RegExp(`^${fighterData.club}$`, "i"),
      }).session(session);

      if (!club) {
        club = new Club({
          naam: fighterData.club,
          status: "Actief",
        });
        await club.save({ session });
        logger.info("New club created", { clubId: club._id, naam: club.naam });
      }

      // Generate unique email
      const baseEmail = `${voornaam.toLowerCase()}.${achternaam.toLowerCase()}`;
      let email = `${baseEmail}@temp.com`;
      let counter = 1;

      while (await User.findOne({ email }).session(session)) {
        email = `${baseEmail}${counter}@temp.com`;
        counter++;
      }

      // Create user
      user = new User({
        voornaam,
        achternaam,
        email,
        wachtwoord: await bcrypt.hash("tempPassword", 10),
        club: club._id,
        role: "Vechter",
        geboortedatum: new Date(), // Default date, should be updated later
        vechterInfo: {
          fightingReady: true,
          weight: fighterData.weight,
        },
      });

      await user.save({ session });
      logger.info("New fighter created", {
        userId: user._id,
        naam: `${user.voornaam} ${user.achternaam}`,
      });

      // Add user to club
      club.leden.push(user._id);
      await club.save({ session });
    }

    return user;
  } catch (error) {
    logger.error("Error in findOrCreateUser", {
      error: error.message,
      stack: error.stack,
      fighterData,
    });
    throw error;
  }
}
