const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
require('dotenv').config({ path: '../config.env' });
const UserModel = require('../models/usersModel');
const CartModel = require('../models/cartModel');
const ProductModel = require('../models/uploadImageModel');
const Order = require('../models/orderModel'); // Add this line to import the Order model

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
      console.log(`User not found with ID: ${userId}`);

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
      console.log(`Cart not found for user ${userId}, creating a new one`);
      cart = new CartModel({
        user: userId,
        items: [],
      });
      await cart.save();
      console.log(`New cart created for user ${userId}`);
      // 填充用戶信息
      await cart.populate({
        path: 'user',
        select: 'username',
      });
    }
    console.log(
      `Returning cart for user ${userId}, items count: ${cart.items.length}`
    );

    //if found user's cart, return cart
    res.status(200).json({ cart });
  })
);

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
    const userId = req.userId; // from `isAuth` to get `userId`
    console.log('Decoded userId:', userId);

    if (!userId) {
      return res
        .status(400)
        .json({ message: 'User ID cannot be null or undefined' });
    }
    // 验证 items 数组
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required.' });
    }
    // Validate items array
    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        return res
          .status(400)
          .json({ message: `Invalid ObjectId: ${item.productId}` });
      }
    }

    let userCart; //init
    try {
      console.log('Before finding user cart, userId:', userId);

      // Then, use userId to find the user's cart and update the item within it
      userCart = await CartModel.findOne({ user: userId });
      if (!userCart) {
        userCart = new CartModel({
          user: userId,
          items: [],
        });
      }
      console.log(
        'Final userCart before saving:',
        JSON.stringify(userCart, null, 2)
      );

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
          userCart.items.push({
            productId,
            productName,
            quantity,
            price,
            image,
          });
        }
      });
      console.log('UserCart before saving:', JSON.stringify(userCart, null, 2));
      if (!userCart.user || userCart.user === null) {
        console.error(
          'Error: userCart.user is null or undefined before saving'
        );
        return res.status(500).json({
          status: 'error',
          message: 'User ID is missing from the cart before saving.',
        });
      }
      await userCart.save(); // 保存購物車
      res.status(200).json({
        success: true,
        data: {
          cart: userCart,
        },
      });
    } catch (error) {
      console.error('Error finding user cart:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Something went wrong while finding the cart',
        details: error.message,
      });
    }
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
    let userCart = await CartModel.findOne({ user: userId });
    if (!userCart) {
      userCart = new CartModel({ user: userId, items: [] });
    }

    const updateItemIndex = userCart.items.findIndex(
      (item) => item.productId.toString() === productId
    );
    if (updateItemIndex === -1) {
      // 如果購物車中沒有該商品，添加它
      userCart.items.push({
        productId,
        productName: product.name, // 假設產品模型有 name 字段
        quantity,
        price: product.price, // 假設產品模型有 price 字段
        image: product.image, // 假設產品模型有 image 字段
      });
    } else {
      // 如果購物車中已有該商品，更新數量
      userCart.items[updateItemIndex].quantity = quantity;
    }

    // Update the quantity and total for the specific item
    await userCart.save(); // Save the updated cart
    res.json({ message: 'Quantity updated successfully', cart: userCart });
  })
);
// delete the item
router.delete(
  '/cart/:id' /* 	#swagger.tags = ['User-Member:cart']
#swagger.description = 'Delete an item from cart' */,
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    try {
      const itemId = req.params.id;
      const userId = req.user._id;

      console.log(
        `Attempting to delete item ${itemId} from cart for user ${userId}`
      );

      // Find the user's cart
      const cart = await CartModel.findOne({ user: userId });

      if (!cart) {
        return next(appError(404, 'Cart not found', next));
      }

      // Log the cart items for debugging
      console.log('Current cart items:', JSON.stringify(cart.items, null, 2));

      // Check if the item exists in the cart by comparing both _id and productId
      const initialItemCount = cart.items.length;

      // Try to find the item by various ID fields
      const itemToDelete = cart.items.find((item) => {
        return (
          // Compare as strings to avoid type issues
          (item._id && item._id.toString() === itemId) ||
          (item.productId && item.productId.toString() === itemId)
        );
      });

      if (!itemToDelete) {
        console.log(`Item with ID ${itemId} not found in cart`);
        return next(appError(404, 'Item not found in cart', next));
      }

      console.log('Found item to delete:', itemToDelete);

      // Remove the item from the cart
      cart.items = cart.items.filter((item) => {
        const itemIdMatch = item._id && item._id.toString() === itemId;
        const productIdMatch =
          item.productId && item.productId.toString() === itemId;
        return !itemIdMatch && !productIdMatch;
      });

      // If no items were removed, the item wasn't in the cart
      if (cart.items.length === initialItemCount) {
        console.log(`Failed to remove item ${itemId} from cart`);
        return next(appError(404, 'Failed to remove item from cart', next));
      }

      console.log(
        `Successfully removed item. New cart length: ${cart.items.length}`
      );

      // Save the updated cart
      await cart.save();

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Item removed from cart successfully',
        cart,
      });
    } catch (error) {
      console.error('Error deleting item from cart:', error);
      next(appError(500, `Error deleting item: ${error.message}`, next));
    }
  })
);
//user create an order
// const orders = {};
// const ResponseType = 'JSON';
// router.post(
//   '/createOrder',
//   handleErrorAsync(async (req, res, next) => {
//     const data = req.body;
//     const TimeStamp = Math.round(new Date().getTime() / 1000);
//     console.log('TimeStamp:', TimeStamp);
//     console.log('data:', data);

//     orders[TimeStamp] = { ...data, TimeStamp, MerchantOrderNo: TimeStamp };
//     console.log('createOrder:', TimeStamp, orders);
//     res.json(orders[TimeStamp]);
//   })
// );
// 成立訂單
router.post('/orders/', isAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return next(
        appError(400, 'User ID not found in authentication token', next)
      );
    }
    console.log('Creating order for user:', userId);

    const { items, totalAmount, paymentMethod, paymentDetails } = req.body;

    // 確保items是有效的數組
    if (!items || !Array.isArray(items) || items.length === 0) {
      return next(appError(400, 'Invalid items data', next));
    }

    // Create a new order record
    const newOrder = new Order({
      userId: userId,
      items,
      totalAmount,
      paymentMethod,
      paymentDetails,
      status: 'draft',
      createdAt: new Date(),
    });
    console.log('New order created:', newOrder);
    // Save to database
    await newOrder.save();

    // Return the order ID
    res.status(200).json({
      success: true,
      orderId: newOrder._id,
    });
  } catch (error) {
    console.error('Error creating draft order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order',
    });
  }
});
//confirm the order
router.get(
  '/confirmOrder',
  handleErrorAsync(async (req, res, next) => {
    res.render('confirm', { title: 'Express' });
  })
);
//retrieve all orders for a specific user
router.get(
  '/getUserAllOrders',
  /* 	#swagger.tags = ['User-Member:orders']
#swagger.description = 'validate' */
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    try {
      const userId = req.user._id;

      // Find the order in the database
      const orders = await Order.find({ userId });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      console.error('Error retrieving order details:', error);
      next(appError(500, `Error retrieving order: ${error.message}`, next));
    }
  })
);
// Add this route to get a specific order by ID
router.get(
  '/getUserOrders/:id',
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    const orderId = req.params.id;

    try {
      // Find order in database
      const order = await Order.findById(orderId);

      if (!order) {
        return next(appError(404, 'Order not found', next));
      }

      res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      console.error('Error retrieving order:', error);
      next(appError(500, `Error retrieving order: ${error.message}`, next));
    }
  })
);

// update order status
router.patch(
  '/orders/:id/status',
  isAuth,
  handleErrorAsync(async (req, res, next) => {
    const { status } = req.body;
    const orderId = req.params.id;

    try {
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { status },
        { new: true }
      );

      if (!updatedOrder) {
        return next(appError(404, 'Order not found', next));
      }

      res.status(200).json({
        success: true,
        order: updatedOrder,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      next(
        appError(500, `Error updating order status: ${error.message}`, next)
      );
    }
  })
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
