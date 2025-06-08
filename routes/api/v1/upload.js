const express = require("express");
const router = express.Router();
const { uploadFile } = require("../../../controllers/uploadController");

// POST /api/v1/upload - Upload een bestand
router.post("/", uploadFile);

module.exports = router;
