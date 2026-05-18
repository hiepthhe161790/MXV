# Quick Start - Commodity Trading Exchange Backend

## Prerequisites
- Node.js 16+
- Docker & Docker Compose (recommended)
- Or: MongoDB, Redis, RabbitMQ running locally

## Option 1: Docker (Recommended)

### Start Everything

```bash
cd trading-backend

# Build and start all services
docker-compose up --build

# Containers:
# - MongoDB on localhost:27017
# - Redis on localhost:6379
# - RabbitMQ on localhost:5672 (admin: localhost:15672)
# - Trading API on localhost:3001
```

### Health Check

```bash
curl http://localhost:3001/health

# Response:
# {"status":"ok","timestamp":"2024-01-15T10:30:00Z"}
```

---

## Option 2: Local Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Services

```bash
# Terminal 1: MongoDB
mongod --dbpath ./data/db

# Terminal 2: Redis
redis-server

# Terminal 3: RabbitMQ
# Or use: rabbitmq-server (if installed via package manager)
```

### 3. Configure Environment

```bash
cp .env.example .env

# Edit .env:
# MONGODB_URL=mongodb://localhost:27017/trading_exchange
# REDIS_URL=redis://localhost:6379
# RABBITMQ_URL=amqp://localhost
```

### 4. Start Backend

```bash
npm run dev

# Should log:
# [info]: MongoDB connected successfully
# [info]: Redis cache connected
# [info]: RabbitMQ connected successfully
# [info]: Trading Exchange API started on port 3001
```

---

## Testing the System

### 1. Create Account

```bash
curl -X POST http://localhost:3001/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trader1@example.com",
    "initialBalance": 50000
  }'

# Response:
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "email": "trader1@example.com",
#   "balance": 50000,
#   "frozenBalance": 0,
#   "availableBalance": 50000,
#   "totalEquity": 50000,
#   "isActive": true,
#   "createdAt": "2024-01-15T10:30:00Z"
# }
```

### 2. Get Account Details

```bash
curl http://localhost:3001/api/accounts/{accountId}

# Response: Account details with current balance
```

### 3. Deposit Funds

```bash
curl -X POST http://localhost:3001/api/accounts/{accountId}/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "reason": "Additional deposit"
  }'
```

### 4. Place Order

```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "{accountId}",
    "symbol": "GCZ24",
    "side": "BUY",
    "quantity": 100,
    "orderType": "LIMIT",
    "limitPrice": 2100,
    "idempotencyKey": "order-123-unique"
  }'

# Response: Created order with state SENT
# {
#   "id": "order-uuid",
#   "accountId": "account-uuid",
#   "symbol": "GCZ24",
#   "side": "BUY",
#   "quantity": 100,
#   "state": "SENT",
#   "filledQuantity": 0,
#   "averagePrice": 0,
#   "createdAt": "2024-01-15T10:30:00Z"
# }
```

### 5. Get Order Status

```bash
curl http://localhost:3001/api/orders/{orderId}

# Response: Current order state
```

### 6. Cancel Order

```bash
curl -X DELETE http://localhost:3001/api/orders/{orderId}

# Response: Order state CANCELLED
```

### 7. Get Positions

```bash
curl http://localhost:3001/api/positions/account/{accountId}

# Response: Array of open positions with P&L
```

### 8. Close Position

```bash
curl -X POST http://localhost:3001/api/positions/{accountId}/GCZ24/close \
  -H "Content-Type: application/json" \
  -d '{
    "closePrice": 2150
  }'

# Response: Closed position with realized P&L
```

---

## Architecture Overview

```
┌──────────────────────────────┐
│   Express.js REST API        │ Port 3001
│  /accounts /orders /positions│
└────────────┬─────────────────┘
             │
      ┌──────▼──────┐
      │  7 Services │
      └──────┬──────┘
             │
  ┌──────────┼──────────┐
  │          │          │
┌─▼─┐    ┌──▼──┐   ┌──▼──┐
│SQL│    │Cache│   │Events│ MongoDB, Redis, RabbitMQ
└───┘    └─────┘   └──────┘
```

---

## Services (Microservices)

| Service | Purpose | Events |
|---------|---------|--------|
| **Account** | Manage balances | BalanceDeposited, BalanceWithdrawn |
| **Order** | Order lifecycle | OrderCreated, OrderSent, OrderFilled |
| **Risk** | Risk validation | MarginCallTriggered, AutoLiquidation |
| **Position** | Track positions | PositionUpdated, PnL calculation |
| **Matching** | Order matching | TradeExecuted |
| **Settlement** | EOD settlement | AccountSettled, AuditLogged |
| **Infrastructure** | Events/Cache/DB | RabbitMQ, Redis, MongoDB |

---

## Key Endpoints

```
Accounts:
  POST   /api/accounts
  GET    /api/accounts/:id
  POST   /api/accounts/:id/deposit
  POST   /api/accounts/:id/withdraw
  POST   /api/accounts/:id/freeze
  POST   /api/accounts/:id/unfreeze

Orders:
  POST   /api/orders
  GET    /api/orders/:id
  GET    /api/orders/account/:id
  DELETE /api/orders/:id

Positions:
  GET    /api/positions/account/:id
  GET    /api/positions/:id/:symbol
  POST   /api/positions/:id/:symbol/close
```

---

## Order Lifecycle

```
NEW
  ↓ (validate)
VALIDATED
  ↓ (send to exchange)
SENT
  ↓ (match & fill)
PARTIALLY_FILLED or FILLED
  ↓
(settled)

Alternative paths:
- VALIDATED → REJECTED (by risk)
- SENT → CANCELLED (by user)
```

---

## Risk Rules

```
MAX_LEVERAGE:                 10:1
MIN_MARGIN_REQUIREMENT:       10%
MAX_EXPOSURE_PER_ACCOUNT:     $100,000
MARGIN_CALL_THRESHOLD:        20%
AUTO_LIQUIDATION_THRESHOLD:   5%
```

---

## Logs

```bash
# Real-time logs
docker-compose logs -f trading-backend

# Access MongoDB
docker-compose exec mongodb mongosh

# Access Redis
docker-compose exec redis redis-cli

# Access RabbitMQ Admin
# http://localhost:15672
# Default: guest/guest
```

---

## Stop Services

```bash
# Stop all (containers remain)
docker-compose stop

# Stop and remove
docker-compose down

# Remove all (including volumes)
docker-compose down -v
```

---

## Next: Full Documentation

See [README.md](./README.md) for complete documentation including:
- Architecture deep dive
- DDD patterns
- Event sourcing
- API reference
- Deployment guide

---

**System Ready! Start trading! 🚀**
