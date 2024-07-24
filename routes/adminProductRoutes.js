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
router.use(
  '/adminProducts',
  express.static(path.join(__dirname, '../public/Images'))
);
// (__dirname, '..', 'public', 'images')
// __dirname, '..', 'client', 'public', 'images')
// router.use(
//   '/admin/products',
//   express.static(path.join(__dirname, '..', 'public', 'Images'))
// );
// router.use('/:productId/image', async (req, res) => {
//   try {
//     const productId = req.params.productId;
//     console.log(productId);
//     const product = await ProductModel.findById(productId);
//     console.log(product);
//     if (!product) {
//       return res.status(404).send('Product not found');
//     }

//     if (!product.image) {
//       return res.status(404).send('Product image not found');
//     }
//     const imagesPath = path.join(
//       __dirname,
//       '..',
//       'client',
//       'public',
//       product.image
//     );
//     console.log(imagesPath);
//     res.sendFile(imagePath);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
//get all photos of products
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
      // return res.status(400).json({ error: 'No file uploaded' });
      return next(appError(400, 'please upload product information'));
    }
    console.log(req.body);
    const { productName, type, order, price } = req.body;
    const imageName = req.file.filename;
    const newProduct = await ProductModel.create({
      image: imageName,
      productName: productName,
      type,
      order,
      price,
    });
    console.log('New product created:', newProduct);
  })
);

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
