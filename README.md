# 📘 MVX TRADING SYSTEM - README

## 🎯 Mục tiêu Hệ thống

Xây dựng một hệ thống giao dịch hàng hóa phái sinh (Derivatives Trading System) đầy đủ với Node.js và MongoDB, hỗ trợ:

- **Quản lý tài khoản**: Đăng ký, KYC, liên kết ngân hàng
- **Quản lý tiền**: Nộp, rút tiền, đối soát
- **Giao dịch**: Đặt lệnh, khớp lệnh, quản lý vị thế
- **Quản lý rủi ro**: Ký quỹ, margin call, liquidation tự động
- **Lịch sử & Tài liệu**: Order history, trade history, audit log
- **API & Tích hợp**: REST API, WebSocket, FIX Protocol

---

## 🏗️ Kiến trúc Hệ thống

```
┌─────────────────────────────────┐
│   Client Applications            │ (Web, Mobile, Desktop)
└──────────────┬──────────────────┘
               │
    ┌──────────┴──────────┐
    ↓                     ↓
┌─────────────┐    ┌──────────────┐
│  REST API   │    │  WebSocket   │
│ (Express)   │    │ (Real-time)  │
└──────┬──────┘    └───────┬──────┘
       │                   │
       └─────────┬─────────┘
                 ↓
          ┌─────────────┐
          │ Middleware  │
          │ - Auth      │
          │ - Validator │
          │ - Logger    │
          └──────┬──────┘
                 │
      ┌──────────┴──────────┐
      ↓                     ↓
┌─────────────┐      ┌─────────────┐
│   Services  │      │  Controllers│
│ - Order     │      │ - Account   │
│ - Risk      │      │ - Order     │
│ - Position  │      │ - Position  │
│ - Audit     │      └─────────────┘
└──────┬──────┘
       │
       ↓
┌──────────────────────┐
│  MongoDB Database    │
│ - Accounts           │
│ - Orders             │
│ - Positions          │
│ - Transactions       │
│ - Trades             │
│ - AuditLogs          │
└──────────────────────┘
```

---

## 🚀 Hướng Dẫn Cài Đặt

### 1. Yêu cầu Hệ thống

- Node.js 18+
- MongoDB 4.4+
- npm hoặc yarn

### 2. Clone & Cài Đặt

```bash
# Clone repository
git clone https://github.com/your-repo/mvx-trading-system.git
cd mvx-trading-system

# Cài đặt dependencies
npm install

# Copy environment file
cp .env.example .env

# Cập nhật .env với cấu hình của bạn
```

### 3. Cấu Hình MongoDB

```bash
# Option 1: Local MongoDB
mongod --dbpath /path/to/data

# Option 2: MongoDB Atlas
# Cập nhật MONGODB_URI trong .env

# Create indexes
npm run seed
```

### 4. Khởi động Server

```bash
# Development mode
npm run dev

# Production mode
npm start

# Output:
# ✅ MongoDB connected: localhost:27017/mvx_trading
# 🚀 Server running on port 3000
# 📝 Environment: development
# 🌍 API URL: http://localhost:3000
```

---

## 📚 Cấu Trúc Dự Án

```
mvx-trading-system/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   ├── logger.js            # Pino logger
│   │   └── env.js               # Environment variables
│   │
│   ├── models/
│   │   ├── Account.js           # Account schema
│   │   ├── Order.js             # Order schema
│   │   ├── Position.js          # Position schema
│   │   ├── Transaction.js       # Transaction schema
│   │   ├── Trade.js             # Trade schema
│   │   └── AuditLog.js          # Audit log schema
│   │
│   ├── services/
│   │   ├── AccountService.js    # Account business logic
│   │   ├── OrderService.js      # Order business logic
│   │   ├── PositionService.js   # Position business logic
│   │   ├── RiskService.js       # Risk management logic
│   │   └── AuditService.js      # Audit logging
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
│   │   ├── auth.js              # JWT authentication
│   │   ├── validator.js         # Request validation
│   │   ├── errorHandler.js      # Error handling
│   │   └── rateLimit.js         # Rate limiting
│   │
│   ├── utils/
│   │   ├── idGenerator.js       # Generate unique IDs
│   │   ├── validators.js        # Validation schemas
│   │   └── helpers.js           # Helper functions
│   │
│   ├── jobs/
│   │   ├── settlementJob.js     # EOD settlement
│   │   ├── marginCallJob.js     # Margin call detection
│   │   └── reconciliationJob.js # Bank reconciliation
│   │
│   └── app.js                   # Express app setup
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── docs/
│   ├── 01_BUSINESS_CONCEPTS.md
│   ├── 02_SYSTEM_ARCHITECTURE.md
│   ├── 03_MONGODB_SCHEMA.md
│   ├── 04_IMPLEMENTATION_GUIDE.md
│   └── 05_API_REFERENCE.md
│
├── scripts/
│   └── seed.js                  # Database seeding
│
├── .env.example
├── .gitignore
├── package.json
├── server.js                    # Entry point
└── README.md
```

---

## 🔑 Core Features

### 1. **Account Management** 
```bash
POST   /api/v1/accounts/register    # Register new account
POST   /api/v1/accounts/login       # Login
GET    /api/v1/accounts/{id}        # Get account info
POST   /api/v1/accounts/kyc         # Submit KYC
PATCH  /api/v1/accounts/{id}        # Update account
```

### 2. **Order Management**
```bash
POST   /api/v1/orders              # Create order
GET    /api/v1/orders/{id}         # Get order
GET    /api/v1/orders              # List orders
DELETE /api/v1/orders/{id}         # Cancel order
```

### 3. **Position Management**
```bash
GET    /api/v1/positions           # Get all positions
GET    /api/v1/positions/{id}      # Get position details
GET    /api/v1/positions/summary   # Get summary
```

### 4. **Balance & Transactions**
```bash
POST   /api/v1/transactions/deposit    # Deposit
POST   /api/v1/transactions/withdraw   # Withdraw
GET    /api/v1/transactions            # List transactions
GET    /api/v1/balance                 # Get balance info
```

---

## 📋 Database Collections

### 1. Accounts
- accountNumber, email, phone
- KYC information
- Balance tracking
- Trading permissions

### 2. Orders
- Order details (symbol, quantity, side)
- Status tracking (CREATED → COMPLETED)
- Risk checks results
- Flow logs

### 3. Positions
- Open positions per symbol
- Entry/exit prices
- P&L calculations
- Margin tracking

### 4. Transactions
- Deposits/Withdrawals
- Reconciliation status
- Bank information

### 5. Trades
- Trade executions
- Commission tracking
- Settlement status

### 6. AuditLogs
- All system events
- User actions
- Changes tracking
- Compliance

---

## 🔒 Security

- **Authentication**: JWT tokens (24h expiry)
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: Password hashing (bcrypt), sensitive data encryption
- **API Security**:
  - CORS enabled
  - Rate limiting
  - Input validation
  - SQL injection prevention
  - XSS protection (Helmet)

---

## 📊 Key Calculations

### Margin Level
```
Margin Level = (Account Balance / Frozen Amount) × 100%
- 100%+: OK
- 50-100%: Margin Call
- <50%: Forced Liquidation
```

### Unrealized P&L
```
LONG:  (Current Price - Entry Price) × Quantity
SHORT: (Entry Price - Current Price) × Quantity
```

### Leverage
```
Leverage = Exposure Amount / Margin Used
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run integration tests
npm run test:integration

# Watch mode
npm run test:watch
```

---

## 📝 API Documentation

Xem [API_REFERENCE.md](docs/05_API_REFERENCE.md) để chi tiết đầy đủ.

---

## 🚧 Roadmap

- [ ] Phase 1: Core features (Account, Order, Position)
- [ ] Phase 2: Risk management & margin calls
- [ ] Phase 3: WebSocket real-time updates
- [ ] Phase 4: Advanced features (Options, Hedging)
- [ ] Phase 5: Mobile app integration

---

## 📞 Support & Contribution

- Issues: [GitHub Issues]
- Pull Requests: Welcome!
- Email: dev@mvx.vn

---

## 📄 License

MIT License - © 2024 MVX Trading

