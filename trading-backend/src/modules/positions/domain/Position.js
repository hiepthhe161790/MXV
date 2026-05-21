const AggregateRoot = require('../../../shared/domain/AggregateRoot');
const DomainEvent = require('../../../shared/domain/DomainEvent');
const { roundToMoneyPrecision, calculateMarginRequired } = require('../../../shared/utils/currency');

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
    this.stopLossPrice = null;
    this.takeProfitPrice = null;
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
    // Input validation
    if (!tradeQuantity || tradeQuantity <= 0) {
      throw new Error(`Invalid trade quantity: ${tradeQuantity}`);
    }
    if (!tradePrice || tradePrice <= 0) {
      throw new Error(`Invalid trade price: ${tradePrice}`);
    }
    if (!tradeSide || !['BUY', 'SELL', 'LONG', 'SHORT'].includes(tradeSide)) {
      throw new Error(`Invalid trade side: ${tradeSide}`);
    }

    const normalizedTradeSide = tradeSide === 'BUY' ? 'LONG' : (tradeSide === 'SELL' ? 'SHORT' : tradeSide);

    if (this.quantity === 0) {
      // Opening a new position from a flat state — reset realized P&L so previous
      // closed-trade history doesn't bleed into the new position display
      this.realizedPnL = 0;
      this.side = normalizedTradeSide;
      this.quantity = tradeQuantity;
      this.entryPrice = roundToMoneyPrecision(tradePrice);
      this.currentPrice = roundToMoneyPrecision(tradePrice); // Set current price to fill price
    } else if (normalizedTradeSide === this.side) {
      // Adding to existing position
      const newTotal = roundToMoneyPrecision((this.quantity * this.entryPrice) + (tradeQuantity * tradePrice));
      this.quantity += tradeQuantity;
      this.entryPrice = roundToMoneyPrecision(newTotal / this.quantity);
      this.currentPrice = roundToMoneyPrecision(tradePrice); // Update current price to latest fill price
    } else {
      // Closing or reversing position
      if (tradeQuantity > this.quantity) {
        // Reversal: close existing and open opposite
        const closingPnL = roundToMoneyPrecision(
          this.side === 'LONG'
            ? (tradePrice - this.entryPrice) * this.quantity
            : (this.entryPrice - tradePrice) * this.quantity
        );
        
        this.realizedPnL = roundToMoneyPrecision(this.realizedPnL + closingPnL);
        
        // Open the remaining in the opposite direction
        this.quantity = tradeQuantity - this.quantity;
        this.entryPrice = roundToMoneyPrecision(tradePrice);
        this.currentPrice = roundToMoneyPrecision(tradePrice);
        this.side = normalizedTradeSide;
      } else if (tradeQuantity === this.quantity) {
        // Exact close
        const closingPnL = roundToMoneyPrecision(
          this.side === 'LONG'
            ? (tradePrice - this.entryPrice) * this.quantity
            : (this.entryPrice - tradePrice) * this.quantity
        );
          
        this.realizedPnL = roundToMoneyPrecision(this.realizedPnL + closingPnL);
        this.quantity = 0;
        this.currentPrice = roundToMoneyPrecision(tradePrice); // Record close price
      } else {
        // Partial close
        const closingPnL = roundToMoneyPrecision(
          this.side === 'LONG'
            ? (tradePrice - this.entryPrice) * tradeQuantity
            : (this.entryPrice - tradePrice) * tradeQuantity
        );
          
        this.realizedPnL = roundToMoneyPrecision(this.realizedPnL + closingPnL);
        this.quantity -= tradeQuantity;
        this.currentPrice = roundToMoneyPrecision(tradePrice); // Update current price
      }
    }

    // Margin is based on quantity × current market price / leverage
    // This way margin reflects actual risk exposure
    this.marginUsed = this.quantity > 0 ? roundToMoneyPrecision((this.quantity * this.currentPrice) / this.leverage) : 0;
    
    // Recalculate unrealized P&L now that currentPrice is updated
    this.recalculatePnL();

    this.raiseEvent(new DomainEvent(
      this.id,
      'PositionUpdated',
      {
        quantity: this.quantity,
        entryPrice: this.entryPrice,
        currentPrice: this.currentPrice,
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
    this.currentPrice = roundToMoneyPrecision(newPrice);
    this.recalculatePnL();
    
    this.marginUsed = this.quantity > 0 ? roundToMoneyPrecision((this.quantity * this.currentPrice) / this.leverage) : 0;

    this.raiseEvent(new DomainEvent(
      this.id,
      'PriceUpdated',
      {
        currentPrice: this.currentPrice,
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
      this.unrealizedPnL = roundToMoneyPrecision((this.currentPrice - this.entryPrice) * this.quantity);
    } else if (this.side === 'SHORT') {
      this.unrealizedPnL = roundToMoneyPrecision((this.entryPrice - this.currentPrice) * this.quantity);
    }
  }

  /**
   * Close position at specified price
   */
  closePosition(closePrice) {
    if (this.quantity === 0) {
      throw new Error('Position is already closed');
    }

    const closingPnL = roundToMoneyPrecision(
      this.side === 'LONG'
        ? (closePrice - this.entryPrice) * this.quantity
        : (this.entryPrice - closePrice) * this.quantity
    );

    const marginBeforeClose = this.marginUsed;

    this.realizedPnL = roundToMoneyPrecision(this.realizedPnL + closingPnL);
    this.unrealizedPnL = 0;
    this.quantity = 0;
    this.currentPrice = roundToMoneyPrecision(closePrice);

    this.marginUsed = 0;

    this.raiseEvent(new DomainEvent(
      this.id,
      'PositionClosed',
      {
        closePrice,
        realizedPnL: this.realizedPnL,
        totalPnL: this.realizedPnL + this.unrealizedPnL,
        marginUsed: marginBeforeClose,
      }
    ));
  }

  /**
   * Update Stop Loss and Take Profit levels
   */
  updateSLTP(stopLossPrice, takeProfitPrice) {
    this.stopLossPrice = stopLossPrice || null;
    this.takeProfitPrice = takeProfitPrice || null;

    this.raiseEvent(new DomainEvent(
      this.id,
      'PositionSLTPUpdated',
      {
        stopLossPrice: this.stopLossPrice,
        takeProfitPrice: this.takeProfitPrice,
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
        if (event.data.stopLossPrice !== undefined) this.stopLossPrice = event.data.stopLossPrice;
        if (event.data.takeProfitPrice !== undefined) this.takeProfitPrice = event.data.takeProfitPrice;
        break;

      case 'PositionSLTPUpdated':
        this.stopLossPrice = event.data.stopLossPrice;
        this.takeProfitPrice = event.data.takeProfitPrice;
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
      stopLossPrice: this.stopLossPrice,
      takeProfitPrice: this.takeProfitPrice,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isClosed: this.quantity === 0,
    };
  }
}

module.exports = Position;
