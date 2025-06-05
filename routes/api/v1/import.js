const express = require("express");
const router = express.Router();
const importController = require("../../../controllers/importController");

// POST /api/v1/import/matchmaking - Import matchmaking data
router.post("/matchmaking", importController.importMatchmaking);

module.exports = router;
