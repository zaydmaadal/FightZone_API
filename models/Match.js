const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  fighter1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fighter2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  weightClass: {
    type: String,
    required: true,
  },
  rounds: {
    type: Number,
    default: 3,
  },
  weight1Confirmed: {
    type: Boolean,
    default: false,
  },
  weight2Confirmed: {
    type: Boolean,
    default: false,
  },
  result: {
    type: String,
    enum: ["Pending", "Fighter1", "Fighter2", "Draw"],
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
matchSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Match", matchSchema);
