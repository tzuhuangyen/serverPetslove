//product model
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    image: { type: String, default: '' },
    productName: { type: String, required: true },
    type: { type: String, required: true },
    order: { type: String, required: true },
    price: { type: Number, required: true },
    createdAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
  },
  { versionKey: false }
  // { collection: 'products' },
  // { timestamps: true }
);
//mongoDB 資料庫collection name is products

module.exports = mongoose.model('Product', ProductSchema);
