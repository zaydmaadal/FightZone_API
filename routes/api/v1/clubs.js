const express = require("express");
const router = express.Router();
const clubsController = require("../../../controllers/clubs");

// Club aanmaken
router.post("/", clubsController.createClub);

// Meerdere Clubs aanmaken
router.post("/multiple", clubsController.createMultipleClubs);

// Alle clubs ophalen
router.get("/", clubsController.getAllClubs);

// Specifieke club ophalen
router.get("/:id", clubsController.getClubById);

module.exports = router;
