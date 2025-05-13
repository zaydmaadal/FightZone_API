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
  const errorCheck = $('span:contains("Lid niet gevonden")').text();
  if (errorCheck) throw new Error("Licentie niet gevonden bij VKBMO");

  const content = $("#lidbox").text();

  // Regex patterns
  const patterns = {
    licentieNummer: /Lic nr:\s*(\d+)/,
    vervalDatum: /Vervaldatum:\s*(\d{2}\/\d{2}\/\d{4})/,
    clubNaam: /Club:\s*(.*?)(\n|$)/,
    rawNaam: /Naam:\s*<b>(.*?)<\/b>/,
  };

  const result = {};
  for (const [key, regex] of Object.entries(patterns)) {
    const match = content.match(regex);
    if (!match && key !== "rawNaam") throw new Error(`Ontbrekend veld: ${key}`);
    result[key] = match ? match[1] : null;
  }

  // Datumconversie
  if (result.vervalDatum) {
    const [day, month, year] = result.vervalDatum.split("/");
    result.vervalDatum = new Date(`${year}-${month}-${day}`);
  }

  return result;
}

module.exports = router;
