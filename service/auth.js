const jwt = require('jsonwebtoken');
// const dotenv = require('dotenv');
// require('dotenv').config({ path: '../config.env' });

const UserModel = require('../models/usersModel');
const appError = require('./appError');
const handleErrorAsync = require('./handleErrorAsync');

//middleware 確認token是否正確或沒過期
const isAuth = handleErrorAsync(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log('Received token:', token);

  if (!token) {
    return next(appError(401, 'Login first,please ', next));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    console.log('Decoded token:', decoded); // This should show the decoded JWT payload

    const currentUser = await UserModel.findById(decoded.userId);
    if (!currentUser) {
      return next(appError(401, 'User not found!'));
    }
    req.user = currentUser; // Assign the user object to req.user
    console.log('currentUser:', currentUser); // This should show the userId set in the request object
    req.userId = currentUser._id; // Also set the userId in the request object
    console.log('userId in isAuth:', req.userId); // Log the userId received from the isAuth middleware
    next(); // Proceed to the next middleware
  } catch (error) {
    return next(appError(401, 'Authentication failed!'));
  }
});

const generateToken = (user, statusCode, res) => {
  console.log('userId:', user._id);
  const JWTsecret = process.env.JWT_SECRET_KEY || 'defaultSecretForTesting'; // Ensure this matches your .env file

  if (!JWTsecret) {
    console.error('JWT secret key is undefined!');
  }
  const token = jwt.sign({ userId: user._id }, JWTsecret, {
    expiresIn: process.env.JWT_EXPIRED_DAY,
  });
  //to prevent accidentally leaking password information to the client
  user.password = undefined;
  return res.status(200).json({
    token,
    loggedInUsername: user.username, // 返回用戶名
    userId: user._id,
  });
};
module.exports = { isAuth, generateToken };
