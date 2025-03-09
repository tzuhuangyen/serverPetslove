//使用multer处理上传文件并将文件保存在指定的目录
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const ProductModel = require('../models/uploadImageModel');
const fs = require('fs');
// const testFilePath = path.join(__dirname, '../public/Images/test.txt');
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
const dirPath = path.resolve(__dirname, '..', '..', 'public', 'Images');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('Setting upload destination...');
    console.log('Resolved directory path:', dirPath);

    try {
      if (!fs.existsSync(dirPath)) {
        console.log('Directory does not exist. Attempting to create...');
        fs.mkdirSync(dirPath, { recursive: true });
        console.log('Directory created successfully:', dirPath);
      } else {
        console.log('Directory already exists:', dirPath);
      }
      cb(null, dirPath);
    } catch (err) {
      console.error('Error creating directory:', err);
      cb(err, null);
    }

    //cb() 是一個當篩選完成時被呼叫 Callback 函式，其接受兩個參數：（1）錯誤訊息 （2）說明是否接受該檔案的 Boolean 值
  },
  filename: (req, file, cb) => {
    //獲得檔案的原始名稱（名稱＋檔案格式）
    console.log('Original filename:', file.originalname);
    const newFilename =
      file.fieldname +
      '_' +
      Date.now() +
      `${uuidv4()}_${path.extname(file.originalname)}`;
    console.log('Processed filename:', newFilename);

    cb(null, newFilename);
  },
});

// 创建 multer 实例
const adminUploadMiddleware = multer({
  storage: storage,
});
module.exports = adminUploadMiddleware;
