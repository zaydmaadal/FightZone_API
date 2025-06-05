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
});

const vechterSchema = new mongoose.Schema({
  gewicht: { type: Number }, // in kg
  lengte: { type: Number }, // in cm
  klasse: { type: String }, // Vechtklasse
  bijnaam: { type: String }, // Bijnaam van de vechter
  fights: [fightSchema], // Array van gevechten
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
