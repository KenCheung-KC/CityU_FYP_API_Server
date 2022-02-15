const bcryptService = require('../service/bcryptService')
const jwt = require('jsonwebtoken')

const register = async (req, res) => {
    const { username, email, password } = req.body
    
    // check if any information is missed
    if(!username || !email || !password){
        res.send('Please enter all required information')
        return
    }

    // check if email is used
    const registeredEmail = await pool.query(`SELECT email FROM users WHERE email = '${email}';`)
    if(registeredEmail.rowCount > 0) {
        res.send('Email already used')
        return
    }

    // check if username is used
    const registeredUsername = await pool.query(`SELECT email FROM users WHERE username = '${username}';`)
    if(registeredUsername.rowCount > 0) {
        res.send('Username already used')
        return
    }

    // hash the password
    const encryptedPassword = await bcryptService.encryptPassword(password)

    // store user information into database
    await pool.query(`INSERT INTO users (role, username, email, password) VALUES ('user', '${username}', '${email}', '${encryptedPassword}');`)
    .then(res => console.log(res))
    .catch(err => {
        console.log('err:', err)
    })
    res.send('Account created!')
}

const login = async (req, res) => {
    const { username, password } = req.body
    var message = '';

    // check if username or password is missed
    if(!username || !password) {
        message = 'Please enter both username and password'
        res.send({
            message,
        })
        return
    }

    // Check username is existing or not
    const usernameResult = await pool.query(`SELECT username FROM users WHERE username = '${username}'`)
    if (usernameResult.rowCount == 0) {
        message = 'Invalid username!'
        res.send({
            message,
        })
        return
    }

    // if username and password are correct, assign a token to user for subsequent requests
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
            role: user.role,
            username: user.username,
            email: user.email
        }
        message = 'login success'
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET_KEY);
        const { password, ...userWithoutPassword } = user // object destructuring, take off the hashed password
        res.send({
            token, 
            message,
            user: userWithoutPassword,
        })
    }
}

module.exports = {
    register,
    login,
};