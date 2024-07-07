const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  items: Array,
  user: Object,
  status: String,
});

module.exports = mongoose.model('Order', OrderSchema);
