// list all hiking tours
const hikingToursList = async (req, res) => {
    const hikingToursResult = await pool.query(`SELECT hikingTours.*, hikingRoutes.hikingRouteImage, hikingRoutes.name AS hikingroutename, users.username AS hostname FROM hikingTours, hikingRoutes, users WHERE hikingTours.hikingRouteId = hikingRoutes.id AND hikingTours.dateAndTime >= NOW() AND hikingTours.hostId = users.id ORDER BY hikingTours.id DESC;`)
    const hikingTours = hikingToursResult.rows

    res.send({
        message: 'hiking tour list',
        hikingTours: hikingTours,
    })
}

// join hiking tour
const joinHikingTour = async (req, res) => {
    const { userId } = req.body
    const { id } = req.params
    const targetHikingTour = await pool.query(`SELECT * from hikingTourParticipants WHERE hikingTourId = ${id}`)
    const maximumParticipant = await pool.query(`SELECT maximumParticipant FROM hikingTours WHERE id = ${id}`)
    const targetHikingTourIsFull = targetHikingTour.rows.length >= maximumParticipant.rows[0].maximumparticipant ? true : false
    const participantsUserId = targetHikingTour.rows.map((elem) => {
        return elem.participantid
    })
    const alreadyParticipanted = participantsUserId.includes(parseInt(userId, 10))

    if(alreadyParticipanted) {
        res.send({
            message: 'Already participated!',
        })
        return
    }

    if (targetHikingTourIsFull && !alreadyParticipanted) {
        res.send({
            message: 'This tour is full!',
        })
        return
    }

    const checkParticipateRecord = await pool.query(`SELECT * FROM hikingTourParticipants WHERE participantId = ${userId} AND hikingTourId = ${id}`)
    const userAlreadyParticipated = checkParticipateRecord.rows.length > 0 ? true : false

    if (!userAlreadyParticipated) {
        await pool.query(`INSERT INTO hikingTourParticipants (participantId, hikingTourId) VALUES (${userId}, ${id});`, (err, result) => {
            if (err) {
                console.log('database err: ', err)
            }  
        })
        res.send({
            message: 'Tour joined!',
        })
    } else {
        res.send({
            message: 'Already participated!',
            userJoinedTours: [],
        })
    }
}

const getUserJoinedTours = async (req, res) => {
    const { userId } = req.params
    const userJoinedTours = await pool.query(`SELECT hikingTourParticipants.*, hikingTours.hostId AS hostId from hikingTourParticipants, hikingTours WHERE hikingTourParticipants.participantId = ${userId} AND hikingTourParticipants.hikingtourId = hikingTours.id AND hostId != ${userId}`)

    const userJoinedToursId = userJoinedTours.rows.map((tour) => {
        return tour.hikingtourid
    })

    const userJoinedToursDetails = await Promise.all(userJoinedToursId.map(async (hikingTourId) => {
        const tourDetails = await pool.query(`SELECT hikingTours.*, hikingRoutes.hikingRouteImage, hikingRoutes.name AS hikingRouteName, users.username AS hostName from hikingTours, hikingRoutes, users WHERE hikingTours.id = ${hikingTourId} AND hikingTours.hikingRouteId = hikingRoutes.id AND hikingTours.hostId = users.id`)
        return tourDetails.rows[0]
    }))

    res.send({
        message: 'Message from getuserJoinedTours',
        userJoinedTours: userJoinedToursDetails,
    })
}

const getUserHostedTours = async (req, res) => {
    const { userId } = req.params
    const userHostedToursResult = await pool.query(`SELECT hikingTours.*, hikingRoutes.hikingRouteImage, hikingRoutes.name AS hikingRouteName, users.username AS hostName from hikingTours, hikingRoutes, users WHERE hostId = ${userId} AND hikingTours.hikingRouteId = hikingRoutes.id AND hikingTours.hostId = users.id`)

    const userHostedTours = userHostedToursResult.rows

    res.send({
        message: 'Message from getUserHostedTours',
        userHostedTours: userHostedTours,
    })
}

const createTour = async (req, res) => {
    const {
        hostId,
        tourName,
        hikingRouteId,
        maximumParticipants,
        minimumParticipants,
        price,
        dateAndTime,
        tourDescription,
    } = req.body

    // some characters will be encoded e.g. #, +, $, @ and space etc.
    const newDateAndTime = dateAndTime.replace(" ", "+");

    await pool.query(`INSERT INTO hikingTours (hikingRouteId, hostId, tourName, tourDescription, maximumParticipant, minimumParticipant, dateAndTime, restaurantIncluded, price) VALUES (${hikingRouteId}, ${hostId}, '${tourName}', '${tourDescription}', ${maximumParticipants}, ${minimumParticipants}, '${newDateAndTime}', FALSE, ${price}) RETURNING id;`, 
    async (err, result) => {
        if (err) {
            console.log('database err: ', err)
            return
        }
        let hikingTourId = result.rows[0].id
        await pool.query(`INSERT INTO hikingTourParticipants (participantId, hikingTourId) VALUES (${hostId}, ${hikingTourId})`)
    })

    res.send({
        message: "Tour created!",
    })
}

const editTour = async (req, res) => {
    const { tourId } = req.params
    const {
        tourName,
        hikingRouteId,
        maximumParticipants,
        minimumParticipants,
        price,
        dateAndTime,
        tourDescription,
    } = req.body

    const newDateAndTime = dateAndTime.replace(" ", "+");
    await pool.query(`UPDATE hikingTours SET tourName = '${tourName}', tourDescription = '${tourDescription}', hikingRouteId = ${hikingRouteId},maximumParticipant = ${maximumParticipants}, minimumParticipant = ${minimumParticipants}, price = ${price}, dateAndTime = '${newDateAndTime}' WHERE hikingTours.id = ${tourId};`, 
    (err, result) => {
        if(err) {
            console.log('edit tour database err: ', err)
        } else {
            console.log('edit tour database result: ', result)
        }
    })

    res.send({
        message: 'Tour edited!',
    })
}

const getTourParticipants = async (req, res) => {
    const { tourId } = req.params

    const tourParticipants = await pool.query(`SELECT username FROM users, hikingTourParticipants WHERE hikingTourParticipants.hikingtourID = ${tourId} AND hikingTourParticipants.participantID = users.id;`)

    res.send({
        participants: tourParticipants.rows
    })
} 

module.exports = {
    hikingToursList,
    joinHikingTour,
    getUserJoinedTours,
    getUserHostedTours,
    createTour,
    editTour,
    getTourParticipants,
}