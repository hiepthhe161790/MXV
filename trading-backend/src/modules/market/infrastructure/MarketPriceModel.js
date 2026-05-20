const mongoose = require('mongoose');

/**
 * Market Price Cache Schema
 * Stores the last known market prices to avoid waiting for external API calls on startup
 */
const marketPriceSchema = new mongoose.Schema({
  symbol:    { type: String, required: true, unique: true, index: true },
  price:     { type: Number, required: true },
  change:    { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'market_prices' });

const MarketPriceModel = mongoose.models.MarketPrice || mongoose.model('MarketPrice', marketPriceSchema);

module.exports = MarketPriceModel;
