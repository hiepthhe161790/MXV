const { RiskEngine } = require('../domain/RiskEngine');
const logger = require('../../../shared/infrastructure/Logger');

/**
 * Risk Management Service - Application Layer
 */
class RiskService {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.riskEngine = new RiskEngine(eventBus, logger);
  }

  /**
   * Validate Order Before Sending to Exchange
   */
  async validateOrderForPlacement(order, account, positions) {
    try {
      const result = await this.riskEngine.validateOrder(order, account, positions);
      logger.info(`Order ${order.id} passed risk validation`);
      return { isValid: true, marginRequired: result.marginRequired };
    } catch (error) {
      logger.error(`Order ${order.id} failed risk validation:`, error.message);
      return {
        isValid: false,
        reason: error.message,
        code: error.code,
      };
    }
  }

  /**
   * Check and Handle Margin Calls
   */
  async handleMarginCheck(account, positions) {
    try {
      const marginCall = await this.riskEngine.checkMarginCall(account, positions);
      return marginCall;
    } catch (error) {
      logger.error('Error checking margin:', error);
      throw error;
    }
  }

  /**
   * Check and Handle Auto-Liquidation
   */
  async handleAutoLiquidation(account, positions) {
    try {
      const liquidation = await this.riskEngine.checkAutoLiquidation(account, positions);
      return liquidation;
    } catch (error) {
      logger.error('Error checking auto-liquidation:', error);
      throw error;
    }
  }
}

module.exports = RiskService;
