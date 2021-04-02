var express = require('express');
var router = express.Router();
const recommendationController = require('../controllers/recommendationController')

router.get('/recommendationRoutes', recommendationController.recommendationRoutes)

module.exports = router;