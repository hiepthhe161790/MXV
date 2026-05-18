/**
 * Event Bus Interface - Handles asynchronous event publishing
 * Implementations can use RabbitMQ, Kafka, etc.
 */
class EventBus {
  async publish(event) {
    throw new Error('EventBus.publish() must be implemented');
  }

  async subscribe(eventType, handler) {
    throw new Error('EventBus.subscribe() must be implemented');
  }

  async connect() {
    throw new Error('EventBus.connect() must be implemented');
  }

  async disconnect() {
    throw new Error('EventBus.disconnect() must be implemented');
  }
}

module.exports = EventBus;
