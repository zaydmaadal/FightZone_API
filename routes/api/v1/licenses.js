// licenses.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const cheerio = require("cheerio");

router.post("/validate", async (req, res) => {
  try {
    const { qrCodeUrl } = req.body;

    if (!qrCodeUrl || !qrCodeUrl.includes("vkbmolink.be")) {
      return res.status(400).json({
        valid: false,
        message: "Ongeldige VKBMO URL",
      });
    }

    // Converteer hash-based URLs naar het oude formaat
    let finalUrl = qrCodeUrl;
    if (qrCodeUrl.includes("qr.php?")) {
      const licenseKey = qrCodeUrl.split("?")[1].split("&")[0];
      finalUrl = `https://vkbmolink.be/qr_lid.php?lk=${licenseKey}`;
    }

    const response = await axios.get(finalUrl);
    const licenseData = parseVkbmoHTML(response.data);

    res.json({
      valid: true,
      data: licenseData,
    });
  } catch (error) {
    console.error("Validatiefout:", error.message);
    res.status(400).json({
      valid: false,
      message: error.message,
    });
  }
});

function parseVkbmoHTML(html) {
  const $ = cheerio.load(html);

  // Nieuwe error checks
  const errorMessages = [
    "Lid niet gevonden",
    "Invalid license",
    "404",
    "niet actief",
  ];

  if (
    errorMessages.some((msg) => html.toLowerCase().includes(msg.toLowerCase()))
  ) {
    throw new Error("Licentie niet gevonden of ongeldig");
  }

  // Aangepaste veldextractie
  const extractField = (label) => {
    // Probeer beide formaten
    const elements = [
      $(`span:contains('${label}')`).first(),
      $(`div:contains('${label}')`).first(),
    ];

    for (const el of elements) {
      if (el.length) {
        const value = el.next().text().trim();
        if (value) return value;
      }
    }

    return null;
  };

  // Extract velden
  const licentieNummer =
    extractField("Lic nr:") || html.match(/Licentie nr:?\s*(\d+)/i)?.[1];

  const naam = extractField("Naam:") || $("b").first().text().trim();

  const club =
    extractField("Club:") || html.match(/Club:?\s*([^\n<]+)/i)?.[1]?.trim();

  const vervaldatum =
    extractField("Vervaldatum:") ||
    html.match(/Vervaldatum:?\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1];

  const geboortedatum =
    extractField("Geb datum:") ||
    html.match(/Geb datum:?\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1];

  const geslacht =
    extractField("Geslacht:") || html.match(/Geslacht:?\s*([MV])/i)?.[1];

  // Debug logging
  console.log("Extracted values:", {
    licentieNummer,
    naam,
    club,
    vervaldatum,
    geboortedatum,
    geslacht,
  });

  // Valideer verplichte velden
  if (!licentieNummer || !vervaldatum) {
    throw new Error(
      `Ontbrekende licentiegegevens. Gevonden: ${JSON.stringify({
        licentieNummer,
        naam,
        club,
        vervaldatum,
        geboortedatum,
        geslacht,
      })}`
    );
  }

  // Controleer datumformaten
  const validateDate = (dateStr) => {
    if (!dateStr) return true;
    const parts = dateStr.split("/");
    return parts.length === 3 && !parts.some(isNaN);
  };

  if (!validateDate(vervaldatum) || !validateDate(geboortedatum)) {
    throw new Error(`Ongeldig datumformaat`);
  }

  return {
    licentieNummer,
    naam,
    club,
    vervaldatum, // dd/mm/yyyy
    geboortedatum: geboortedatum || null, // dd/mm/yyyy (optioneel)
    geslacht: geslacht || null, // M/V (optioneel)
  };
}

module.exports = router;
