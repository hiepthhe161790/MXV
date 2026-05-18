const Position = require('../domain/Position');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../../shared/infrastructure/Logger');

/**
 * Position Service - Application Layer
 */
class PositionService {
  constructor(positionRepository, eventBus, cache) {
    this.positionRepository = positionRepository;
    this.eventBus = eventBus;
    this.cache = cache;
  }

  /**
   * Get or create position
   */
  async getOrCreatePosition(accountId, symbol, side) {
    try {
      let position = await this.positionRepository.findByAccountAndSymbol(accountId, symbol);
      
      if (!position) {
        const positionId = uuidv4();
        const newPosition = Position.create(positionId, accountId, symbol, side);
        
        await this.positionRepository.save(newPosition);
        for (const event of newPosition.getUncommittedEvents()) {
          await this.eventBus.publish(event);
        }
        newPosition.markEventsAsCommitted();
        
        position = newPosition.toJSON();
        logger.info(`Position created: ${symbol} ${side}`);
      }
      
      return position;
    } catch (error) {
      logger.error('Error getting/creating position:', error);
      throw error;
    }
  }

  /**
   * Add trade to position
   */
  async addTrade(accountId, symbol, side, tradeQuantity, tradePrice) {
    try {
      let positionData = await this.cache.get(`position:${accountId}:${symbol}`);
      if (!positionData) {
        positionData = await this.positionRepository.findByAccountAndSymbol(accountId, symbol);
      }

      if (!positionData) {
        positionData = await this.getOrCreatePosition(accountId, symbol, side);
      }

      const position = this.reconstructPosition(positionData);
      position.addTrade(tradeQuantity, tradePrice, side);

      await this.positionRepository.save(position);
      for (const event of position.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      position.markEventsAsCommitted();

      await this.cache.set(`position:${accountId}:${symbol}`, position.toJSON());
      await this.cache.invalidatePattern(`positions:account:${accountId}`);

      logger.info(`Trade added to position: ${symbol} ${side} ${tradeQuantity}@${tradePrice}`);
      return position.toJSON();
    } catch (error) {
      logger.error('Error adding trade to position:', error);
      throw error;
    }
  }

  /**
   * Update market price
   */
  async updatePrice(accountId, symbol, newPrice) {
    try {
      let positionData = await this.cache.get(`position:${accountId}:${symbol}`);
      if (!positionData) {
        positionData = await this.positionRepository.findByAccountAndSymbol(accountId, symbol);
      }

      if (!positionData) return null;

      const position = this.reconstructPosition(positionData);
      position.updateMarketPrice(newPrice);

      await this.positionRepository.save(position);
      for (const event of position.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      position.markEventsAsCommitted();

      await this.cache.set(`position:${accountId}:${symbol}`, position.toJSON());

      return position.toJSON();
    } catch (error) {
      logger.error('Error updating price:', error);
      throw error;
    }
  }

  /**
   * Close position
   */
  async closePosition(accountId, symbol, closePrice) {
    try {
      let positionData = await this.cache.get(`position:${accountId}:${symbol}`);
      if (!positionData) {
        positionData = await this.positionRepository.findByAccountAndSymbol(accountId, symbol);
      }

      if (!positionData) throw new Error('Position not found');

      const position = this.reconstructPosition(positionData);
      position.closePosition(closePrice);

      await this.positionRepository.save(position);
      for (const event of position.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      position.markEventsAsCommitted();

      await this.cache.delete(`position:${accountId}:${symbol}`);
      await this.cache.invalidatePattern(`positions:account:${accountId}`);

      logger.info(`Position closed: ${symbol} at ${closePrice}`);
      return position.toJSON();
    } catch (error) {
      logger.error('Error closing position:', error);
      throw error;
    }
  }

  /**
   * Get positions by account
   */
  async getPositionsByAccount(accountId) {
    try {
      const cacheKey = `positions:account:${accountId}`;
      let positions = await this.cache.get(cacheKey);
      if (!positions) {
        positions = await this.positionRepository.findByAccountId(accountId);
        await this.cache.set(cacheKey, positions, 300);
      }
      return positions;
    } catch (error) {
      logger.error('Error retrieving positions:', error);
      throw error;
    }
  }

  /**
   * Get open positions for account
   */
  async getOpenPositions(accountId) {
    try {
      return await this.positionRepository.findOpenPositions(accountId);
    } catch (error) {
      logger.error('Error retrieving open positions:', error);
      throw error;
    }
  }

  /**
   * Get position summary for entire system
   */
  async getSystemPositionSummary() {
    try {
      const allPositions = await this.positionRepository.findAll();
      return {
        totalPositions: allPositions.length,
        totalRealizedPnL: allPositions.reduce((sum, p) => sum + (p.realizedPnL || 0), 0),
        totalUnrealizedPnL: allPositions.reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0),
        totalMarginUsed: allPositions.reduce((sum, p) => sum + (p.marginUsed || 0), 0),
      };
    } catch (error) {
      logger.error('Error getting position summary:', error);
      throw error;
    }
  }

  /**
   * Reconstruct Position from saved data
   */
  reconstructPosition(positionData) {
    const position = new Position(
      positionData._id || positionData.id,
      positionData.accountId,
      positionData.symbol,
      positionData.side,
      positionData.quantity,
      positionData.entryPrice
    );

    position.currentPrice = positionData.currentPrice;
    position.realizedPnL = positionData.realizedPnL;
    position.unrealizedPnL = positionData.unrealizedPnL;
    position.marginUsed = positionData.marginUsed;
    position.leverage = positionData.leverage;
    position.createdAt = positionData.createdAt;
    position.updatedAt = positionData.updatedAt;

    return position;
  }
}

module.exports = PositionService;
