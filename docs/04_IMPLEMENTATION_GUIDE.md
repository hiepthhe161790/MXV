# 🚀 IMPLEMENTATION GUIDE - NODE.JS & MONGODB

## 1. PROJECT SETUP

### 1.1 Initialize Project

```bash
# Create directory
mkdir mvx_trading_system
cd mvx_trading_system

# Initialize npm
npm init -y

# Install dependencies
npm install express mongoose dotenv cors uuid winston pino \
  jsonwebtoken bcryptjs joi socket.io redis bull \
  axios joi-password-complexity

npm install --save-dev nodemon jest supertest
```

### 1.2 Project Structure

```
mvx_trading_system/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── env.js
│   │   └── logger.js
│   │
│   ├── models/
│   │   ├── Account.js
│   │   ├── Order.js
│   │   ├── Position.js
│   │   ├── Trade.js
│   │   ├── Transaction.js
│   │   ├── AuditLog.js
│   │   ├── Product.js
│   │   └── RiskLimit.js
│   │
│   ├── services/
│   │   ├── AccountService.js
│   │   ├── OrderService.js
│   │   ├── PositionService.js
│   │   ├── RiskService.js
│   │   ├── SettlementService.js
│   │   └── AuditService.js
│   │
│   ├── controllers/
│   │   ├── AccountController.js
│   │   ├── OrderController.js
│   │   ├── PositionController.js
│   │   └── TransactionController.js
│   │
│   ├── routes/
│   │   ├── accounts.js
│   │   ├── orders.js
│   │   ├── positions.js
│   │   └── transactions.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── validator.js
│   │   └── rateLimit.js
│   │
│   ├── utils/
│   │   ├── idGenerator.js
│   │   ├── validators.js
│   │   └── helpers.js
│   │
│   ├── jobs/
│   │   ├── settlementJob.js
│   │   ├── marginCallJob.js
│   │   └── reconciliationJob.js
│   │
│   └── app.js
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── docs/
├── .env
├── .env.example
├── server.js
├── package.json
└── README.md
```

### 1.3 Environment Configuration

```bash
# .env
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/mvx_trading
DB_NAME=mvx_trading

# JWT
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRY=24h

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info

# API
API_VERSION=v1

# Exchange
EXCHANGE_API_URL=https://api.mxv.vn
EXCHANGE_API_KEY=your_exchange_key
```

---

## 2. CORE MODULES

### 2.1 Database Configuration

```javascript
// src/config/database.js
const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);
    
    // Enable automatic schema validation
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    return conn;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Failed to disconnect from MongoDB:', error);
    process.exit(1);
  }
};

module.exports = { connectDB, disconnectDB };
```

### 2.2 Logger Configuration

```javascript
// src/config/logger.js
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

module.exports = logger;
```

### 2.3 ID Generator

```javascript
// src/utils/idGenerator.js
const { v4: uuidv4 } = require('uuid');

const generateIds = {
  // ORD20240518100000
  orderId: () => `ORD${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
  
  // TRD20240518100000
  tradeId: () => `TRD${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
  
  // TXN20240518100000
  transactionId: () => `TXN${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
  
  // EVT20240518100000
  eventId: () => `EVT${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
  
  // MVX000001
  accountNumber: (counter) => `MVX${String(counter).padStart(6, '0')}`,
  
  // Client-provided (for idempotency)
  clientOrderId: () => uuidv4()
};

module.exports = generateIds;
```

---

## 3. MONGOOSE MODELS

### 3.1 Account Model

```javascript
// src/models/Account.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const accountSchema = new mongoose.Schema(
  {
    // Identifiers
    accountNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
      match: /^MVX\d{6}$/
    },
    clientId: {
      type: String,
      required: true,
      index: true
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      index: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    phone: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false // Don't return password by default
    },

    // Status
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED'],
      default: 'PENDING',
      index: true
    },

    // KYC
    kyc: {
      fullName: String,
      identityType: {
        type: String,
        enum: ['PASSPORT', 'ID_CARD', 'DRIVER_LICENSE']
      },
      identityNumber: String,
      dateOfBirth: Date,
      nationality: String,
      address: String,
      city: String,
      country: String,
      postalCode: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      verificationDocuments: [String]
    },

    // Balance
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    frozenAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    availableBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    totalDeposit: { type: Number, default: 0 },
    totalWithdraw: { type: Number, default: 0 },
    unrealizedPnL: { type: Number, default: 0 },
    realizedPnL: { type: Number, default: 0 },

    // Trading Config
    accountType: {
      type: String,
      enum: ['INDIVIDUAL', 'CORPORATE'],
      default: 'INDIVIDUAL'
    },
    riskProfile: {
      type: String,
      enum: ['LOW', 'MODERATE', 'AGGRESSIVE'],
      default: 'MODERATE'
    },
    maxPositionLimit: { type: Number, default: 1000 },
    maxExposureLimit: { type: Number, default: 1000000 },
    tradingPermission: {
      type: [String],
      default: ['FUTURES']
    },

    // Linked Banks
    linkedBanks: [{
      bankCode: String,
      accountNumber: String,
      accountHolder: String,
      verified: Boolean,
      verifiedAt: Date
    }],

    // Settings
    country: String,
    timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
    language: { type: String, default: 'vi' },
    twoFactorEnabled: { type: Boolean, default: false },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    kycVerifiedAt: Date,
    lastLoginAt: Date
  },
  { timestamps: true }
);

// Hash password before saving
accountSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
accountSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// Update availableBalance virtual
accountSchema.virtual('displayAvailableBalance').get(function() {
  return this.balance - this.frozenAmount;
});

// Indexes
accountSchema.index({ accountNumber: 1 });
accountSchema.index({ email: 1 });
accountSchema.index({ status: 1 });
accountSchema.index({ createdAt: -1 });
accountSchema.index({ 'kyc.verified': 1, status: 1 });

module.exports = mongoose.model('Account', accountSchema);
```

### 3.2 Order Model

```javascript
// src/models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    // Identifiers
    orderId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },
    clientOrderId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },

    // Product
    symbol: {
      type: String,
      required: true,
      index: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    // Order Type
    orderType: {
      type: String,
      enum: ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'],
      required: true
    },
    side: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true
    },

    // Prices
    limitPrice: Number,
    stopPrice: Number,
    executedPrice: Number,

    // Status
    status: {
      type: String,
      enum: [
        'CREATED',
        'VALIDATED',
        'SUBMITTED',
        'PENDING_MATCH',
        'FILLED',
        'PARTIAL_FILLED',
        'COMPLETED',
        'CANCELLED',
        'REJECTED',
        'EXPIRED'
      ],
      default: 'CREATED',
      index: true
    },
    filledQuantity: { type: Number, default: 0 },
    remainingQuantity: Number,

    // Commission
    estimatedCommission: Number,
    actualCommission: Number,

    // Risk Checks
    marginRequired: Number,
    riskChecks: {
      marginCheck: { passed: Boolean, message: String },
      positionLimitCheck: { passed: Boolean, message: String },
      exposureCheck: { passed: Boolean, message: String }
    },

    // Exchange
    exchangeOrderId: String,
    exchange: String,

    // Flow Log
    flowLog: [{
      step: String,
      status: String,
      message: String,
      timestamp: { type: Date, default: Date.now }
    }],

    // Timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    submittedAt: Date,
    filledAt: Date,
    completedAt: Date,
    expiryAt: Date,

    // Audit
    createdBy: String,
    modifiedBy: String
  },
  { timestamps: true }
);

// Indexes
orderSchema.index({ accountId: 1, createdAt: -1 });
orderSchema.index({ symbol: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

// TTL Index for cancelled orders (30 days)
orderSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 2592000,
    partialFilterExpression: { status: 'CANCELLED' }
  }
);

module.exports = mongoose.model('Order', orderSchema);
```

### 3.3 Position Model

```javascript
// src/models/Position.js
const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },
    symbol: {
      type: String,
      required: true,
      index: true
    },

    // Status
    status: {
      type: String,
      enum: ['OPEN', 'CLOSING', 'CLOSED', 'LIQUIDATED'],
      default: 'OPEN',
      index: true
    },

    // Position Details
    side: {
      type: String,
      enum: ['LONG', 'SHORT'],
      required: true
    },
    openQuantity: { type: Number, required: true },
    closedQuantity: { type: Number, default: 0 },

    // Entry
    entryPrice: { type: Number, required: true },
    entryDate: { type: Date, default: Date.now },
    entryOrderId: mongoose.Schema.Types.ObjectId,

    // Current Status
    currentPrice: Number,
    lastUpdateAt: Date,

    // P&L
    unrealizedPnL: { type: Number, default: 0 },
    realizedPnL: { type: Number, default: 0 },
    totalValue: Number,

    // Risk
    marginUsed: { type: Number, required: true },
    exposureAmount: Number,
    leverage: Number,

    // Risk Management
    stopLossPrice: Number,
    takeProfitPrice: Number,

    // Timeline
    openedAt: { type: Date, default: Date.now, index: true },
    closedAt: Date,
    modifiedAt: { type: Date, default: Date.now },

    // Trades
    trades: [mongoose.Schema.Types.ObjectId],

    // Exit
    exitPrice: Number,
    exitDate: Date,
    exitOrderId: mongoose.Schema.Types.ObjectId
  },
  { timestamps: true }
);

// Compound index for account + symbol
positionSchema.index({ accountId: 1, symbol: 1 }, { unique: true });
positionSchema.index({ accountId: 1, status: 1 });
positionSchema.index({ marginUsed: -1 });

module.exports = mongoose.model('Position', positionSchema);
```

### 3.4 Transaction Model

```javascript
// src/models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },

    // Type
    type: {
      type: String,
      enum: [
        'DEPOSIT',
        'WITHDRAWAL',
        'MARGIN_USAGE',
        'MARGIN_RELEASE',
        'PNL_REALIZED',
        'COMMISSION',
        'FEE',
        'DIVIDEND'
      ],
      required: true,
      index: true
    },

    amount: { type: Number, required: true },
    currency: {
      type: String,
      enum: ['USD', 'VND', 'EUR'],
      default: 'USD'
    },

    // Status
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },

    // Bank Info
    bankCode: String,
    bankAccount: String,
    referenceNumber: String,

    // Related Records
    orderId: mongoose.Schema.Types.ObjectId,
    tradeId: mongoose.Schema.Types.ObjectId,
    positionId: mongoose.Schema.Types.ObjectId,

    description: String,

    // Reconciliation
    reconcileStatus: {
      type: String,
      enum: ['PENDING', 'MATCHED', 'UNMATCHED'],
      default: 'PENDING',
      index: true
    },
    reconcileAt: Date,

    // Timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    processedAt: Date,
    completedAt: Date,

    // Audit
    createdBy: String
  },
  { timestamps: true }
);

// Indexes
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ accountId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ referenceNumber: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
```

---

## 4. SERVICES

### 4.1 Order Service

```javascript
// src/services/OrderService.js
const Order = require('../models/Order');
const Account = require('../models/Account');
const Position = require('../models/Position');
const RiskService = require('./RiskService');
const AuditService = require('./AuditService');
const idGenerator = require('../utils/idGenerator');
const logger = require('../config/logger');

class OrderService {
  // Create new order
  async createOrder(accountId, orderData) {
    try {
      // Generate order ID
      const orderId = idGenerator.orderId();
      
      // Validate account
      const account = await Account.findById(accountId);
      if (!account) {
        throw new Error('Account not found');
      }
      if (account.status !== 'ACTIVE') {
        throw new Error('Account is not active');
      }

      // Check idempotency
      if (orderData.clientOrderId) {
        const existing = await Order.findOne({
          clientOrderId: orderData.clientOrderId,
          accountId
        });
        if (existing) {
          return existing; // Return existing order
        }
      }

      // Create order
      const order = new Order({
        orderId,
        accountId,
        clientOrderId: orderData.clientOrderId,
        symbol: orderData.symbol,
        quantity: orderData.quantity,
        orderType: orderData.orderType,
        side: orderData.side,
        limitPrice: orderData.limitPrice,
        stopPrice: orderData.stopPrice,
        status: 'CREATED',
        flowLog: [{
          step: 'OMS',
          status: 'CREATED',
          message: 'Order created by OMS'
        }]
      });

      // Validate order
      await this.validateOrder(order, account);

      // Risk check
      const riskCheck = await RiskService.checkOrderRisk(order, account);
      order.riskChecks = riskCheck.checks;
      order.marginRequired = riskCheck.marginRequired;

      if (!riskCheck.passed) {
        order.status = 'REJECTED';
        await order.save();
        
        await AuditService.logEvent({
          accountId,
          eventType: 'ORDER_REJECTED',
          severity: 'WARNING',
          details: { orderId, reason: riskCheck.reason }
        });

        throw new Error(`Order rejected: ${riskCheck.reason}`);
      }

      // Submit to exchange (async)
      order.status = 'SUBMITTED';
      order.submittedAt = new Date();
      order.flowLog.push({
        step: 'RISK',
        status: 'PASSED',
        message: 'Risk checks passed'
      });

      await order.save();

      // Queue submission to exchange
      this.submitToExchange(order).catch(err => {
        logger.error(`Failed to submit order to exchange: ${err.message}`);
      });

      await AuditService.logEvent({
        accountId,
        eventType: 'ORDER_CREATED',
        severity: 'INFO',
        details: { orderId, ...orderData }
      });

      return order;
    } catch (error) {
      logger.error(`Failed to create order: ${error.message}`);
      throw error;
    }
  }

  // Validate order
  async validateOrder(order, account) {
    // Check quantity
    if (order.quantity <= 0) {
      throw new Error('Invalid quantity');
    }

    // Check price for limit orders
    if (order.orderType === 'LIMIT' && !order.limitPrice) {
      throw new Error('Limit price required for LIMIT orders');
    }

    // Check price for stop orders
    if (order.orderType === 'STOP' && !order.stopPrice) {
      throw new Error('Stop price required for STOP orders');
    }

    // Check symbol
    // TODO: Validate symbol from products collection

    return true;
  }

  // Submit to exchange
  async submitToExchange(order) {
    try {
      // TODO: Call exchange API
      const response = await this.callExchangeAPI(order);

      order.exchangeOrderId = response.orderId;
      order.status = 'PENDING_MATCH';
      order.flowLog.push({
        step: 'EXCHANGE',
        status: 'SUBMITTED',
        message: 'Order submitted to exchange'
      });

      await order.save();

      logger.info(`Order submitted to exchange: ${order.orderId}`);
    } catch (error) {
      logger.error(`Failed to submit order to exchange: ${error.message}`);
      // Will retry via job
    }
  }

  // Call exchange API
  async callExchangeAPI(order) {
    // TODO: Implement actual exchange API call
    return {
      orderId: `EX${Date.now()}`,
      status: 'PENDING'
    };
  }

  // Cancel order
  async cancelOrder(orderId, accountId) {
    try {
      const order = await Order.findOne({ orderId, accountId });
      
      if (!order) {
        throw new Error('Order not found');
      }

      if (!['CREATED', 'PENDING_MATCH', 'PARTIAL_FILLED'].includes(order.status)) {
        throw new Error(`Cannot cancel order in ${order.status} status`);
      }

      order.status = 'CANCELLED';
      await order.save();

      await AuditService.logEvent({
        accountId,
        eventType: 'ORDER_CANCELLED',
        severity: 'INFO',
        details: { orderId }
      });

      return order;
    } catch (error) {
      logger.error(`Failed to cancel order: ${error.message}`);
      throw error;
    }
  }

  // Get order by ID
  async getOrder(orderId, accountId) {
    return Order.findOne({ orderId, accountId });
  }

  // Get account orders
  async getAccountOrders(accountId, query = {}) {
    const filter = { accountId };
    
    if (query.status) filter.status = query.status;
    if (query.symbol) filter.symbol = query.symbol;
    
    const skip = (query.page || 0) * (query.limit || 10);
    
    return Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit || 10);
  }
}

module.exports = new OrderService();
```

### 4.2 Risk Service

```javascript
// src/services/RiskService.js
const Account = require('../models/Account');
const Position = require('../models/Position');
const logger = require('../config/logger');

class RiskService {
  // Check order risk
  async checkOrderRisk(order, account) {
    const checks = {
      marginCheck: { passed: false },
      positionLimitCheck: { passed: false },
      exposureCheck: { passed: false }
    };

    try {
      // 1. Margin Check
      const marginCheck = await this.checkMargin(order, account);
      checks.marginCheck = marginCheck;

      // 2. Position Limit Check
      const positionCheck = await this.checkPositionLimit(order, account);
      checks.positionLimitCheck = positionCheck;

      // 3. Exposure Check
      const exposureCheck = await this.checkExposure(order, account);
      checks.exposureCheck = exposureCheck;

      const allPassed = checks.marginCheck.passed && 
                       checks.positionLimitCheck.passed && 
                       checks.exposureCheck.passed;

      return {
        passed: allPassed,
        checks,
        marginRequired: marginCheck.marginRequired,
        reason: allPassed ? 'All checks passed' : 'Risk check failed'
      };
    } catch (error) {
      logger.error(`Risk check failed: ${error.message}`);
      return {
        passed: false,
        checks,
        reason: error.message
      };
    }
  }

  // Check if account has sufficient margin
  async checkMargin(order, account) {
    try {
      // Calculate margin required
      const marginRequired = this.calculateMarginRequired(order);

      const sufficientMargin = account.balance - account.frozenAmount >= marginRequired;

      return {
        passed: sufficientMargin,
        message: sufficientMargin ? 'Margin OK' : 'Insufficient margin',
        marginRequired,
        availableMargin: account.balance - account.frozenAmount
      };
    } catch (error) {
      return {
        passed: false,
        message: error.message,
        marginRequired: 0
      };
    }
  }

  // Check if position limit is not exceeded
  async checkPositionLimit(order, account) {
    try {
      const currentPosition = await Position.findOne({
        accountId: account._id,
        symbol: order.symbol,
        status: 'OPEN'
      });

      const totalPosition = (currentPosition?.openQuantity || 0) + order.quantity;

      const withinLimit = totalPosition <= account.maxPositionLimit;

      return {
        passed: withinLimit,
        message: withinLimit ? 'Position limit OK' : 'Position limit exceeded',
        currentPosition: currentPosition?.openQuantity || 0,
        totalPosition,
        limit: account.maxPositionLimit
      };
    } catch (error) {
      return {
        passed: false,
        message: error.message
      };
    }
  }

  // Check if exposure is within limit
  async checkExposure(order, account) {
    try {
      // TODO: Calculate exposure based on market price
      const exposure = order.quantity * 100; // Placeholder

      const withinLimit = exposure <= account.maxExposureLimit;

      return {
        passed: withinLimit,
        message: withinLimit ? 'Exposure OK' : 'Exposure limit exceeded',
        exposure,
        limit: account.maxExposureLimit
      };
    } catch (error) {
      return {
        passed: false,
        message: error.message
      };
    }
  }

  // Calculate margin required
  calculateMarginRequired(order) {
    // TODO: Get margin requirement from product specs
    // For now, simple calculation
    return order.quantity * 100; // Placeholder
  }

  // Check for forced liquidation
  async checkForLiquidation(accountId) {
    try {
      const account = await Account.findById(accountId);
      const positions = await Position.find({
        accountId,
        status: 'OPEN'
      });

      const marginLevel = this.calculateMarginLevel(account);

      if (marginLevel < 50) {
        // Trigger forced liquidation
        await this.triggerForcedLiquidation(accountId, positions);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Liquidation check failed: ${error.message}`);
      return false;
    }
  }

  // Calculate margin level percentage
  calculateMarginLevel(account) {
    if (account.frozenAmount === 0) return 100;
    return (account.balance / account.frozenAmount) * 100;
  }

  // Trigger forced liquidation
  async triggerForcedLiquidation(accountId, positions) {
    logger.warn(`Forced liquidation triggered for account: ${accountId}`);
    // TODO: Implement liquidation logic
  }
}

module.exports = new RiskService();
```

---

## 5. CONTROLLERS

### 5.1 Order Controller

```javascript
// src/controllers/OrderController.js
const OrderService = require('../services/OrderService');
const logger = require('../config/logger');

class OrderController {
  // Create order
  async createOrder(req, res) {
    try {
      const { symbol, side, quantity, orderType, limitPrice, stopPrice } = req.body;
      const accountId = req.user.accountId;

      // Validate input
      if (!symbol || !side || !quantity || !orderType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const order = await OrderService.createOrder(accountId, {
        symbol,
        side,
        quantity,
        orderType,
        limitPrice,
        stopPrice,
        clientOrderId: req.body.clientOrderId
      });

      res.status(201).json({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error(`Order creation error: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  }

  // Get order
  async getOrder(req, res) {
    try {
      const { orderId } = req.params;
      const accountId = req.user.accountId;

      const order = await OrderService.getOrder(orderId, accountId);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error(`Get order error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  // Get account orders
  async getAccountOrders(req, res) {
    try {
      const accountId = req.user.accountId;
      const query = {
        status: req.query.status,
        symbol: req.query.symbol,
        page: parseInt(req.query.page) || 0,
        limit: parseInt(req.query.limit) || 10
      };

      const orders = await OrderService.getAccountOrders(accountId, query);

      res.json({
        success: true,
        data: orders,
        page: query.page,
        limit: query.limit
      });
    } catch (error) {
      logger.error(`Get account orders error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  // Cancel order
  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const accountId = req.user.accountId;

      const order = await OrderService.cancelOrder(orderId, accountId);

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error(`Cancel order error: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new OrderController();
```

