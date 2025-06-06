const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  fighters: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      weight: { type: Number, required: true },
      weightConfirmed: { type: Boolean, default: false },
      result: {
        type: String,
        enum: ["win", "loss", "draw", "pending"],
        default: "pending",
      },
    },
  ],
  winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt timestamp before saving
matchSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Match", matchSchema);
