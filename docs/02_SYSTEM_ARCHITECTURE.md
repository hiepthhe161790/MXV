# 🏗️ KIẾN TRÚC HỆ THỐNG GIAO DỊCH HÀNG HÓA PHÁI SINH

## 1. TỔNG QUAN KIẾN TRÚC

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATIONS                             │
│  (Web Browser, Mobile App, Desktop Trading Platform)                   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ↓                     ↓
        ┌─────────────────────┐  ┌──────────────────┐
        │   REST API Layer    │  │  WebSocket       │
        │  (Express.js)       │  │  Real-time       │
        └──────────┬──────────┘  └────────┬─────────┘
                   │                      │
        ┌──────────┴──────────────────────┴──────────┐
        │                                             │
        ↓                                             ↓
┌──────────────────┐                      ┌─────────────────┐
│  OMS (Order      │                      │ Position        │
│  Management      │                      │ Manager         │
│  System)         │                      │                 │
└────────┬─────────┘                      └────────┬────────┘
         │                                         │
         ↓                                         ↓
    ┌────────────────────────────────────────────────────────┐
    │            RISK ENGINE                                 │
    │  • Margin Validation                                   │
    │  • Position Limit Check                                │
    │  • Exposure Validation                                 │
    │  • Auto-liquidation Logic                              │
    └─────────────────┬──────────────────────────────────────┘
                      │
    ┌─────────────────┴──────────────────┐
    │                                     │
    ↓                                     ↓
┌──────────────────────┐    ┌──────────────────────────┐
│ Exchange Connector   │    │ Settlement & Clearing     │
│ (API to MXV)         │    │ Engine                    │
└──────────┬───────────┘    └────────────┬─────────────┘
           │                             │
    ┌──────┴─────────────────────────────┴──────┐
    │                                            │
    ↓                                            ↓
┌────────────────────────────────────────────────────────┐
│            MONGODB DATABASE                            │
│  • Accounts Collection                                 │
│  • Orders Collection                                   │
│  • Positions Collection                                │
│  • Transactions Collection                             │
│  • Audit Logs Collection                               │
│  • Risk Checks Collection                              │
└────────────────────────────────────────────────────────┘
    │
    ├─ Redis Cache Layer (Optional)
    ├─ Message Queue (Bull/RabbitMQ)
    └─ External Services (Bank API, Email, etc)
```

---

## 2. TECH STACK

```
Backend:
├─ Runtime: Node.js (v18+)
├─ Framework: Express.js
├─ Database: MongoDB
├─ Cache: Redis (Optional)
├─ Message Queue: Bull (Redis-based)
├─ Authentication: JWT + HMAC
├─ Logging: Winston
├─ Monitoring: Prometheus + Grafana
└─ Testing: Jest, Supertest

Frontend (Optional):
├─ React / Vue.js
├─ TradingView Charts
└─ WebSocket Client

Infrastructure:
├─ Docker & Docker Compose
├─ Kubernetes (Optional)
└─ CI/CD: GitHub Actions / Jenkins
```

---

## 3. MICROSERVICES ARCHITECTURE

```
┌──────────────────────────────────────────────────────┐
│                API GATEWAY                            │
│  - Request Routing                                    │
│  - Authentication                                     │
│  - Rate Limiting                                      │
└────────────────────┬─────────────────────────────────┘
                     │
        ┌────────────┼────────────┬──────────┐
        ↓            ↓            ↓          ↓
    ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
    │Account │  │ Order  │  │Position│  │ Risk   │
    │Service │  │Service │  │Service │  │Service │
    └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘
        │           │           │           │
        └───────────┼───────────┼───────────┘
                    ↓
            ┌──────────────────┐
            │ Notification     │
            │ Service          │
            │ (Email/SMS/Push) │
            └──────────────────┘
```

### Service Responsibilities

**Account Service:**
- Quản lý tài khoản người dùng
- KYC verification
- Bank linking
- Deposit/Withdrawal
- Balance management

**Order Service:**
- Create/Update/Cancel orders
- Order validation
- Exchange integration
- Order history

**Position Service:**
- Open/Close positions
- P&L calculation
- Position monitoring
- Position history

**Risk Service:**
- Margin validation
- Position limit checking
- Exposure calculation
- Auto-liquidation
- Margin call detection

**Settlement Service:**
- EOD settlement
- Trade finalization
- P&L realization
- Statement generation

---

## 4. DATABASE SCHEMA (MONGODB)

### Collections Structure

```javascript
// 1. ACCOUNTS
{
  _id: ObjectId,
  accountNumber: String,           // MXV00001
  clientId: String,
  email: String,
  phone: String,
  
  // Status
  status: String,                  // PENDING, ACTIVE, SUSPENDED, CLOSED
  
  // KYC
  kyc: {
    fullName: String,
    identityType: String,           // PASSPORT, ID_CARD
    identityNumber: String,
    dateOfBirth: Date,
    nationality: String,
    verified: Boolean,
    verifiedAt: Date
  },
  
  // Financial Info
  balance: Number,
  frozenAmount: Number,            // Used for margin
  availableBalance: Number,
  totalDeposit: Number,
  totalWithdraw: Number,
  
  // Trading Settings
  accountType: String,              // INDIVIDUAL, CORPORATE
  riskProfile: String,              // LOW, MODERATE, AGGRESSIVE
  maxPositionLimit: Number,
  maxExposureLimit: Number,
  tradingPermission: [String],      // FUTURES, OPTIONS
  
  // Linked Banks
  linkedBanks: [{
    bankCode: String,
    accountNumber: String,
    accountHolder: String,
    verified: Boolean,
    verifiedAt: Date
  }],
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  kycVerifiedAt: Date,
  lastLoginAt: Date,
  
  // Metadata
  country: String,
  timezone: String,
  language: String,
  twoFactorEnabled: Boolean
}

// 2. ORDERS
{
  _id: ObjectId,
  orderId: String,                  // ORD20240518001
  accountId: ObjectId,
  clientOrderId: String,            // For idempotency
  
  // Product
  symbol: String,                   // GCZ24, SIZ24
  quantity: Number,
  
  // Order Type
  orderType: String,                // MARKET, LIMIT, STOP, STOP_LIMIT
  side: String,                     // BUY, SELL
  
  // Prices
  limitPrice: Number,
  stopPrice: Number,
  executedPrice: Number,
  
  // Status Flow
  status: String,                   // CREATED, VALIDATED, SUBMITTED, 
                                    // PENDING_MATCH, FILLED, PARTIAL_FILLED,
                                    // COMPLETED, CANCELLED, REJECTED
  
  filledQuantity: Number,
  remainingQuantity: Number,
  
  // Commission & Fees
  estimatedCommission: Number,
  actualCommission: Number,
  
  // Risk Checks
  marginRequired: Number,
  riskChecks: {
    marginCheck: { passed: Boolean, message: String },
    positionLimitCheck: { passed: Boolean, message: String },
    exposureCheck: { passed: Boolean, message: String }
  },
  
  // Execution Details
  exchangeOrderId: String,          // ID from Exchange
  exchanges: String,                 // MXV
  
  // Timestamps
  createdAt: Date,
  submittedAt: Date,
  filledAt: Date,
  completedAt: Date,
  
  // Flow Log
  flowLog: [{
    step: String,                   // OMS, RISK, EXCHANGE
    status: String,
    message: String,
    timestamp: Date
  }],
  
  // Audit
  createdBy: String,                // User ID
  modifiedBy: String
}

// 3. POSITIONS
{
  _id: ObjectId,
  accountId: ObjectId,
  symbol: String,
  
  // Position Details
  side: String,                     // LONG, SHORT
  openQuantity: Number,
  closedQuantity: Number,
  
  // Entry Info
  entryPrice: Number,
  entryDate: Date,
  
  // Current Status
  currentPrice: Number,
  
  // P&L
  unrealizedPnL: Number,
  realizedPnL: Number,
  
  // Risk Metrics
  marginUsed: Number,
  exposureAmount: Number,
  leverage: Number,
  
  // Stop Loss & Take Profit
  stopLossPrice: Number,
  takeProfitPrice: Number,
  
  // Timeline
  openedAt: Date,
  closedAt: Date,
  modifiedAt: Date,
  
  // Status
  status: String,                   // OPEN, CLOSING, CLOSED, LIQUIDATED
  
  // Trades that made this position
  trades: [ObjectId]                // Array of Trade IDs
}

// 4. TRANSACTIONS
{
  _id: ObjectId,
  transactionId: String,
  accountId: ObjectId,
  
  // Type
  type: String,                     // DEPOSIT, WITHDRAWAL, MARGIN_USAGE,
                                    // PNL_REALIZED, COMMISSION, DIVIDEND
  
  amount: Number,
  currency: String,                 // USD, VND
  
  // Status
  status: String,                   // PENDING, PROCESSING, COMPLETED, REJECTED
  
  // Bank Info (for deposit/withdrawal)
  bankCode: String,
  bankAccount: String,
  referenceNumber: String,
  
  // Related Order/Trade
  orderId: ObjectId,
  tradeId: ObjectId,
  positionId: ObjectId,
  
  // Description
  description: String,
  
  // Reconciliation
  reconcileStatus: String,          // PENDING, MATCHED, UNMATCHED
  reconcileAt: Date,
  
  // Timestamps
  createdAt: Date,
  processedAt: Date,
  completedAt: Date,
  
  // Audit
  createdBy: String
}

// 5. TRADES (Executions)
{
  _id: ObjectId,
  tradeId: String,
  orderId: ObjectId,
  accountId: ObjectId,
  symbol: String,
  
  // Execution
  side: String,                     // BUY, SELL
  quantity: Number,
  executionPrice: Number,
  totalValue: Number,
  
  // Fees
  commission: Number,
  fee: Number,
  
  // Counterparty
  counterpartyId: String,
  
  // Timestamps
  executedAt: Date,
  settledAt: Date,
  
  // Reference
  exchangeTradeId: String,
  
  // Status
  status: String                    // PENDING, SETTLED, CANCELLED
}

// 6. AUDIT_LOGS
{
  _id: ObjectId,
  eventId: String,
  timestamp: Date,
  eventType: String,                // ORDER_CREATED, ORDER_CANCELLED,
                                    // POSITION_OPENED, POSITION_CLOSED,
                                    // DEPOSIT, WITHDRAWAL, MARGIN_CALL, etc
  
  userId: String,
  accountId: ObjectId,
  
  // Changes
  changes: {
    before: Object,
    after: Object
  },
  
  // Severity
  severity: String,                 // INFO, WARNING, ERROR, CRITICAL
  
  // Connection Info
  ipAddress: String,
  userAgent: String,
  
  // Details
  details: Object
}

// 7. PRODUCTS (Symbols/Contracts)
{
  _id: ObjectId,
  symbol: String,                   // GCZ24
  productName: String,              // Gold Dec 2024
  productType: String,              // FUTURES, OPTION
  
  currency: String,
  contractSize: Number,
  tickSize: Number,
  tickValue: Number,
  
  expiryDate: Date,
  lastTradingDate: Date,
  
  marginInitial: Number,
  marginMaintenance: Number,
  
  isActive: Boolean,
  
  createdAt: Date,
  updatedAt: Date
}

// 8. RISK_LIMITS
{
  _id: ObjectId,
  accountId: ObjectId,
  
  // Limits
  maxPositionSize: Number,
  maxExposure: Number,
  maxLeverage: Number,
  minMarginRatio: Number,
  
  // Threshold
  marginCallThreshold: Number,      // 50%
  liquidationThreshold: Number,     // 30%
  
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 5. DATA FLOW & EVENT STREAM

### Order Creation Flow
```javascript
1. Client Request
   POST /api/orders
   {
     symbol: "GCZ24",
     side: "BUY",
     quantity: 10,
     orderType: "LIMIT",
     limitPrice: 2100
   }
   ↓
2. OMS Validation
   - Check symbol exists
   - Check quantity > 0
   - Check price format
   ↓
3. Margin & Risk Check
   - Calculate margin required
   - Check account balance
   - Check max position limit
   - Check exposure limit
   ↓
4. Create Order Document
   status: "CREATED"
   ↓
5. Submit to Exchange (Async via Message Queue)
   - Exchange API call
   - Set timeout 30s
   - Handle failures with retry
   ↓
6. Update Order Status
   status: "SUBMITTED"
   ↓
7. Wait for Exchange Confirmation
   status: "PENDING_MATCH"
   ↓
8. Order Matched
   status: "FILLED"
   - Update Position
   - Update Balance (margin)
   - Update Risk Metrics
   ↓
9. Send Confirmation to Client
   WebSocket: Position updated, Balance updated
```

### Real-time Updates via WebSocket
```javascript
// Subscription
ws.on('subscribe', (data) => {
  // /ws/orders -> sends order updates
  // /ws/positions -> sends position updates
  // /ws/balance -> sends balance updates
  // /ws/margin -> sends margin alerts
});

// Events sent
{
  type: "ORDER_UPDATED",
  data: { orderId, status, filledQuantity, ... }
}

{
  type: "POSITION_UPDATED",
  data: { positionId, currentPrice, unrealizedPnL, ... }
}

{
  type: "MARGIN_ALERT",
  severity: "WARNING",
  data: { marginLevel, action: "DEPOSIT_REQUIRED" }
}
```

---

## 6. ERROR HANDLING & RETRY LOGIC

```javascript
const retryConfig = {
  maxRetries: 3,
  backoffMs: 1000,           // 1s
  maxBackoffMs: 10000,       // 10s
  factor: 2                  // exponential
};

// Retry scenarios
- Network timeout
- Exchange API temporary failure
- Database connection error
- External service failure

// Non-retriable scenarios
- Invalid input
- Account not found
- Insufficient balance
- Position limit exceeded
```

---

## 7. SECURITY CONSIDERATIONS

```
1. Authentication
   - JWT tokens with 24h expiry
   - HMAC signatures for API calls
   - 2FA for sensitive operations
   
2. Authorization
   - Role-based access control (RBAC)
   - Account isolation
   - IP whitelisting (optional)
   
3. Data Protection
   - Encrypt sensitive fields (SSN, Bank Account)
   - HTTPS/TLS for all communications
   - Database encryption at rest
   
4. Audit
   - Log all operations
   - Immutable audit trail
   - Time-series data preservation
   
5. Rate Limiting
   - API rate limiting per account
   - DDoS protection
   - Order rate limiting
```

---

## 8. PERFORMANCE OPTIMIZATION

```javascript
// 1. Database Indexing
db.orders.createIndex({ accountId: 1, createdAt: -1 });
db.positions.createIndex({ accountId: 1 });
db.accounts.createIndex({ email: 1 });

// 2. Caching Strategy
- Cache products (symbols)
- Cache account settings
- Cache margin requirements
- TTL: 5-10 minutes

// 3. Connection Pooling
- MongoDB connection pool
- Redis connection pool
- HTTP connection reuse

// 4. Message Queue
- Async processing
- Background jobs (reconciliation, EOD settlement)
- Decoupling services

// 5. Monitoring
- Request latency
- Database query performance
- Message queue depth
- Error rates
```

