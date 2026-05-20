/**
 * diagnose_margin.js — kiểm tra toàn bộ trạng thái margin
 * node scripts/diagnose_margin.js
 */
const mongoose = require('mongoose');
const { createClient } = require('redis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  // --- MongoDB ---
  await mongoose.connect(process.env.MONGODB_URL);
  console.log('✅ MongoDB connected\n');

  const db = mongoose.connection;
  const accountsCol  = db.collection('accounts');
  const positionsCol = db.collection('positions');
  const ordersCol    = db.collection('orders');

  const accounts = await accountsCol.find({}).toArray();

  for (const acc of accounts) {
    const accountId = acc._id?.toString() || acc.id;
    console.log('═'.repeat(60));
    console.log(`Account : ${accountId}`);
    console.log(`Email   : ${acc.email}`);
    console.log(`Balance : $${(acc.balance || 0).toFixed(4)}`);
    console.log(`Frozen  : $${(acc.frozenBalance || 0).toFixed(4)}`);
    console.log(`Available: $${((acc.balance||0)-(acc.frozenBalance||0)).toFixed(4)}`);

    // Open positions
    const openPos = await positionsCol.find({ accountId, quantity: { $gt: 0 } }).toArray();
    const totalMarginPos = openPos.reduce((s, p) => s + (p.marginUsed || 0), 0);
    console.log(`\nOpen positions (${openPos.length}):`);
    for (const p of openPos) {
      console.log(`  ${p.symbol} ${p.side} qty=${p.quantity} entry=$${p.entryPrice} marginUsed=$${(p.marginUsed||0).toFixed(4)}`);
    }
    console.log(`Total marginUsed from positions: $${totalMarginPos.toFixed(4)}`);

    // Pending orders (PENDING or PARTIALLY_FILLED) — these also consume frozen margin
    const pendingOrders = await ordersCol.find({
      accountId,
      state: { $in: ['PENDING', 'PARTIALLY_FILLED'] }
    }).toArray();
    console.log(`\nPending/PartialFilled orders (${pendingOrders.length}):`);
    let totalMarginOrders = 0;
    for (const o of pendingOrders) {
      const unfilledQty = (o.quantity || 0) - (o.filledQuantity || 0);
      const price = o.limitPrice || o.stopPrice || 100;
      const marginOrder = (unfilledQty * price) / 10;
      totalMarginOrders += marginOrder;
      console.log(`  ${o._id} ${o.symbol} ${o.side} ${o.orderType} unfilled=${unfilledQty} price=$${price} marginHeld=$${marginOrder.toFixed(4)} state=${o.state}`);
    }
    console.log(`Total margin from pending orders: $${totalMarginOrders.toFixed(4)}`);

    const expectedTotal = totalMarginPos + totalMarginOrders;
    const diff = (acc.frozenBalance || 0) - expectedTotal;
    console.log(`\nExpected total frozen : $${expectedTotal.toFixed(4)}`);
    console.log(`Actual   frozenBalance: $${(acc.frozenBalance||0).toFixed(4)}`);
    console.log(`Discrepancy (ghost)   : $${diff.toFixed(4)} ${Math.abs(diff) > 0.01 ? '⚠️  NEEDS FIX' : '✅ OK'}`);
    console.log('');
  }

  // --- Redis cache ---
  console.log('═'.repeat(60));
  console.log('Checking Redis cache...\n');
  const redis = createClient({ url: process.env.REDIS_URL });
  redis.on('error', () => {});
  await redis.connect();

  const accKeys = await redis.keys('account:*');
  for (const key of accKeys) {
    const raw = await redis.get(key);
    if (raw) {
      const cached = JSON.parse(raw);
      console.log(`Redis ${key}:`);
      console.log(`  balance=$${cached.balance}  frozenBalance=$${cached.frozenBalance}`);
    }
  }
  await redis.disconnect();

  await mongoose.disconnect();
  console.log('\n✅ Done');
}

run().catch(err => { console.error(err); process.exit(1); });
