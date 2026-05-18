// src/utils/validators.js
const Joi = require('joi');
const passwordComplexity = require('joi-password-complexity');

// Custom validation schemas
const validationSchemas = {
  // Account Registration
  registerAccount: Joi.object({
    email: Joi.string().email().required(),
    phone: Joi.string().regex(/^\+?[0-9\-\s()]+$/).required(),
    password: passwordComplexity({
      min: 8,
      max: 30,
      lowerCase: 1,
      upperCase: 1,
      numeric: 1,
      symbol: 1,
      requirementCount: 4
    }).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
  }),

  // KYC Information
  kyc: Joi.object({
    fullName: Joi.string().min(3).max(100).required(),
    identityType: Joi.string().valid('PASSPORT', 'ID_CARD', 'DRIVER_LICENSE').required(),
    identityNumber: Joi.string().required(),
    dateOfBirth: Joi.date().required(),
    nationality: Joi.string().required(),
    address: Joi.string().required(),
    city: Joi.string().required(),
    country: Joi.string().required(),
    postalCode: Joi.string().required()
  }),

  // Create Order
  createOrder: Joi.object({
    symbol: Joi.string().regex(/^[A-Z]{1,4}[A-Z0-9]{1,}$/).required(),
    side: Joi.string().valid('BUY', 'SELL').required(),
    quantity: Joi.number().integer().min(1).required(),
    orderType: Joi.string().valid('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT').required(),
    limitPrice: Joi.number().positive().when('orderType', {
      is: Joi.string().valid('LIMIT', 'STOP_LIMIT'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    stopPrice: Joi.number().positive().when('orderType', {
      is: Joi.string().valid('STOP', 'STOP_LIMIT'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    clientOrderId: Joi.string().optional()
  }),

  // Deposit
  deposit: Joi.object({
    amount: Joi.number().positive().required(),
    bankCode: Joi.string().required(),
    bankAccount: Joi.string().required(),
    referenceNumber: Joi.string().optional()
  }),

  // Withdrawal
  withdrawal: Joi.object({
    amount: Joi.number().positive().required(),
    bankCode: Joi.string().required(),
    bankAccount: Joi.string().required(),
    twoFactorCode: Joi.string().optional()
  }),

  // Login
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    twoFactorCode: Joi.string().optional()
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().default('-createdAt')
  })
};

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }));
      return res.status(400).json({ success: false, errors });
    }

    req.validated = value;
    next();
  };
};

// Validate margin calculation
const validateMarginCalculation = (balance, frozenAmount, marginRequired) => {
  const availableMargin = balance - frozenAmount;
  return availableMargin >= marginRequired;
};

// Validate price
const validatePrice = (price, tickSize) => {
  return (price % tickSize) === 0 || Math.abs((price % tickSize) - tickSize) < 0.0001;
};

// Validate quantity
const validateQuantity = (quantity, minTradeVolume) => {
  return quantity >= minTradeVolume && quantity % 1 === 0;
};

// Calculate realistic P&L
const calculatePnL = (entryPrice, exitPrice, quantity, side) => {
  if (side === 'LONG') {
    return (exitPrice - entryPrice) * quantity;
  } else {
    return (entryPrice - exitPrice) * quantity;
  }
};

module.exports = {
  validationSchemas,
  validate,
  validateMarginCalculation,
  validatePrice,
  validateQuantity,
  calculatePnL
};
