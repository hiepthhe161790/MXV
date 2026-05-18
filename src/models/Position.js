// src/models/Position.js
const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },
    symbol: {
      type: String,
      required: true,
      index: true
    },

    // Status
    status: {
      type: String,
      enum: ['OPEN', 'CLOSING', 'CLOSED', 'LIQUIDATED'],
      default: 'OPEN',
      index: true
    },

    // Position Details
    side: {
      type: String,
      enum: ['LONG', 'SHORT'],
      required: true
    },
    openQuantity: { type: Number, required: true },
    closedQuantity: { type: Number, default: 0 },

    // Entry Information
    entryPrice: { type: Number, required: true },
    entryDate: { type: Date, default: Date.now },
    entryOrderId: mongoose.Schema.Types.ObjectId,

    // Current Status
    currentPrice: Number,
    lastUpdateAt: Date,

    // P&L Calculation
    unrealizedPnL: { type: Number, default: 0 },
    realizedPnL: { type: Number, default: 0 },
    totalValue: Number,

    // Risk Metrics
    marginUsed: { type: Number, required: true },
    exposureAmount: Number,
    leverage: Number,

    // Risk Management
    stopLossPrice: Number,
    takeProfitPrice: Number,
    stopLossOrderId: mongoose.Schema.Types.ObjectId,
    takeProfitOrderId: mongoose.Schema.Types.ObjectId,

    // Timeline
    openedAt: { type: Date, default: Date.now, index: true },
    closedAt: Date,
    modifiedAt: { type: Date, default: Date.now },

    // Related Trades
    trades: [mongoose.Schema.Types.ObjectId],

    // Exit Information
    exitPrice: Number,
    exitDate: Date,
    exitOrderId: mongoose.Schema.Types.ObjectId
  },
  { timestamps: true }
);

// Compound unique index for account + symbol
positionSchema.index({ accountId: 1, symbol: 1 }, { unique: true });
positionSchema.index({ accountId: 1, status: 1 });
positionSchema.index({ marginUsed: -1 });

// Calculate unrealized P&L
positionSchema.methods.calculateUnrealizedPnL = function(currentPrice) {
  this.currentPrice = currentPrice;
  this.lastUpdateAt = new Date();

  if (this.side === 'LONG') {
    this.unrealizedPnL = (currentPrice - this.entryPrice) * this.openQuantity;
  } else {
    this.unrealizedPnL = (this.entryPrice - currentPrice) * this.openQuantity;
  }

  return this.unrealizedPnL;
};

// Calculate total value
positionSchema.methods.calculateTotalValue = function(currentPrice) {
  this.totalValue = currentPrice * this.openQuantity;
  return this.totalValue;
};

// Get position summary
positionSchema.methods.getSummary = function() {
  return {
    symbol: this.symbol,
    side: this.side,
    quantity: this.openQuantity,
    entryPrice: this.entryPrice,
    currentPrice: this.currentPrice,
    unrealizedPnL: this.unrealizedPnL,
    realizedPnL: this.realizedPnL,
    marginUsed: this.marginUsed,
    leverage: this.leverage,
    status: this.status
  };
};

module.exports = mongoose.model('Position', positionSchema);
