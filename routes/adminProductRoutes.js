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
//   express.static(path.join(__dirname, '../public/images'))
// );
// console.log(path.join(__dirname, '../public/images'));

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
    const data = await ProductModel.find()
      .select('-image.data')
      .sort({ createdAt: 'descending' });
    // 为每个产品添加图片URL
    const productsWithImageUrl = data.map((product) => {
      const productObj = product.toObject();
      // 添加图片URL
      productObj.imageUrl = `${req.protocol}://${req.get(
        'host'
      )}/api/admin/products/image/${product._id}`;
      return productObj;
    });
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
    console.log('Inside /uploadProduct route');
    if (!req.file) {
      return next(appError(400, 'please upload product information'));
    }
    console.log('Uploaded file:', req.file);
    console.log('File received:', req.file.originalname);

    const { productName, type, order, price } = req.body;
    console.log('Product data:', { productName, type, order, price });
    console.log('Creating new product in database...');
    const newProduct = await ProductModel.create({
      image: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
      productName,
      type,
      order,
      price,
    });

    res.status(201).json({ success: true, data: newProduct });

    console.log('New product created:', newProduct);
  })
);
// 添加到adminProductRoutes.js
// 从MongoDB提供图片

router.get(
  '/image/:productId',
  handleErrorAsync(async (req, res) => {
    const productId = req.params.productId;
    const product = await ProductModel.findById(productId);

    if (!product || !product.image || !product.image.data) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // 设置正确的内容类型
    res.set('Content-Type', product.image.contentType);
    // 发送图片数据
    res.send(product.image.data);
  })
);
//update product
router.patch(
  '/updateProduct/:id' /* 	#swagger.tags = ['Admin-Products']
#swagger.description = 'update Products by id' */,
  adminUploadMiddleware.single('image'),
  handleErrorAsync(async (req, res, next) => {
    try {
      const productId = req.params.id;
      console.log('Updating product with ID:', productId);
      console.log('Request body:', req.body);
      const { productName, type, order, price, is_enabled } = req.body;
      // 準備更新數據
      const updateData = {
        productName,
        type,
        order,
        price,
        is_enabled: is_enabled !== undefined ? is_enabled : 1,
      };
      console.log('Update data:', updateData);

      // 如果有上傳新圖片，則更新圖片數據
      if (req.file) {
        console.log('New image uploaded:', req.file.originalname);
        updateData.image = {
          data: req.file.buffer,
          contentType: req.file.mimetype,
        };
      }
      const updatedProduct = await ProductModel.findByIdAndUpdate(
        productId,
        updateData,
        { new: true }
      );
      if (!updatedProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }
      console.log('Product updated successfully:', updatedProduct._id);
      res.status(200).json({
        status: 'success',
        message: 'Product updated successfully',
        data: updatedProduct,
      });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update product',
        error: error.message,
      });
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
