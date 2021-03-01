const hikingRouteList = async (req, res) => {
    console.log('hiking route list get called!')

    const hikingRoutesResult = await pool.query(`SELECT * FROM hikingRoutes`)
    console.log(hikingRoutesResult.rows)
    const hikingRoutes = hikingRoutesResult.rows

    // setTimeout(() => {
    //     res.send({
    //         message: 'hiking route list',
    //         hikingRoutes: hikingRoutes,
    //     })     
    // }, 3000)
    res.send({
        message: 'hiking route list',
        hikingRoutes: hikingRoutes,
    }) 
}

const getHikingRoute = async (req, res) => {
    const { id } = req.params
    console.log("params id: ", id)

    const hikingRoutesResult = await pool.query(`SELECT * FROM hikingRoutes WHERE id = ${id}`)
    console.log('resultttt: ', hikingRoutesResult.rows)
    const routeResult = hikingRoutesResult.rows[0]

    res.send({
        message: 'respond from getHikingRoute',
        hikingRoute: routeResult,
    })
}

module.exports = {
    hikingRouteList,
    getHikingRoute,
}