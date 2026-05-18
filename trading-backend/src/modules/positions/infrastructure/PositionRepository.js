const mongoose = require('mongoose');

/**
 * Position MongoDB Schema
 */
const positionSchema = new mongoose.Schema({
  _id: String,
  accountId: { type: String, required: true, index: true },
  symbol: { type: String, required: true, index: true },
  side: { type: String, enum: ['LONG', 'SHORT'], required: true },
  quantity: { type: Number, required: true, default: 0 },
  entryPrice: { type: Number, required: true, default: 0 },
  currentPrice: { type: Number, required: true, default: 0 },
  realizedPnL: { type: Number, required: true, default: 0 },
  unrealizedPnL: { type: Number, required: true, default: 0 },
  marginUsed: { type: Number, required: true, default: 0 },
  leverage: { type: Number, required: true, default: 1 },
  createdAt: { type: Date, required: true, default: Date.now },
  updatedAt: { type: Date, required: true, default: Date.now },
}, { collection: 'positions' });

// Indexes
positionSchema.index({ accountId: 1, symbol: 1, side: 1 }, { unique: true });
positionSchema.index({ accountId: 1 });
positionSchema.index({ symbol: 1 });

const PositionModel = mongoose.model('Position', positionSchema);

/**
 * Position Repository
 */
class PositionRepository {
  async save(position) {
    const positionData = position.toJSON();
    return await PositionModel.findByIdAndUpdate(
      position.id,
      { ...positionData, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  }

  async findById(id) {
    return await PositionModel.findById(id);
  }

  async findByAccountId(accountId) {
    return await PositionModel.find({ accountId });
  }

  async findByAccountAndSymbol(accountId, symbol) {
    return await PositionModel.findOne({ accountId, symbol });
  }

  async findOpenPositions(accountId) {
    return await PositionModel.find({ accountId, quantity: { $gt: 0 } });
  }

  async findBySymbol(symbol) {
    return await PositionModel.find({ symbol });
  }

  async findAll() {
    return await PositionModel.find();
  }

  async delete(id) {
    return await PositionModel.deleteOne({ _id: id });
  }
}

module.exports = { PositionModel, PositionRepository };
