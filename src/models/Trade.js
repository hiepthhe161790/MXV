// src/models/Trade.js
const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema(
  {
    tradeId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    symbol: {
      type: String,
      required: true,
      index: true
    },

    // Execution Details
    side: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true
    },
    quantity: { type: Number, required: true },
    executionPrice: { type: Number, required: true },
    totalValue: Number,

    // Fees
    commission: { type: Number, default: 0 },
    fee: { type: Number, default: 0 },

    // Counterparty
    counterpartyId: String,

    // Exchange Info
    exchangeTradeId: String,
    exchange: { type: String, default: 'MXV' },

    // Status
    status: {
      type: String,
      enum: ['PENDING', 'SETTLED', 'CANCELLED'],
      default: 'PENDING'
    },

    // Timestamps
    executedAt: { type: Date, default: Date.now },
    settledAt: Date
  },
  { timestamps: true }
);

// Indexes
tradeSchema.index({ tradeId: 1 });
tradeSchema.index({ orderId: 1 });
tradeSchema.index({ accountId: 1, executedAt: -1 });
tradeSchema.index({ symbol: 1, executedAt: -1 });

// Calculate total value
tradeSchema.pre('save', function(next) {
  this.totalValue = this.quantity * this.executionPrice;
  next();
});

module.exports = mongoose.model('Trade', tradeSchema);
