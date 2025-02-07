const express = require("express");
const router = express.Router();
const { loginUser, getCurrentUser } = require("../../../controllers/auth");
const authMiddleware = require("../../../middleware/auth"); // Middleware toevoegen

router.post("/login", loginUser);
router.get("/me", authMiddleware, getCurrentUser); // Auth middleware toevoegen

module.exports = router;
