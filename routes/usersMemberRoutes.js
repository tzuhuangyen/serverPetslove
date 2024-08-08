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
// const handleError = require('../service/handleError');
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
    let cart = await CartModel.findOne({ user }).populate({
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
    const { items } = req.body;
    console.log('Received items:', items); // 添加日志以检查接收到的 item 对象

    // 验证 items 数据的有效性
    if (!items || !Array.isArray(items) || items.length === 0) {
      return next(appError(400, 'Invalid items data', next));
    }

    const userId = req.user._id;
    if (!userId) {
      return next(appError(400, 'User ID is missing', next));
    }
    // 查找產品信息
    // const product = await ProductModel.findById(productId);
    // if (!product) {
    //   return next(appError(404, 'Product not found', next));
    // }

    // 查找或創建購物車
    let cart = await CartModel.findOne({ user: userId });
    if (!cart) {
      cart = new CartModel({
        user: userId,
        items: [],
      });
    }
    // 创建一个映射表以便查找和更新购物车项
    const itemMap = new Map();
    // 处理每个购物车项
    items.forEach((item) => {
      const { productId, productName, quantity, price } = item;

      // 验证每个项的字段是否完整
      if (!productId || !productName || quantity == null || !price) {
        console.log('Invalid item:', item);
        return;
      }

      // 将项的 productId 作为键存储在映射表中
      itemMap.set(productId.toString(), { productName, quantity, price });
    });

    // 更新购物车项
    cart.items.forEach((cartItem) => {
      const itemData = itemMap.get(cartItem.productId.toString());
      if (itemData) {
        cartItem.productName = itemData.productName;
        cartItem.quantity = itemData.quantity;
        cartItem.price = itemData.price;
        itemMap.delete(cartItem.productId.toString());
      }
    });
    // 将新项添加到购物车
    itemMap.forEach((itemData, productId) => {
      cart.items.push({
        productId,
        productName: itemData.productName,
        quantity: itemData.quantity,
        price: itemData.price,
      });
    });
    // 移除无效项
    cart.items = cart.items.filter((item) => item.productName && item.price);
    // Update existing cart

    cart.user = userId;
    // 保存購物車
    console.log('Before saving cart:', cart);

    await cart.save();
    console.log(
      'After saving cart:',
      await CartModel.findById(cart._id).populate('user')
    );

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
//user create an order
const orders = {};
const ResponseType = 'JSON';
router.post(
  '/createOrder',
  handleErrorAsync(async (req, res, next) => {
    const data = req.body;
    const TimeStamp = Math.round(new Date().getTime() / 1000);
    console.log('TimeStamp:', TimeStamp);
    console.log('data:', data);

    orders[TimeStamp] = { ...data, TimeStamp, MerchantOrderNo: TimeStamp };
    console.log('createOrder:', TimeStamp, orders);
    res.json(orders[TimeStamp]);
  })
);
//confirm the order
router.get(
  '/confirmOrder',
  handleErrorAsync(async (req, res, next) => {
    res.render('confirm', { title: 'Express' });
  })
);
//取得 orders內容
router.get(
  '/getUserOrders/:id',
  /* 	#swagger.tags = ['User-Member:orders']
#swagger.description = 'validate' */ handleErrorAsync(
    async (req, res, next) => {
      res.json(orders[id]);
    }
  )
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
