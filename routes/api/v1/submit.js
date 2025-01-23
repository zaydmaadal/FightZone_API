const express = require("express");
const router = express.Router();

// @route   GET /api/v1/submit
// @desc    Test route
// @access  Public
router.get("/", (req, res) => {
  res.status(200).json({ message: "API werkt!" });
});

module.exports = router;
