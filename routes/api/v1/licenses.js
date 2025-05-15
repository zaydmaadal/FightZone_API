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

    // Laat Axios automatisch redirects volgen
    const response = await axios.get(qrCodeUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FightZone/1.0)",
        "Accept-Language": "nl-BE,nl;q=0.9",
      },
      maxRedirects: 5, // Sta maximaal 5 redirects toe
    });

    // Gebruik de uiteindelijke URL na redirects
    const finalUrl = response.request.res.responseUrl || qrCodeUrl;
    console.log("Final URL after redirects:", finalUrl);

    // Controleer of we op de juiste pagina zijn beland
    if (!finalUrl.includes("qr_lid.php")) {
      throw new Error("Ongeldige licentie URL - verwachtte qr_lid.php pagina");
    }

    // Gebruik de bestaande parser
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

  // Controleer op ongeldige licentie
  if ($('span:contains("Lid niet gevonden (3)!")').length > 0) {
    throw new Error("Lid niet gevonden bij VKBMO");
  }

  // Helper functie voor betrouwbare veldextractie
  const getFieldValue = (label) => {
    const labelElement = $(`span:contains('${label}')`).first();

    if (!labelElement.length) {
      console.warn(`Label '${label}' niet gevonden`);
      return null;
    }

    // Speciaal geval voor Naam (bevat <b> tag)
    if (label === "Naam:") {
      return labelElement.next("b").text().trim();
    }

    // Voor andere velden: neem de direct volgende tekst
    let value = "";
    let nextNode = labelElement[0].next;

    while (nextNode) {
      if (nextNode.type === "text") {
        value += $(nextNode).text().trim();
        break;
      }
      nextNode = nextNode.next;
    }

    return value || null;
  };

  // Extract alle velden
  const licentieNummer =
    getFieldValue("Lic nr:") ||
    $("#lidbox")
      .text()
      .match(/Lic nr:\s*(\d+)/)?.[1];
  const naam =
    getFieldValue("Naam:") ||
    $("#lidbox")
      .text()
      .match(/Naam:\s*([^\n]+)/)?.[1]
      ?.trim();
  const club =
    getFieldValue("Club:") ||
    $("#lidbox")
      .text()
      .match(/Club:\s*([^\n]+)/)?.[1]
      ?.trim();
  const vervaldatum =
    getFieldValue("Vervaldatum:") ||
    $("#lidbox")
      .text()
      .match(/Vervaldatum:\s*([^\n]+)/)?.[1]
      ?.trim();
  const geboortedatum =
    getFieldValue("Geb datum:") ||
    html
      .match(/<!--\s*<span[^>]*>Geb datum:<\/span>\s*([^<]+)<br>\s*-->/)?.[1]
      ?.trim();
  const geslacht =
    getFieldValue("Geslacht:") ||
    $("#lidbox")
      .text()
      .match(/Geslacht:\s*([^\n]+)/)?.[1]
      ?.trim();

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
