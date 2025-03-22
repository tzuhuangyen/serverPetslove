const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  items: Array,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    default: 'credit_card',
  },
  paymentDetails: {
    type: Object,
    default: {},
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'paid', 'shipped', 'delivered', 'cancelled'],
    default: 'draft',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Order', OrderSchema);
