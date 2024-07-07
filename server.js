require('dotenv').config();
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const connectDB = require('./connectMongo');
connectDB();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
//捕捉程式重大錯誤 這個要放最前面
process.on('uncaughtException', (err) => {
  console.error('uncaught Exception!');
  console.error(err.name);
  console.error(err.message);
  console.error(err.stack);
  process.exit(1);
});

const usersRoutes = require('./routes/usersRoutes');
const usersMemberRoutes = require('./routes/usersMemberRoutes');
// const productRoutes = require('./routes/productRoutes');
const adminProductRoutes = require('./routes/adminProductRoutes');
const adminUserRoutes = require('./routes/adminUsersRoutes');
const adminCartRoutes = require('./routes/adminCartRoutes');
const corsOptions = {
  origin: ['https://tzuhuangyen.github.io', 'http://localhost:5173'], // 允許您的前端域
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
const imagesPath = path.join(__dirname, '../client/public/images');
console.log(imagesPath);
console.log(`Resolved images path: ${imagesPath}`);

// express.static('public/Images')
app.use('/adminProducts', express.static('public/Images'));
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
  next();
});
// 日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
  next();
});

// This is a function that takes in 'req' and 'res' objects as parameters.
// The function is expected to return a JSON response.

// 将用户路由挂载到 /api/users 路径下
app.use('/api/users', usersRoutes);
app.use('/api/users/member', usersMemberRoutes);

// 将产品路由挂载到 /products 路径下
// app.use('/products', productRoutes);
// 將admin路由掛載到 /admin路徑下
// app.use('/api/admin', adminProductRoutes);
app.use('/api/admin/products', adminProductRoutes);
// app.use('/admin/orders', adminProductRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/carts', adminCartRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 404 找不到頁面 錯誤處理程序
app.use((req, res, next) => {
  res.status(404).send("Sorry can't find that! 404 错误处理程序");
});
// express全域錯誤捕捉 程式處理程序管理
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({ err: message });
});
//未捕捉到 api 的catch
process.on('unhandleRejection', (err, promise) => {
  console.error('uncaught Rejection!', promise, 'reason', err);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Yen's Server Started at Server is running on ${PORT}`);
});
