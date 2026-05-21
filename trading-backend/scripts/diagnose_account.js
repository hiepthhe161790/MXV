/**
 * diagnose_account.js
 * Quick diagnostic for the frozen margin issue
 * Run with: node scripts/diagnose_account.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const url = process.env.MONGODB_URL;
  if (!url) {
    console.error('❌ MONGODB_URL not defined in .env!');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(url);

  const db = mongoose.connection;
  const accountsCol = db.collection('accounts');
  const positionsCol = db.collection('positions');
  const ordersCol = db.collection('orders');

  // Target account from logs
  const accountId = '36073d14-8b36-4a94-8d02-c14f39122f97';

  console.log(`\n📋 Checking account: ${accountId}\n`);

  // 1. Check account balance
  const account = await accountsCol.findOne({ $or: [{ _id: accountId }, { id: accountId }] });
  if (account) {
    console.log('💰 ACCOUNT STATUS:');
    console.log(`  Total balance:      $${(account.balance || 0).toFixed(4)}`);
    console.log(`  Frozen (margin):    $${(account.frozenBalance || 0).toFixed(4)}`);
    console.log(`  Available:          $${((account.balance || 0) - (account.frozenBalance || 0)).toFixed(4)}`);
  } else {
    console.log('❌ Account not found');
    await mongoose.disconnect();
    process.exit(1);
  }

  // 2. Check open positions
  const openPositions = await positionsCol.find({
    accountId: accountId
  }).toArray();
  
  const openActivePositions = openPositions.filter(p => (p.quantity || 0) > 0);

  console.log(`\n📊 OPEN POSITIONS (${openActivePositions.length}):`);
  if (openActivePositions.length === 0) {
    console.log('  ✅ No open positions');
  } else {
    let totalMargin = 0;
    for (const pos of openActivePositions) {
      const margin = pos.marginUsed || 0;
      totalMargin += margin;
      console.log(`  ${pos.symbol} ${pos.side} qty=${pos.quantity} entry=$${pos.entryPrice} current=$${pos.currentPrice} margin=$${margin.toFixed(4)}`);
    }
    console.log(`  Total margin from positions: $${totalMargin.toFixed(4)}`);
  }

  // 3. Check pending/partial orders
  const pendingOrders = await ordersCol.find({
    accountId: accountId,
    state: { $in: ['PENDING', 'PARTIALLY_FILLED'] }
  }).toArray();

  console.log(`\n⏳ PENDING/PARTIAL ORDERS (${pendingOrders.length}):`);
  if (pendingOrders.length === 0) {
    console.log('  ✅ No pending orders');
  } else {
    let totalMargin = 0;
    for (const ord of pendingOrders) {
      const unfilledQty = (ord.quantity || 0) - (ord.filledQuantity || 0);
      const price = ord.limitPrice || ord.stopPrice || 100;
      const margin = (unfilledQty * price) / 10;
      totalMargin += margin;
      console.log(`  ${ord._id} ${ord.symbol} ${ord.side} ${ord.orderType}`);
      console.log(`    unfilled=${unfilledQty} price=$${price} margin=$${margin.toFixed(4)} state=${ord.state}`);
    }
    console.log(`  Total margin from pending: $${totalMargin.toFixed(4)}`);
  }

  // 4. Calculate what frozen balance should be
  const posMargin = openActivePositions.reduce((sum, p) => sum + (p.marginUsed || 0), 0);
  const pendMargin = pendingOrders.reduce((sum, o) => {
    const unfilledQty = (o.quantity || 0) - (o.filledQuantity || 0);
    const price = o.limitPrice || o.stopPrice || 100;
    return sum + (unfilledQty * price) / 10;
  }, 0);
  const expectedFrozen = posMargin + pendMargin;
  const actualFrozen = account.frozenBalance || 0;
  const diff = actualFrozen - expectedFrozen;

  console.log(`\n🔍 MARGIN RECONCILIATION:`);
  console.log(`  Margin from open positions: $${posMargin.toFixed(4)}`);
  console.log(`  Margin from pending orders: $${pendMargin.toFixed(4)}`);
  console.log(`  Expected frozen total:      $${expectedFrozen.toFixed(4)}`);
  console.log(`  Actual frozen balance:      $${actualFrozen.toFixed(4)}`);
  console.log(`  Discrepancy:                $${diff.toFixed(4)} ${Math.abs(diff) > 0.01 ? '⚠️  ISSUE!' : '✅ OK'}`);

  if (Math.abs(diff) > 0.01) {
    console.log(`\n❌ PROBLEM FOUND:`);
    if (diff > 0) {
      console.log(`  Too much frozen (ghost margin): $${diff.toFixed(4)}`);
      console.log(`  This should be released to available balance`);
    } else {
      console.log(`  Not enough frozen (margin deficit): $${Math.abs(diff).toFixed(4)}`);
      console.log(`  This indicates a position/order wasn't properly accounted for`);
    }
  }

  await mongoose.disconnect();
  console.log('\n✅ Diagnostic complete\n');
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
