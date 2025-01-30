const mongoose = require("mongoose");

const fightSchema = new mongoose.Schema({
  tegenstander: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // Verwijzing naar een andere gebruiker
  datum: { type: Date, required: true }, // Datum van het gevecht
  event: { type: String }, // Naam van het evenement --> later een object van maken met meer details
  locatie: { type: String }, // Locatie van het evenement
  resultaat: { type: String }, // Of de vechter heeft gewonnen
  Knockout: { type: Boolean }, // Of de vechter heeft gewonnen met een knockout
});

const vechterSchema = new mongoose.Schema({
  gewicht: { type: Number }, // in kg
  lengte: { type: Number }, // in cm
  klasse: { type: String }, // Vechtklasse
  bijnaam: { type: String }, // Bijnaam van de vechter
  fights: [fightSchema], // Array van gevechten
  verzekering: { type: Boolean, default: true }, // Of de vechter verzekerd is
  fightingReady: { type: Boolean, default: true }, // Of de vechter klaar is om te vechten
});

const trainerSchema = new mongoose.Schema({
  specialisatie: { type: String, required: true },
  ervaring: { type: Number, required: true },
});

const vkbmoLidSchema = new mongoose.Schema({
  lidnummer: { type: String, required: true },
  datumVanInschrijving: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    voornaam: { type: String, required: true },
    achternaam: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    wachtwoord: { type: String, required: true },
    geboortedatum: { type: Date, required: true },
    club: { type: String }, //later automatisch verbonden met de club waar de trainer bij hoort
    profielfoto: { type: String },
    role: {
      type: String,
      enum: ["Vechter", "Trainer", "VKBMO-lid"],
      required: true,
    },
    vechterInfo: vechterSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
