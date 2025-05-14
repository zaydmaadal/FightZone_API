// licenses.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const cheerio = require("cheerio");

router.post("/validate", async (req, res) => {
  try {
    const { qrCodeUrl } = req.body;

    if (!qrCodeUrl || !qrCodeUrl.includes("vkbmolink.be/qr_lid.php")) {
      return res.status(400).json({
        valid: false,
        message: "Ongeldige VKBMO URL",
      });
    }

    const response = await axios.get(qrCodeUrl);
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

  // Extract velden met specifieke logica per veld
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
  let vervaldatum =
    getFieldValue("Vervaldatum:") ||
    $("#lidbox")
      .text()
      .match(/Vervaldatum:\s*([^\n]+)/)?.[1]
      ?.trim();

  // Debug logging
  console.log("Extracted values:", {
    licentieNummer,
    naam,
    club,
    vervaldatum,
  });

  // Valideer verplichte velden
  if (!licentieNummer || !vervaldatum) {
    throw new Error(
      `Ontbrekende licentiegegevens. Gevonden: ${JSON.stringify({
        licentieNummer,
        naam,
        club,
        vervaldatum,
      })}`
    );
  }

  // Controleer alleen of het een geldige datum is
  const dateParts = vervaldatum.split("/");
  if (dateParts.length !== 3) {
    throw new Error(`Ongeldig datumformaat: ${vervaldatum}`);
  }

  const [day, month, year] = dateParts;
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new Error(`Ongeldige datum: ${vervaldatum}`);
  }

  return {
    licentieNummer,
    naam,
    club,
    vervaldatum, // Behoud origineel formaat dd/mm/yyyy
  };
}

module.exports = router;
