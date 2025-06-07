const express = require("express");
const router = express.Router();
const multer = require("multer");
const importController = require("../../../controllers/importController");

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.includes("excel") ||
      file.mimetype.includes("spreadsheet") ||
      file.originalname.endsWith(".xlsx")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Alleen Excel bestanden zijn toegestaan"), false);
    }
  },
});

// Simplified upload middleware
const uploadMiddleware = upload.single("file");

// POST /api/v1/import/matchmaking - Import matchmaking data
router.post(
  "/matchmaking",
  uploadMiddleware,
  importController.importMatchmaking
);

// Add error handling middleware
router.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
    code: "SERVER_ERROR",
  });
});

module.exports = router;
