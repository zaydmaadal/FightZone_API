var express = require('express');
var router = express.Router();
const usersController = require('../../../controllers/users'); // Adjust path as needed
const { authenticate } = require('../../../middleware/auth'); // Adjust path as needed


/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});




module.exports = router;
