const express = require("express");
const router = express.Router();
const matchesController = require("../../../controllers/matches");

// GET /api/v1/matches - Get all matches
router.get("/", matchesController.getAllMatches);

// GET /api/v1/matches/:id - Get match by ID
router.get("/:id", matchesController.getMatchById);

// POST /api/v1/matches - Create a new match
router.post("/", matchesController.createMatch);

// PATCH /api/v1/matches/:id - Update a match
router.patch("/:id", matchesController.updateMatch);

// DELETE /api/v1/matches/:id - Delete a match
router.delete("/:id", matchesController.deleteMatch);

module.exports = router;
