const express = require('express');
const router = express.Router();
const path = require('path');

const adminUploadMiddleware = require('../middlewares/adminUploadMiddleware');
const ProductModel = require('../models/uploadImageModel');
const handleSuccess = require('../service/handleSuccess');
const handleError = require('../service/handleError');
const appError = require('../service/appError');
const handleErrorAsync = require('../service/handleErrorAsync');

// 设置静态文件夹来提供图片
// router.use(
//   '/adminProducts',
//   express.static(path.join(__dirname, '../public/Images'))
// );
// console.log(path.join(__dirname, '../public/Images'));

//get all product
// app.use('/api/admin/products', adminProductRoutes);
router.get(
  '/',
  /* 	#swagger.tags = ['Admin-Products']
#swagger.description = 'Get all Products' */
  /* #swagger.responses[200] = {
      schema: [
         {'title':'test',
         'complete': true,
          'id':'202405251645'
         }],
      description: "got all products successfully." } */
  handleErrorAsync(async (req, res) => {
    // 从 MongoDB 中检索所有产品数据
    const data = await ProductModel.find().sort({ createdAt: 'descending' });
    console.log(data);
    res.send({ status: 'ok', data: data });
  })
);
// Get product by ID
router.get(
  '/:productId' /* 	#swagger.tags = ['Admin-Products']
#swagger.description = 'Get an Products by id' */,
  handleErrorAsync(async (req, res) => {
    const productId = req.params.productId; // 從請求中獲取商品ID
    console.log(productId);
    // 使用ProductModel的findById方法查找商品
    const product = await ProductModel.findById(productId);
    console.log(product);
    if (!product) {
      // 如果未找到商品，返回404錯誤
      return res.status(404).json({ error: 'Product not found' });
    }

    // 找到商品後返回成功和商品數據
    res.status(200).json({ status: 'ok', data: product });
  })
);
//app.use('/api/admin/products', adminProductRoutes);
// 後端路由/products/uploadProduct处理图像上传的路由
router.post(
  '/uploadProduct' /* 	#swagger.tags = ['Admin-Products']
  #swagger.description = 'upload new product' */,
  /*	#swagger.parameters['obj'] = {
            in: 'body',
            description: 'add new product.',
            required: true,
            schema: {
  "productName": "Fish",
  "type": "Fish",
  "order": "pre-order",
  "price": "25"
} 
    } */
  adminUploadMiddleware.single('image'),
  handleErrorAsync(async (req, res, next) => {
    if (!req.file) {
      return next(appError(400, 'please upload product information'));
    }
    console.log('Uploaded file:', req.file);

    const { productName, type, order, price } = req.body;
    console.log('Product data:', { productName, type, order, price });

    const newProduct = await ProductModel.create({
      image: req.file.filename, // 存储文件名
      productName,
      type,
      order,
      price,
    });

    res.status(201).json({ success: true, data: newProduct });
    console.log('New product created:', newProduct);
  })
);
//update product
router.patch(
  '/updateProduct/:id' /* 	#swagger.tags = ['Admin-Products']
#swagger.description = 'update Products by id' */,
  handleErrorAsync(async (req, res, next) => {
    const productId = req.params.id;
    const { productName, type, order, price } = req.body;
    const updatedProduct = await ProductModel.findByIdAndUpdate(
      productId,
      { productName, type, order, price },
      { new: true }
    );
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
  })
);

router.delete(
  '/deleteProduct/:id',
  /* 	#swagger.tags = ['Admin-Products']
#swagger.description = 'delete Products by id' */
  handleErrorAsync(async (req, res) => {
    const productId = req.params.id;
    await ProductModel.findByIdAndDelete(productId);
    res.json({ status: 'Product deleted successfully' });
  })
);
module.exports = router;
