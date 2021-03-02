const hikingToursList = async (req, res) => {
    // const hikingToursResult = await pool.query(`SELECT *, hikingRouteImage, name AS hikingroutename FROM hikingTours, hikingRoutes WHERE hikingTours.id = hikingRoutes.id;`)
    const hikingToursResult = await pool.query(`SELECT hikingTours.*, hikingRouteImage, name AS hikingroutename, username AS hostname FROM hikingTours, hikingRoutes, users WHERE hikingTours.id = hikingRoutes.id AND hikingTours.hostId = users.id;`)
    const hikingTours = hikingToursResult.rows

    res.send({
        message: 'hiking tour list',
        hikingTours: hikingTours,
    }) 
}

const joinHikingTour = async (req, res) => {
    const { userId } = req.body
    const { id } = req.params

    const targetHikingTour = await pool.query(`SELECT * from hikingTourParticipants WHERE hikingTourId = ${id}`)
    const maximumParticipant = await pool.query(`SELECT maximumParticipant FROM hikingTours WHERE id = ${id}`)
    const targetHikingTourIsFull = targetHikingTour.rows.length >= maximumParticipant.rows[0].maximumParticipant ? true : false

    if (targetHikingTourIsFull) {
        res.send({
            message: 'This tour is full!',
        })
    }

    const checkParticipateRecord = await pool.query(`SELECT * FROM hikingTourParticipants WHERE participantId = ${userId} AND hikingTourId = ${id}`)
    const userAlreadyParticipated = checkParticipateRecord.rows.length > 0 ? true : false

    if (!userAlreadyParticipated) {
        const insertHikingTourParticipant = await pool.query(`INSERT INTO hikingTourParticipants (participantId, hikingTourId) VALUES (${userId}, ${id});`, (err, res) => {
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
    const userJoinedTours = await pool.query(`SELECT * from hikingTourParticipants WHERE participantId = ${userId}`)
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

module.exports = {
    hikingToursList,
    joinHikingTour,
    getUserJoinedTours,
    getUserHostedTours,
}