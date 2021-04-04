var hikingRouteController = require('./hikingRoutesController')

const hikingRouteFeatures = ['location', 'difficulty', 'distance', 'elevationgain', 'stars', 'dogfriendly', 'kidfriendly', 'camping', 'river', 'wildflower', 'wildlife', 'estimatedduration']

const recommendationRoutes = async (req, res) => {
    const { id: userId } = req.decoded
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

    // filter the liked routes
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

    const contentBased_recommendedHikingRoutes = removeDuplicateItem(sortedJaccardSimResult)
    for(let i=0; i<contentBased_recommendedHikingRoutes.length; i++){
        contentBased_recommendedHikingRoutes[i].userliked = false
        // console.log('b: ', contentBased_recommendedHikingRoutes[i].id + ' sim score: ' + contentBased_recommendedHikingRoutes[i].jaccardSimilarityScore)
    }
    
    const top5RecommendedRoutes = contentBased_recommendedHikingRoutes.slice(0, 5)

    // getUtilityMatrix()
    getSimilarityMatrix()

    res.send({
        message: 'recommendation API called!',
        top5recommendedRoutes: top5RecommendedRoutes,
    })
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
    const allUsersRatingRecordsResult = await pool.query(`SELECT raterId, hikingRouteId, rating FROM hikingRouteUserRating;`)
    return allUsersRatingRecordsResult.rows
}

const getAllRateduserId = async() => {
    const allRatedUsersIdResult = await pool.query(`SELECT DISTINCT raterId FROM hikingRouteUserRating ORDER BY raterId ASC;`)    
    const allRatedUsersId = allRatedUsersIdResult.rows.map((v) => {
        return v.raterid;
    })

    return allRatedUsersId
}

const getUtilityMatrix = async () => {
    const allHikingRoutesId = await getAllHikingRoutesId()
    const allRatedUsersId = await getAllRateduserId()
    const allUsersRating = await getAllUsersRatingRecords()
    const hikingRoutesAmount = allHikingRoutesId.length
    const ratedUsersAmount = allRatedUsersId.length
    const utilityMatrix = initializeMatrix(ratedUsersAmount, hikingRoutesAmount, 0)

    for(let i=0; i<allUsersRating.length; i++) {
        const userRating = allUsersRating[i]
        const userIndex = allRatedUsersId.indexOf(userRating.raterid)
        const hikingRouteIndex = allHikingRoutesId.indexOf(userRating.hikingrouteid)
        utilityMatrix[userIndex][hikingRouteIndex] = userRating.rating
    }

    // console.log(JSON.stringify(allHikingRoutesId))
    // printMatrix(utilityMatrix)
    console.log('utility matrix:')
    console.table(utilityMatrix)
    // const routeLabels = allHikingRoutesId.map((v) => {
    //     return `r${v}`
    // })
    // console.table(allRatedUsersId, routeLabels)
    // console.table([
    //     { a: 1, b: 2 }, 
    //     { a: 3, b: 7, c: 'y' }],
    //     ['a', 'b', 'c']
    // );
    return utilityMatrix
}

const getSimilarityMatrix = async () => {
    const allHikingRoutesId = await getAllHikingRoutesId()
    const allRatedUsersId = await getAllRateduserId()
    const hikingRoutesAmount = allHikingRoutesId.length
    const similartyMatrix = initializeMatrix(hikingRoutesAmount, hikingRoutesAmount, -1)
    const utilityMatrix = await getUtilityMatrix()

    // calculate the similarity value here
    for(let i=0; i<similartyMatrix.length; i++) {
        for(let j=0; j<similartyMatrix[i].length; j++) {
            if(i == j) {
                similartyMatrix[i][j] = 1
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
            similartyMatrix[i][j] = similarity
            // similartyMatrix[i][j] = Math.round(similarity * 1000) / 1000
        }
    }
    // console.log('sim:')
    console.log('similarity matrix:')
    // printMatrix(similartyMatrix)
    console.table(similartyMatrix)

    return similartyMatrix
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