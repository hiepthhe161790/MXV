/**
 * Base class for Aggregate Roots
 * Aggregates are clusters of entities and value objects that are treated as a single unit
 * They maintain their own transactional boundaries and domain logic
 */
class AggregateRoot {
  constructor(id) {
    this.id = id;
    this.uncommittedEvents = [];
    this.version = 0;
  }

  getId() {
    return this.id;
  }

  raiseEvent(event) {
    this.uncommittedEvents.push(event);
    this.applyEvent(event);
  }

  applyEvent(event) {
    // To be implemented by subclasses
  }

  getUncommittedEvents() {
    return this.uncommittedEvents;
  }

  clearUncommittedEvents() {
    this.uncommittedEvents = [];
  }

  markEventsAsCommitted() {
    this.clearUncommittedEvents();
  }
}

module.exports = AggregateRoot;
