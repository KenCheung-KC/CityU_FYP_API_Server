var express = require('express');
var router = express.Router();
const hikingRoutesController = require('../controllers/hikingRoutesController')

/* GET users listing. */

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});
router.get('/hikingRouteList', hikingRoutesController.hikingRouteList)
router.get('/hikingRouteList/:id', hikingRoutesController.getHikingRoute)
router.post('/rateHikingRoute/:routeId', hikingRoutesController.rateForHikingRoute)
router.put('/likeHikingRoute/:routeId', hikingRoutesController.likeHikingRoute)

module.exports = router;
