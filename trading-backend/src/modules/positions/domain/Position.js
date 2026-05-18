const AggregateRoot = require('../../../shared/domain/AggregateRoot');
const DomainEvent = require('../../../shared/domain/DomainEvent');

/**
 * Position Aggregate Root
 * Represents an open position for a symbol
 */
class Position extends AggregateRoot {
  constructor(id, accountId, symbol, side, quantity = 0, entryPrice = 0) {
    super(id);
    this.accountId = accountId;
    this.symbol = symbol;
    this.side = side === 'BUY' ? 'LONG' : (side === 'SELL' ? 'SHORT' : side); // LONG or SHORT
    this.quantity = quantity; // Current quantity
    this.entryPrice = entryPrice; // Average entry price
    this.currentPrice = entryPrice; // Last market price
    this.realizedPnL = 0;
    this.unrealizedPnL = 0;
    this.marginUsed = 0;
    this.leverage = 10;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static create(id, accountId, symbol, side) {
    const position = new Position(id, accountId, symbol, side);
    position.raiseEvent(new DomainEvent(
      id,
      'PositionOpened',
      { accountId, symbol, side: position.side, quantity: 0, entryPrice: 0 }
    ));
    return position;
  }

  /**
   * Update position with new trade
   */
  addTrade(tradeQuantity, tradePrice, tradeSide) {
    const normalizedTradeSide = tradeSide === 'BUY' ? 'LONG' : (tradeSide === 'SELL' ? 'SHORT' : tradeSide);

    if (this.quantity === 0) {
      // Opening a new position from a flat state
      this.side = normalizedTradeSide;
      this.quantity = tradeQuantity;
      this.entryPrice = tradePrice;
    } else if (normalizedTradeSide === this.side) {
      // Adding to existing position
      const newTotal = (this.quantity * this.entryPrice) + (tradeQuantity * tradePrice);
      this.quantity += tradeQuantity;
      this.entryPrice = newTotal / this.quantity;
    } else {
      // Closing or reversing position
      if (tradeQuantity > this.quantity) {
        // Reversal: close existing and open opposite
        const closingPnL = this.side === 'LONG'
          ? (tradePrice - this.entryPrice) * this.quantity
          : (this.entryPrice - tradePrice) * this.quantity;
        
        this.realizedPnL += closingPnL;
        
        // Open the remaining in the opposite direction
        this.quantity = tradeQuantity - this.quantity;
        this.entryPrice = tradePrice;
        this.side = normalizedTradeSide;
      } else if (tradeQuantity === this.quantity) {
        // Exact close
        const closingPnL = this.side === 'LONG'
          ? (tradePrice - this.entryPrice) * this.quantity
          : (this.entryPrice - tradePrice) * this.quantity;
          
        this.realizedPnL += closingPnL;
        this.quantity = 0;
      } else {
        // Partial close
        const closingPnL = this.side === 'LONG'
          ? (tradePrice - this.entryPrice) * tradeQuantity
          : (this.entryPrice - tradePrice) * tradeQuantity;
          
        this.realizedPnL += closingPnL;
        this.quantity -= tradeQuantity;
      }
    }

    this.marginUsed = (this.quantity * this.entryPrice) / this.leverage;

    this.raiseEvent(new DomainEvent(
      this.id,
      'PositionUpdated',
      {
        quantity: this.quantity,
        entryPrice: this.entryPrice,
        realizedPnL: this.realizedPnL,
        unrealizedPnL: this.unrealizedPnL,
        marginUsed: this.marginUsed,
        side: this.side,
      }
    ));
  }

  /**
   * Update market price and recalculate unrealized P&L
   */
  updateMarketPrice(newPrice) {
    this.currentPrice = newPrice;
    this.recalculatePnL();
    
    this.marginUsed = (this.quantity * this.currentPrice) / this.leverage;

    this.raiseEvent(new DomainEvent(
      this.id,
      'PriceUpdated',
      {
        currentPrice: newPrice,
        unrealizedPnL: this.unrealizedPnL,
        marginUsed: this.marginUsed,
      }
    ));
  }

  /**
   * Recalculate unrealized P&L based on current price
   */
  recalculatePnL() {
    if (this.quantity === 0) {
      this.unrealizedPnL = 0;
      return;
    }

    if (this.side === 'LONG') {
      this.unrealizedPnL = (this.currentPrice - this.entryPrice) * this.quantity;
    } else if (this.side === 'SHORT') {
      this.unrealizedPnL = (this.entryPrice - this.currentPrice) * this.quantity;
    }
  }

  /**
   * Close position at specified price
   */
  closePosition(closePrice) {
    if (this.quantity === 0) {
      throw new Error('Position is already closed');
    }

    const closingPnL = this.side === 'LONG'
      ? (closePrice - this.entryPrice) * this.quantity
      : (this.entryPrice - closePrice) * this.quantity;

    this.realizedPnL += closingPnL;
    this.unrealizedPnL = 0;
    this.quantity = 0;
    this.currentPrice = closePrice;

    this.marginUsed = 0;

    this.raiseEvent(new DomainEvent(
      this.id,
      'PositionClosed',
      {
        closePrice,
        realizedPnL: this.realizedPnL,
        totalPnL: this.realizedPnL + this.unrealizedPnL,
        marginUsed: this.marginUsed,
      }
    ));
  }

  /**
   * Calculate total P&L (realized + unrealized)
   */
  getTotalPnL() {
    return this.realizedPnL + this.unrealizedPnL;
  }

  applyEvent(event) {
    switch (event.eventType) {
      case 'PositionOpened':
        this.accountId = event.data.accountId;
        this.symbol = event.data.symbol;
        this.side = event.data.side === 'BUY' ? 'LONG' : (event.data.side === 'SELL' ? 'SHORT' : event.data.side);
        break;

      case 'PositionUpdated':
        this.quantity = event.data.quantity;
        this.entryPrice = event.data.entryPrice;
        this.realizedPnL = event.data.realizedPnL;
        this.unrealizedPnL = event.data.unrealizedPnL;
        this.marginUsed = event.data.marginUsed;
        if (event.data.side) this.side = event.data.side === 'BUY' ? 'LONG' : (event.data.side === 'SELL' ? 'SHORT' : event.data.side);
        break;

      case 'PriceUpdated':
        this.currentPrice = event.data.currentPrice;
        this.unrealizedPnL = event.data.unrealizedPnL;
        this.marginUsed = event.data.marginUsed;
        break;

      case 'PositionClosed':
        this.quantity = 0;
        this.realizedPnL = event.data.realizedPnL;
        this.unrealizedPnL = 0;
        this.marginUsed = 0;
        break;
    }
    this.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      accountId: this.accountId,
      symbol: this.symbol,
      side: this.side,
      quantity: this.quantity,
      entryPrice: this.entryPrice,
      currentPrice: this.currentPrice,
      realizedPnL: this.realizedPnL,
      unrealizedPnL: this.unrealizedPnL,
      totalPnL: this.getTotalPnL(),
      marginUsed: this.marginUsed,
      leverage: this.leverage,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isClosed: this.quantity === 0,
    };
  }
}

module.exports = Position;
