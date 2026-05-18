# 🗺️ QUICK NAVIGATION GUIDE - MVX TRADING SYSTEM

## 📚 Tài liệu theo Mục Đích Sử Dụng

### 🎓 BẢN TÓM TẮT NHANH
**File**: `docs/SUMMARY.md`
- Danh sách kiểm tra onboarding
- Công thức quan trọng
- Debugging tips
- Next steps

### 📖 HIỂU NGHIỆP VỤ (Business Knowledge)
**File**: `docs/01_BUSINESS_CONCEPTS.md`
- Mô hình thị trường
- Sản phẩm giao dịch
- Ký quỹ, đòn bẩy, tick size
- Quản lý tài khoản
- Nộp/rút tiền
- Đặt lệnh
- Quản lý vị thế
- Rủi ro (margin call, liquidation)
- Lịch sử & audit

**Khi nào dùng**: Học về thị trường, hiểu flow giao dịch, học công thức

### 🏗️ KIẾN TRÚC HỆ THỐNG (Architecture)
**File**: `docs/02_SYSTEM_ARCHITECTURE.md`
- Sơ đồ kiến trúc (OMS → Risk → Exchange)
- Tech stack
- Microservices
- Database structure
- Error handling
- Security
- Performance

**Khi nào dùng**: Hiểu cách hệ thống hoạt động, design patterns

### 🗄️ DATABASE (MongoDB Schema)
**File**: `docs/03_MONGODB_SCHEMA.md`
- Chi tiết 8 collections
- Field definitions
- Indexes
- Aggregation pipelines
- Backup strategy

**Khi nào dùng**: Thiết kế database, viết queries, optimize

### 💻 CODE IMPLEMENTATION (Developer Guide)
**File**: `docs/04_IMPLEMENTATION_GUIDE.md`
- Project setup
- Database connection
- Mongoose models
- Services (OrderService, RiskService)
- Controllers (OrderController)
- Middleware
- Error handling

**Khi nào dùng**: Viết code, implement services, debug issues

### 🔗 API ENDPOINTS (REST & WebSocket)
**File**: `docs/05_API_REFERENCE.md`
- Account endpoints (register, login, KYC)
- Order endpoints (create, cancel, list)
- Position endpoints (get, close, summary)
- Transaction endpoints (deposit, withdraw)
- WebSocket events
- Error responses
- Curl examples

**Khi nào dùng**: Integrate với frontend, test API, viết client code

### 📘 MAIN README
**File**: `README.md`
- Tổng quan dự án
- Hướng dẫn cài đặt
- Cấu trúc folder
- Features
- Database info
- Security
- Testing

**Khi nào dùng**: Setup project, deploy, general info

---

## 🗂️ CẤU TRÚC THÀNH PHẦN

### Configuration
```
.env.example          - Biến môi trường
.gitignore           - Git exclusions
package.json         - Dependencies
server.js            - Entry point
```

### Source Code (`src/`)
```
config/
├─ database.js       - MongoDB setup
└─ logger.js         - Logging setup

models/
├─ Account.js        - User accounts
├─ Order.js          - Trading orders
├─ Position.js       - Open positions
├─ Transaction.js    - Money transfers
├─ Trade.js          - Trade executions
└─ AuditLog.js       - Event logs

services/            - Business logic (Ready to complete)
├─ OrderService.js
├─ RiskService.js
└─ AuditService.js

controllers/         - Request handlers (Ready to implement)
routes/              - Express routes (Ready to implement)
middleware/          - Auth, validation, etc (Ready to implement)
utils/
├─ idGenerator.js    - Generate IDs
└─ validators.js     - Validation schemas

app.js               - Express setup
```

### Tests (Ready to create)
```
tests/
├─ unit/
│  ├─ OrderService.test.js
│  ├─ RiskService.test.js
│  └─ validators.test.js
└─ integration/
   ├─ accounts.test.js
   ├─ orders.test.js
   └─ positions.test.js
```

---

## 📋 LEARNING PATH (Đường đi học tập)

### Week 1: Business Fundamentals
```
Day 1-2: Read 01_BUSINESS_CONCEPTS.md
Day 3-4: Understand margin, P&L, liquidation
Day 5: Complete SUMMARY.md exercises
```

### Week 2: System Design
```
Day 1-2: Read 02_SYSTEM_ARCHITECTURE.md
Day 3-4: Study MongoDB schema (03_MONGODB_SCHEMA.md)
Day 5: Draw architecture diagram yourself
```

### Week 3: Implementation
```
Day 1-2: Setup project, install deps
Day 3-4: Study 04_IMPLEMENTATION_GUIDE.md
Day 5: Run server locally
```

### Week 4: Integration
```
Day 1-2: Read 05_API_REFERENCE.md
Day 3-4: Test API with Postman/curl
Day 5: Integrate with frontend (optional)
```

---

## 🔍 HOW TO USE FILES

### I want to understand ORDER LIFECYCLE
```
1. Start with: docs/01_BUSINESS_CONCEPTS.md → PART 2.3
2. Then read: docs/02_SYSTEM_ARCHITECTURE.md → Data Flow & Event Stream
3. Then check: docs/05_API_REFERENCE.md → Order Endpoints
4. Then review: src/models/Order.js
```

### I want to implement ORDER SERVICE
```
1. Read: docs/04_IMPLEMENTATION_GUIDE.md → Section 4.1
2. Look at: src/models/Order.js
3. Implement: src/services/OrderService.js
4. Test with: curl commands in docs/05_API_REFERENCE.md
```

### I want to understand RISK MANAGEMENT
```
1. Read: docs/01_BUSINESS_CONCEPTS.md → PART 5
2. Understand: Margin calculation formulas
3. Review: docs/02_SYSTEM_ARCHITECTURE.md → Risk Engine
4. Implement: src/services/RiskService.js
```

### I want to setup MONGODB
```
1. Install MongoDB locally or use Atlas
2. Read: docs/03_MONGODB_SCHEMA.md
3. Create indexes from provided commands
4. Run seed script: npm run seed
5. Verify: mongosh or MongoDB Compass
```

### I want to TEST THE API
```
1. Start server: npm run dev
2. Open: docs/05_API_REFERENCE.md
3. Copy curl commands
4. Run: curl -X POST http://localhost:3000/...
5. Check logs in terminal
```

---

## 🎯 COMMON TASKS & FILES

| Task | Main File | Secondary Files |
|------|-----------|-----------------|
| Understand margin | SUMMARY.md | 01_BUSINESS.md |
| Design API | 05_API_REFERENCE.md | 04_IMPLEMENTATION.md |
| Create model | 03_MONGODB_SCHEMA.md | src/models/*.js |
| Implement service | 04_IMPLEMENTATION.md | src/services/*.js |
| Setup database | 03_MONGODB_SCHEMA.md | src/config/database.js |
| Debug order | 01_BUSINESS.md | 05_API_REFERENCE.md |
| Test risk logic | SUMMARY.md | src/services/RiskService.js |
| Write tests | README.md | tests/ |

---

## 🚀 QUICK START COMMANDS

```bash
# 1. Setup
cd d:/MVX
npm install
cp .env.example .env

# 2. Start MongoDB
mongod

# 3. Create indexes
npm run seed

# 4. Run server
npm run dev

# 5. Test in another terminal
curl http://localhost:3000/health

# 6. Register account
curl -X POST http://localhost:3000/api/v1/accounts/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+84912345678",
    "password": "SecurePass123!"
  }'
```

---

## 📞 WHEN YOU GET STUCK

### Problem: Don't understand margin calculation
**Solution**: 
- Read: `docs/SUMMARY.md` → VI. Key Formulas
- Or: `docs/01_BUSINESS_CONCEPTS.md` → PART 1.3

### Problem: Don't know where to implement feature
**Solution**:
- Check: `docs/02_SYSTEM_ARCHITECTURE.md` → Microservices
- Find service: `src/services/`
- Add method there

### Problem: Model schema errors
**Solution**:
- Check: `docs/03_MONGODB_SCHEMA.md`
- Look at: `src/models/{Model}.js`
- Verify indexes are created

### Problem: API not working
**Solution**:
- Check logs in terminal (Pino logger)
- Look at: `docs/05_API_REFERENCE.md` → Error Responses
- Trace code: Service → Controller → Route

### Problem: Database connection fails
**Solution**:
- Check: `.env` has correct `MONGODB_URI`
- Verify MongoDB is running: `mongosh`
- Look at: `src/config/database.js`

---

## ✅ VERIFICATION CHECKLIST

After setup, verify:
- [ ] Read README.md completely
- [ ] Read SUMMARY.md completely
- [ ] Understand all 6 doc files exist
- [ ] npm install completed without errors
- [ ] MongoDB connection working
- [ ] Server starts with `npm run dev`
- [ ] Health check passes: `curl http://localhost:3000/health`
- [ ] All models in `src/models/` exist
- [ ] package.json has all dependencies

---

## 📈 NEXT ACTIONS

### Immediate (Today)
- [ ] Read README.md
- [ ] Read SUMMARY.md
- [ ] Understand the 6 doc files

### Short-term (This week)
- [ ] Setup project locally
- [ ] Start MongoDB
- [ ] Run `npm install`
- [ ] Start server with `npm run dev`

### Medium-term (Next week)
- [ ] Implement OrderService methods
- [ ] Implement RiskService methods
- [ ] Create API routes

### Long-term (Ongoing)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Deploy to production
- [ ] Monitor performance

---

**Good luck! You have everything you need to build this trading system! 🚀📈**

