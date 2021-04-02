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

const removeDuplicateItem = (arr) => {
    const filteredArr = arr.filter((item, index) => {
        return arr.indexOf(item) === index
    })

    return filteredArr
}

module.exports = {
    recommendationRoutes,
}