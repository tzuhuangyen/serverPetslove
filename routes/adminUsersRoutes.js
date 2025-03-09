const express = require('express');
const router = express.Router();
const path = require('path');
// import path from 'path';

const UserModel = require('../models/usersModel');

const handleSuccess = require('../service/handleSuccess');
const handleError = require('../service/handleError');
const appError = require('../service/appError');
const handleErrorAsync = require('../service/handleErrorAsync');
const orderModel = require('../models/orderModel');
//admin mange users
//find/get all users
router.get(
  '/',
  /* 	#swagger.tags = ['Admin-Users']
#swagger.description = 'get all users' */
  /* #swagger.responses[200] = {
schema: {},
description: "User registered successfully." } */
  handleErrorAsync(async (req, res) => {
    const data = await UserModel.find();
    console.log(data);
    res.send({ status: 'ok', data: data });
    console.log('Handling GET request to mongoDB for /users');
  })
);

//admin find/get by ID
router.get(
  '/:id',
  /* 	#swagger.tags = ['Admin-Users']
#swagger.description = 'get a users bu id' */ handleErrorAsync(
    async (req, res) => {
      const data = await UserModel.findById(req.params.id);
      res.json(data);
    }
  )
);
//admin get all orders
router.post(
  '/orders' /* 	#swagger.tags = ['Admin-Orders']
#swagger.description = 'get all orders' */,
  handleErrorAsync(async (req, res) => {
    const newOder = new orderModel(req.body);
    await newOder.order();
    res.status(200).json(newOder);
  })
);
module.exports = router;
