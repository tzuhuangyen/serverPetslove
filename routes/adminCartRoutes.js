const express = require('express');
const router = express.Router();
const CartModel = require('../models/cartModel');
const handleErrorAsync = require('../service/handleErrorAsync');

router.get(
  '/' /* 	#swagger.tags = ['Admin-Carts']
    #swagger.description = 'get all users' cart */,
  /* #swagger.responses[200] = {
    schema: {},
    description: "got all Users' cart successfully." } */
  handleErrorAsync(async (req, res, next) => {
    const data = await CartModel.find();
    console.log(data);
    res.send({ status: 'ok', data: data });
    console.log('Handling GET request to mongoDB for /users_carts');
  })
);
module.exports = router;
