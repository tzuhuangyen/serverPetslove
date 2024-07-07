//自訂appError錯誤 來會觸發應用到express全域錯誤捕捉
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     // res.status(500).send('Something broke!');
//     res.status(500).json({ err: err.message });
//   });
const appError = (httpStatus, errMessage, next) => {
  const error = new Error(errMessage);

  error.statusCode = httpStatus;
  //isOperational這錯誤是預期錯誤嗎？
  error.isOperational = true;
  //   next(error);
  return error;
};

module.exports = appError;
