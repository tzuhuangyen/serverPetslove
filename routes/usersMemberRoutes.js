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
const handleError = require('../service/handleError');
//查詢用戶個人資料
router.get(
  '/myProfile' /* 	#swagger.tags = ['User-Member']
  #swagger.description = 'validate' */,
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    const users = await UserModel.find();
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
    const userId = req.userId; // 从路径参数中获取用户ID
    console.log('Received userId from isAuth:', req.userId); // Log the userId received from the isAuth middleware
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
  })
);

// 用戶登戶後获取用户cart数据
router.get(
  '/cart' /* 	#swagger.tags = ['User-Member:cart']
#swagger.description = 'validate' */,
  isAuth,
  handleErrorAsync(async (req, res, next) => {
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
  })
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
  handleErrorAsync(async (req, res, next) => {
    const { item } = req.body;
    console.log('Received item:', item); // 添加日志以检查接收到的 item 对象

    const { _id: productId, quantity } = item; // Extract productId and quantity from item
    console.log('Received productId:', productId);
    if (!item || !item._id || !item.quantity) {
      return next(appError(400, 'Invalid item data', next)); // 验证 item 对象
    }
    const userId = req.user._id;
    if (!userId) {
      return next(appError(400, 'User ID is missing', next));
    }
    // 查找產品信息
    const product = await ProductModel.findById(productId);
    if (!product) {
      return next(appError(404, 'Product not found', next));
    }

    // 查找或創建購物車
    let cart = await CartModel.findOne({ userId });
    if (!cart) {
      cart = new CartModel({
        userId,
        items: [],
      });
    }
    // Update existing cart
    // 查找現有的產品在購物車中的索引
    const existingItemIndex = cart.items.findIndex(
      (cartItem) => cartItem.productId.toString() === productId
    );
    // 如果產品不在購物車中，添加新項
    if (existingItemIndex === -1) {
      cart.items.push({
        productId,
        quantity,
        total: product.price,
      });
    } else {
      // 如果產品已在購物車中，更新數量
      cart.items[existingItemIndex].quantity += item.quantity;
    }
    // 保存購物車
    await cart.save();
    console.log('Item added to cart:', cart);

    // 關聯查詢 user 的 username
    await cart.populate('user', 'username');
    res.status(200).json({ cart });
  })
);
// patch cart with new quantity
router.patch(
  '/cart/:productId' /* 	#swagger.tags = ['User-Member:cart']
#swagger.description = 'validate' */,
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user._id;
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
  })
);
// delete the item
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
