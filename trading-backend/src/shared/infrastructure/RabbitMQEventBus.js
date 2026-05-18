const amqp = require('amqplib');
const EventBus = require('./EventBus');
const logger = require('./Logger');

/**
 * RabbitMQ Implementation of Event Bus
 * Uses topic exchange for event-driven communication between services
 */
class RabbitMQEventBus extends EventBus {
  constructor(url = process.env.RABBITMQ_URL || 'amqp://localhost') {
    super();
    this.url = url;
    this.connection = null;
    this.channel = null;
    this.exchangeName = 'trading_events';
  }

  async connect() {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      
      // Declare topic exchange
      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
      
      logger.info('RabbitMQ connected successfully');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async publish(event) {
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
      logger.error('Failed to publish event:', error);
      throw error;
    }
  }

  async subscribe(eventType, handler, queueName) {
    try {
      const queue = await this.channel.assertQueue(queueName, { durable: true });
      const routingKey = `trading.${eventType.toLowerCase()}`;
      
      await this.channel.bindQueue(queue.queue, this.exchangeName, routingKey);
      
      await this.channel.consume(queue.queue, async (msg) => {
        try {
          const event = JSON.parse(msg.content.toString());
          await handler(event);
          this.channel.ack(msg);
        } catch (error) {
          logger.error('Error processing event:', error);
          this.channel.nack(msg, false, true); // Requeue on error
        }
      });
      
      logger.info(`Subscribed to ${eventType} on queue ${queueName}`);
    } catch (error) {
      logger.error('Failed to subscribe to event:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      logger.info('RabbitMQ disconnected');
    } catch (error) {
      logger.error('Error disconnecting from RabbitMQ:', error);
    }
  }
}

module.exports = RabbitMQEventBus;
