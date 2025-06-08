const express = require("express");
const router = express.Router();
const { loginUser, getCurrentUser, requestPasswordReset, resetPassword } = require("../../../controllers/auth");
const authMiddleware = require("../../../middleware/auth"); // Middleware toevoegen

router.post("/login", loginUser);
router.get("/me", authMiddleware, getCurrentUser); // Auth middleware toevoegen
router.post("/reset-password", requestPasswordReset);
router.post("/reset-password/:token", resetPassword);

module.exports = router;
