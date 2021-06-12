const { Pool } = require('pg');

var pool;

const getDBPool = () => {
    if(pool) return pool

    pool = new Pool({
        // user: 'postgres',
        // password: '25549033',
        // host: 'kam',
        // port: 5432,
        // database: 'FYP',
        // user: process.env.DB_USER,
        // password: process.env.DB_PASSWORD,
        // port: process.env.DB_PORT,
        // database: process.env.DB_NAME
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    })
    return pool
};

module.exports = {
    getDBPool,
}