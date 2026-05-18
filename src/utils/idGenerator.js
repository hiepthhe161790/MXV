// src/utils/idGenerator.js
const { v4: uuidv4 } = require('uuid');

const generateIds = {
  // ORD20240518100000XXXXX
  orderId: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `ORD${timestamp}${random}`;
  },

  // TRD20240518100000XXXXX
  tradeId: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `TRD${timestamp}${random}`;
  },

  // TXN20240518100000XXXXX
  transactionId: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `TXN${timestamp}${random}`;
  },

  // EVT20240518100000XXXXX
  eventId: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `EVT${timestamp}${random}`;
  },

  // MVX000001
  accountNumber: (counter) => {
    return `MVX${String(counter).padStart(6, '0')}`;
  },

  // UUID for client-provided IDs
  clientOrderId: () => uuidv4(),

  // POS20240518100000XXXXX
  positionId: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `POS${timestamp}${random}`;
  }
};

module.exports = generateIds;
