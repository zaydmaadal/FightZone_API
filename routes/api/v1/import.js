const express = require("express");
const router = express.Router();
const multer = require("multer");
const importController = require("../../../controllers/importController");

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Alleen Excel bestanden zijn toegestaan"), false);
    }
  },
});

// Middleware to handle multiple field names
const uploadMiddleware = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err && err.code === "LIMIT_UNEXPECTED_FILE") {
      // Try alternative field names
      upload.single("excelFile")(req, res, (err2) => {
        if (err2 && err2.code === "LIMIT_UNEXPECTED_FILE") {
          upload.single("matchmakingFile")(req, res, next);
        } else {
          next(err2);
        }
      });
    } else {
      next(err);
    }
  });
};

// POST /api/v1/import/matchmaking - Import matchmaking data
router.post(
  "/matchmaking",
  uploadMiddleware,
  importController.importMatchmaking
);

module.exports = router;
