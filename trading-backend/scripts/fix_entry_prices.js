/**
 * fix_entry_prices.js
 * Fix positions có entryPrice = 100 (fallback) sai.
 * Với position còn mở (qty > 0), không thể biết giá fill thực tế từ DB,
 * nên ta dùng currentPrice làm entryPrice mới (reset PnL về 0 unrealized).
 * Với position đã đóng (qty = 0) thì bỏ qua.
 *
 * node scripts/fix_entry_prices.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const FALLBACK_PRICE = 100; // giá sai cần fix

async function run() {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log('✅ MongoDB connected\n');

  const db = mongoose.connection;
  const positionsCol = db.collection('positions');
  const ordersCol = db.collection('orders');

  // Tìm tất cả positions có entryPrice = 100 và còn mở
  const badPositions = await positionsCol.find({
    entryPrice: FALLBACK_PRICE,
    quantity: { $gt: 0 },
  }).toArray();

  console.log(`Found ${badPositions.length} open position(s) with wrong entryPrice=$${FALLBACK_PRICE}\n`);

  for (const pos of badPositions) {
    console.log(`Processing: ${pos.symbol} (${pos.side}) account=${pos.accountId} qty=${pos.quantity}`);

    // Tìm giá fill thực tế từ orders đã FILLED của account này, symbol này
    const filledOrders = await ordersCol.find({
      accountId: pos.accountId,
      symbol: pos.symbol,
      state: 'FILLED',
    }).sort({ updatedAt: -1 }).toArray();

    let correctEntryPrice = null;

    if (filledOrders.length > 0) {
      // Tính weighted average price của tất cả filled orders cùng chiều
      const sameSideOrders = filledOrders.filter(o => {
        const orderSide = o.side === 'BUY' ? 'LONG' : 'SHORT';
        return orderSide === pos.side;
      });
      if (sameSideOrders.length > 0) {
        const totalQty = sameSideOrders.reduce((s, o) => s + (o.filledQuantity || 0), 0);
        const totalValue = sameSideOrders.reduce((s, o) => s + ((o.filledQuantity || 0) * (o.averagePrice || 0)), 0);
        if (totalQty > 0 && totalValue > 0) {
          correctEntryPrice = totalValue / totalQty;
          console.log(`  → Found ${sameSideOrders.length} filled order(s). Weighted avg price = $${correctEntryPrice.toFixed(4)}`);
        }
      }
    }

    // Fallback: dùng currentPrice nếu không tìm được từ orders
    if (!correctEntryPrice || correctEntryPrice <= 0) {
      correctEntryPrice = pos.currentPrice || pos.entryPrice;
      console.log(`  → No filled orders found. Using currentPrice = $${correctEntryPrice}`);
    }

    const newMarginUsed = parseFloat(((pos.quantity * correctEntryPrice) / 10).toFixed(6));

    // Tính lại unrealized PnL
    const currentPrice = pos.currentPrice || correctEntryPrice;
    let unrealizedPnL = 0;
    if (pos.side === 'LONG') {
      unrealizedPnL = parseFloat(((currentPrice - correctEntryPrice) * pos.quantity).toFixed(4));
    } else {
      unrealizedPnL = parseFloat(((correctEntryPrice - currentPrice) * pos.quantity).toFixed(4));
    }

    await positionsCol.updateOne(
      { _id: pos._id },
      {
        $set: {
          entryPrice: parseFloat(correctEntryPrice.toFixed(4)),
          marginUsed: newMarginUsed,
          unrealizedPnL,
          updatedAt: new Date(),
        }
      }
    );

    console.log(`  ✅ Updated: entryPrice=$${correctEntryPrice.toFixed(4)} marginUsed=$${newMarginUsed} unrealizedPnL=$${unrealizedPnL}\n`);
  }

  if (badPositions.length === 0) {
    console.log('✔ No positions need fixing.');
  }

  await mongoose.disconnect();
  console.log('✅ Done');
}

run().catch(err => { console.error(err); process.exit(1); });
