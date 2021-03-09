const bcryptService = require('../service/bcryptService')
const jwt = require('jsonwebtoken')

const index = (req, res) => {
    res.send('This is index controller!')
}

const register = async (req, res) => {
    const { username, email, password } = req.body
    
    if(!username || !email || !password){
        res.send('Please enter all required information')
        return
    }
    const registeredEmail = await pool.query(`SELECT email FROM users WHERE email = '${email}';`)
    if(registeredEmail.rowCount > 0) {
        res.send('Email already used')
        return
    }

    const registeredUsername = await pool.query(`SELECT email FROM users WHERE username = '${username}';`)
    if(registeredUsername.rowCount > 0) {
        res.send('Username already used')
        return
    }
    // const now = new Date().toISOString()

    const encryptedPassword = await bcryptService.encryptPassword(password)

    // await pool.query(`INSERT INTO users (role, username, email, password, createdAt) VALUES ('user', '${username}', '${email}', '${encryptedPassword}', '${now}');`)
    await pool.query(`INSERT INTO users (role, username, email, password) VALUES ('user', '${username}', '${email}', '${encryptedPassword}');`)
    .then(res => console.log(res))
    .catch(err => {
        console.log('err:', err)
    })
    res.send('User created!')
}

const login = async (req, res) => {
    const { username, password } = req.body
    var message = '';

    if(!username || !password) {
        message = 'Please enter both username and password'
        res.send({
            message,
        })
        return
    }

    // Check username is valid or not
    const usernameResult = await pool.query(`SELECT username FROM users WHERE username = '${username}'`)

    if (usernameResult.rowCount == 0) {
        message = 'Invalid username!'
        res.send({
            message,
        })
        return
    }

    const userEntity = await pool.query(`SELECT * FROM users WHERE username = '${username}'`)

    const user = userEntity.rows[0]

    const { password: hashedPassword } = user
    const correctPassowrd = await bcryptService.comparePassword(password, hashedPassword)

    if(!correctPassowrd) {
        console.log('Incorrect password!')
        message = 'Incorrect password'
        res.send({
            message,
        })
        return
    } else {
        const tokenPayload = {
            id: user.id,
            role: user.id,
            username: user.username,
            email: user.email
        }
        message = 'login success'
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY);
        // console.log('token: ', token)
        const {password, ...userWithoutPassword} = user
        // console.log('userWithoutPassword: ', userWithoutPassword)
        res.send({
            token, 
            message,
            user: userWithoutPassword,
        })
    }
}

module.exports = {
    index,
    register,
    login,
};