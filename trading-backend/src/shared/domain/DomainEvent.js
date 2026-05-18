/**
 * Base class for all domain events
 * Events are immutable records of something that happened
 */
class DomainEvent {
  constructor(aggregateId, eventType, data, timestamp = new Date()) {
    this.aggregateId = aggregateId;
    this.eventType = eventType;
    this.data = data;
    this.timestamp = timestamp;
    this.eventId = require('uuid').v4();
  }

  toJSON() {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      data: this.data,
      timestamp: this.timestamp,
    };
  }
}

module.exports = DomainEvent;
