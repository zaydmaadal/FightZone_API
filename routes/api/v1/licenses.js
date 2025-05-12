const express = require("express");
const router = express.Router();
const axios = require("axios");
const cheerio = require("cheerio"); // HTML parsing
const User = require("../../../models/User");

router.post("/validate", async (req, res) => {
  try {
    const { qrCodeUrl } = req.body;

    // 1. Haal licentiegegevens op van VKBMO
    const response = await axios.get(qrCodeUrl);
    const licenseData = parseVkbmoHTML(response.data);

    // 2. Validaties
    const existingUser = await User.findOne({
      licentieNummer: licenseData.licentieNummer,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Licentie is al geregistreerd",
      });
    }

    if (new Date(licenseData.vervalDatum) < new Date()) {
      return res.status(400).json({
        message: "Licentie is verlopen",
      });
    }

    // 3. Return parsed data voor registratie
    res.json({
      valid: true,
      data: licenseData,
    });
  } catch (error) {
    console.error("Validatiefout:", error);
    res.status(500).json({ message: "Licentie validatie mislukt" });
  }
});

// Echte HTML-parsing met Cheerio
function parseVkbmoHTML(html) {
  const $ = cheerio.load(html);

  // Aanpassen op basis van VKBMO's HTML-structuur
  return {
    voornaam: $('td:contains("Voornaam") + td').text().trim(),
    achternaam: $('td:contains("Naam") + td').text().trim(),
    geboortedatum: $('td:contains("Geboortedatum") + td').text().trim(),
    licentieNummer: $('td:contains("Licentienummer") + td').text().trim(),
    vervalDatum: $('td:contains("Vervaldatum") + td').text().trim(),
    club: $('td:contains("Club") + td').text().trim(),
  };
}

module.exports = router;
