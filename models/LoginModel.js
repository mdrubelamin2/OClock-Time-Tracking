const dbConnect = require('../config/database');

const LoginModel = {
  getUserMail: async (userMail) => {
    try {
      const getUserByMailQuery = 'SELECT * FROM users WHERE user_mail = ?'

      const value = [userMail]
      const [row] = await dbConnect.promise().execute(getUserByMailQuery, value)
      return row;
    } catch (err) {
      console.log('error fomr LoginModel', err);
      return err;
    }
  },
};

module.exports = LoginModel;