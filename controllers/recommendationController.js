var hikingRouteController = require('./hikingRoutesController')

// features for content based filtering
const hikingRouteFeatures = ['location', 'difficulty', 'distance', 'elevationgain', 'stars', 'dogfriendly', 'kidfriendly', 'camping', 'river', 'wildflower', 'wildlife', 'estimatedduration']

const recommendationRoutes = async (req, res) => {
    const { id: userId } = req.decoded
    const contentBasedRecommendedRoutes = await getContentBasedRecommendation(userId)
    const collaborativeFilteringRecommendedRoutes = await getCollaborativeFilteringRecommendedRoutes(userId)
    var hybridRecommendationHikingRoutes = []

    // user has like and rate the route
    if(contentBasedRecommendedRoutes.length > 0 && collaborativeFilteringRecommendedRoutes.length > 0) {
        var top5ContentBasedRecommendedRoutes = []
        var top5CollaborativeFilteringRecommendedRoutes = []
        for(let i=0; i<5; i++) {
            const contentBasedRoute = contentBasedRecommendedRoutes[i]
            contentBasedRoute.recommendedbycontentbased = true
            top5ContentBasedRecommendedRoutes.push(contentBasedRoute)
        }
        for(let j=0; j<5; j++) {
            const collaborativeFilteringRecommendedRoute = collaborativeFilteringRecommendedRoutes[j]
            collaborativeFilteringRecommendedRoute.recommendedbycollaborativefiltering = true
            top5CollaborativeFilteringRecommendedRoutes.push(collaborativeFilteringRecommendedRoute)
        }
        hybridRecommendationHikingRoutes = [...top5ContentBasedRecommendedRoutes]
        for(let k=0; k<top5CollaborativeFilteringRecommendedRoutes.length; k++) {
            var duplicated = false
            const currentCFRoute = top5CollaborativeFilteringRecommendedRoutes[k]
            for(let l=0; l<5; l++) {
                const currentCBRoute = hybridRecommendationHikingRoutes[l]
                if(currentCFRoute.id == currentCBRoute.id) {
                    duplicated = true
                    hybridRecommendationHikingRoutes[l].recommendedbycollaborativefiltering = true
                    break
                }
            }
            if(duplicated == false) {
                hybridRecommendationHikingRoutes.push(currentCFRoute)
            }
        }
    }

    // user has not like any route, but has rate the route
    if(contentBasedRecommendedRoutes.length == 0 && collaborativeFilteringRecommendedRoutes.length > 0) {
        for(let i=0; i<10; i++) {
            if(collaborativeFilteringRecommendedRoutes[i]) {
                collaborativeFilteringRecommendedRoutes[i].recommendedbycollaborativefiltering = true
                hybridRecommendationHikingRoutes.push(collaborativeFilteringRecommendedRoutes[i])
            }
        }
    }

    // user has not rate any route, but has like the route
    if(contentBasedRecommendedRoutes.length > 0 && collaborativeFilteringRecommendedRoutes.length == 0) {
        for(let i=0; i<10; i++) {
            if(contentBasedRecommendedRoutes[i]) {
                contentBasedRecommendedRoutes[i].recommendedbycontentbased = true
                hybridRecommendationHikingRoutes.push(contentBasedRecommendedRoutes[i])
            }
        }
    }

    // user has not like and rate any route
    if(contentBasedRecommendedRoutes.length == 0 && collaborativeFilteringRecommendedRoutes.length == 0) {
        const topRatingRoutes = await getTopRatingHikingRoutes(10)
        for(let i=0; i<topRatingRoutes.length; i++) {
            topRatingRoutes[i].recommendedforcoldstart = true
            hybridRecommendationHikingRoutes.push(topRatingRoutes[i])
        }
    }

    console.log('recommendation result:')
    for(let z=0; z<hybridRecommendationHikingRoutes.length; z++) {
        const { id, name } = hybridRecommendationHikingRoutes[z]
        const result = { routeId: id, routeName: name }
        console.log(result)
    }

    res.send({
        message: 'recommendation API called!',
        recommendedRoutes: hybridRecommendationHikingRoutes,
    })
}

const getContentBasedRecommendation = async(userId) => {
    var jaccardSimilarityResult = []
    const userLikedRoutes = await hikingRouteController.getUserLikedRoutes(userId)
    const allHikingRoutes = await getAllHikingRoutes()
    const userLikedRoutesId = userLikedRoutes.map((likedRoute) => {
        return likedRoute.id
    })

    for(let i=0; i<userLikedRoutes.length; i++) {
        const firstHikingRoute = userLikedRoutes[i]
        for(let j=0; j<allHikingRoutes.length; j++) {
            const secondHikingRoute = allHikingRoutes[j]
            if(firstHikingRoute.id == secondHikingRoute.id) {
                continue
            }
            const sim = getJaccardSimilarityScore(firstHikingRoute, secondHikingRoute, hikingRouteFeatures)
            secondHikingRoute.jaccardSimilarityScore = sim
            jaccardSimilarityResult.push(secondHikingRoute)
        }
    }

    // filter user liked routes
    const sortedJaccardSimResult = jaccardSimilarityResult.filter(({ id }) => {
        return !userLikedRoutesId.includes(id)
    })

    sortedJaccardSimResult.sort((first, second) => {
        if(first.jaccardSimilarityScore > second.jaccardSimilarityScore) {
            return -1
        }

        if(first.jaccardSimilarityScore < second.jaccardSimilarityScore) {
            return 1
        }

        return 0
    })

    const contentBasedRecommendedHikingRoutes = removeDuplicateItem(sortedJaccardSimResult)
    console.log('Content based filtering:')
    for(let i=0; i<contentBasedRecommendedHikingRoutes.length; i++){
        contentBasedRecommendedHikingRoutes[i].userliked = false
        console.log('route id: ', contentBasedRecommendedHikingRoutes[i].id + ', name: ' + contentBasedRecommendedHikingRoutes[i].name + ', sim score: ' + contentBasedRecommendedHikingRoutes[i].jaccardSimilarityScore)
    }
    return contentBasedRecommendedHikingRoutes
}

const getAllHikingRoutes = async () => {
    const hikingRoutesResult = await pool.query(`SELECT * FROM hikingRoutes WHERE deletedAt IS NULL ORDER BY name;`)
    const hikingRoutes = hikingRoutesResult.rows

    return hikingRoutes
}

const getJaccardSimilarityScore = (firstHikingRoute, secondHikingRoute, compareFeatures) => {
    var numerator = 0;
    var denominator = 0;

    for(let i=0; i<compareFeatures.length; i++){
        const currentFeature = compareFeatures[i]
        if(currentFeature == 'distance'){
            const diff = Math.abs(firstHikingRoute[currentFeature] - secondHikingRoute[currentFeature])
            if(diff <= 1) {
                numerator++
                denominator++
            } else {
                denominator +=2
            }
            continue
        }

        if(currentFeature == 'elevationgain'){
            const diff = Math.abs(firstHikingRoute[currentFeature] - secondHikingRoute[currentFeature])
            if(diff <= 50) {
                numerator++
                denominator++
            } else {
                denominator +=2
            }
            continue
        }
        
        if(currentFeature == 'estimatedduration'){
            const diff = Math.abs(firstHikingRoute[currentFeature] - secondHikingRoute[currentFeature])
            if(diff <= 30) {
                numerator++
                denominator++
            } else {
                denominator +=2
            }
            continue
        }

        if(firstHikingRoute[currentFeature] == secondHikingRoute[currentFeature]){
            numerator++
            denominator++
        } else {
            denominator += 2
        }
    }

    return numerator / denominator
}

const getAllHikingRoutesId = async() => {
    const allHikingRoutesIdResult = await pool.query(`SELECT id FROM hikingRoutes WHERE deletedAt IS NULL ORDER BY id ASC;`)
    const allHikingRoutesId = allHikingRoutesIdResult.rows.map((v) => {
        return v.id;
    })
    return allHikingRoutesId
}

const getAllUsersRatingRecords = async() => {
    const allUsersRatingRecordsResult = await pool.query(`SELECT raterId, hikingRouteId, rating FROM hikingRouteUserRating WHERE deletedAt IS NULL;`)
    return allUsersRatingRecordsResult.rows
}

const getAllRatedUsersId = async() => {
    const allRatedUsersIdResult = await pool.query(`SELECT DISTINCT raterId FROM hikingRouteUserRating ORDER BY raterId ASC;`)
    const allRatedUsersId = allRatedUsersIdResult.rows.map((v) => {
        return v.raterid;
    })
    return allRatedUsersId
}

const getUtilityMatrix = async (userId) => {
    const allHikingRoutesId = await getAllHikingRoutesId()
    const allRatedUsersId = await getAllRatedUsersId()
    const allUsersRating = await getAllUsersRatingRecords()
    const hikingRoutesAmount = allHikingRoutesId.length
    const ratedUsersAmount = allRatedUsersId.length
    const utilityMatrix = initializeMatrix(ratedUsersAmount, hikingRoutesAmount, 0)
    // const userIndexForUtilityMatrix = allRatedUsersId.indexOf(userId)
    // console.log('user id: ', userId)
    // console.log('user index: ', userIndexForUtilityMatrix)

    for(let i=0; i<allUsersRating.length; i++) {
        const userRating = allUsersRating[i]
        const userIndex = allRatedUsersId.indexOf(userRating.raterid)
        const hikingRouteIndex = allHikingRoutesId.indexOf(userRating.hikingrouteid)
        utilityMatrix[userIndex][hikingRouteIndex] = userRating.rating
    }

    return utilityMatrix
}

const getSimilarityMatrix = async (userId) => {
    const allHikingRoutesId = await getAllHikingRoutesId()
    const allRatedUsersId = await getAllRatedUsersId()
    const hikingRoutesAmount = allHikingRoutesId.length
    const similarityMatrix = initializeMatrix(hikingRoutesAmount, hikingRoutesAmount, 0)
    const similarityMatrixForDisplay = initializeMatrix(hikingRoutesAmount, hikingRoutesAmount, 0)
    const utilityMatrix = await getUtilityMatrix(userId)

    // calculate the similarity value here
    for(let i=0; i<similarityMatrix.length; i++) {
        for(let j=0; j<similarityMatrix[i].length; j++) {
            if(i == j) {
                similarityMatrix[i][j] = 1
                similarityMatrixForDisplay[i][j] = 1
                continue
            }
            var numerator = 0;
            var denominator = 0;
            var term1 = 0;
            var term2 = 0;
            for(let k=0; k<allRatedUsersId.length; k++) {
                numerator += utilityMatrix[k][i] * utilityMatrix[k][j]
                term1 += utilityMatrix[k][i] * utilityMatrix[k][i]
                term2 += utilityMatrix[k][j] * utilityMatrix[k][j]
            }
            denominator = Math.sqrt(term1) * Math.sqrt(term2)
            if(numerator == 0 || denominator == 0) {
                continue
            }
            const similarity = numerator / denominator
            similarityMatrix[i][j] = similarity
            // similarityMatrix[i][j] = Math.round(similarity * 100) / 100
            similarityMatrixForDisplay[i][j] = Math.round(similarity * 100) / 100
        }
    }

    console.log('utility matrix:')
    console.table(utilityMatrix)
    console.log('similarity matrix:')
    // console.table(similarityMatrix)
    console.table(similarityMatrixForDisplay)

    return similarityMatrix
}

const getCollaborativeFilteringRecommendedRoutes = async(userId) => {
    const allHikingRoutesId = await getAllHikingRoutesId()
    const utilityMatrix = await getUtilityMatrix(userId)
    const similarityMatrix = await getSimilarityMatrix(userId)
    const allRatedUsersId = await getAllRatedUsersId()
    const userIndex = allRatedUsersId.indexOf(userId)
    const userRatingRecord = utilityMatrix[userIndex] || []
    const predictedArray = [...userRatingRecord] // clone an array in es6
    
    for(let i=0; i<userRatingRecord.length; i++) {
        if(userRatingRecord[i] !== 0) {
            continue
        }
        var numerator = 0;
        var denominator = 0;
        for(let j=0; j<userRatingRecord.length; j++) {
            if(j==i || userRatingRecord[j] == 0) {
                continue
            }
            numerator += userRatingRecord[j] * similarityMatrix[j][i]
            denominator += similarityMatrix[j][i]
        }
        const estimatedRating = numerator / denominator
        if(estimatedRating > 0) {
            predictedArray[i] = estimatedRating
        }
    }
    // console.log('hiking routes id: ', JSON.stringify(allHikingRoutesId))
    // console.log('user rating record: ', JSON.stringify(userRatingRecord))
    // console.log('predicted array: ', JSON.stringify(predictedArray))
    const collaborativeFilteringRecommendedRoutes = []
    for(let k=0; k<userRatingRecord.length; k++) {
        if(userRatingRecord[k] > 0) {
            continue
        }
        const recommendedRouteObject = {
            routeId: allHikingRoutesId[k],
            estimatedRating: predictedArray[k],
        }
        collaborativeFilteringRecommendedRoutes.push(recommendedRouteObject)
    }
    // console.log('collaborative before sort: ', collaborativeFilteringRecommendedRoutes)
    collaborativeFilteringRecommendedRoutes.sort((firstObj, secondObj) => {
        const { estimatedRating: firstEstimatedRating } = firstObj
        const { estimatedRating: secondEstimatedRating} = secondObj
        if(firstEstimatedRating > secondEstimatedRating) {
            return -1
        }
        if(firstEstimatedRating < secondEstimatedRating) {
            return 1
        }
        return 0
    })
    // console.log('collaborative after sort: ', collaborativeFilteringRecommendedRoutes)
    const collaborativeFilteringRecommendedRoutesId = collaborativeFilteringRecommendedRoutes.map((recommendedRouteObject) => {
        return recommendedRouteObject.routeId
    })
    const allHikingRoutes = await getAllHikingRoutes()
    const collaborativeFilteringRecommendedRoutesDetail = []
    for(let l=0; l<collaborativeFilteringRecommendedRoutesId.length; l++) {
        for(let m=0; m<allHikingRoutes.length; m++) {
            if(allHikingRoutes[m].id == collaborativeFilteringRecommendedRoutesId[l]) {
                allHikingRoutes[m].userliked = false
                collaborativeFilteringRecommendedRoutesDetail.push(allHikingRoutes[m])
            }
        }   
    }
    return collaborativeFilteringRecommendedRoutesDetail
}

const getTopRatingHikingRoutes = async(routesAmount) => {
    const topRatingHikingRoutesResult = await pool.query(`SELECT * FROM hikingRoutes WHERE id IN (SELECT hikingRouteId FROM hikingRouteUserRating GROUP BY hikingRouteId ORDER BY AVG(rating) DESC LIMIT ${routesAmount});`)
    const topRatingHikingRoutes = topRatingHikingRoutesResult.rows
    const recommendedRoutes = []
    for(let i=0; i<routesAmount; i++) {
        topRatingHikingRoutes[i].userliked = false
        recommendedRoutes.push(topRatingHikingRoutes[i])
    }
    // console.log('top rating routes: ', recommendedRoutes)
    return recommendedRoutes
}

const initializeMatrix = (row, col, defaultValue) => {
    const matrix = []
    for(let i=0; i<row; i++) {
        const rowArr = []
        for(let j=0; j<col; j++) {
            rowArr.push(defaultValue)
        }
        matrix.push(rowArr)
    }

    return matrix
}

const printMatrix = (matrixArray) => {
    for(let i=0; i<matrixArray.length; i++) {
        console.log(JSON.stringify(matrixArray[i]))
    }
}

const removeDuplicateItem = (arr) => {
    const filteredArr = arr.filter((item, index) => {
        return arr.indexOf(item) === index
    })
    return filteredArr
}

module.exports = {
    recommendationRoutes,
}