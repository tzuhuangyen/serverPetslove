const handleError = (res, err) => {
  let message = '';
  if (err) {
    message = err.message;
    console.error(err);
  } else {
    message = 'something wrong';
  }
  res.status(400).send({
    status: true,
    message,
  });
};
module.exports = handleError;
