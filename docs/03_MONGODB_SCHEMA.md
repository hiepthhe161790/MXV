# 🗄️ MONGODB SCHEMA & INDEXES DESIGN

## 1. DATABASE SETUP

### Connection String
```javascript
// .env
MONGODB_URI=mongodb://username:password@localhost:27017/mvx_trading
// or for MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mvx_trading
```

### Database Name: `mvx_trading`

---

## 2. COLLECTIONS & DETAILED SCHEMAS

### Collection 1: `accounts`

```javascript
// Schema Definition
const accountSchema = {
  bsonType: "object",
  required: ["accountNumber", "clientId", "status", "balance"],
  properties: {
    _id: { bsonType: "objectId" },
    
    // Account Identifiers
    accountNumber: {
      bsonType: "string",
      pattern: "^MVX\\d{6}$",      // MVX000001
      description: "Unique account number"
    },
    clientId: {
      bsonType: "string",
      description: "Client identifier"
    },
    email: {
      bsonType: "string",
      pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
    },
    phone: { bsonType: "string" },
    
    // Account Status
    status: {
      enum: ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED"],
      description: "Account current status"
    },
    
    // KYC Information
    kyc: {
      bsonType: "object",
      properties: {
        fullName: { bsonType: "string" },
        identityType: { enum: ["PASSPORT", "ID_CARD", "DRIVER_LICENSE"] },
        identityNumber: { bsonType: "string" },
        dateOfBirth: { bsonType: "date" },
        nationality: { bsonType: "string" },
        address: { bsonType: "string" },
        city: { bsonType: "string" },
        country: { bsonType: "string" },
        postalCode: { bsonType: "string" },
        verified: { bsonType: "bool" },
        verifiedAt: { bsonType: "date" },
        verificationDocuments: [{ bsonType: "string" }]
      }
    },
    
    // Balance Information
    balance: { bsonType: "double" },                  // Total balance
    frozenAmount: { bsonType: "double" },            // Margin used
    availableBalance: { bsonType: "double" },        // = balance - frozen
    totalDeposit: { bsonType: "double" },
    totalWithdraw: { bsonType: "double" },
    unrealizedPnL: { bsonType: "double" },
    realizedPnL: { bsonType: "double" },
    
    // Trading Configuration
    accountType: { enum: ["INDIVIDUAL", "CORPORATE"] },
    riskProfile: { enum: ["LOW", "MODERATE", "AGGRESSIVE"] },
    maxPositionLimit: { bsonType: "int" },
    maxExposureLimit: { bsonType: "double" },
    tradingPermission: {
      bsonType: "array",
      items: { enum: ["FUTURES", "OPTIONS", "SPOT"] }
    },
    
    // Linked Banks
    linkedBanks: {
      bsonType: "array",
      items: {
        bsonType: "object",
        properties: {
          bankCode: { bsonType: "string" },          // MB, TCB, VCB
          accountNumber: { bsonType: "string" },
          accountHolder: { bsonType: "string" },
          verified: { bsonType: "bool" },
          verifiedAt: { bsonType: "date" }
        }
      }
    },
    
    // Settings
    country: { bsonType: "string" },
    timezone: { bsonType: "string" },
    language: { bsonType: "string" },
    twoFactorEnabled: { bsonType: "bool" },
    
    // Timestamps
    createdAt: { bsonType: "date" },
    updatedAt: { bsonType: "date" },
    kycVerifiedAt: { bsonType: "date" },
    lastLoginAt: { bsonType: "date" }
  }
};

// Indexes
db.accounts.createIndex({ accountNumber: 1 }, { unique: true });
db.accounts.createIndex({ clientId: 1 });
db.accounts.createIndex({ email: 1 }, { unique: true });
db.accounts.createIndex({ status: 1 });
db.accounts.createIndex({ createdAt: -1 });
db.accounts.createIndex({ "kyc.verified": 1, status: 1 });
```

### Collection 2: `orders`

```javascript
const orderSchema = {
  bsonType: "object",
  required: ["orderId", "accountId", "symbol", "side", "quantity", "status"],
  properties: {
    _id: { bsonType: "objectId" },
    
    // Order Identifiers
    orderId: {
      bsonType: "string",
      pattern: "^ORD\\d{14}$",     // ORD20240518100000
      description: "Unique order ID"
    },
    accountId: { bsonType: "objectId" },
    clientOrderId: {
      bsonType: "string",
      description: "Client-provided ID for idempotency"
    },
    
    // Product Information
    symbol: { bsonType: "string" },    // GCZ24, SIZ24
    quantity: { bsonType: "int", minimum: 1 },
    
    // Order Type & Details
    orderType: { enum: ["MARKET", "LIMIT", "STOP", "STOP_LIMIT"] },
    side: { enum: ["BUY", "SELL"] },
    
    // Price Parameters
    limitPrice: { bsonType: "double" },
    stopPrice: { bsonType: "double" },
    executedPrice: { bsonType: "double" },
    
    // Status & Execution
    status: {
      enum: [
        "CREATED",
        "VALIDATED",
        "SUBMITTED",
        "PENDING_MATCH",
        "FILLED",
        "PARTIAL_FILLED",
        "COMPLETED",
        "CANCELLED",
        "REJECTED",
        "EXPIRED"
      ]
    },
    filledQuantity: { bsonType: "int" },
    remainingQuantity: { bsonType: "int" },
    
    // Commission & Fees
    estimatedCommission: { bsonType: "double" },
    actualCommission: { bsonType: "double" },
    
    // Risk Checks
    marginRequired: { bsonType: "double" },
    riskChecks: {
      bsonType: "object",
      properties: {
        marginCheck: {
          bsonType: "object",
          properties: {
            passed: { bsonType: "bool" },
            message: { bsonType: "string" }
          }
        },
        positionLimitCheck: {
          bsonType: "object",
          properties: {
            passed: { bsonType: "bool" },
            message: { bsonType: "string" }
          }
        },
        exposureCheck: {
          bsonType: "object",
          properties: {
            passed: { bsonType: "bool" },
            message: { bsonType: "string" }
          }
        }
      }
    },
    
    // Exchange Reference
    exchangeOrderId: { bsonType: "string" },
    exchange: { bsonType: "string" },     // MXV
    
    // Flow Log
    flowLog: {
      bsonType: "array",
      items: {
        bsonType: "object",
        properties: {
          step: { bsonType: "string" },       // OMS, RISK, EXCHANGE
          status: { bsonType: "string" },
          message: { bsonType: "string" },
          timestamp: { bsonType: "date" }
        }
      }
    },
    
    // Timestamps
    createdAt: { bsonType: "date" },
    submittedAt: { bsonType: "date" },
    filledAt: { bsonType: "date" },
    completedAt: { bsonType: "date" },
    expiryAt: { bsonType: "date" },
    
    // Audit
    createdBy: { bsonType: "string" },
    modifiedBy: { bsonType: "string" }
  }
};

// Indexes
db.orders.createIndex({ orderId: 1 }, { unique: true });
db.orders.createIndex({ accountId: 1, createdAt: -1 });
db.orders.createIndex({ clientOrderId: 1 });
db.orders.createIndex({ symbol: 1, status: 1 });
db.orders.createIndex({ status: 1, createdAt: -1 });
db.orders.createIndex({ "flowLog.step": 1 });

// TTL Index (auto-delete CANCELLED orders after 30 days)
db.orders.createIndex(
  { createdAt: 1 },
  { 
    expireAfterSeconds: 2592000,
    partialFilterExpression: { status: "CANCELLED" }
  }
);
```

### Collection 3: `positions`

```javascript
const positionSchema = {
  bsonType: "object",
  required: ["accountId", "symbol", "side", "openQuantity", "status"],
  properties: {
    _id: { bsonType: "objectId" },
    accountId: { bsonType: "objectId" },
    symbol: { bsonType: "string" },
    
    // Position Status
    status: { enum: ["OPEN", "CLOSING", "CLOSED", "LIQUIDATED"] },
    
    // Position Details
    side: { enum: ["LONG", "SHORT"] },
    openQuantity: { bsonType: "int" },
    closedQuantity: { bsonType: "int" },
    
    // Entry Information
    entryPrice: { bsonType: "double" },
    entryDate: { bsonType: "date" },
    entryOrderId: { bsonType: "objectId" },
    
    // Current Status
    currentPrice: { bsonType: "double" },
    lastUpdateAt: { bsonType: "date" },
    
    // P&L Calculation
    unrealizedPnL: { bsonType: "double" },
    realizedPnL: { bsonType: "double" },
    totalValue: { bsonType: "double" },     // Current market value
    
    // Risk Metrics
    marginUsed: { bsonType: "double" },
    exposureAmount: { bsonType: "double" },
    leverage: { bsonType: "double" },
    
    // Risk Management
    stopLossPrice: { bsonType: "double" },
    takeProfitPrice: { bsonType: "double" },
    
    // Timeline
    openedAt: { bsonType: "date" },
    closedAt: { bsonType: "date" },
    modifiedAt: { bsonType: "date" },
    
    // Related Trades
    trades: {
      bsonType: "array",
      items: { bsonType: "objectId" }
    },
    
    // Exit Info (if closed)
    exitPrice: { bsonType: "double" },
    exitDate: { bsonType: "date" },
    exitOrderId: { bsonType: "objectId" }
  }
};

// Indexes
db.positions.createIndex({ accountId: 1, symbol: 1 }, { unique: true });
db.positions.createIndex({ accountId: 1, status: 1 });
db.positions.createIndex({ symbol: 1, status: 1 });
db.positions.createIndex({ status: 1, createdAt: -1 });
db.positions.createIndex({ marginUsed: -1 });  // For margin monitoring
```

### Collection 4: `transactions`

```javascript
const transactionSchema = {
  bsonType: "object",
  required: ["transactionId", "accountId", "type", "amount", "status"],
  properties: {
    _id: { bsonType: "objectId" },
    transactionId: {
      bsonType: "string",
      pattern: "^TXN\\d{14}$"
    },
    accountId: { bsonType: "objectId" },
    
    // Transaction Type
    type: {
      enum: [
        "DEPOSIT",
        "WITHDRAWAL",
        "MARGIN_USAGE",
        "MARGIN_RELEASE",
        "PNL_REALIZED",
        "COMMISSION",
        "FEE",
        "DIVIDEND"
      ]
    },
    
    amount: { bsonType: "double" },
    currency: { enum: ["USD", "VND", "EUR"] },
    
    // Status
    status: {
      enum: ["PENDING", "PROCESSING", "COMPLETED", "REJECTED", "CANCELLED"]
    },
    
    // Bank Information (for deposits/withdrawals)
    bankCode: { bsonType: "string" },
    bankAccount: { bsonType: "string" },
    referenceNumber: { bsonType: "string" },
    
    // Related Records
    orderId: { bsonType: "objectId" },
    tradeId: { bsonType: "objectId" },
    positionId: { bsonType: "objectId" },
    
    // Description
    description: { bsonType: "string" },
    
    // Reconciliation
    reconcileStatus: { enum: ["PENDING", "MATCHED", "UNMATCHED"] },
    reconcileAt: { bsonType: "date" },
    
    // Timestamps
    createdAt: { bsonType: "date" },
    processedAt: { bsonType: "date" },
    completedAt: { bsonType: "date" },
    
    // Audit
    createdBy: { bsonType: "string" }
  }
};

// Indexes
db.transactions.createIndex({ transactionId: 1 }, { unique: true });
db.transactions.createIndex({ accountId: 1, createdAt: -1 });
db.transactions.createIndex({ type: 1, status: 1 });
db.transactions.createIndex({ referenceNumber: 1 });
db.transactions.createIndex({ reconcileStatus: 1 });
```

### Collection 5: `trades`

```javascript
const tradeSchema = {
  bsonType: "object",
  required: ["tradeId", "accountId", "orderId", "symbol", "quantity"],
  properties: {
    _id: { bsonType: "objectId" },
    tradeId: {
      bsonType: "string",
      pattern: "^TRD\\d{14}$"
    },
    orderId: { bsonType: "objectId" },
    accountId: { bsonType: "objectId" },
    symbol: { bsonType: "string" },
    
    // Execution Details
    side: { enum: ["BUY", "SELL"] },
    quantity: { bsonType: "int" },
    executionPrice: { bsonType: "double" },
    totalValue: { bsonType: "double" },
    
    // Fees
    commission: { bsonType: "double" },
    fee: { bsonType: "double" },
    
    // Counterparty
    counterpartyId: { bsonType: "string" },
    
    // Exchange Info
    exchangeTradeId: { bsonType: "string" },
    exchange: { bsonType: "string" },
    
    // Status
    status: { enum: ["PENDING", "SETTLED", "CANCELLED"] },
    
    // Timestamps
    executedAt: { bsonType: "date" },
    settledAt: { bsonType: "date" }
  }
};

// Indexes
db.trades.createIndex({ tradeId: 1 }, { unique: true });
db.trades.createIndex({ orderId: 1 });
db.trades.createIndex({ accountId: 1, executedAt: -1 });
db.trades.createIndex({ symbol: 1, executedAt: -1 });
db.trades.createIndex({ status: 1 });
```

### Collection 6: `auditLogs`

```javascript
const auditLogSchema = {
  bsonType: "object",
  required: ["eventId", "timestamp", "eventType"],
  properties: {
    _id: { bsonType: "objectId" },
    eventId: {
      bsonType: "string",
      pattern: "^EVT\\d{14}$"
    },
    timestamp: { bsonType: "date" },
    
    // Event Classification
    eventType: {
      enum: [
        "ORDER_CREATED",
        "ORDER_CANCELLED",
        "ORDER_EXECUTED",
        "POSITION_OPENED",
        "POSITION_CLOSED",
        "POSITION_LIQUIDATED",
        "DEPOSIT_INITIATED",
        "DEPOSIT_COMPLETED",
        "WITHDRAWAL_INITIATED",
        "WITHDRAWAL_COMPLETED",
        "MARGIN_CALL",
        "MARGIN_RELEASED",
        "ACCOUNT_CREATED",
        "ACCOUNT_SUSPENDED",
        "LOGIN",
        "LOGOUT"
      ]
    },
    severity: { enum: ["INFO", "WARNING", "ERROR", "CRITICAL"] },
    
    // User & Account
    userId: { bsonType: "string" },
    accountId: { bsonType: "objectId" },
    
    // Changes
    changes: {
      bsonType: "object",
      properties: {
        before: { bsonType: "object" },
        after: { bsonType: "object" }
      }
    },
    
    // Connection Info
    ipAddress: { bsonType: "string" },
    userAgent: { bsonType: "string" },
    
    // Details
    details: { bsonType: "object" },
    
    // Status
    status: { enum: ["SUCCESS", "FAILURE"] },
    errorMessage: { bsonType: "string" }
  }
};

// Indexes
db.auditLogs.createIndex({ eventId: 1 }, { unique: true });
db.auditLogs.createIndex({ timestamp: -1 });
db.auditLogs.createIndex({ accountId: 1, timestamp: -1 });
db.auditLogs.createIndex({ eventType: 1, timestamp: -1 });
db.auditLogs.createIndex({ severity: 1 });

// TTL Index (auto-delete logs after 1 year)
db.auditLogs.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 31536000 }
);
```

### Collection 7: `products`

```javascript
const productSchema = {
  bsonType: "object",
  required: ["symbol", "productName", "productType"],
  properties: {
    _id: { bsonType: "objectId" },
    symbol: {
      bsonType: "string",
      pattern: "^[A-Z]{1,4}[A-Z0-9]{1,}$"  // GCZ24, SIZ24
    },
    productName: { bsonType: "string" },
    productType: { enum: ["FUTURES", "OPTION", "SPOT"] },
    
    // Contract Specifications
    currency: { bsonType: "string" },
    contractSize: { bsonType: "double" },
    tickSize: { bsonType: "double" },
    tickValue: { bsonType: "double" },
    
    // Dates
    launchDate: { bsonType: "date" },
    expiryDate: { bsonType: "date" },
    lastTradingDate: { bsonType: "date" },
    
    // Margin Requirements
    marginInitial: { bsonType: "double" },
    marginMaintenance: { bsonType: "double" },
    
    // Status
    isActive: { bsonType: "bool" },
    
    // Timestamps
    createdAt: { bsonType: "date" },
    updatedAt: { bsonType: "date" }
  }
};

// Indexes
db.products.createIndex({ symbol: 1 }, { unique: true });
db.products.createIndex({ productType: 1 });
db.products.createIndex({ isActive: 1 });
db.products.createIndex({ expiryDate: 1 });
```

### Collection 8: `riskLimits`

```javascript
const riskLimitSchema = {
  bsonType: "object",
  required: ["accountId"],
  properties: {
    _id: { bsonType: "objectId" },
    accountId: { bsonType: "objectId" },
    
    // Position Limits
    maxPositionSize: { bsonType: "int" },
    maxExposure: { bsonType: "double" },
    maxLeverage: { bsonType: "double" },
    minMarginRatio: { bsonType: "double" },
    
    // Thresholds
    marginCallThreshold: { bsonType: "double" },    // 50%
    liquidationThreshold: { bsonType: "double" },   // 30%
    
    // Status
    isActive: { bsonType: "bool" },
    
    // Timestamps
    createdAt: { bsonType: "date" },
    updatedAt: { bsonType: "date" }
  }
};

// Indexes
db.riskLimits.createIndex({ accountId: 1 }, { unique: true });
```

---

## 3. MONGODB AGGREGATION PIPELINES

### Pipeline 1: Calculate Account Summary

```javascript
db.accounts.aggregate([
  {
    $match: { accountId: ObjectId("...") }
  },
  {
    $lookup: {
      from: "positions",
      localField: "_id",
      foreignField: "accountId",
      as: "openPositions"
    }
  },
  {
    $lookup: {
      from: "orders",
      localField: "_id",
      foreignField: "accountId",
      pipeline: [
        { $match: { status: { $in: ["PENDING_MATCH", "PARTIAL_FILLED"] } } }
      ],
      as: "pendingOrders"
    }
  },
  {
    $project: {
      accountNumber: 1,
      balance: 1,
      frozenAmount: 1,
      availableBalance: { $subtract: ["$balance", "$frozenAmount"] },
      totalPositions: { $size: "$openPositions" },
      totalUnrealizedPnL: { $sum: "$openPositions.unrealizedPnL" },
      pendingOrders: { $size: "$pendingOrders" },
      marginRatio: {
        $cond: {
          if: { $gt: ["$frozenAmount", 0] },
          then: { $divide: ["$balance", "$frozenAmount"] },
          else: 999
        }
      }
    }
  }
]);
```

### Pipeline 2: Daily P&L Report

```javascript
db.trades.aggregate([
  {
    $match: {
      accountId: ObjectId("..."),
      executedAt: {
        $gte: new Date("2024-05-18"),
        $lt: new Date("2024-05-19")
      }
    }
  },
  {
    $group: {
      _id: "$symbol",
      totalQuantity: { $sum: "$quantity" },
      totalValue: { $sum: "$totalValue" },
      totalCommission: { $sum: "$commission" },
      averagePrice: { $avg: "$executionPrice" },
      tradeCount: { $sum: 1 }
    }
  },
  {
    $project: {
      symbol: "$_id",
      totalQuantity: 1,
      totalValue: 1,
      totalCommission: 1,
      averagePrice: { $round: ["$averagePrice", 2] },
      tradeCount: 1,
      _id: 0
    }
  },
  {
    $sort: { totalValue: -1 }
  }
]);
```

---

## 4. BACKUP & RECOVERY STRATEGY

```bash
# Backup
mongodump --uri="mongodb://username:password@localhost:27017/mvx_trading" \
  --out=/backups/mvx_trading_$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://username:password@localhost:27017/mvx_trading" \
  /backups/mvx_trading_20240518/mvx_trading

# Automated backup (cron job)
0 2 * * * mongodump --uri="..." --out=/backups/mvx_trading_$(date +\\%Y\\%m\\%d)
```

