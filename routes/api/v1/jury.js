const express = require("express");
const router = express.Router();
const juryController = require("../../../controllers/juryController");

// GET /api/v1/jury/events/:eventId/matches - Get all matches for an event
router.get("/events/:eventId/matches", juryController.getEventMatches);

// PATCH /api/v1/jury/matches/:matchId/weight/:fighterNumber - Confirm fighter weight
router.patch(
  "/matches/:matchId/weight/:fighterNumber",
  juryController.confirmWeight
);

// PATCH /api/v1/jury/matches/:matchId/result - Set match result
router.patch("/matches/:matchId/result", juryController.setResult);

module.exports = router;
