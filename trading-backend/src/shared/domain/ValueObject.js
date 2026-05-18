/**
 * Base class for Value Objects
 * Value objects are immutable objects that are equal if their values are equal
 */
class ValueObject {
  constructor(value) {
    this.value = value;
  }

  equals(other) {
    if (!other) return false;
    return this.value === other.value;
  }

  getValue() {
    return this.value;
  }
}

module.exports = ValueObject;
