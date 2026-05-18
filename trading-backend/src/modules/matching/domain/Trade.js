/**
 * Trade representation
 */
class Trade {
  constructor(id, buyOrderId, sellOrderId, symbol, quantity, price, timestamp = new Date()) {
    this.id = id;
    this.buyOrderId = buyOrderId;
    this.sellOrderId = sellOrderId;
    this.symbol = symbol;
    this.quantity = quantity;
    this.price = price;
    this.timestamp = timestamp;
    this.buyerAccountId = null;
    this.sellerAccountId = null;
  }

  toJSON() {
    return {
      id: this.id,
      buyOrderId: this.buyOrderId,
      sellOrderId: this.sellOrderId,
      symbol: this.symbol,
      quantity: this.quantity,
      price: this.price,
      timestamp: this.timestamp,
      buyerAccountId: this.buyerAccountId,
      sellerAccountId: this.sellerAccountId,
    };
  }
}

module.exports = Trade;
