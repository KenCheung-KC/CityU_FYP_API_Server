// const config = require('../config/environment');
const bcrypt = require('bcrypt');

const encryptPassword = str =>
  new Promise((resolve, reject) => {
    bcrypt.genSalt(10, (genErr, salt) => {
      console.log('salt: ', salt)
      if (genErr) return reject(genErr);
      return bcrypt.hash(str, salt, (err, hash) => {
        if (err) return reject(err);

        return resolve(hash);
      });
    });
  });

const comparePassword = (originalPassword, hashPassword) =>
  new Promise((resolve, reject) => {
    bcrypt.compare(originalPassword, hashPassword, (err, match) => {
      if (err) return reject(err);
      return resolve(match);
    });
  });

  
module.exports = {
  encryptPassword,
  comparePassword,
};
