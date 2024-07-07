//使用multer处理上传文件并将文件保存在指定的目录
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');

// 使用 Multer 中间件处理图像上传
//multer定义文件上传的存储引擎、文件名和上传目录等选项
//三個參數： request 物件、帶有上傳檔案資訊的file 物件、篩選完成後呼叫的cb 函式。
//{dest: "public/images/uploads"}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    //cb() 是一個當篩選完成時被呼叫 Callback 函式，其接受兩個參數：（1）錯誤訊息 （2）說明是否接受該檔案的 Boolean 值
    console.log('Destination directory:', 'public/Images');

    cb(null, 'public/Images'); // 图像存储地方
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
