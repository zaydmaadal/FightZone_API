const mongoose = require("mongoose");

const fightSchema = new mongoose.Schema({
  tegenstander: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // Verwijzing naar een andere gebruiker
  datum: { type: Date, required: true }, // Datum van het gevecht
  resultaat: { type: String }, // Of de vechter heeft gewonnen
});

const vechterSchema = new mongoose.Schema({
  gewicht: { type: Number }, // in kg
  lengte: { type: Number }, // in cm
  fights: [fightSchema], // Array van gevechten
  verzekering: { type: Boolean, default: true }, // Of de vechter verzekerd is
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
    naam: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    wachtwoord: { type: String, required: true },
    geboortedatum: { type: Date, required: true },
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
