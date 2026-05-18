// src/models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    timestamp: { type: Date, default: Date.now, index: true },

    // Event Classification
    eventType: {
      type: String,
      enum: [
        'ORDER_CREATED',
        'ORDER_CANCELLED',
        'ORDER_EXECUTED',
        'POSITION_OPENED',
        'POSITION_CLOSED',
        'POSITION_LIQUIDATED',
        'DEPOSIT_INITIATED',
        'DEPOSIT_COMPLETED',
        'WITHDRAWAL_INITIATED',
        'WITHDRAWAL_COMPLETED',
        'MARGIN_CALL',
        'MARGIN_RELEASED',
        'ACCOUNT_CREATED',
        'ACCOUNT_SUSPENDED',
        'LOGIN',
        'LOGOUT',
        'KYC_VERIFIED',
        'RISK_ALERT'
      ],
      required: true,
      index: true
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
      default: 'INFO',
      index: true
    },

    // User & Account
    userId: String,
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      index: true
    },

    // Changes
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed
    },

    // Connection Info
    ipAddress: String,
    userAgent: String,

    // Details
    details: mongoose.Schema.Types.Mixed,

    // Status
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS'
    },
    errorMessage: String
  },
  { timestamps: true }
);

// Indexes
auditLogSchema.index({ eventId: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ accountId: 1, timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });

// TTL Index (auto-delete logs after 1 year)
const ttlDays = process.env.AUDIT_LOG_RETENTION_DAYS || 365;
auditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: ttlDays * 24 * 60 * 60 }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
