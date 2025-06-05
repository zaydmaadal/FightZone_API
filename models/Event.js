const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    start: {
      type: Date,
      default: Date.now,
    },
    end: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: String,
      default: "Locatie niet gespecificeerd",
    },
    createdBy: {
      type: String,
      default: "vkbmo-sync",
    },
    // Type van event: 'vkbmo', 'training', 'club'
    type: {
      type: String,
      enum: ["vkbmo", "training", "club"],
      default: "vkbmo",
    },
    // Voor club events: welke club het betreft
    club: {
      type: String,
    },
    // Voor training events: welke trainer het betreft
    trainer: {
      type: String,
    },
    // Voor wie het event zichtbaar is
    visibility: {
      type: String,
      enum: ["public", "club", "trainer"],
      default: "public",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    // Matchmaking fields
    matchmaking: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Match",
      },
    ],
    hasMatchmaking: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Update the updatedAt timestamp before saving
eventSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Event", eventSchema);
