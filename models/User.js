const mongoose = require("mongoose");

const vechterSchema = new mongoose.Schema({
  gewicht: { type: Number }, // in kg
  lengte: { type: Number }, // in cm
  klasse: { type: String }, // Vechtklasse
  bijnaam: { type: String }, // Bijnaam van de vechter
  fightRecord: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
  },
  licentieNummer: { type: String, unique: true },
  vervalDatum: Date,
  fightingReady: { type: Boolean, default: true }, // Of de vechter klaar is om te vechten
});

const trainerSchema = new mongoose.Schema({
  specialisatie: { type: String, required: true },
  ervaring: { type: Number, required: true },
});

const vkbmoLidSchema = new mongoose.Schema({
  Scheidsrechter: { type: Boolean, default: false },
  Jurylid: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    voornaam: { type: String, required: true },
    achternaam: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    wachtwoord: { type: String, required: true },
    geboortedatum: { type: Date, required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club" }, // Verwijzing naar club
    profielfoto: { type: String },
    role: {
      type: String,
      enum: ["Vechter", "Trainer", "VKBMO-lid"],
      required: true,
    },
    vechterInfo: vechterSchema,
    trainerInfo: trainerSchema,
    vkbmoLidInfo: vkbmoLidSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
