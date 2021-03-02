const hikingToursList = async (req, res) => {
    console.log('hiking tour controller get called')
    // const hikingToursResult = await pool.query(`SELECT *, hikingRouteImage, name AS hikingroutename FROM hikingTours, hikingRoutes WHERE hikingTours.id = hikingRoutes.id;`)
    const hikingToursResult = await pool.query(`SELECT hikingTours.*, hikingRouteImage, name AS hikingroutename, username AS hostname FROM hikingTours, hikingRoutes, users WHERE hikingTours.id = hikingRoutes.id AND hikingTours.hostId = users.id;`)
    console.log('tours result: ', hikingToursResult.rows)
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
    // console.log('checkParticipateRecord: ', checkParticipateRecord)

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
        console.log('already joined!')
        res.send({
            message: 'Already participated!',
            userJoinedTours: [],
        })
    }
}

const getUserJoinedTours = async (req, res) => {
    const { id } = req.params
    console.log('userid: ', id)
    console.log('getMyJoinedTours called!')

    const userJoinedTours = await pool.query(`SELECT * from hikingTourParticipants WHERE participantId = ${id}`)
    console.log('aaa: ', userJoinedTours)
    const userJoinedToursId = userJoinedTours.rows.map((tour) => {
        return tour.hikingtourid
    })
    console.log('bbb: ', userJoinedToursId)

    const userJoinedToursDetails = await Promise.all(userJoinedToursId.map(async (hikingTourId) => {
        const tourDetails = await pool.query(`SELECT hikingTours.*, hikingRoutes.hikingRouteImage, hikingRoutes.name AS hikingRouteName, users.username AS hostName from hikingTours, hikingRoutes, users WHERE hikingTours.id = ${hikingTourId} AND hikingTours.hikingRouteId = hikingRoutes.id AND hikingTours.hostId = users.id`)
        // console.log('details: ', tourDetails.rows[0])
        return tourDetails.rows[0]
    }))
    console.log('ccc: ', userJoinedToursDetails)

    res.send({
        message: 'hello',
        userJoinedTours: userJoinedToursDetails,
    })
}

module.exports = {
    hikingToursList,
    joinHikingTour,
    getUserJoinedTours,
}