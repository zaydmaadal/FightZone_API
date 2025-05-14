// licenses.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const cheerio = require("cheerio");
const User = require("../../../models/User");
const Club = require("../../../models/Club");
const authMiddleware = require("../../../middleware/auth");
router.use(authMiddleware);

router.post("/validate", async (req, res) => {
  try {
    const { qrCodeUrl } = req.body;
    console.log("Ontvangen QR URL:", req.body.qrCodeUrl);
    const trainer = await User.findById(req.user.id).populate("club");

    console.log("Ingelogde trainer:", {
      id: trainer?._id,
      club: trainer?.club?.naam,
      role: trainer?.role,
    });

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

  // Controleer op lid niet gevonden
  if ($('div:contains("LICENSE VALID")').length === 0) {
    throw new Error("Licentie niet geldig of verlopen");
  }

  // Nieuwe selectors voor de huidige HTML-structuur
  const result = {
    licentieNummer: $('span:contains("Lic nr:")').next().text().trim(),
    rawNaam: $('span:contains("Naam:")').next("b").text().trim(),
    clubNaam: $('span:contains("Club:")').next().text().trim(),
    vervalDatum: $('span:contains("Vervaldatum:")').next().text().trim(),
  };

  // Debug logging
  console.log("Geparseerde licentie data:", result);

  if (!result.vervalDatum || !result.licentieNummer) {
    throw new Error("Ontbrekende licentiegegevens");
  }

  // Datumconversie fix (DD/MM/YYYY => ISO)
  const [day, month, year] = result.vervalDatum.split("/");
  result.vervalDatum = new Date(`${year}-${month}-${day}`);

  return result;
}

module.exports = router;
