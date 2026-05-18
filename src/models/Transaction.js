// src/models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
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

    // Type
    type: {
      type: String,
      enum: [
        'DEPOSIT',
        'WITHDRAWAL',
        'MARGIN_USAGE',
        'MARGIN_RELEASE',
        'PNL_REALIZED',
        'COMMISSION',
        'FEE',
        'DIVIDEND'
      ],
      required: true,
      index: true
    },

    amount: { type: Number, required: true },
    currency: {
      type: String,
      enum: ['USD', 'VND', 'EUR'],
      default: 'USD'
    },

    // Status
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },

    // Bank Information
    bankCode: String,
    bankAccount: String,
    bankAccountHolder: String,
    referenceNumber: String,

    // Related Records
    orderId: mongoose.Schema.Types.ObjectId,
    tradeId: mongoose.Schema.Types.ObjectId,
    positionId: mongoose.Schema.Types.ObjectId,

    description: String,

    // Reconciliation
    reconcileStatus: {
      type: String,
      enum: ['PENDING', 'MATCHED', 'UNMATCHED'],
      default: 'PENDING',
      index: true
    },
    reconcileAt: Date,
    reconcileReference: String,

    // Timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    processedAt: Date,
    completedAt: Date,

    // Audit
    createdBy: String,
    approvedBy: String,
    approvedAt: Date,

    // Notes
    notes: String
  },
  { timestamps: true }
);

// Indexes
transactionSchema.index({ accountId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ referenceNumber: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
