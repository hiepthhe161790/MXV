const amqp = require('amqplib');
const EventBus = require('./EventBus');
const logger = require('./Logger');

/**
 * RabbitMQ Implementation of Event Bus
 * Uses topic exchange for event-driven communication between services
 * Includes robust auto-reconnection and graceful error fallback
 */
class RabbitMQEventBus extends EventBus {
  constructor(url = process.env.RABBITMQ_URL || 'amqp://localhost') {
    super();
    this.url = url;
    this.connection = null;
    this.channel = null;
    this.exchangeName = 'trading_events';
    this.subscriptions = [];
    this.isConnecting = false;
    this.reconnectTimeout = null;
  }

  async connect() {
    if (this.connection) return;
    if (this.isConnecting) return;
    
    this.isConnecting = true;
    logger.info('Attempting to connect to RabbitMQ...');
    
    try {
      this.connection = await amqp.connect(this.url);
      
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err.message || err);
      });
      
      this.connection.on('close', (err) => {
        logger.warn('RabbitMQ connection closed:', err?.message || 'closed');
        this._handleDisconnect();
      });

      this.channel = await this.connection.createChannel();
      
      this.channel.on('error', (err) => {
        logger.error('RabbitMQ channel error:', err.message || err);
      });
      
      this.channel.on('close', () => {
        logger.warn('RabbitMQ channel closed.');
        this.channel = null;
      });
      
      // Declare topic exchange
      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
      
      logger.info('RabbitMQ connected successfully');
      this.isConnecting = false;

      // Re-establish any active subscriptions
      await this._reestablishSubscriptions();
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error.message || error);
      this.isConnecting = false;
      this._handleDisconnect();
    }
  }

  _handleDisconnect() {
    this.connection = null;
    this.channel = null;
    
    if (this.reconnectTimeout) return;
    
    logger.info('Scheduling RabbitMQ reconnection in 5 seconds...');
    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      await this.connect();
    }, 5000);
  }

  async _reestablishSubscriptions() {
    if (this.subscriptions.length === 0) return;
    logger.info(`Re-establishing ${this.subscriptions.length} RabbitMQ subscriptions...`);
    for (const sub of this.subscriptions) {
      try {
        await this._setupSubscription(sub.eventType, sub.handler, sub.queueName);
      } catch (err) {
        logger.error(`Failed to re-establish subscription for ${sub.eventType}:`, err.message || err);
      }
    }
  }

  async publish(event) {
    if (!this.channel) {
      logger.warn(`RabbitMQ not connected, dropping event: ${event.eventType}`);
      return;
    }
    
    try {
      const eventData = typeof event.toJSON === 'function' ? event.toJSON() : event;
      const message = JSON.stringify(eventData);
      const routingKey = `trading.${event.eventType.toLowerCase()}`;
      
      this.channel.publish(
        this.exchangeName,
        routingKey,
        Buffer.from(message),
        { persistent: true, contentType: 'application/json' }
      );
      
      logger.debug(`Event published: ${event.eventType} -> ${routingKey}`);
    } catch (error) {
      logger.error('Failed to publish event:', error.message || error);
    }
  }

  async subscribe(eventType, handler, queueName) {
    // Keep track of the subscription for reconnections
    this.subscriptions.push({ eventType, handler, queueName });
    
    if (!this.channel) {
      logger.warn(`Subscription registered for ${eventType}, but RabbitMQ is not connected yet.`);
      return;
    }

    try {
      await this._setupSubscription(eventType, handler, queueName);
    } catch (error) {
      logger.error(`Failed to initial subscribe to ${eventType}:`, error.message || error);
      throw error;
    }
  }

  async _setupSubscription(eventType, handler, queueName) {
    if (!this.channel) return;
    
    const queue = await this.channel.assertQueue(queueName, { durable: true });
    const routingKey = `trading.${eventType.toLowerCase()}`;
    
    await this.channel.bindQueue(queue.queue, this.exchangeName, routingKey);
    
    await this.channel.consume(queue.queue, async (msg) => {
      try {
        if (!msg) return;
        const event = JSON.parse(msg.content.toString());
        await handler(event);
        if (this.channel) {
          this.channel.ack(msg);
        }
      } catch (error) {
        logger.error('Error processing event:', error.message || error);
        if (this.channel) {
          try {
            this.channel.nack(msg, false, true); // Requeue on error
          } catch (nackErr) {
            logger.error('Failed to nack message:', nackErr.message || nackErr);
          }
        }
      }
    });
    
    logger.info(`Subscribed to ${eventType} on queue ${queueName}`);
  }

  async disconnect() {
    try {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      logger.info('RabbitMQ disconnected');
    } catch (error) {
      logger.error('Error disconnecting from RabbitMQ:', error.message || error);
    }
  }
}

module.exports = RabbitMQEventBus;
