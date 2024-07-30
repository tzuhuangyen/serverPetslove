const mongoose = require('mongoose');

//先設定購物車內容有什麼產品訊息
const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Products',
    required: true,
  },

  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity can not be less than 1.'],
  },
  price: { type: Number, required: true },
});

//cartModel
//定义了整个购物车的结构，包含一个用户ID（referring to the User model）和一个购物车项数组
const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    // unique: true,
  },
  items: [cartItemSchema],
});
module.exports = mongoose.model('Cart', cartSchema);
