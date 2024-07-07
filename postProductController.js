//控制器函数，用于处理上传产品的请求
//先通过 express-async-handler 中间件包装了一个异步函数，以便在异步操作中正确处理错误
const expressHandler = require('express-async-handler');
// const uploadImageModel = require('./models/uploadImageModel');
// 导入产品模型，用于数据库操作
//展示如何在後端路由中處理錯誤並返回適當的 JSON 對象
const postImage = expressHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(500).json({ error: 'No file uploaded' });
    }
    // 从请求中获取上传的文件信息
    const imageFile = new uploadImageModel({
      image: req.file.filename,
      filepath: req.file.path,
    });

    const saveImage = await imageFile.save();
    res.status(200).json(saveImage);
    // 从请求体中获取其他資訊 并使用这些字段创建了一个产品对象，并将其保存到数据库中
    // const { productName, price, type, order, description } = req.body;
    // 创建产品对象
    // const productFile = new productModel({
    //   filename: file.filename,
    //   filepath: file.path,
    //   imageUrl: '/public/Images/' + file.filename,

    //   productName: productName,
    //   price: price,
    //   type: type,
    //   order: order,
    //   description: description,
    // });

    // const saveProduct = await productFile.save();
    // res.status(200).json({ message: 'File uploaded successfully' });
  } catch (error) {
    console.error('Error in postProduct:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// module.exports = { postImage };
