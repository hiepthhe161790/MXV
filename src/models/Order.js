// src/models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    // Identifiers
    orderId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },
    clientOrderId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },

    // Product Information
    symbol: {
      type: String,
      required: true,
      index: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    // Order Type & Direction
    orderType: {
      type: String,
      enum: ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'],
      required: true
    },
    side: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true
    },

    // Prices
    limitPrice: Number,
    stopPrice: Number,
    executedPrice: Number,

    // Status
    status: {
      type: String,
      enum: [
        'CREATED',
        'VALIDATED',
        'SUBMITTED',
        'PENDING_MATCH',
        'FILLED',
        'PARTIAL_FILLED',
        'COMPLETED',
        'CANCELLED',
        'REJECTED',
        'EXPIRED'
      ],
      default: 'CREATED',
      index: true
    },
    filledQuantity: { type: Number, default: 0 },
    remainingQuantity: Number,

    // Commission & Fees
    estimatedCommission: Number,
    actualCommission: Number,

    // Risk Checks
    marginRequired: Number,
    riskChecks: {
      marginCheck: { passed: Boolean, message: String },
      positionLimitCheck: { passed: Boolean, message: String },
      exposureCheck: { passed: Boolean, message: String }
    },

    // Exchange Reference
    exchangeOrderId: String,
    exchange: { type: String, default: 'MXV' },

    // Flow Log
    flowLog: [
      {
        step: String,
        status: String,
        message: String,
        timestamp: { type: Date, default: Date.now }
      }
    ],

    // Timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    submittedAt: Date,
    filledAt: Date,
    completedAt: Date,
    expiryAt: Date,

    // Audit
    createdBy: String,
    modifiedBy: String
  },
  { timestamps: true }
);

// Indexes
orderSchema.index({ accountId: 1, createdAt: -1 });
orderSchema.index({ symbol: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

// TTL Index for cancelled orders (30 days)
orderSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 2592000,
    partialFilterExpression: { status: 'CANCELLED' }
  }
);

// Add log entry method
orderSchema.methods.addFlowLog = function(step, status, message) {
  this.flowLog.push({
    step,
    status,
    message,
    timestamp: new Date()
  });
};

// Get order summary
orderSchema.methods.getSummary = function() {
  return {
    orderId: this.orderId,
    symbol: this.symbol,
    side: this.side,
    orderType: this.orderType,
    quantity: this.quantity,
    filled: this.filledQuantity,
    remaining: this.remainingQuantity,
    status: this.status,
    limitPrice: this.limitPrice,
    executedPrice: this.executedPrice,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Order', orderSchema);
