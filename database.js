const { Pool } = require('pg');

var pool;

const getDBPool = () => {
    if(pool) return pool
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    })
    return pool
};

module.exports = {
    getDBPool,
}