var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// PATCH /api/v1/users/:id - Update een bestaande user
router.patch("/:id", usersController.updateUser);

module.exports = router;
