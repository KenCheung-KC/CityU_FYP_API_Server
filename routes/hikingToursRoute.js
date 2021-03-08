var express = require('express');
var router = express.Router();
const hikingToursController = require('../controllers/hikingToursController')

/* GET users listing. */

router.get('/', function(req, res, next) {
  res.send('respond from hiking tours route');
});
router.get('/hikingToursList', hikingToursController.hikingToursList)
router.post('/joinHikingTour/:id', hikingToursController.joinHikingTour)
router.get('/getUserJoinedTours/:userId', hikingToursController.getUserJoinedTours)
router.get('/getUserHostedTours/:userId', hikingToursController.getUserHostedTours)
router.post('/createTour', hikingToursController.createTour)

module.exports = router;
