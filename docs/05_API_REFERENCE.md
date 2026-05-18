# 🔗 API REFERENCE - MVX TRADING SYSTEM

## Base URL
```
https://api.mvx.vn/api/v1
Development: http://localhost:3000/api/v1
```

## Authentication
Tất cả requests (trừ login/register) cần JWT token trong header:
```
Authorization: Bearer {token}
```

---

## 📋 Account Endpoints

### 1. Register Account
```http
POST /accounts/register

Content-Type: application/json

{
  "email": "trader@example.com",
  "phone": "+84912345678",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "accountNumber": "MVX000001",
    "email": "trader@example.com",
    "status": "PENDING",
    "createdAt": "2024-05-18T10:00:00Z"
  }
}
```

### 2. Login
```http
POST /accounts/login

{
  "email": "trader@example.com",
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h",
    "account": {
      "_id": "507f1f77bcf86cd799439011",
      "accountNumber": "MVX000001",
      "email": "trader@example.com",
      "balance": 100000,
      "status": "ACTIVE"
    }
  }
}
```

### 3. Get Account Details
```http
GET /accounts/{accountId}
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "accountNumber": "MVX000001",
    "email": "trader@example.com",
    "status": "ACTIVE",
    "balance": 100000,
    "frozenAmount": 15000,
    "availableBalance": 85000,
    "kyc": {
      "verified": true,
      "fullName": "Nguyễn Văn A",
      "dateOfBirth": "1990-01-01"
    },
    "riskProfile": "MODERATE",
    "maxPositionLimit": 1000,
    "tradingPermission": ["FUTURES", "OPTIONS"]
  }
}
```

### 4. Update KYC Information
```http
POST /accounts/kyc
Authorization: Bearer {token}

{
  "fullName": "Nguyễn Văn A",
  "identityType": "PASSPORT",
  "identityNumber": "123456789",
  "dateOfBirth": "1990-01-01",
  "nationality": "Vietnam",
  "address": "123 Nguyen Hue, Ho Chi Minh",
  "city": "Ho Chi Minh",
  "country": "Vietnam",
  "postalCode": "700000"
}

Response: 200 OK
{
  "success": true,
  "message": "KYC information submitted for verification",
  "data": { ... }
}
```

---

## 📊 Order Endpoints

### 1. Create Order
```http
POST /orders

Authorization: Bearer {token}
Content-Type: application/json

{
  "symbol": "GCZ24",
  "side": "BUY",
  "quantity": 10,
  "orderType": "LIMIT",
  "limitPrice": 2100.00,
  "clientOrderId": "client_order_001"  // optional, for idempotency
}

Response: 201 Created
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "orderId": "ORD20240518100000ABC",
    "symbol": "GCZ24",
    "side": "BUY",
    "quantity": 10,
    "orderType": "LIMIT",
    "limitPrice": 2100.00,
    "status": "SUBMITTED",
    "filledQuantity": 0,
    "marginRequired": 10000,
    "riskChecks": {
      "marginCheck": { "passed": true },
      "positionLimitCheck": { "passed": true },
      "exposureCheck": { "passed": true }
    },
    "createdAt": "2024-05-18T10:00:00Z"
  }
}
```

### 2. Get Order
```http
GET /orders/{orderId}
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "orderId": "ORD20240518100000ABC",
    "symbol": "GCZ24",
    "side": "BUY",
    "quantity": 10,
    "status": "FILLED",
    "filledQuantity": 10,
    "executedPrice": 2100.00,
    "flowLog": [
      { "step": "OMS", "status": "CREATED", "timestamp": "..." },
      { "step": "RISK", "status": "PASSED", "timestamp": "..." },
      { "step": "EXCHANGE", "status": "SUBMITTED", "timestamp": "..." },
      { "step": "EXCHANGE", "status": "EXECUTED", "timestamp": "..." }
    ]
  }
}
```

### 3. List Orders
```http
GET /orders?status=FILLED&symbol=GCZ24&page=0&limit=10
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "orderId": "ORD20240518100000ABC",
      "symbol": "GCZ24",
      "side": "BUY",
      "quantity": 10,
      "status": "FILLED",
      "createdAt": "2024-05-18T10:00:00Z"
    },
    ...
  ],
  "pagination": {
    "page": 0,
    "limit": 10,
    "total": 25
  }
}
```

### 4. Cancel Order
```http
DELETE /orders/{orderId}
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "orderId": "ORD20240518100000ABC",
    "status": "CANCELLED"
  }
}
```

---

## 📈 Position Endpoints

### 1. Get All Positions
```http
GET /positions
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "symbol": "GCZ24",
      "side": "LONG",
      "openQuantity": 100,
      "entryPrice": 2100.00,
      "currentPrice": 2150.00,
      "unrealizedPnL": 5000,
      "marginUsed": 10000,
      "leverage": 21.5,
      "status": "OPEN"
    },
    ...
  ]
}
```

### 2. Get Position Details
```http
GET /positions/{symbol}
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "symbol": "GCZ24",
    "side": "LONG",
    "openQuantity": 100,
    "closedQuantity": 0,
    "entryPrice": 2100.00,
    "entryDate": "2024-05-18T10:00:00Z",
    "currentPrice": 2150.00,
    "unrealizedPnL": 5000,
    "realizedPnL": 0,
    "marginUsed": 10000,
    "exposureAmount": 215000,
    "leverage": 21.5,
    "stopLossPrice": 2000.00,
    "takeProfitPrice": 2200.00,
    "status": "OPEN"
  }
}
```

### 3. Close Position
```http
POST /positions/{symbol}/close

{
  "quantity": 50,  // Partial close
  "orderType": "MARKET"
}

Response: 200 OK
{
  "success": true,
  "message": "Position closed successfully",
  "data": {
    "closedQuantity": 50,
    "exitPrice": 2150.00,
    "realizedPnL": 2500,
    "remaining": 50
  }
}
```

### 4. Get Positions Summary
```http
GET /positions/summary
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "totalPositions": 3,
    "totalMarginUsed": 30000,
    "totalExposure": 645000,
    "totalUnrealizedPnL": 12500,
    "totalRealizedPnL": 5000,
    "marginLevel": 350  // %
  }
}
```

---

## 💰 Transaction Endpoints

### 1. Deposit
```http
POST /transactions/deposit
Authorization: Bearer {token}

{
  "amount": 10000,
  "bankCode": "MB",
  "bankAccount": "0123456789",
  "currency": "VND"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "transactionId": "TXN20240518100000ABC",
    "type": "DEPOSIT",
    "amount": 10000,
    "status": "PENDING",
    "referenceNumber": "REF123456",
    "createdAt": "2024-05-18T10:00:00Z"
  }
}
```

### 2. Withdraw
```http
POST /transactions/withdraw
Authorization: Bearer {token}

{
  "amount": 5000,
  "bankCode": "MB",
  "bankAccount": "0123456789"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "transactionId": "TXN20240518100001ABC",
    "type": "WITHDRAWAL",
    "amount": 5000,
    "status": "PENDING",
    "createdAt": "2024-05-18T10:01:00Z"
  }
}
```

### 3. Get Balance
```http
GET /transactions/balance
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": {
    "accountNumber": "MVX000001",
    "totalBalance": 100000,
    "frozenAmount": 15000,
    "availableBalance": 85000,
    "marginLevel": 667,  // %
    "marginStatus": "SAFE"
  }
}
```

### 4. List Transactions
```http
GET /transactions?type=DEPOSIT&status=COMPLETED&page=0&limit=10
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "transactionId": "TXN20240518100000ABC",
      "type": "DEPOSIT",
      "amount": 10000,
      "status": "COMPLETED",
      "createdAt": "2024-05-18T10:00:00Z"
    },
    ...
  ]
}
```

---

## 🔍 WebSocket Events (Real-time)

### Connect
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your_jwt_token' }
});
```

### Subscribe to Order Updates
```javascript
socket.emit('subscribe', { channel: 'orders' });

socket.on('order:updated', (data) => {
  // {
  //   orderId: "ORD...",
  //   status: "FILLED",
  //   filledQuantity: 10,
  //   executedPrice: 2100.00
  // }
});
```

### Subscribe to Position Updates
```javascript
socket.emit('subscribe', { channel: 'positions' });

socket.on('position:updated', (data) => {
  // {
  //   symbol: "GCZ24",
  //   unrealizedPnL: 5000,
  //   marginLevel: 667,
  //   status: "OPEN"
  // }
});
```

### Subscribe to Balance Updates
```javascript
socket.emit('subscribe', { channel: 'balance' });

socket.on('balance:updated', (data) => {
  // {
  //   balance: 100000,
  //   frozenAmount: 15000,
  //   availableBalance: 85000
  // }
});
```

### Margin Alert
```javascript
socket.on('margin:alert', (data) => {
  // {
  //   severity: "WARNING",
  //   marginLevel: 75,
  //   action: "DEPOSIT_REQUIRED"
  // }
});
```

---

## ❌ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid input",
  "errors": [
    {
      "field": "quantity",
      "message": "quantity must be a positive integer"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Order not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again after 15 minutes"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## 📝 Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

## 🔐 Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Premium**: 1000 requests per 15 minutes
- **Headers**:
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Reset timestamp

---

## 📚 Example: Complete Trading Flow

```bash
# 1. Register & Login
curl -X POST http://localhost:3000/api/v1/accounts/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trader@example.com",
    "phone": "+84912345678",
    "password": "SecurePass123!"
  }'

# 2. Deposit Money
curl -X POST http://localhost:3000/api/v1/transactions/deposit \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000,
    "bankCode": "MB"
  }'

# 3. Create Order
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "GCZ24",
    "side": "BUY",
    "quantity": 10,
    "orderType": "LIMIT",
    "limitPrice": 2100.00
  }'

# 4. View Position
curl -X GET http://localhost:3000/api/v1/positions/GCZ24 \
  -H "Authorization: Bearer {token}"

# 5. Close Position
curl -X POST http://localhost:3000/api/v1/positions/GCZ24/close \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{ "quantity": 10, "orderType": "MARKET" }'

# 6. Withdraw Money
curl -X POST http://localhost:3000/api/v1/transactions/withdraw \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 50000, "bankCode": "MB" }'
```

