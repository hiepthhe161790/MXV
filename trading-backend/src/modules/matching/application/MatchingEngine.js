const Trade = require('../domain/Trade');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../../shared/infrastructure/Logger');

/**
 * Matching Engine Simulator
 * Simulates order matching for testing
 * In production, this would connect to a real exchange or matching engine
 */
class MatchingEngine {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.orderBook = {}; // { symbol: { BUY: [], SELL: [] } }
  }

  /**
   * Submit order to matching engine
   */
  async submitOrder(order) {
    try {
      this._initializeSymbolBook(order.symbol);
      
      const side = order.side === 'BUY' ? 'SELL' : 'BUY'; // Opposite side
      const matchedOrders = this.orderBook[order.symbol][side];
      
      let remainingQuantity = order.quantity;

      // Try to match against existing orders
      for (let i = matchedOrders.length - 1; i >= 0 && remainingQuantity > 0; i--) {
        const matchedOrder = matchedOrders[i];
        
        // Check if price matches
        if (this._isPriceMatched(order, matchedOrder)) {
          const fillQuantity = Math.min(remainingQuantity, matchedOrder.quantity);
          const tradePrice = matchedOrder.limitPrice || order.limitPrice || 100; // Use limit price or default
          
          // Create trade
          const trade = await this._createTrade(order, matchedOrder, fillQuantity, tradePrice);
          
          // Publish trade events
          await this._publishTradeEvents(trade, order, matchedOrder, fillQuantity, tradePrice);
          
          remainingQuantity -= fillQuantity;
          matchedOrder.quantity -= fillQuantity;
          
          // Remove matched order if fully filled
          if (matchedOrder.quantity === 0) {
            matchedOrders.splice(i, 1);
          }
        }
      }

      // Add remaining quantity to order book (only if not market)
      if (remainingQuantity > 0) {
        if (order.orderType === 'MARKET') {
          // MOCK: Auto-fill remaining market orders against a simulated liquidity provider
          const mockPrice = order.limitPrice || 100;
          const mockOpposingOrder = {
            id: 'mock-liq-' + uuidv4(),
            accountId: 'mock-liquidity-provider',
            side: side,
            quantity: remainingQuantity,
            orderType: 'LIMIT',
            limitPrice: mockPrice
          };
          const trade = await this._createTrade(order, mockOpposingOrder, remainingQuantity, mockPrice);
          await this._publishTradeEvents(trade, order, mockOpposingOrder, remainingQuantity, mockPrice);
          remainingQuantity = 0;
          logger.info(`Market order auto-filled by simulated liquidity: ${order.id} - ${trade.quantity}@${mockPrice}`);
        } else {
          this.orderBook[order.symbol][order.side].push({
            id: order.id,
            accountId: order.accountId,
            side: order.side,
            quantity: remainingQuantity,
            limitPrice: order.limitPrice,
            createdAt: new Date(),
          });
          
          logger.info(`Order added to book: ${order.id} - ${remainingQuantity}@${order.limitPrice}`);
        }
      }

      return { remainingQuantity, trades: [] };
    } catch (error) {
      logger.error('Error submitting order to matching engine:', error);
      throw error;
    }
  }

  /**
   * Cancel order from matching engine
   */
  async cancelOrder(orderId, symbol) {
    try {
      if (!this.orderBook[symbol]) return;

      ['BUY', 'SELL'].forEach((side) => {
        const index = this.orderBook[symbol][side].findIndex((o) => o.id === orderId);
        if (index !== -1) {
          this.orderBook[symbol][side].splice(index, 1);
          logger.info(`Order cancelled from book: ${orderId}`);
        }
      });
    } catch (error) {
      logger.error('Error cancelling order:', error);
    }
  }

  /**
   * Simulate price movement and trigger matches
   * Called periodically for market orders
   */
  async simulatePriceMovement(symbol, newPrice) {
    try {
      if (!this.orderBook[symbol]) return [];

      const trades = [];
      const buyOrders = this.orderBook[symbol]['BUY'];
      const sellOrders = this.orderBook[symbol]['SELL'];

      // 1. Match BUY LIMIT orders in the book against the new market price
      // A BUY LIMIT matches if its limitPrice >= newPrice
      for (let i = buyOrders.length - 1; i >= 0; i--) {
        const buyOrder = buyOrders[i];
        if (buyOrder.limitPrice >= newPrice) {
          const mockOpposingOrder = {
            id: 'mock-liq-' + uuidv4(),
            accountId: 'mock-liquidity-provider',
            side: 'SELL',
            symbol: symbol,
            quantity: buyOrder.quantity,
            orderType: 'LIMIT',
            limitPrice: newPrice
          };

          const trade = await this._createTrade(buyOrder, mockOpposingOrder, buyOrder.quantity, newPrice);
          await this._publishTradeEvents(trade, buyOrder, mockOpposingOrder, buyOrder.quantity, newPrice);
          
          trades.push(trade);
          logger.info(`BUY LIMIT order matched against market price ${newPrice}: ${buyOrder.id}`);
          
          // Remove from book
          buyOrders.splice(i, 1);
        }
      }

      // 2. Match SELL LIMIT orders in the book against the new market price
      // A SELL LIMIT matches if its limitPrice <= newPrice
      for (let i = sellOrders.length - 1; i >= 0; i--) {
        const sellOrder = sellOrders[i];
        if (sellOrder.limitPrice <= newPrice) {
          const mockOpposingOrder = {
            id: 'mock-liq-' + uuidv4(),
            accountId: 'mock-liquidity-provider',
            side: 'BUY',
            symbol: symbol,
            quantity: sellOrder.quantity,
            orderType: 'LIMIT',
            limitPrice: newPrice
          };

          const trade = await this._createTrade(mockOpposingOrder, sellOrder, sellOrder.quantity, newPrice);
          await this._publishTradeEvents(trade, mockOpposingOrder, sellOrder, sellOrder.quantity, newPrice);
          
          trades.push(trade);
          logger.info(`SELL LIMIT order matched against market price ${newPrice}: ${sellOrder.id}`);
          
          // Remove from book
          sellOrders.splice(i, 1);
        }
      }

      return trades;
    } catch (error) {
      logger.error('Error simulating price movement:', error);
      return [];
    }
  }

  /**
   * Check if order price matches
   */
  _isPriceMatched(order, matchedOrder) {
    // Market orders always match
    if (order.orderType === 'MARKET' || matchedOrder.orderType === 'MARKET') {
      return true;
    }

    // Limit orders - check price overlap
    if (order.side === 'BUY' && matchedOrder.side === 'SELL') {
      return order.limitPrice >= matchedOrder.limitPrice;
    }
    if (order.side === 'SELL' && matchedOrder.side === 'BUY') {
      return order.limitPrice <= matchedOrder.limitPrice;
    }

    return false;
  }

  /**
   * Create trade record
   */
  async _createTrade(buyerOrder, sellerOrder, quantity, price) {
    const isBuyer = buyerOrder.side === 'BUY';
    const trade = new Trade(
      uuidv4(),
      isBuyer ? buyerOrder.id : sellerOrder.id,
      isBuyer ? sellerOrder.id : buyerOrder.id,
      buyerOrder.symbol,
      quantity,
      price
    );

    trade.buyerAccountId = isBuyer ? buyerOrder.accountId : sellerOrder.accountId;
    trade.sellerAccountId = isBuyer ? sellerOrder.accountId : buyerOrder.accountId;

    return trade;
  }

  /**
   * Publish trade events to event bus
   */
  async _publishTradeEvents(trade, order1, order2, quantity, price) {
    try {
      // Publish trade events for both orders
      await this.eventBus.publish({
        aggregateId: trade.id,
        eventType: 'TradeExecuted',
        data: trade.toJSON ? trade.toJSON() : trade,
      });

      logger.info(`Trade executed: ${quantity}@${price} - Buy: ${trade.buyOrderId}, Sell: ${trade.sellOrderId}`);
    } catch (error) {
      logger.error('Error publishing trade events:', error);
    }
  }

  /**
   * Initialize symbol order book
   */
  _initializeSymbolBook(symbol) {
    if (!this.orderBook[symbol]) {
      this.orderBook[symbol] = { BUY: [], SELL: [] };
    }
  }

  /**
   * Get order book for symbol
   */
  getOrderBook(symbol) {
    return this.orderBook[symbol] || { BUY: [], SELL: [] };
  }

  /**
   * Get depth snapshot
   */
  getDepth(symbol, depth = 5) {
    const book = this.orderBook[symbol];
    if (!book) return { bids: [], asks: [] };

    return {
      bids: book.BUY.slice(-depth).reverse(),
      asks: book.SELL.slice(0, depth),
      timestamp: new Date(),
    };
  }
}

module.exports = MatchingEngine;
