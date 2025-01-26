const express = require("express");
const router = express.Router();
const usersController = require("../../../controllers/users");

// GET /api/v1/users - Haalt alle users op
router.get("/", usersController.getAllUsers);

// POST /api/v1/users - Voegt een nieuwe user toe
router.post("/", usersController.createUser);

// POST /api/v1/users/:id/gevechten - Plannen van een nieuw gevecht (Pre-fight)
router.post("/:id/gevechten", usersController.plannenGevecht);

// PATCH /api/v1/gevechten/:id/resultaat - Resultaat bijwerken na gevecht (Post-fight)
router.patch(
  "/:id/gevechten/:gevechtId/resultaat",
  usersController.updateGevechtResultaat
);

module.exports = router;
