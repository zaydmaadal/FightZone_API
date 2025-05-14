// licenses.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const cheerio = require("cheerio");
const User = require("../../../models/User");
const Club = require("../../../models/Club");

router.post("/validate", async (req, res) => {
  try {
    const { qrCodeUrl } = req.body;
    const trainer = await User.findById(req.user.id).populate("club");

    // 1. Valideer trainer
    if (!trainer || trainer.role !== "Trainer") {
      return res.status(403).json({
        valid: false,
        message: "Alleen trainers kunnen licenties valideren",
      });
    }

    // 2. Haal licentiegegevens op
    const response = await axios.get(qrCodeUrl);
    const licenseData = parseVkbmoHTML(response.data);

    // 3. Club validatie
    if (licenseData.clubNaam !== trainer.club.naam) {
      return res.status(400).json({
        valid: false,
        message: `Club mismatch: Licentie (${licenseData.clubNaam}) vs Trainer (${trainer.club.naam})`,
      });
    }

    // 4. Controleer licentie nummer
    const existingUser = await User.findOne({
      "vechterInfo.licentieNummer": licenseData.licentieNummer,
    });

    if (existingUser) {
      return res.status(400).json({
        valid: false,
        message: "Licentienummer al geregistreerd",
      });
    }

    // 5. Valideer vervaldatum
    if (licenseData.vervalDatum < new Date()) {
      return res.status(400).json({
        valid: false,
        message: "Licentie is verlopen",
      });
    }

    // Succes response
    res.json({
      valid: true,
      data: {
        licentieNummer: licenseData.licentieNummer,
        vervalDatum: licenseData.vervalDatum.toISOString().split("T")[0],
        clubNaam: licenseData.clubNaam,
      },
    });
  } catch (error) {
    console.error("Validatiefout:", error);
    const statusCode = error.message.includes("niet gevonden") ? 404 : 500;
    res.status(statusCode).json({
      valid: false,
      message: error.message || "Validatie mislukt",
    });
  }
});

function parseVkbmoHTML(html) {
  const $ = cheerio.load(html);

  // Controleer op "Lid niet gevonden"
  if ($('span:contains("Lid niet gevonden")').length > 0) {
    throw new Error("Licentie niet gevonden bij VKBMO");
  }

  // Extraheer cruciale velden
  const result = {
    licentieNummer: $("#lidbox span:contains('Lic nr:') + b").text().trim(),
    rawNaam: $("#lidbox span:contains('Naam:') + b").text().trim(),
    clubNaam: $("#lidbox span:contains('Club:')").next().text().trim(),
    vervalDatum: $("#lidbox span:contains('Vervaldatum:')")
      .next()
      .text()
      .trim(),
  };

  // Valideer verplichte velden
  if (!result.licentieNummer || !result.vervalDatum || !result.clubNaam) {
    throw new Error("Ontbrekende licentiegegevens in de HTML");
  }

  // Converteer datum (DD/MM/YYYY => YYYY-MM-DD)
  const [day, month, year] = result.vervalDatum.split("/");
  result.vervalDatum = new Date(`${year}-${month}-${day}`);

  return result;
}

module.exports = router;
