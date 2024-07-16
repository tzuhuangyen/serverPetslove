const UserModel = require('../models/usersModel');
const mergeCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const localCart = req.body.cart;

    // 獲取用戶現有的購物車
    const user = await UserModel.findById(userId).populate('cart.product');
    let serverCart = user.cart;

    // 合併購物車
    localCart.forEach((localItem) => {
      const serverItem = serverCart.find(
        (item) => item.product._id.toString() === localItem._id
      );
      if (serverItem) {
        serverItem.quantity += localItem.quantity;
      } else {
        serverCart.push({
          product: localItem._id,
          quantity: localItem.quantity,
        });
      }
    });

    // 更新用戶購物車
    UserModel.cart = serverCart;
    await user.save();

    res.status(200).json({ message: 'Cart merged successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to merge cart', error });
  }
};

module.exports = { mergeCart };
