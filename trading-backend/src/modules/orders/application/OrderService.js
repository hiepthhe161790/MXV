const { Order, OrderState } = require('../domain/Order');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../../shared/infrastructure/Logger');

/**
 * Order Service - Application Layer
 * Handles order lifecycle and use cases
 */
class OrderService {
  constructor(orderRepository, eventBus, cache) {
    this.orderRepository = orderRepository;
    this.eventBus = eventBus;
    this.cache = cache;
  }

  /**
   * Place Order - Entry point for new orders
   * Includes idempotency check
   */
  async placeOrder(accountId, symbol, side, quantity, orderType, limitPrice = null, stopPrice = null, idempotencyKey = null) {
    try {
      // Idempotency check
      if (idempotencyKey) {
        const existing = await this.orderRepository.findByIdempotencyKey(idempotencyKey);
        if (existing) {
          logger.info(`Order already submitted (idempotency): ${idempotencyKey}`);
          return existing;
        }
      }
      
      const orderId = uuidv4();
      const order = Order.create(
        orderId,
        accountId,
        symbol,
        side,
        quantity,
        orderType,
        limitPrice,
        stopPrice,
        idempotencyKey
      );
      
      // Validate order
      order.validate();
      
      // Persist and publish events
      await this.orderRepository.save(order);
      for (const event of order.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      order.markEventsAsCommitted();
      
      // Cache
      await this.cache.set(`order:${orderId}`, order.toJSON());
      
      logger.info(`Order placed: ${orderId} - ${accountId} ${side} ${quantity} ${symbol}`);
      return order.toJSON();
    } catch (error) {
      logger.error('Error placing order:', error);
      throw error;
    }
  }

  /**
   * Send Order to Exchange
   */
  async sendOrder(orderId) {
    try {
      let orderData = await this.cache.get(`order:${orderId}`);
      if (!orderData) {
        orderData = await this.orderRepository.findById(orderId);
      }
      
      if (!orderData) throw new Error('Order not found');
      
      const order = this.reconstructOrder(orderData);
      order.send();
      
      await this.orderRepository.save(order);
      for (const event of order.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      order.markEventsAsCommitted();
      
      await this.cache.set(`order:${orderId}`, order.toJSON());
      
      logger.info(`Order sent: ${orderId}`);
      return order.toJSON();
    } catch (error) {
      logger.error('Error sending order:', error);
      throw error;
    }
  }

  /**
   * Process Order Fill from Matching Engine
   */
  async fillOrder(orderId, filledQuantity, price) {
    try {
      let orderData = await this.cache.get(`order:${orderId}`);
      if (!orderData) {
        orderData = await this.orderRepository.findById(orderId);
      }
      
      if (!orderData) throw new Error('Order not found');
      
      const order = this.reconstructOrder(orderData);
      order.fill(filledQuantity, price);
      
      await this.orderRepository.save(order);
      for (const event of order.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      order.markEventsAsCommitted();
      
      await this.cache.set(`order:${orderId}`, order.toJSON());
      
      logger.info(`Order filled: ${orderId} - ${filledQuantity}@${price}`);
      return order.toJSON();
    } catch (error) {
      logger.error('Error filling order:', error);
      throw error;
    }
  }

  /**
   * Cancel Order
   */
  async cancelOrder(orderId) {
    try {
      let orderData = await this.cache.get(`order:${orderId}`);
      if (!orderData) {
        orderData = await this.orderRepository.findById(orderId);
      }
      
      if (!orderData) throw new Error('Order not found');
      
      const order = this.reconstructOrder(orderData);
      order.cancel();
      
      await this.orderRepository.save(order);
      for (const event of order.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      order.markEventsAsCommitted();
      
      await this.cache.set(`order:${orderId}`, order.toJSON());
      await this.cache.invalidatePattern(`orders:account:*`);
      
      logger.info(`Order cancelled: ${orderId}`);
      return order.toJSON();
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Reject Order (from Risk Engine, etc.)
   */
  async rejectOrder(orderId, reason) {
    try {
      let orderData = await this.cache.get(`order:${orderId}`);
      if (!orderData) {
        orderData = await this.orderRepository.findById(orderId);
      }
      
      if (!orderData) throw new Error('Order not found');
      
      const order = this.reconstructOrder(orderData);
      order.reject(reason);
      
      await this.orderRepository.save(order);
      for (const event of order.getUncommittedEvents()) {
        await this.eventBus.publish(event);
      }
      order.markEventsAsCommitted();
      
      await this.cache.set(`order:${orderId}`, order.toJSON());
      
      logger.info(`Order rejected: ${orderId} - ${reason}`);
      return order.toJSON();
    } catch (error) {
      logger.error('Error rejecting order:', error);
      throw error;
    }
  }

  /**
   * Get Order
   */
  async getOrder(orderId) {
    try {
      let orderData = await this.cache.get(`order:${orderId}`);
      if (!orderData) {
        orderData = await this.orderRepository.findById(orderId);
        if (orderData) {
          await this.cache.set(`order:${orderId}`, orderData);
        }
      }
      return orderData;
    } catch (error) {
      logger.error('Error retrieving order:', error);
      throw error;
    }
  }

  /**
   * Get Orders by Account
   */
  async getOrdersByAccount(accountId, state = null) {
    try {
      const cacheKey = `orders:account:${accountId}:${state || 'all'}`;
      let orders = await this.cache.get(cacheKey);
      if (!orders) {
        orders = await this.orderRepository.findByAccountId(accountId, state);
        await this.cache.set(cacheKey, orders, 300); // 5 min TTL
      }
      return orders;
    } catch (error) {
      logger.error('Error retrieving account orders:', error);
      throw error;
    }
  }

  async getAllOrders(state = null) {
    try {
      const cacheKey = `orders:all:${state || 'all'}`;
      let orders = await this.cache.get(cacheKey);
      if (!orders) {
        orders = state
          ? await this.orderRepository.findByState(state)
          : await this.orderRepository.findAll();
        await this.cache.set(cacheKey, orders, 300);
      }
      return orders;
    } catch (error) {
      logger.error('Error retrieving all orders:', error);
      throw error;
    }
  }

  /**
   * Reconstruct Order Aggregate from Saved Data
   */
  reconstructOrder(orderData) {
    const order = new Order(
      orderData._id || orderData.id,
      orderData.accountId,
      orderData.symbol,
      orderData.side,
      orderData.quantity,
      orderData.orderType,
      orderData.limitPrice,
      orderData.stopPrice
    );
    
    order.state = orderData.state;
    order.filledQuantity = orderData.filledQuantity;
    order.averagePrice = orderData.averagePrice;
    order.createdAt = orderData.createdAt;
    order.updatedAt = orderData.updatedAt;
    order.idempotencyKey = orderData.idempotencyKey;
    
    return order;
  }
}

module.exports = OrderService;
