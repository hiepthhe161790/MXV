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
        logger.info(`[FLOW-DEBUG] [4-POSITION_CREATED] New position created: ${position.id || position._id} for Account: ${accountId}, Symbol: ${symbol}, Side: ${side}`);
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
      logger.info(`[FLOW-DEBUG] [4-ADD_TRADE_START] Adding trade to position for Account: ${accountId}, Symbol: ${symbol}, Side: ${side}, TradeQty: ${tradeQuantity} @ Price: ${tradePrice}`);

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

      logger.info(`[FLOW-DEBUG] [4-ADD_TRADE_DONE] Trade added successfully. Position ${position.id} now has Qty: ${position.quantity}, EntryPrice: ${position.entryPrice}, MarginUsed: ${position.marginUsed}`);
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
      
      const marginReleased = position.marginUsed;

      logger.info(`[FLOW-DEBUG] [5-CLOSE_POSITION_START] Closing position: Account: ${accountId}, Symbol: ${symbol}. Current Qty: ${position.quantity}, EntryPrice: ${position.entryPrice}, MarginUsed: ${position.marginUsed} at ClosePrice: ${closePrice}`);

      position.closePosition(closePrice);

      await this.positionRepository.save(position);
      for (const event of position.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      position.markEventsAsCommitted();

      await this.cache.delete(`position:${accountId}:${symbol}`);
      await this.cache.invalidatePattern(`positions:account:${accountId}`);

      logger.info(`[FLOW-DEBUG] [5-CLOSE_POSITION_DONE] Position ${position.id} closed. RealizedPnL: ${position.realizedPnL}, Margin released: ${marginReleased}`);
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
    position.stopLossPrice = positionData.stopLossPrice;
    position.takeProfitPrice = positionData.takeProfitPrice;
    position.createdAt = positionData.createdAt;
    position.updatedAt = positionData.updatedAt;

    return position;
  }

  /**
   * Set Stop Loss and Take Profit levels
   */
  async updateSLTP(accountId, symbol, stopLossPrice, takeProfitPrice) {
    try {
      let positionData = await this.cache.get(`position:${accountId}:${symbol}`);
      if (!positionData) {
        positionData = await this.positionRepository.findByAccountAndSymbol(accountId, symbol);
      }

      if (!positionData) throw new Error('Position not found');

      const position = this.reconstructPosition(positionData);
      position.updateSLTP(stopLossPrice, takeProfitPrice);

      await this.positionRepository.save(position);
      for (const event of position.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      position.markEventsAsCommitted();

      await this.cache.set(`position:${accountId}:${symbol}`, position.toJSON());
      await this.cache.invalidatePattern(`positions:account:${accountId}`);

      logger.info(`SL/TP updated for position ${symbol}: SL=${stopLossPrice}, TP=${takeProfitPrice}`);
      return position.toJSON();
    } catch (error) {
      logger.error('Error updating SL/TP for position:', error);
      throw error;
    }
  }
}

module.exports = PositionService;
