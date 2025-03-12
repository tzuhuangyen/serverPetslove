const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const dotenv = require('dotenv');
require('dotenv').config();
const frontendUrl = process.env.FRONTEND_URL;
// console.log('JWT_SECRET_KEY:', process.env.JWT_SECRET_KEY);
// console.log('JWT Expiry:', process.env.JWT_EXPIRED_DAY);

//處理全域catch
const handleErrorAsync = require('../service/handleErrorAsync');
const UserModel = require('../models/usersModel');
const appError = require('../service/appError');
const { generateToken } = require('../service/auth');

// Post /signup 註冊功能
router.post(
  '/signup' /* 	#swagger.tags = ['User-SignUp & Login/out']
#swagger.description = 'validate' */,
  handleErrorAsync(async (req, res, next) => {
    // 處理註冊的邏輯 擷取用戶輸入的資料
    const { username, password, confirmPassword } = req.body;
    // 检查是否已存在相同用户名的用户
    const userExists = await UserModel.findOne({ username });
    if (userExists) {
      return next(appError(400, 'Username already exists', next));
    }
    if (password !== confirmPassword) {
      return next(appError(400, 'password not match', next));
    }
    // 將用戶輸入的密碼加密
    const hashedPassword = await bcrypt.hash(password, 10);
    //.create &save new user
    const newUser = await UserModel.create({
      username,
      password: hashedPassword,
    });
    const token = generateToken(newUser, 200, res);
    // 返回成功響應和用戶信息
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
      },
    });
  })
);

// /api/users登入功能
router.post(
  '/login' /* 	#swagger.tags = ['User-SignUp & Login/out']
#swagger.description = 'validate' */,
  handleErrorAsync(async (req, res, next) => {
    // 從 POST 請求的 body 中取得使用者提供的資訊
    const { username, password } = req.body;
    // 在 users 陣列中查找是否存在符合提供的使用者名稱和密碼的帳戶
    const user = await UserModel.findOne({ username }).select('+password');
    // 用户不存在或密码不正确
    if (!user) {
      return next(appError(400, 'Username not found', next));
    }
    // 检查用户提供的密码与数据库中的哈希密码是否匹配
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Invalid login attempt for user:', username); // Log incorrect password attempt
      return next(appError(401, 'Invalid password', next));
    }
    // 取得login後的new token
    const token = generateToken(user, 200, res); // 生成 JWT 令牌
    console.log('Generated login token:', token); // 输出生成的 token
    // 登录成功，生成 JWT 令牌并返回给客户端
    console.log('User logged:', user.username); // 登录成功
  })
);

//forgot password
router.post(
  '/forgotPsw' /* 	#swagger.tags = ['User-SignUp & Login/out']
#swagger.description = 'validate' */,
  handleErrorAsync(async (req, res, next) => {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .send({ message: 'User not found with this email' });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    // Set token expiration time (e.g., 1 hour)
    const resetTokenExpiration = Date.now() + 3600000;

    // Save the token and expiration to the user object in the database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiration;
    await user.save();

    // Create reset link (to be sent via email)
    const resetLink = `${frontendUrl}/users/resetPsw/${resetToken}`;

    // Send email to the user with the reset link
    const mailOptions = {
      to: user.email,
      from: 'yan0912@ghotmail.com',
      subject: 'Password of Pets Lover Reset Request',
      text:
        `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
        `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
        `${resetLink}\n\n` +
        `If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };
    await transporter.sendEmail(mailOptions);
    res.send({ message: 'Password reset link sent to your email' });
  })
);

//Delete user by id
//only admin can delete other user account by request

module.exports = router;
