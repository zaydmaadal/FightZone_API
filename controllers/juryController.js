const Match = require("../models/Match");
const Event = require("../models/Event");
const User = require("../models/User");
const ExcelJS = require("exceljs");

// Helper function to calculate age
const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

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
      .populate("fighters.user", "voornaam achternaam club")
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
    const { matchId, fighterIndex } = req.params;
    const index = parseInt(fighterIndex);

    // Validate fighter index
    if (isNaN(index) || index < 0 || index > 1) {
      return res.status(400).json({
        message: "Ongeldig vechter index. Moet 0 of 1 zijn.",
      });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({
        message: "Match niet gevonden",
      });
    }

    // Update weight confirmation
    match.fighters[index].weightConfirmed = true;
    await match.save();

    res.status(200).json({
      message: `Gewicht vechter ${index + 1} bevestigd`,
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
    const { winnerId } = req.body; // ID van de winnaar

    const match = await Match.findById(matchId).populate("fighters.user");

    if (!match) {
      return res.status(404).json({ message: "Match niet gevonden" });
    }

    // Valideer winnerId komt overeen met een vechter
    const isValidWinner = match.fighters.some((f) =>
      f.user._id.equals(winnerId)
    );
    if (!isValidWinner) {
      return res.status(400).json({ message: "Ongeldige winnaar ID" });
    }

    // Check if both weights are confirmed
    if (!match.fighters.every((f) => f.weightConfirmed)) {
      return res.status(400).json({
        message: "Beide vechters moeten eerst hun gewicht bevestigen",
      });
    }

    // Update match result
    match.winner = winnerId;
    match.fighters.forEach((f) => {
      f.result = f.user._id.equals(winnerId) ? "win" : "loss";
    });

    // Update fighter records
    for (const fighter of match.fighters) {
      const user = fighter.user;
      if (fighter.result === "win") {
        user.vechterInfo.fightRecord.wins++;
      } else if (fighter.result === "loss") {
        user.vechterInfo.fightRecord.losses++;
      }
      await user.save();
    }

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

// Export event matches to Excel
exports.exportEventMatches = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event niet gevonden" });
    }

    const matches = await Match.find({ eventId })
      .populate({
        path: "fighters.user",
        select: "voornaam achternaam club geboortedatum",
        populate: {
          path: "club",
          select: "naam",
        },
      })
      .populate("winner", "voornaam achternaam");

    if (!matches || matches.length === 0) {
      return res
        .status(404)
        .json({ message: "Geen matches gevonden voor dit event" });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Matches");

    // Stijl definities
    const headerStyle = {
      font: { bold: true, color: { argb: "FFFFFFFF" } },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF3483FE" },
      }, // Blauwe achtergrond
      border: {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      },
      alignment: { horizontal: "center", vertical: "middle" },
    };

    const redStyle = {
      font: { color: { argb: "FFFF0000" }, bold: true },
    };

    const blueStyle = {
      font: { color: { argb: "FF0000FF" }, bold: true },
    };

    const vsStyle = {
      font: { bold: true },
      alignment: { horizontal: "center" },
    };

    const resultStyle = {
      font: { bold: true },
      alignment: { horizontal: "center" },
    };

    // Event titel
    worksheet.mergeCells("A1:K1"); // Aangepast voor minder kolommen
    const titleCell = worksheet.getCell("A1");
    titleCell.value = event.title || event.naam || "Event Matches";
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: "center" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" },
    };

    // Kolomkoppen (zonder lege kolommen)
    const headerRow = worksheet.addRow([
      "#",
      "Rode Hoek",
      "Sportschool",
      "KG",
      "LT",
      "VS",
      "Blauwe Hoek",
      "Sportschool",
      "KG",
      "LT",
      "Uitslagen",
    ]);

    headerRow.eachCell((cell) => {
      cell.style = headerStyle;
    });

    // Data rijen
    matches.forEach((match, index) => {
      const fighter1 = match.fighters[0]?.user || {};
      const fighter2 = match.fighters[1]?.user || {};

      const row = worksheet.addRow([
        index + 1,
        `${fighter1.voornaam || "Onbekend"} ${fighter1.achternaam || ""}`,
        fighter1.club?.naam || "N/A",
        match.fighters[0]?.weight || "N/A",
        fighter1.geboortedatum ? calculateAge(fighter1.geboortedatum) : "N/A",
        "VS",
        `${fighter2.voornaam || "Onbekend"} ${fighter2.achternaam || ""}`,
        fighter2.club?.naam || "N/A",
        match.fighters[1]?.weight || "N/A",
        fighter2.geboortedatum ? calculateAge(fighter2.geboortedatum) : "N/A",
        match.winner
          ? match.winner._id.equals(fighter1._id)
            ? "R-wop"
            : "B-wop"
          : "pending",
      ]);

      // Pas stijlen toe
      row.getCell(2).style = redStyle; // Rode hoek naam
      row.getCell(7).style = blueStyle; // Blauwe hoek naam
      row.getCell(6).style = vsStyle; // VS
      row.getCell(11).style = resultStyle; // Resultaat

      // Voeg borders toe
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
      });
    });

    // Kolombreedtes aanpassen (zonder lege kolommen)
    worksheet.columns = [
      { key: "num", width: 5 }, // #
      { key: "fighter1", width: 20 }, // Rode hoek naam
      { key: "club1", width: 15 }, // Sportschool 1
      { key: "weight1", width: 8 }, // KG 1
      { key: "age1", width: 8 }, // LT 1
      { key: "vs", width: 5 }, // VS
      { key: "fighter2", width: 20 }, // Blauwe hoek naam
      { key: "club2", width: 15 }, // Sportschool 2
      { key: "weight2", width: 8 }, // KG 2
      { key: "age2", width: 8 }, // LT 2
      { key: "result", width: 12 }, // Uitslagen
    ];

    // Response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${event.title || "matches"}-${
        new Date().toISOString().split("T")[0]
      }.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({
      message: "Export failed",
      error: error.message,
      details:
        "Er is een fout opgetreden bij het exporteren van de matches. Controleer of alle vechtergegevens correct zijn ingevuld.",
    });
  }
};
