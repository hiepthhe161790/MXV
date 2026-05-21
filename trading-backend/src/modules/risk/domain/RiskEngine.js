/**
 * Risk Validation Rules
 */
const RiskRules = {
  MAX_EXPOSURE_PER_ACCOUNT: 100000, // Maximum position exposure
  MIN_MARGIN_REQUIREMENT: 0.10, // 10% minimum margin
  MAX_LEVERAGE: 10, // Maximum 10:1 leverage
  MAX_POSITION_SIZE: 10000, // Max contracts per symbol
  MARGIN_CALL_THRESHOLD: 0.20, // 20% margin level triggers call
  LIQUIDATION_THRESHOLD: 0.05, // 5% triggers auto liquidation
};

const BASE_PRICES = {
  'GCZ24': 2150,
  'SIZ24': 25.5,
  'CLZ24': 78.5,
  'NGF25': 2.8,
  'HGZ24': 3.95,
  'ZCZ24': 470,
  'ZSF25': 1020,
  'KCZ24': 185,
};


/**
 * Risk Engine Service
 * Validates orders against risk parameters
 */
class RiskEngine {
  constructor(eventBus, cache, logger) {
    this.eventBus = eventBus;
    this.cache = cache;
    this.logger = logger;
  }

  /**
   * Validate Order Against Risk Rules
   * Called when order is validated
   */
  async validateOrder(order, account, positions) {
    try {
      // 1. Resolve price from cache first, then fallback to BASE_PRICES
      let price = order.limitPrice || order.stopPrice;
      if (!price) {
        if (this.cache) {
          try {
            const cachedPrice = await this.cache.get(`market:price:${order.symbol}`);
            if (cachedPrice) {
              price = Number(cachedPrice);
            }
          } catch (cacheErr) {
            this.logger.error(`Error reading cached price for ${order.symbol}:`, cacheErr.message);
          }
        }
      }
      if (!price) {
        price = BASE_PRICES[order.symbol];
        if (!price) {
          throw new Error(`Cannot validate order: missing price for ${order.symbol}`);
        }
      }

      const validations = [
        this.checkSufficientMargin(order, account, price),
        this.checkExposureLimit(order, account, positions, price),
        this.checkPositionSize(order, positions),
        this.checkMarginRequirement(order, account, price),
      ];

      for (const validation of validations) {
        if (!validation.isValid) {
          const error = new Error(validation.reason);
          error.code = validation.code;
          throw error;
        }
      }

      const marginRequired = this.calculateMarginRequired(order, price);
      this.logger.info(`Order passed risk validation: ${order.id}. Resolved price: ${price}, margin required: ${marginRequired}`);
      return { isValid: true, marginRequired };
    } catch (error) {
      this.logger.error('Risk validation failed:', error);
      throw error;
    }
  }

  /**
   * Check if account has sufficient margin
   */
  checkSufficientMargin(order, account, price) {
    const marginRequired = this.calculateMarginRequired(order, price);
    const availableBalance = account.balance - account.frozenBalance;

    if (availableBalance < marginRequired) {
      return {
        isValid: false,
        reason: `Insufficient margin. Required: ${marginRequired}, Available: ${availableBalance}`,
        code: 'INSUFFICIENT_MARGIN',
      };
    }

    return { isValid: true };
  }

  /**
   * Check if order would exceed exposure limit
   */
  checkExposureLimit(order, account, positions, price) {
    const currentExposure = this.calculateCurrentExposure(positions);
    const orderExposure = this.calculateOrderExposure(order, price);
    const totalExposure = currentExposure + orderExposure;

    if (totalExposure > RiskRules.MAX_EXPOSURE_PER_ACCOUNT) {
      return {
        isValid: false,
        reason: `Order would exceed exposure limit. Total: ${totalExposure}, Max: ${RiskRules.MAX_EXPOSURE_PER_ACCOUNT}`,
        code: 'EXPOSURE_LIMIT_EXCEEDED',
      };
    }

    return { isValid: true };
  }

  /**
   * Check if position size would exceed limits
   */
  checkPositionSize(order, positions) {
    const position = positions.find((p) => p.symbol === order.symbol && p.side === order.side);
    const currentSize = position ? position.quantity : 0;
    const newSize = currentSize + order.quantity;

    if (newSize > RiskRules.MAX_POSITION_SIZE) {
      return {
        isValid: false,
        reason: `Position size would exceed limit. New size: ${newSize}, Max: ${RiskRules.MAX_POSITION_SIZE}`,
        code: 'POSITION_SIZE_EXCEEDED',
      };
    }

    return { isValid: true };
  }

  /**
   * Check minimum margin requirement
   */
  checkMarginRequirement(order, account, price) {
    const marginRequired = this.calculateMarginRequired(order, price);
    const equity = account.balance;
    const marginRatio = (account.frozenBalance + marginRequired) / equity;

    if (marginRatio > (1 - RiskRules.MIN_MARGIN_REQUIREMENT)) {
      return {
        isValid: false,
        reason: `Order would violate minimum margin requirement`,
        code: 'MARGIN_REQUIREMENT_VIOLATED',
      };
    }

    return { isValid: true };
  }

  /**
   * Calculate margin required for order
   */
  calculateMarginRequired(order, price = null) {
    let resolvedPrice = price || order.limitPrice || order.stopPrice || BASE_PRICES[order.symbol];
    if (!resolvedPrice || resolvedPrice <= 0) {
      throw new Error(`Cannot calculate margin: missing valid price for ${order.symbol}`);
    }
    const orderValue = order.quantity * resolvedPrice;
    const margin = orderValue / RiskRules.MAX_LEVERAGE;
    return margin;
  }

  /**
   * Calculate current exposure from open positions
   */
  calculateCurrentExposure(positions) {
    return positions.reduce((total, position) => {
      const exposure = position.quantity * position.currentPrice;
      return total + exposure;
    }, 0);
  }

  /**
   * Calculate exposure from new order
   */
  calculateOrderExposure(order, price = null) {
    let resolvedPrice = price || order.limitPrice || order.stopPrice || BASE_PRICES[order.symbol];
    if (!resolvedPrice || resolvedPrice <= 0) {
      throw new Error(`Cannot calculate exposure: missing valid price for ${order.symbol}`);
    }
    return order.quantity * resolvedPrice;
  }

  /**
   * Check Margin Call Condition
   * Called after each trade fill
   */
  async checkMarginCall(account, positions) {
    if (positions.length === 0) return null;

    const totalUnrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const equity = account.balance + totalUnrealizedPnL;
    const totalMarginUsed = positions.reduce((sum, p) => sum + p.marginUsed, 0);
    const marginLevel = equity / totalMarginUsed;

    if (marginLevel < RiskRules.MARGIN_CALL_THRESHOLD) {
      this.logger.warn(`Margin call triggered for account ${account.id}. Margin Level: ${marginLevel}`);
      
      await this.eventBus.publish({
        aggregateId: account.id,
        eventType: 'MarginCallTriggered',
        data: { marginLevel, equity, marginUsed: totalMarginUsed },
      });

      return { triggered: true, marginLevel };
    }

    return { triggered: false, marginLevel };
  }

  /**
   * Check Auto-Liquidation Condition
   * Called periodically or after losses
   */
  async checkAutoLiquidation(account, positions) {
    if (positions.length === 0) return null;

    const totalUnrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const equity = account.balance + totalUnrealizedPnL;
    const totalMarginUsed = positions.reduce((sum, p) => sum + p.marginUsed, 0);
    const marginLevel = equity / totalMarginUsed;

    if (marginLevel < RiskRules.LIQUIDATION_THRESHOLD) {
      this.logger.error(`AUTO-LIQUIDATION triggered for account ${account.id}. Margin Level: ${marginLevel}`);
      
      await this.eventBus.publish({
        aggregateId: account.id,
        eventType: 'AutoLiquidationTriggered',
        data: { marginLevel, equity, marginUsed: totalMarginUsed, positions: positions.map((p) => p.id) },
      });

      return { triggered: true, marginLevel, positions: positions.map((p) => p.id) };
    }

    return { triggered: false, marginLevel };
  }
}

module.exports = { RiskEngine, RiskRules };
