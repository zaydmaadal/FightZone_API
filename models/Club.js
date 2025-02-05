const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema(
  {
    naam: { type: String, required: true, unique: true },
    locatie: { type: String, required: true },
    clublogo: { type: String },
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Eigenaar (Trainer)
    leden: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Vechters & Trainers
  },
  { timestamps: true }
);

module.exports = mongoose.model("Club", clubSchema);
