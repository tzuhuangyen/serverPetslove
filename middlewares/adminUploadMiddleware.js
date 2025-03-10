//使用multer处理上传文件并将文件保存在指定的目录
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const ProductModel = require('../models/uploadImageModel');
const fs = require('fs');
// const testFilePath = path.join(__dirname, '../public/images/test.txt');
// fs.writeFile(testFilePath, 'This is a test file', (err) => {
//   if (err) {
//     console.error('Write test failed:', err);
//   } else {
//     console.log('Write test succeeded, file saved at:', testFilePath);
//   }
// });
// 使用 Multer 中间件处理图像上传
//multer定义文件上传的存储引擎、文件名和上传目录等选项
//三個參數： request 物件、帶有上傳檔案資訊的file 物件、篩選完成後呼叫的cb 函式。
//{dest: "public/images/uploads"}
const dirPath = path.resolve(__dirname, '..', '..', 'public', 'images');
// 配置multer将文件存储在内存中，而不是磁盘上
const storage = multer.memoryStorage();

// 创建 multer 实例
const adminUploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 限制5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  },
});
module.exports = adminUploadMiddleware;
