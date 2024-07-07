const handleSuccess = (res, date) => {
  res.send({
    status: true,
    data,
  });
};

module.exports = handleSuccess;
