# 📚 PHÂN TÍCH KHÁI NIỆM NGHIỆP VỤ GIAO DỊCH HÀNG HÓA PHÁI SINH

## PHẦN 1: TỔNG QUAN THỊ TRƯỜNG HÀNG HÓA PHÁI SINH

### 1.1 Mô hình thị trường
```
Nhà đầu tư (Traders)
    ↓
Sàn giao dịch (Exchange - MXV)
    ↓
Thành viên kinh doanh (Brokers)
    ↓
Hệ thống giao dịch (Trading System)
    ↓
Ngân hàng thanh toán & Clearing House
```

**Các vai trò chính:**
- **MXV (Sàn giao dịch)**: Quản lý sản phẩm, khớp lệnh, quy định
- **Thành viên kinh doanh (Brokers)**: Trung gian giữa nhà đầu tư và sàn
- **Nhà đầu tư**: Cá nhân/tổ chức giao dịch
- **Ngân hàng thanh toán**: Xử lý tiền, settlement

### 1.2 Các loại sản phẩm giao dịch
```javascript
// Loại 1: Hợp đồng Tương lai (Futures)
{
  type: "FUTURES",
  symbol: "GCZ24",           // Gold December 2024
  description: "Vàng tháng 12/2024",
  currency: "USD",
  contractSize: 100,         // troy ounces
  tickSize: 0.10,           // $0.10
  tickValue: 10,            // mỗi tick = $10
  minTradeVolume: 1,
  expiryDate: "2024-12-27"
}

// Loại 2: Hợp đồng Quyền chọn (Options)
{
  type: "OPTION",
  optionType: "CALL|PUT",
  strikePrice: 2000,
  expiryDate: "2024-12-27"
}

// Nhóm hàng hóa:
- Nông sản: Lúa, Cacao, Cà phê, Đường
- Kim loại: Vàng, Bạc, Đồng, Nhôm
- Năng lượng: Dầu, Khí tự nhiên
- Nguyên liệu công nghiệp: Cao su, Palady
```

### 1.3 Đặc điểm giao dịch hàng hóa

**🔑 Ký quỹ (Margin)**
```javascript
// Ký quỹ là tiền đặt cọc để giao dịch
const marginRequirement = {
  initialMargin: 10000,      // Ký quỹ ban đầu
  maintenanceMargin: 7500,   // Ký quỹ bảo trì
  marginUtilized: 5000,      // Ký quỹ đã sử dụng
  marginAvailable: 5000,     // Ký quỹ còn lại = Balance - Utilized
  marginLevel: 0.67,         // Util / Required = 5000 / 7500
  leverageRatio: 10          // 1 : 10
};

// Công thức:
// Balance = 100,000 USD
// Margin Utilized = 100,000 - Margin Available
// Margin Level = Margin Used / Maintenance Margin
// Nếu Margin Level < 100% → Margin Call
```

**🎯 Đòn bẩy (Leverage)**
```javascript
// Giao dịch với đòn bẩy 1:10
const trade = {
  accountBalance: 10000,     // Tài khoản
  leverage: 10,              // 10x
  buyingPower: 100000,       // Sức mua = Balance × Leverage
  position: 100,             // Mua 100 hợp đồng
  contractValue: 100000,     // Giá trị = 100 × giá hiện tại
};
```

**💰 Giá trị hợp đồng (Contract Value)**
```javascript
const contractValue = {
  currentPrice: 2100,        // $/oz cho vàng
  contractSize: 100,         // 100 oz
  value: 2100 * 100,        // = $210,000
  // Với ký quỹ 10,000, nhà đầu tư kiểm soát $210,000
};
```

**📊 Tick Size & Tick Value**
```javascript
const tickInfo = {
  tickSize: 0.10,           // Mức tăng giá tối thiểu
  currentPrice: 2100.00,
  nextPrice: 2100.10,       // Tăng 1 tick
  
  tickValue: 10,            // $10 trên 1 tick
  // Nếu giá tăng 1 tick: P&L = +$10
  // Nếu giá tăng 10 ticks ($1): P&L = +$100
  // Nếu giá tăng 100 ticks ($10): P&L = +$1,000
};
```

**⏰ Ngày đáo hạn (Expiry)**
```javascript
const expiryInfo = {
  symbol: "GCZ24",
  expiryDate: "2024-12-27",
  lastTradingDate: "2024-12-26",
  // Sau ngày này, hợp đồng không còn giao dịch được
};
```

---

## PHẦN 2: NGHIỆP VỤ GIAO DỊCH CỐT LÕI

### 2.1 Quản lý tài khoản giao dịch

**Lifecycle của Account:**
```
1. KYC (Know Your Customer)
   - Xác minh danh tính
   - Xác minh địa chỉ
   - Xác minh nguồn tiền
   
2. Mở tài khoản
   - Tạo account
   - Setup password
   - Kích hoạt
   
3. Trạng thái tài khoản
   - PENDING: Chờ xác minh
   - ACTIVE: Sẵn sàng giao dịch
   - SUSPENDED: Tạm khóa
   - CLOSED: Đóng tài khoản
   
4. Liên kết ngân hàng
   - Xác minh ngân hàng
   - Lưu thông tin tài khoản ngân hàng
```

**📋 Data Structure Account:**
```javascript
const account = {
  _id: ObjectId,
  accountNumber: "MVX00001",
  clientId: "CLI001",
  status: "ACTIVE",         // PENDING, ACTIVE, SUSPENDED, CLOSED
  
  // KYC Info
  fullName: "Nguyễn Văn A",
  identityType: "PASSPORT",
  identityNumber: "123456789",
  dateOfBirth: "1990-01-01",
  nationality: "Vietnam",
  
  // Account Type
  accountType: "INDIVIDUAL", // INDIVIDUAL, CORPORATE
  tradingPermission: ["FUTURES", "OPTIONS"],
  
  // Balance Info
  balance: 100000,           // Số tiền hiện có
  frozenAmount: 0,          // Tiền bị khoá (margin used)
  availableBalance: 100000,
  
  // Risk Profile
  riskProfile: "MODERATE",   // LOW, MODERATE, AGGRESSIVE
  maxPositionLimit: 1000,
  
  // Timestamps
  createdAt: "2024-01-01",
  updatedAt: "2024-05-18",
  kycVerifiedAt: "2024-01-05",
  
  // Bank Info
  linkedBanks: [
    {
      bankCode: "MB",
      accountNumber: "0123456789",
      verified: true
    }
  ]
};
```

### 2.2 Nộp và Rút tiền

**Luồng Nộp tiền (Deposit):**
```
1. Nhà đầu tư chuyển tiền vào ngân hàng broker
   ↓
2. Xác nhận giao dịch ngân hàng
   ↓
3. Auto Reconcile (so đối ngân hàng)
   - Kiểm tra transaction ref
   - Cập nhật balance
   ↓
4. Tiền khả dụng trong tài khoản
   ↓
5. Audit log ghi nhận
```

**Luồng Rút tiền (Withdrawal):**
```
1. Yêu cầu rút tiền
   - Kiểm tra số dư: Balance ≥ Withdrawal Amount
   - Kiểm tra không có position mở hoặc đủ margin
   
2. Phê duyệt
   - By Compliance/Admin
   
3. Chuyển tiền
   - Chuyển từ tài khoản broker → ngân hàng nhà đầu tư
   
4. Settlement
   - Xác nhận tiền rút
   
5. Audit log
```

**💾 Data Structure:**
```javascript
const transaction = {
  _id: ObjectId,
  transactionId: "TXN20240518001",
  accountId: "MVX00001",
  type: "DEPOSIT",              // DEPOSIT, WITHDRAWAL
  amount: 10000,
  currency: "VND",
  
  // Status flow: PENDING → PROCESSING → COMPLETED/REJECTED
  status: "COMPLETED",
  
  // Bank Info
  bankCode: "MB",
  bankAccount: "0123456789",
  referenceNumber: "REF123456",
  
  // Timestamps
  createdAt: "2024-05-18T10:00:00",
  processedAt: "2024-05-18T10:15:00",
  completedAt: "2024-05-18T10:30:00",
  
  // Reconciliation
  reconcileStatus: "MATCHED",   // PENDING, MATCHED, UNMATCHED
  auditLog: [...]
};
```

**⚠️ Edge Cases:**
- **Freeze Amount**: Tiền bị khoá do margin used
- **Transaction Rollback**: Hoàn lại nếu có lỗi
- **Partial Fill**: Rút một phần nếu không đủ điều kiện

### 2.3 Đặt lệnh giao dịch (Order)

**Loại lệnh:**
```javascript
// 1. MARKET ORDER - Lệnh giá thị trường
{
  orderType: "MARKET",
  side: "BUY",
  quantity: 10,
  executionPrice: 2150.50,     // Giá thực hiện = giá thị trường hiện tại
  // Thực hiện ngay tức thì
}

// 2. LIMIT ORDER - Lệnh giá tối đa/tối thiểu
{
  orderType: "LIMIT",
  side: "BUY",
  quantity: 10,
  limitPrice: 2100.00,         // Chỉ mua nếu ≤ $2100
  status: "PENDING_MATCH",     // Chờ khớp lệnh
}

// 3. STOP ORDER (Stop Loss)
{
  orderType: "STOP",
  side: "SELL",
  quantity: 10,
  stopPrice: 2000.00,          // Kích hoạt nếu giá xuống ≤ $2000
  status: "WAITING_TRIGGER",
  // Khi giá xuống đến $2000 → tự động trở thành MARKET ORDER
}

// 4. STOP LIMIT ORDER
{
  orderType: "STOP_LIMIT",
  side: "SELL",
  quantity: 10,
  stopPrice: 2000.00,          // Trigger price
  limitPrice: 1999.00,         // Order price sau khi trigger
  status: "WAITING_TRIGGER",
}
```

**🔄 Lifecycle của Order:**
```
1. CREATE: Nhà đầu tư tạo lệnh
   ↓
2. VALIDATE: Kiểm tra
   - Đủ margin?
   - Đủ buying power?
   - Số lượng hợp lệ?
   - Price hợp lệ?
   
3. RISK CHECK: Risk Engine kiểm tra
   - Không vượt max position?
   - Không vượt exposure limit?
   - Đủ margin sau khi open position?
   
4. SUBMIT: Gửi lệnh lên sàn giao dịch (Exchange)
   
5. PENDING: Chờ khớp lệnh
   
6. MATCHED/PARTIAL_FILLED: Có giao dịch xảy ra
   
7. COMPLETED/CANCELLED: Kết thúc
   
8. AUDIT LOG: Ghi nhận toàn bộ quá trình
```

**📊 Data Structure Order:**
```javascript
const order = {
  _id: ObjectId,
  orderId: "ORD20240518001",
  accountId: "MVX00001",
  clientOrderId: "CLIENT001",   // ID do client tạo (idempotency)
  
  // Product Info
  symbol: "GCZ24",
  quantity: 100,
  
  // Order Details
  orderType: "LIMIT",           // MARKET, LIMIT, STOP, STOP_LIMIT
  side: "BUY",                  // BUY, SELL
  
  limitPrice: 2100.00,
  stopPrice: null,
  
  // Status Flow
  status: "PENDING_MATCH",      // CREATE→VALIDATE→SUBMIT→PENDING_MATCH→MATCHED→COMPLETED
  filledQuantity: 50,
  remainingQuantity: 50,
  
  // Execution
  executedPrice: null,
  totalValue: null,
  
  // Margin & Fees
  marginRequired: 5000,
  estimatedCommission: 50,
  
  // Risk Checks
  riskChecks: {
    marginCheck: { passed: true },
    positionLimitCheck: { passed: true },
    exposureCheck: { passed: true }
  },
  
  // Timestamps
  createdAt: "2024-05-18T10:00:00",
  submittedAt: "2024-05-18T10:01:00",
  filledAt: null,
  
  // Flow: OMS → Risk Engine → Exchange
  flowLog: [
    { step: "OMS", status: "RECEIVED", timestamp: "..." },
    { step: "RISK", status: "PASSED", timestamp: "..." },
    { step: "EXCHANGE", status: "SUBMITTED", timestamp: "..." }
  ]
};
```

**⚡ Flow trong hệ thống:**
```
Client (OMS)
    ↓ (Order Request)
Risk Engine
    ↓ (Risk Validation)
    ├─ Margin Check ✓
    ├─ Position Limit Check ✓
    └─ Exposure Check ✓
    ↓
Exchange API
    ↓
Order Matching Engine
    ↓
Trade Execution
    ↓
Update Position
    ↓
Update Balance
    ↓
Send Confirmation to Client
```

---

## PHẦN 3: QUẢN LÝ VỊ THẾ (Position Management)

### Open Position (Vị thế mở)
```javascript
const position = {
  _id: ObjectId,
  accountId: "MVX00001",
  symbol: "GCZ24",
  
  // Position Details
  side: "LONG",                // LONG (mua), SHORT (bán)
  openQuantity: 100,           // Số lượng vị thế mở
  
  // Entry Info
  entryPrice: 2100.00,         // Giá vào vị thế
  entryDate: "2024-05-18",
  
  // Current Value
  currentPrice: 2150.00,       // Giá thị trường hiện tại
  
  // P&L Calculation
  unrealizedPnL: 5000,         // (2150 - 2100) × 100 × Multiplier
  realizedPnL: 0,              // Lợi nhuận đã lấy khóa
  
  // Risk Metrics
  marginUsed: 10000,           // Tiền ký quỹ sử dụng cho vị thế
  exposureAmount: 215000,      // Giá trị hiện tại của vị thế
  
  // Leverage
  leverage: 21.5,              // Exposure / Margin Used
  
  // Stop Loss & Take Profit
  stopLossPrice: 2000.00,
  takeProfitPrice: 2200.00,
  
  // Timestamps
  openedAt: "2024-05-18T10:00:00",
  modifiedAt: "2024-05-18T11:00:00"
};
```

### P&L Calculation

**Unrealized P&L (Lợi nhuận chưa lấy khóa):**
```javascript
// LONG Position (Mua)
unrealizedPnL = (currentPrice - entryPrice) × quantity × multiplier

// SHORT Position (Bán)
unrealizedPnL = (entryPrice - currentPrice) × quantity × multiplier

// Ví dụ: Mua 100 lô vàng ở $2100, giá hiện tại $2150
unrealizedPnL = (2150 - 2100) × 100 × 1 = $5,000
```

**Realized P&L (Lợi nhuận đã lấy khóa):**
```javascript
// Khi đóng position
realizedPnL = (exitPrice - entryPrice) × quantity × multiplier
```

### Forced Liquidation (Thanh lý vị thế)
```
Điều kiện thanh lý:
- Khi Margin Level < 100%
- Hệ thống tự động bán vị thế để có đủ tiền
- Bán từ lỗ → lợi nhất

Ví dụ:
- Account Balance: $100,000
- Margin Required: $10,000
- Position: 100 lô vàng ở $2100
- Giá hiện tại: $1900 (lỗ $20,000)
- Balance còn: $80,000
- Margin Level: 80% < 100%
→ Hệ thống forced liquidate: bán 100 lô ở $1900
→ Thu về: $190,000 - $10,000 margin = $180,000 chuyển về balance
```

### Margin Call (Cảnh báo Margin)
```
Ngưỡng Margin Level:
- 100%+: OK
- 50-100%: ⚠️ WARNING (Margin Call)
- <50%: 🔴 DANGER (Auto Liquidation)

Thông báo:
- 100% → 80%: Margin Call thứ 1
- 80% → 50%: Margin Call thứ 2
- <50%: Forced Liquidation bắt đầu
```

---

## PHẦN 4: LỊCH SỬ & GIAO DỊCH

### Order History
```javascript
const orderHistory = [
  {
    date: "2024-05-18",
    orderId: "ORD001",
    symbol: "GCZ24",
    type: "BUY LIMIT",
    quantity: 100,
    price: 2100.00,
    filled: 100,
    status: "COMPLETED",
    commission: 50
  }
];
```

### Trade History
```javascript
const tradeHistory = [
  {
    tradeId: "TRD001",
    date: "2024-05-18T10:30:00",
    symbol: "GCZ24",
    side: "BUY",
    quantity: 100,
    price: 2100.00,
    totalValue: 210000,
    commission: 50,
    netPnL: 0,
    counterparty: "Anonymous"
  }
];
```

---

## PHẦN 5: QUẢN LÝ RỦI RO (Risk Management)

### Risk Checks
```javascript
const riskChecks = {
  // 1. Sufficient Margin (Đủ ký quỹ)
  sufficientMargin: {
    required: 10000,
    available: 15000,
    passed: true
  },
  
  // 2. Max Position (Vị thế tối đa)
  maxPosition: {
    limit: 1000,              // Tối đa 1000 lô
    current: 500,
    proposed: 600,            // Nếu gọi order này
    passed: 600 <= 1000      // true
  },
  
  // 3. Exposure Limit (Giới hạn tiếp xúc rủi ro)
  exposureLimit: {
    limit: 1000000,           // Tối đa $1M tiếp xúc
    current: 500000,
    proposed: 600000,
    passed: 600000 <= 1000000
  },
  
  // 4. Leverage Limit (Đòn bẩy tối đa)
  leverageLimit: {
    limit: 50,                // Tối đa 50x
    current: 25,
    proposed: 30,
    passed: 30 <= 50
  }
};
```

### Auto Liquidation Strategy
```
1. Duy trì margin > 100%:
   - OK (No Action)

2. Margin 50-100%:
   - Send Margin Call Alert
   - Có 1-2 giờ để nộp tiền

3. Margin < 50%:
   - Begin Auto Liquidation
   - Bán từng vị thế (highest loss first)
   - Cho đến khi Margin > 100%

4. Liquidation Order:
   - Bán vị thế lỗ nhất trước
   - Tối ưu hóa để giảm tổn thất
```

---

## PHẦN 6: VẬN HÀNH HỆ THỐNG

### Monitoring (Giám sát)
```
- Real-time balance update
- Position monitoring
- Margin level tracking
- Order status tracking
- Alert system:
  ├─ Margin Call Alert
  ├─ Position Close Alert
  ├─ Large Order Alert
  └─ Risk Limit Alert
```

### Logging (Ghi nhật ký)
```javascript
const auditLog = {
  eventId: "EVT001",
  timestamp: "2024-05-18T10:30:00",
  eventType: "ORDER_CREATED",
  
  userId: "USER001",
  accountId: "ACC001",
  
  changes: {
    before: { balance: 100000 },
    after: { balance: 95000 }
  },
  
  details: {
    orderId: "ORD001",
    amount: 5000
  },
  
  ip: "192.168.1.1",
  userAgent: "Mozilla/5.0..."
};
```

### Settlement EOD (End of Day)
```
1. Rõ ràng vị thế cuối ngày
2. Tính PnL finalized
3. Update balance
4. Generate statements
5. Reconcile with Exchange
6. Archive logs
7. Backup database
```

---

## PHẦN 7: API & TÍCH HỢP

### Authentication
```javascript
// JWT Token
const token = jwt.sign(
  { 
    accountId: "MVX00001",
    clientId: "CLI001",
    role: "TRADER"
  },
  secretKey,
  { expiresIn: "24h" }
);

// HMAC Signature (cho payment gateway)
const signature = crypto
  .createHmac('sha256', secret)
  .update(`${accountId}${amount}${timestamp}`)
  .digest('hex');
```

### API Endpoints
```
REST API:
- POST /api/accounts/register
- GET /api/accounts/{id}
- POST /api/orders/create
- GET /api/orders/{id}
- GET /api/positions
- POST /api/withdraw
- GET /api/balance

WebSocket (Real-time):
- /ws/orders - Order updates
- /ws/positions - Position updates
- /ws/prices - Price feeds
- /ws/margins - Margin alerts

FIX Protocol (High-frequency):
- Market Data
- Order Submission
- Execution Reports
```

### Retry & Idempotency
```javascript
// Client-generated ID for idempotency
const request = {
  clientOrderId: "CLIENT_ORD_001",  // Unique per client
  // Nếu gọi 2 lần với cùng ID → chỉ tạo 1 order
};

// Retry Logic
const maxRetries = 3;
const backoffMs = 1000;
```

---

## 📊 TÓÔM TẮT FLOW GIAO DỊCH HOÀN CHỈNH

```
┌─────────────────────────────────────────────────────────┐
│ 1. ACCOUNT SETUP                                         │
│    Đăng ký → KYC → Mở tài khoản → Link ngân hàng       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. DEPOSIT                                               │
│    Chuyển tiền → Auto Reconcile → Balance cập nhật      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. PLACE ORDER                                           │
│    BUY/SELL → Risk Check → Submit to Exchange           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. ORDER MATCHING                                        │
│    Exchange nhập lệnh → Khớp lệnh → Execution           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. POSITION MANAGEMENT                                   │
│    Open Position → Monitor P&L → Margin Check           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 6. CLOSE POSITION                                        │
│    Sell/Buy opposite → Realize PnL → Close position     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 7. SETTLEMENT                                            │
│    EOD → Finalize PnL → Update balance                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 8. WITHDRAW                                              │
│    Request → Approve → Transfer → Complete              │
└─────────────────────────────────────────────────────────┘
```

