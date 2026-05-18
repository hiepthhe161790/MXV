const mongoose = require('mongoose');

/**
 * Order MongoDB Schema
 */
const orderSchema = new mongoose.Schema({
  _id: String,
  accountId: { type: String, required: true, index: true },
  symbol: { type: String, required: true, index: true },
  side: { type: String, enum: ['BUY', 'SELL'], required: true },
  quantity: { type: Number, required: true },
  orderType: { type: String, enum: ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'], required: true },
  limitPrice: Number,
  stopPrice: Number,
  state: {
    type: String,
    enum: ['NEW', 'VALIDATED', 'SENT', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED'],
    required: true,
    index: true,
  },
  filledQuantity: { type: Number, required: true, default: 0 },
  averagePrice: { type: Number, required: true, default: 0 },
  idempotencyKey: { type: String, index: true }, // For idempotent submission
  createdAt: { type: Date, required: true, default: Date.now },
  updatedAt: { type: Date, required: true, default: Date.now },
}, { collection: 'orders' });

// Indexes for common queries
orderSchema.index({ accountId: 1, state: 1 });
orderSchema.index({ symbol: 1, state: 1 });
orderSchema.index({ createdAt: -1 });

const OrderModel = mongoose.model('Order', orderSchema);

/**
 * Order Repository
 */
class OrderRepository {
  async save(order) {
    const orderData = order.toJSON();
    return await OrderModel.findByIdAndUpdate(
      order.id,
      { ...orderData, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  }

  async findById(id) {
    return await OrderModel.findById(id);
  }

  async findByIdempotencyKey(idempotencyKey) {
    return await OrderModel.findOne({ idempotencyKey });
  }

  async findByAccountId(accountId, state = null) {
    const query = { accountId };
    if (state) query.state = state;
    return await OrderModel.find(query).sort({ createdAt: -1 });
  }

  async findBySymbol(symbol, state = null) {
    const query = { symbol };
    if (state) query.state = state;
    return await OrderModel.find(query).sort({ createdAt: -1 });
  }

  async findByState(state) {
    return await OrderModel.find({ state }).sort({ createdAt: -1 });
  }

  async findAll() {
    return await OrderModel.find().sort({ createdAt: -1 });
  }
}

module.exports = { OrderModel, OrderRepository };
