require('dotenv').config()

var path = require('path');
var express = require('express')
var app = express()
var bodyParser = require('body-parser')
var jwt = require('jsonwebtoken')

var userRoute = require('./routes/userRoute')
var hikingRoutesRoute = require('./routes/hikingRoutesRoute')
var hikingToursRoute = require('./routes/hikingToursRoute')
var recommendationRoute = require('./routes/recommendationRoute')

var db = require('./database');
var pool = db.getDBPool()
global.pool = pool

// verify the request, if user is not authenticated, the request will be blocked.
const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization;
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.decoded = decoded 
        next();
    } catch(err) {
        console.log('authentication error: ', err)
        res.status(401).send("Unauthorized access!");
    }
}

app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json())

// __dirname = directory of this file, __filename = this file
var dir = path.join(__dirname, 'pictures');
global.pictureDirctory = dir
// serve static file if user request to /pictures
app.use('/pictures', express.static(dir));

app.get('/', (req, res) => {
    res.send('hello')
})

app.use('/user', userRoute)
app.use('/hikingRoute', verifyToken, hikingRoutesRoute)
app.use('/hikingTour', verifyToken, hikingToursRoute)
app.use('/recommendation', verifyToken, recommendationRoute)

app.listen(process.env.PORT || 3000, () => {
    console.log('Server listening ')
})