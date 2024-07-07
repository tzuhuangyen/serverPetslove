const express = require('express');
const router = express.Router();
const CartModel = require('../models/cartModel');

router.get(
  '/' /* 	#swagger.tags = ['Admin-Carts']
    #swagger.description = 'get all users' cart */,
  /* #swagger.responses[200] = {
    schema: {},
    description: "got all Users' cart successfully." } */
  async (req, res) => {
    try {
      const data = await CartModel.find();
      console.log(data);
      res.send({ status: 'ok', data: data });
      console.log('Handling GET request to mongoDB for /users_carts');
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);
module.exports = router;
