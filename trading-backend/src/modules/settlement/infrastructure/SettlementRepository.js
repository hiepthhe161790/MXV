const mongoose = require('mongoose');

/**
 * Audit Log Schema - Immutable event log
 * Records all significant trading events for compliance and debugging
 */
const auditLogSchema = new mongoose.Schema({
  _id: String,
  accountId: { type: String, required: true, index: true },
  eventType: { type: String, required: true, index: true },
  actionType: String, // CREATE, UPDATE, DELETE, FILL, CANCEL, etc.
  reference: { type: mongoose.Schema.Types.Mixed }, // orderId, tradeId, etc.
  before: mongoose.Schema.Types.Mixed, // State before change
  after: mongoose.Schema.Types.Mixed, // State after change
  description: String,
  severity: { type: String, enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'], default: 'INFO' },
  timestamp: { type: Date, required: true, default: Date.now, index: true },
  operator: String, // User who triggered the action
  ipAddress: String,
}, { collection: 'audit_logs' });

// Indexes for audit queries
auditLogSchema.index({ accountId: 1, timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });

const AuditLogModel = mongoose.model('AuditLog', auditLogSchema);

/**
 * Settlement Record Schema
 * Records daily settlements
 */
const settlementSchema = new mongoose.Schema({
  _id: String,
  settlementDate: { type: Date, required: true, index: true },
  accountId: { type: String, required: true, index: true },
  openingBalance: Number,
  deposits: Number,
  withdrawals: Number,
  tradedVolume: Number,
  realizedPnL: Number,
  unrealizedPnL: Number,
  closingBalance: Number,
  marginUsed: Number,
  marginLevel: Number,
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  createdAt: { type: Date, required: true, default: Date.now },
  completedAt: Date,
}, { collection: 'settlements' });

// Indexes
settlementSchema.index({ settlementDate: 1, status: 1 });
settlementSchema.index({ accountId: 1, settlementDate: -1 });

const SettlementModel = mongoose.model('Settlement', settlementSchema);

/**
 * Settlement Repository
 */
class SettlementRepository {
  async saveAuditLog(auditLog) {
    return await AuditLogModel.create(auditLog);
  }

  async getAuditLogs(accountId, fromDate, toDate, limit = 100) {
    return await AuditLogModel.find({
      accountId,
      timestamp: { $gte: fromDate, $lte: toDate },
    })
      .limit(limit)
      .sort({ timestamp: -1 });
  }

  async saveSettlement(settlement) {
    return await SettlementModel.findByIdAndUpdate(
      settlement._id,
      settlement,
      { upsert: true, new: true }
    );
  }

  async getSettlement(settlementDate, accountId) {
    return await SettlementModel.findOne({ settlementDate, accountId });
  }

  async getSettlementsByAccount(accountId, limit = 30) {
    return await SettlementModel.find({ accountId }).limit(limit).sort({ settlementDate: -1 });
  }
}

module.exports = { AuditLogModel, SettlementModel, SettlementRepository };
