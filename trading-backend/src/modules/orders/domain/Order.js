const AggregateRoot = require('../../../shared/domain/AggregateRoot');
const DomainEvent = require('../../../shared/domain/DomainEvent');

/**
 * Order States:
 * NEW → VALIDATED → SENT → FILLED → (complete)
 *   ↓
 * VALIDATED → REJECTED (during validation)
 * SENT → CANCELLED (by user)
 * SENT → PARTIALLY_FILLED → FILLED (matching)
 */
const OrderState = {
  NEW: 'NEW',
  VALIDATED: 'VALIDATED',
  SENT: 'SENT',
  PARTIALLY_FILLED: 'PARTIALLY_FILLED',
  FILLED: 'FILLED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
};

/**
 * Order Aggregate Root
 * Manages order lifecycle and business logic
 */
class Order extends AggregateRoot {
  constructor(id, accountId, symbol, side, quantity, orderType, limitPrice = null, stopPrice = null) {
    super(id);
    this.accountId = accountId;
    this.symbol = symbol;
    this.side = side; // BUY or SELL
    this.quantity = quantity;
    this.orderType = orderType; // MARKET, LIMIT, STOP, STOP_LIMIT
    this.limitPrice = limitPrice;
    this.stopPrice = stopPrice;
    this.state = OrderState.NEW;
    this.filledQuantity = 0;
    this.averagePrice = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.idempotencyKey = null; // For idempotent order submission
  }

  static create(id, accountId, symbol, side, quantity, orderType, limitPrice = null, stopPrice = null, idempotencyKey = null) {
    const order = new Order(id, accountId, symbol, side, quantity, orderType, limitPrice, stopPrice);
    order.idempotencyKey = idempotencyKey;
    
    order.raiseEvent(new DomainEvent(
      id,
      'OrderCreated',
      {
        accountId,
        symbol,
        side,
        quantity,
        orderType,
        limitPrice,
        stopPrice,
        idempotencyKey,
      }
    ));
    
    return order;
  }

  validate() {
    if (this.state !== OrderState.NEW) {
      throw new Error(`Cannot validate order in ${this.state} state`);
    }
    
    if (this.quantity <= 0) throw new Error('Quantity must be positive');
    if (!['BUY', 'SELL'].includes(this.side)) throw new Error('Invalid side');
    if (!['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'].includes(this.orderType)) {
      throw new Error('Invalid order type');
    }
    
    if (['LIMIT', 'STOP_LIMIT'].includes(this.orderType) && !this.limitPrice) {
      throw new Error('Limit price required for LIMIT/STOP_LIMIT orders');
    }
    if (['STOP', 'STOP_LIMIT'].includes(this.orderType) && !this.stopPrice) {
      throw new Error('Stop price required for STOP/STOP_LIMIT orders');
    }
    
    this.raiseEvent(new DomainEvent(
      this.id,
      'OrderValidated',
      { state: OrderState.VALIDATED }
    ));
  }

  send() {
    if (this.state !== OrderState.VALIDATED) {
      throw new Error(`Cannot send order in ${this.state} state`);
    }
    
    this.raiseEvent(new DomainEvent(
      this.id,
      'OrderSent',
      { state: OrderState.SENT }
    ));
  }

  fill(filledQuantity, price) {
    if (![OrderState.SENT, OrderState.PARTIALLY_FILLED].includes(this.state)) {
      throw new Error(`Cannot fill order in ${this.state} state`);
    }
    
    if (filledQuantity <= 0 || filledQuantity > (this.quantity - this.filledQuantity)) {
      throw new Error('Invalid fill quantity');
    }
    
    const newFilledQuantity = this.filledQuantity + filledQuantity;
    const newTotal = (this.averagePrice * this.filledQuantity) + (price * filledQuantity);
    const newAveragePrice = newTotal / newFilledQuantity;
    
    const isPartialFill = newFilledQuantity < this.quantity;
    const newState = isPartialFill ? OrderState.PARTIALLY_FILLED : OrderState.FILLED;
    
    this.raiseEvent(new DomainEvent(
      this.id,
      'OrderFilled',
      {
        filledQuantity,
        price,
        totalFilled: newFilledQuantity,
        averagePrice: newAveragePrice,
        state: newState,
      }
    ));
  }

  cancel() {
    if (![OrderState.SENT, OrderState.PARTIALLY_FILLED].includes(this.state)) {
      throw new Error(`Cannot cancel order in ${this.state} state`);
    }
    
    this.raiseEvent(new DomainEvent(
      this.id,
      'OrderCancelled',
      { 
        state: OrderState.CANCELLED,
        filledQuantity: this.filledQuantity,
      }
    ));
  }

  reject(reason) {
    if (this.state !== OrderState.VALIDATED) {
      throw new Error(`Cannot reject order in ${this.state} state`);
    }
    
    this.raiseEvent(new DomainEvent(
      this.id,
      'OrderRejected',
      { state: OrderState.REJECTED, reason }
    ));
  }

  applyEvent(event) {
    switch (event.eventType) {
      case 'OrderCreated':
        Object.assign(this, event.data);
        this.state = OrderState.NEW;
        break;
      
      case 'OrderValidated':
        this.state = event.data.state;
        break;
      
      case 'OrderSent':
        this.state = event.data.state;
        break;
      
      case 'OrderFilled':
        this.filledQuantity = event.data.totalFilled;
        this.averagePrice = event.data.averagePrice;
        this.state = event.data.state;
        break;
      
      case 'OrderCancelled':
        this.state = event.data.state;
        break;
      
      case 'OrderRejected':
        this.state = event.data.state;
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
      orderType: this.orderType,
      limitPrice: this.limitPrice,
      stopPrice: this.stopPrice,
      state: this.state,
      filledQuantity: this.filledQuantity,
      averagePrice: this.averagePrice,
      totalValue: this.filledQuantity * this.averagePrice,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      idempotencyKey: this.idempotencyKey,
    };
  }
}

module.exports = { Order, OrderState };
