const express = require("express");
const router = express.Router();
const juryController = require("../../../controllers/juryController");
const auth = require("../../../middleware/auth");

// Public routes
// GET /api/v1/jury/events/:eventId/export - Export matches to Excel
router.get("/events/:eventId/export", juryController.exportEventMatches);

// Protected routes
router.use(auth);

// GET /api/v1/jury/events/:eventId/matches - Get all matches for an event
router.get("/events/:eventId/matches", juryController.getEventMatches);

// PATCH /api/v1/jury/matches/:matchId/weight/:fighterIndex - Confirm fighter weight
router.patch(
  "/matches/:matchId/weight/:fighterIndex",
  juryController.confirmWeight
);

// PATCH /api/v1/jury/matches/:matchId/result - Set match result (winner)
router.patch("/matches/:matchId/result", juryController.setResult);

module.exports = router;
