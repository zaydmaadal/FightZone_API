const express = require("express");
const router = express.Router();
const usersController = require("../../../controllers/users");

// GET /api/v1/users - Haalt alle users op
router.get("/", usersController.getAllUsers);

// GET /api/v1/users/:id - Haalt een specifieke user op
router.get("/:id", usersController.getUserById);

// POST /api/v1/users - Voegt een nieuwe user toe
router.post("/", usersController.createUser);

// POST /api/v1/users - Voegt meerder nieuwe users toe
router.post("/multiple", usersController.createMultipleUsers);

// POST /api/v1/users/:id/gevechten - Plannen van een nieuw gevecht (Pre-fight)
router.post("/:id/gevechten", usersController.plannenGevecht);

// PATCH /api/v1/users/:id/gevechten/:gevechtId/resultaat - Resultaat bijwerken na gevecht
router.patch(
  "/:id/gevechten/:gevechtId/resultaat",
  usersController.updateGevechtResultaat
);

// PATCH /api/v1/users/vechter/:id - Update een vechter
router.patch("/vechter/:id", usersController.updateVechter);

// DELETE /api/v1/users/:id - Verwijdert een specifieke user
router.delete("/:id", usersController.deleteUserById);

module.exports = router;
