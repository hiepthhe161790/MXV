const logger = require('../../../shared/infrastructure/Logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Settlement Service - Application Layer
 * Handles end-of-day settlement and reconciliation
 */
class SettlementService {
  constructor(settlementRepository, eventBus) {
    this.settlementRepository = settlementRepository;
    this.eventBus = eventBus;
  }

  /**
   * Log audit event
   */
  async logAuditEvent(accountId, eventType, actionType, reference, before, after, description = '', severity = 'INFO') {
    try {
      const auditLog = {
        _id: uuidv4(),
        accountId,
        eventType,
        actionType,
        reference,
        before,
        after,
        description,
        severity,
        timestamp: new Date(),
      };

      await this.settlementRepository.saveAuditLog(auditLog);
      logger.debug(`Audit logged: ${eventType} for ${accountId}`);
      
      return auditLog;
    } catch (error) {
      logger.error('Error logging audit event:', error);
    }
  }

  /**
   * End-of-Day Settlement
   * Settles all accounts and closes trading day
   */
  async performEODSettlement(settlementDate = new Date()) {
    try {
      logger.info(`Starting EOD settlement for ${settlementDate}`);

      // Publish settlement event
      await this.eventBus.publish({
        aggregateId: settlementDate.toISOString(),
        eventType: 'EODSettlementStarted',
        data: { settlementDate },
      });

      logger.info('EOD settlement completed');

      await this.eventBus.publish({
        aggregateId: settlementDate.toISOString(),
        eventType: 'EODSettlementCompleted',
        data: { settlementDate },
      });

      return { success: true, settlementDate };
    } catch (error) {
      logger.error('Error performing EOD settlement:', error);
      throw error;
    }
  }

  /**
   * Settle Account
   */
  async settleAccount(accountId, settlementDate, accountSnapshot) {
    try {
      const settlement = {
        _id: uuidv4(),
        settlementDate,
        accountId,
        openingBalance: accountSnapshot.openingBalance || 0,
        deposits: accountSnapshot.deposits || 0,
        withdrawals: accountSnapshot.withdrawals || 0,
        tradedVolume: accountSnapshot.tradedVolume || 0,
        realizedPnL: accountSnapshot.realizedPnL || 0,
        unrealizedPnL: accountSnapshot.unrealizedPnL || 0,
        closingBalance: accountSnapshot.closingBalance || 0,
        marginUsed: accountSnapshot.marginUsed || 0,
        marginLevel: accountSnapshot.marginLevel || 0,
        status: 'COMPLETED',
        completedAt: new Date(),
      };

      await this.settlementRepository.saveSettlement(settlement);
      
      logger.info(`Account settled: ${accountId} - Balance: ${settlement.closingBalance}`);

      await this.eventBus.publish({
        aggregateId: accountId,
        eventType: 'AccountSettled',
        data: settlement,
      });

      return settlement;
    } catch (error) {
      logger.error('Error settling account:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for account
   */
  async getAuditLogs(accountId, days = 30) {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      const toDate = new Date();

      return await this.settlementRepository.getAuditLogs(accountId, fromDate, toDate);
    } catch (error) {
      logger.error('Error retrieving audit logs:', error);
      throw error;
    }
  }

  /**
   * Reconcile Account
   * Verify account state matches our records
   */
  async reconcileAccount(accountId, externalBalance) {
    try {
      const settlement = await this.settlementRepository.getSettlement(new Date(), accountId);

      if (!settlement) {
        logger.warn(`No settlement found for ${accountId}`);
        return { reconciled: false, reason: 'No settlement found' };
      }

      const difference = settlement.closingBalance - externalBalance;

      if (Math.abs(difference) < 0.01) {
        logger.info(`Account reconciled: ${accountId}`);
        return { reconciled: true, difference: 0 };
      }

      logger.error(`Reconciliation failed for ${accountId}: Difference ${difference}`);

      await this.logAuditEvent(
        accountId,
        'ReconciliationFailed',
        'RECONCILE',
        accountId,
        { balanceExpected: settlement.closingBalance },
        { balanceActual: externalBalance },
        `Balance mismatch: ${difference}`,
        'ERROR'
      );

      return { reconciled: false, difference };
    } catch (error) {
      logger.error('Error reconciling account:', error);
      throw error;
    }
  }
}

module.exports = SettlementService;
