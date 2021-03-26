require('dotenv').config()

var path = require('path');
var express = require('express')
var app = express()
var bodyParser = require('body-parser')
var jwt = require('jsonwebtoken')

var userRoute = require('./routes/userRoute')
var hikingRoutes_Route = require('./routes/hikingRoutes_Route')
var hikingToursRoute = require('./routes/hikingToursRoute')

var db = require('./database');
var pool = db.getDBPool()
global.pool = pool

const verifyToken = (req, res, next) => {
    // console.log('verify token called')
    try {
        // console.log('req header: ', req)
        const token = req.headers.authorization;
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        // console.log('decoded: ', decoded);
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

app.post('/login')

// verify token below login
// app.use(verifyToken())


app.get('/', (req, res) => {
    res.send('abcde')
})

app.use('/user', userRoute)
// app.use(verifyToken())
app.use('/hikingRoute', verifyToken, hikingRoutes_Route)
app.use('/hikingTour', verifyToken, hikingToursRoute)

app.listen(process.env.PORT || 3000, () => {
    console.log('Server listening ')
})