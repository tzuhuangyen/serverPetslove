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
// app.use('/api/users/member', usersMemberRoutes);
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

    if (!cart) {
      return next(appError(404, 'user Cart not found', next));
    }
    //if found user's cart, return cart
    res.status(200).json({ cart });
  })
);
//用戶登戶後 merged cart
// router.patch(
//   'cart/${id}' /* 	#swagger.tags = ['User-Member:cart']
//   #swagger.description = 'post an cart' */,
//   isAuth,
//   mergeCart
// );

// 用戶登戶後 merge cart
router.put(
  '/cart' /* 	#swagger.tags = ['User-Member:cart']
#swagger.description = 'post an cart' */,
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    try {
      const { items } = req.body;
      console.log('Received items:', items);
      if (!items || !Array.isArray(items) || items.length === 0) {
        return next(appError(400, 'Invalid items data', next));
      }

      const userId = req.user?._id;
      console.log('User ID:', userId);
      if (!userId) {
        return next(appError(400, 'User ID is missing', next));
      }
      // Ensure `userId` is not null or undefined
      if (userId === 'null') {
        return next(appError(400, 'Invalid User ID', next));
      }
      let cart = await CartModel.findOne({ user: userId });
      if (!cart) {
        cart = new CartModel({
          user: userId,
          items: [],
        });
      }

      const itemMap = new Map();
      items.forEach((item) => {
        const { productId, productName, quantity, price, image } = item;
        if (!productId || !productName || quantity == null || !price) {
          console.log('Invalid item:', item);
          return next(appError(400, 'Invalid item data', next));
        }
        itemMap.set(productId.toString(), {
          productName,
          quantity,
          price,
          image,
        });
      });
      // Update existing items
      cart.items.forEach((cartItem) => {
        const itemData = itemMap.get(cartItem.productId.toString());
        if (itemData) {
          // cartItem.productName = itemData.productName;
          cartItem.quantity = itemData.quantity;
          // cartItem.price = itemData.price;
          // cartItem.image = itemData.image;
          itemMap.delete(cartItem.productId.toString());
        }
      });
      // Add new items to the cart
      itemMap.forEach((itemData, productId) => {
        const existingItem = cart.items.find(
          (cartItem) => cartItem.productId.toString() === productId
        );
        if (existingItem) {
          // If exists, update quantity
          existingItem.quantity += itemData.quantity;
        } else {
          cart.items.push({
            productId,
            productName: itemData.productName,
            quantity: itemData.quantity,
            price: itemData.price,
            image: itemData.image,
          });
        }
      });

      cart.items = cart.items.filter((item) => item.productName && item.price);
      cart.user = userId;

      console.log('Before saving cart:', cart);
      await cart.save();
      await cart.populate({
        path: 'user',
        select: 'username',
      });

      res.status(200).json({ cart });
    } catch (error) {
      console.error('Error processing cart request:', error);
      next(appError(500, 'Internal Server Error', next));
    }
  })
);
//加入購物車addItemToServerCart
router.post(
  '/cart' /* 	#swagger.tags = ['User-Member:cart']
#swagger.description = 'validate' */,
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    const { items } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is missing' }); // 如果 userId 不存在，返回錯誤
    }

    // Then, use userId to find the user's cart and update the item within it
    let userCart = await CartModel.findOne({ user: userId });
    if (!userCart) {
      userCart = new CartModel({
        user: userId,
        items: [],
      });
    }

    items.forEach((item) => {
      const { productId, productName, quantity, price, image } = item;
      // Check if the item already exists in the cart
      const itemIndex = userCart.items.findIndex(
        (cartItem) => cartItem.productId.toString() === productId
      );
      if (itemIndex > -1) {
        // 如果該商品已存在，則更新數量
        userCart.items[itemIndex].quantity += quantity;
      } else {
        // 如果該商品不存在，則添加新商品
        userCart.items.push({ productId, productName, quantity, price, image });
      }
    });

    await userCart.save(); // 保存購物車
    res.status(200).json({
      success: true,
      data: {
        cart: userCart,
      }, // 返回更新後的購物車
    });
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

    // Update the quantity and total for the specific item
    await userCart.save(); // Save the updated cart
    res.json({ message: 'Quantity updated successfully' });
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
