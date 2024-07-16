const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
require('dotenv').config({ path: '../config.env' });
const UserModel = require('../models/usersModel');
const CartModel = require('../models/cartModel');
const ProductModel = require('../models/uploadImageModel');
const appError = require('../service/appError');
const handleErrorAsync = require('../service/handleErrorAsync');
const { isAuth, generateToken } = require('../service/auth');
const { mergeCart } = require('../controller/cartController');
//查詢用戶個人資料
router.get(
  '/myProfile' /* 	#swagger.tags = ['User-Member']
  #swagger.description = 'validate' */,
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    res.status(200).json({
      status: 'success',
      user: req.user,
    });
  })
);

//修改用戶個人資料密碼修改
router.patch(
  '/myProfile/updatePsw' /* 	#swagger.tags = ['User-Member']
#swagger.description = 'validate' */,
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    console.log('Received userId from isAuth:', req.userId); // Log the userId received from the isAuth middleware

    try {
      const userId = req.userId; // 从路径参数中获取用户ID
      console.log('PATCH /myProfile/updatePsw endpoint hit');
      console.log('this userId about to update:', userId);
      //get user password
      const { newPassword, confirmNewPassword } = req.body;
      if (newPassword !== confirmNewPassword) {
        console.log('Passwords do not match');
        return next(appError(400, 'Passwords do not match', next));
      }
      //compare current and new password are different
      const oldUserPsw = await UserModel.findById(userId).select('+password');
      // Check if the new password is the same as the current password
      const isSamePassword = await bcrypt.compare(
        newPassword,
        oldUserPsw.password
      );
      if (isSamePassword) {
        console.log('New password must be different from the current password');
        return next(
          appError(
            409,
            'New password must be different from the current password'
          )
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updateData = { password: hashedPassword };
      console.log('updateData:', updateData);

      const updateUser = await UserModel.findByIdAndUpdate(userId, updateData, {
        new: true,
      });
      if (!updateUser) {
        console.log('User not found after update');

        return next(appError(404, 'User not found after update', next));
      }
      generateToken(updateUser, 200, res); // Pass the user object, status code, and response object
      console.log('User updated:', updateUser);
    } catch (error) {
      console.error('Error handling PATCH request:', error); // 记录错误信息
      res.status(500).json({ message: error.message });
    }
  })
);

// 用戶登戶後获取用户cart数据
router.get(
  '/cart' /* 	#swagger.tags = ['User-Member:cart']
#swagger.description = 'validate' */,
  isAuth,
  async (req, res, next) => {
    try {
      const userIdFromIsAuth = req.userId; // 從 req.userId 中取得 userId
      const userIdFromReqUser = req.user._id; // 從 req.user._id 中取得 userId
      console.log('userId in router:', userIdFromReqUser); // 輸出路由中的 userId
      console.log(
        'userId in isAuth and router:',
        userIdFromIsAuth === userIdFromReqUser
      ); // 比較兩者是否相同
      const userId = req.user._id;
      // 根据用户ID查找用户信息
      const user = await UserModel.findById(userId);
      if (!user) {
        return next(appError(404, 'User not found', next));
      }
      // 根据用户ID查找购物车数据
      let cart = await CartModel.findOne({ userId: userId }).populate({
        path: 'user',
        select: 'username',
      });
      // .populate({
      //   path: 'items.productId',
      //   model: 'Product',
      // });
      res.status(200).json({ cart });
      if (!cart) {
        return next(appError(404, 'user Cart not found', next));
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.error(
          'Error fetching user cartItems:: User not logged in or token expired',
          error.response.data.err
        );
      } else {
        console.error('Error fetching user cartItems:', error.message);
        next(error); // 確保 next 被調用
      }
    }
  }
);
//用戶登戶後 merged cart
// router.patch(
//   'cart/${id}' /* 	#swagger.tags = ['User-Member:cart']
//   #swagger.description = 'post an cart' */,
//   isAuth,
//   mergeCart
// );

// 用戶登戶後 add to cart
router.post(
  '/cart' /* 	#swagger.tags = ['User-Member:cart']
#swagger.description = 'post an cart' */,
  isAuth,
  async (req, res, next) => {
    try {
      const userId = req.user._id;
      if (!userId) {
        return next(appError(400, 'User ID is missing', next));
      }
      const { item } = req.body;
      console.log('Received productId:', productId);

      // 查找產品信息
      const product = await ProductModel.findById(productId);
      if (!product) {
        return next(appError(404, 'Product not found', next));
      }
      // 查找或創建購物車
      let cart = await CartModel.findOne({ user: userId });
      if (!cart) {
        cart = new CartModel({ user: userId, items: [] });
      }
      // 查找現有的產品在購物車中的索引
      const existingItemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId
      );
      // 如果產品不在購物車中，添加新項
      if (existingItemIndex === -1) {
        cart.items.push({
          productId,
          quantity: quantity || 1,
          total: product.price,
        });
      } else {
        // 如果產品已在購物車中，更新數量
        cart.items[existingItemIndex].quantity += quantity || 1;
        cart.items[existingItemIndex].total += product.price * (quantity || 1);
      }
      // 保存購物車
      await cart.save();
      // 關聯查詢 user 的 username
      await cart.populate('user', 'username');
      res.status(200).json({ cart });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      next(error); // 確保 next 被調用
    }
  }
);
// patch cart with new quantity
router.patch(
  '/cart/:productId' /* 	#swagger.tags = ['User-Member:cart']
#swagger.description = 'validate' */,
  isAuth,
  async (req, res, next) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user._id;
    try {
      // First, check if the product exists
      const product = await ProductModel.findById(productId); // Assuming you have a separate model for products
      if (!product) {
        return next(appError(404, 'Product not found', next));
      }
      // Then, use userId to find the user's cart and update the item within it
      let userCart = await CartModel.findOne({ userId });
      if (!userCart) {
        userCart = new CartModel({ userId, items: [] });
      }

      const updateItemIndex = userCart.items.findIndex(
        (item) => item.productId.toString() === productId
      );
      if (updateItemIndex === -1) {
        return next(appError(404, 'Product not found in cart', next));
      }
      userCart.items[updateItemIndex].quantity = quantity;
      userCart.totalPrice = userCart.items.reduce(
        (acc, item) => acc + item.totalPrice,
        0
      );
      console.log('userCart.totalPrice:', userCart.totalPrice);
      // Update the quantity and total for the specific item
      await userCart.save(); // Save the updated cart
      res.json({ message: 'Quantity updated' });
    } catch (error) {
      console.error('Error updating quantity:', error);
      return next(appError(500, 'Error updating quantity', next));
    }
  }
);
router.delete(
  '/cart/{id}' /* 	#swagger.tags = ['User-Member:cart']
#swagger.description = 'validate' */,
  function () {}
);
//user orders path
router.get(
  '/orders',
  /* 	#swagger.tags = ['User-Member:orders']
#swagger.description = 'validate' */ async (req, res) => {}
);
//用戶登出
//log out
router.post(
  '/myProfile',
  /* 	#swagger.tags = ['User-Member']
#swagger.description = 'validate' */ function (req, res) {
    res.send({ message: 'logout' });
  }
);

module.exports = router;
