const hikingRouteList = async (req, res) => {
    const { id: userId } = req.decoded
    const hikingRoutesResult = await pool.query(`SELECT * FROM hikingRoutes WHERE deletedAt IS NULL ORDER BY name;`)
    const hikingRoutes = hikingRoutesResult.rows
    const ratedHikingRoutesResult = await pool.query(`SELECT * FROM hikingRouteUserRating WHERE raterId = ${userId};`)
    const ratedHikingRoutes = ratedHikingRoutesResult.rows
    const userLikedRoutesResult = await pool.query(`SELECT * FROM hikingRouteUserLike WHERE likerId = ${userId} AND deletedAt IS NULL;`)
    const userLikedRoutes = userLikedRoutesResult.rows

    for(let i=0; i<hikingRoutes.length; i++){
        const hikingRoute = hikingRoutes[i]
        for(let j=0; j<ratedHikingRoutes.length; j++){
            const ratedHikingRoute = ratedHikingRoutes[j]
            if(ratedHikingRoute.hikingrouteid == hikingRoute.id) {
                hikingRoutes[i].userrating = ratedHikingRoute.rating
            }
        }
        for(let k=0; k<userLikedRoutes.length; k++) {
            const userLikedRoute = userLikedRoutes[k]
            if(userLikedRoute.hikingrouteid == hikingRoute.id) {
                hikingRoutes[i].userliked = true
            }
        }
        if(userLikedRoutes.length == 0 || hikingRoutes[i].hasOwnProperty('userliked') == false) {
            hikingRoutes[i].userliked = false 
        }
    }

    res.send({
        message: 'hiking route list',
        hikingRoutes: hikingRoutes,
    }) 
}

const getHikingRoute = async (req, res) => {
    const { id: hikingRouteId } = req.params
    const { id: userId } = req.decoded

    const hikingRouteResult = await pool.query(`SELECT * FROM hikingRoutes WHERE id = ${hikingRouteId}`)
    const routeResult = hikingRouteResult.rows[0]
    const userRatedRoute = await pool.query(`SELECT * FROM hikingRouteUserRating WHERE raterId = ${userId} AND hikingRouteId = ${hikingRouteId}`)
    userRateResult = userRatedRoute.rows[0]
    const userLikedRoutesResult = await pool.query(`SELECT * FROM hikingRouteUserLike WHERE likerId = ${userId} AND hikingRouteId = ${hikingRouteId} AND deletedAt IS NULL`)
    const userLikedRoute = userLikedRoutesResult.rows[0]

    if(userRateResult) {
        const rating = userRateResult.rating
        routeResult.userrating = rating
    }

    if(userLikedRoute) {
        routeResult.userliked = true
    } else {
        routeResult.userliked = false
    }

    res.send({
        message: 'respond from getHikingRoute',
        hikingRoute: routeResult,
    })
}

const likedHikingRouteList = async (req, res) => {
    const { id: userId } = req.decoded
    const userLikedRoutesDetails = await getUserLikedRoutes(userId)

    res.send({
        message: 'GET likedHikingRoutesList called',
        likedHikingRoutes: userLikedRoutesDetails,
    })
}

const rateForHikingRoute = async (req, res) => {
    const { routeId } = req.params
    const { userId: raterId, rating } = req.body
    const alreadyRated = await pool.query(`SELECT * FROM hikingRouteUserRating WHERE raterId = ${raterId} AND hikingRouteId = ${routeId}`)
    const isRated = alreadyRated.rows.length > 0 ? true : false

    if (isRated) {
        await pool.query(`UPDATE hikingRouteUserRating SET rating = ${rating} WHERE raterId = ${raterId} AND hikingRouteId = ${routeId}`)
    } else {
        await pool.query(`INSERT INTO hikingRouteUserRating (raterId, hikingRouteId, rating) VALUES (${raterId}, ${routeId}, ${rating});`, (err, res) => {
            if(err) {
                console.log('err from rateForHikingRoute: ', err)
            }
        })
    }

    res.send({
        message: 'Rated for route!'
    })
}

const likeHikingRoute = async (req, res) => {
    const { routeId } = req.params
    const { id: userId } = req.decoded
    const userLikedRoute = await pool.query(`SELECT * FROM hikingRouteUserLike WHERE likerId = ${userId} AND hikingRouteId = ${routeId}`)
    const isLiked = userLikedRoute.rows.length > 0 ? true : false

    if(isLiked) { // record found
        const userLikedRouteReuslt = userLikedRoute.rows[0]
        const { deletedat: deletedAt } = userLikedRouteReuslt

        switch (deletedAt) {
            case null: // like -> not like
                await pool.query(`UPDATE hikingRouteUserLike SET deletedAt = NOW() WHERE likerId = ${userId} AND hikingRouteId = ${routeId};`)
                break;

            default: // not like -> like
                await pool.query(`UPDATE hikingRouteUserLike SET deletedAt = NULL WHERE likerId = ${userId} AND hikingRouteId = ${routeId};`)
        }
    } else { // no record
        await pool.query(`INSERT INTO hikingRouteUserLike (likerId, hikingRouteId) VALUES (${userId}, ${routeId});`)
    }

    res.send({
        message: 'Api called',
    })
}


const getUserLikedRoutes = async (userId) => {
    const likedHikingRoutes = await pool.query(`SELECT * FROM hikingRouteUserLike WHERE likerId = ${userId} AND deletedAt IS NULL;`)
    const likedHikingRoutesResult = likedHikingRoutes.rows

    const likedHikingRoutesId = likedHikingRoutesResult.map((result) => {
        return result.hikingrouteid
    })

    const userLikedRoutesDetails = await Promise.all(likedHikingRoutesId.map(async (likedRouteId) => {
        const likedRouteDetails = await pool.query(`SELECT * FROM hikingRoutes WHERE id = ${likedRouteId};`)
        const likedRouteDetailsResult = likedRouteDetails.rows[0]
        const userRatedRoutes = await pool.query(`SELECT hikingRouteId, rating FROM hikingRouteUserRating WHERE raterId = ${userId};`)
        const userRatedRoutesResult = userRatedRoutes.rows

        // set userLiked to false first
        likedRouteDetailsResult.userliked = false

        for(let i=0; i<userRatedRoutesResult.length; i++) {
            if(userRatedRoutesResult[i].hikingrouteid == likedRouteDetailsResult.id) {
                likedRouteDetailsResult.userrating = userRatedRoutesResult[i].rating
            }
        }
        for(let i=0; i<likedHikingRoutesResult.length; i++) {
            if(likedHikingRoutesResult[i].hikingrouteid == likedRouteDetailsResult.id){
                likedRouteDetailsResult.userliked = true
            }
        }

        return likedRouteDetailsResult
    }))

    // sort the result in alphabetical order
    userLikedRoutesDetails.sort((routeA, routeB) => {
        const { name: aName } = routeA
        const { name: bName } = routeB

        if(aName > bName) {
            return 1
        }        
        if(bName > aName) {
            return -1
        }

        return 0
    })

    return userLikedRoutesDetails
}

module.exports = {
    hikingRouteList,
    getHikingRoute,
    likedHikingRouteList,
    rateForHikingRoute,
    likeHikingRoute,
    getUserLikedRoutes,
}