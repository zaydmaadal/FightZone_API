const express = require("express");
const router = express.Router();
const vechtersController = require("../../../controllers/vechters");

// @route   GET /api/v1/vechters
// @desc    Test route
// @access  Public

router.get("/", vechtersController.getAllVechters);

module.exports = router;
