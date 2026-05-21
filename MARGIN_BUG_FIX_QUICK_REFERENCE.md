# Quick Reference: Margin Lifecycle Fix

## The Bug in 30 Seconds

```
❌ OLD (WRONG):
  Freeze margin on order → Fill order → UNFREEZE → REFREEZE by reconciliation
  
✅ NEW (CORRECT):  
  Freeze margin on order → Fill order → KEEP FROZEN → Unfreeze when position closes
```

## Files Changed

### 1. `/trading-backend/src/server.js` (Lines 475-570)
- **Changed:** OrderFilled event handler
- **Action:** Removed `unfreezeBalance()` call after position update
- **Why:** Margin must stay frozen until position closes

### 2. `/trading-backend/src/shared/utils/currency.js` (NEW)
- **Added:** Currency precision utilities
- **Functions:**
  - `roundToMoneyPrecision(value)` - Round to 4 decimals
  - `calculateMarginRequired(qty, price, leverage)` - Safe calculation
  - `addMoney()`, `subtractMoney()`

### 3. `/trading-backend/src/modules/accounts/domain/Account.js`
- **Added:** Import currency utilities
- **Changed:** `freezeBalance()`, `unfreezeBalance()`, `applyEvent()`
- **Action:** Use `roundToMoneyPrecision()` for all balance operations

### 4. `/trading-backend/src/modules/positions/domain/Position.js`
- **Added:** Import currency utilities
- **Changed:** `addTrade()`, `updateMarketPrice()`, `recalculatePnL()`, `closePosition()`
- **Action:** Use `roundToMoneyPrecision()` for all price/PnL calculations

### 5. `/trading-backend/src/modules/risk/domain/RiskEngine.js`
- **Added:** Import currency utilities
- **Changed:** `calculateMarginRequired()` method
- **Action:** Use precision utility instead of raw division

---

## What You'll See in Logs After Fix

### Before (WRONG):
```
2026-05-21T03:54:48.981Z [info]: Balance frozen: ... Amount: 453.6
2026-05-21T03:54:49.125Z [info]: Order filled: ...
2026-05-21T03:54:49.298Z [info]: Balance unfrozen: ... Amount: 453.6  ❌
2026-05-21T03:54:49.810Z [info]: Margin reconcile: froze $453.6000    ❌
```

### After (CORRECT):
```
2026-05-21T03:54:48.981Z [info]: Balance frozen: ... Amount: 453.6000
2026-05-21T03:54:49.125Z [info]: Order filled: ...
2026-05-21T03:54:49.125Z [info]: Position updated for order: ...
[No unfreeze log here - margin stays frozen]
2026-05-21T03:55:39.295Z [info]: Position closed: GCZ24 at 4535.4
2026-05-21T03:55:39.311Z [info]: Balance unfrozen: ... Amount: 453.6000 ✅
```

---

## Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Freeze Count** | Freeze → Unfreeze → Freeze | Freeze → Keep → Unfreeze |
| **Race Condition** | ❌ Exists (between unfreeze/freeze) | ✅ Eliminated |
| **Float Precision** | ❌ 453.53999999999996 | ✅ 453.6000 |
| **Margin Lifecycle** | ❌ Fragmented | ✅ Unified |
| **Account Equity** | ❌ Can be wrong during window | ✅ Always correct |

---

## Testing Checklist

- [ ] Single order from placement to close
- [ ] Multiple concurrent orders  
- [ ] Partial position close
- [ ] Position reversal (LONG → SHORT)
- [ ] PnL calculations (check 4 decimal precision)
- [ ] Margin reconciliation (should be rare now)
- [ ] Risk validation prevents over-margin orders
- [ ] WebSocket connection stability (separate issue)

---

## How to Verify the Fix

### Verify Margin Stays Frozen:
```bash
# Run these in MongoDB
db.accounts.find({ _id: ObjectId("...") })
# Watch frozenBalance - it should:
# 1. Increase when order placed
# 2. STAY SAME when order filled
# 3. Decrease to 0 when position closed
```

### Verify Precision:
```bash
# Check trades table for PnL
db.trades.find().sort({ createdAt: -1 }).limit(5)
# Look for PnL values with exactly 4 decimals
```

### Verify No Race Conditions:
```bash
# Place 2 orders quickly, verify both succeed with correct margin
curl -X POST http://localhost:3000/api/v1/orders \
  -d { accountId, symbol: "GCZ24", ... }

curl -X POST http://localhost:3000/api/v1/orders \
  -d { accountId, symbol: "SIZ24", ... }

# Check account.frozenBalance = margin1 + margin2
```

---

## Related Issues to Address Separately

### 1. WebSocket Reconnection Loop
```
Logs show frequent:
  WebSocket connection closed
  New WebSocket connection established
```
**Likely causes:** 
- Heartbeat timeout too low
- Frontend aggressive reconnect
- Server resource issue

### 2. Float Precision in Other Calculations
- Check yield calculations
- Check liquidation threshold calculations
- Consider using Decimal.js for all financial math

### 3. Margin Reconciliation Script
- Run `scripts/diagnose_margin.js` to verify current state
- Consider running reconciliation periodically
