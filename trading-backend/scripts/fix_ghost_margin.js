/**
 * fix_ghost_margin.js
 * Releases ghost margin (frozen balance with no open positions/orders)
 * Run with: node scripts/fix_ghost_margin.js
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

  // Target account
  const accountId = '36073d14-8b36-4a94-8d02-c14f39122f97';

  console.log(`\n🔧 Fixing ghost margin for account: ${accountId}\n`);

  // Get account
  const account = await accountsCol.findOne({ $or: [{ _id: accountId }, { id: accountId }] });
  if (!account) {
    console.error('❌ Account not found');
    await mongoose.disconnect();
    process.exit(1);
  }

  const currentFrozen = account.frozenBalance || 0;
  console.log(`Current frozen margin: $${currentFrozen.toFixed(4)}`);

  // Check for open positions and pending orders
  const openPositions = await positionsCol.countDocuments({
    accountId: accountId,
    quantity: { $gt: 0 }
  });

  const pendingOrders = await ordersCol.countDocuments({
    accountId: accountId,
    state: { $in: ['PENDING', 'PARTIALLY_FILLED'] }
  });

  console.log(`Open positions: ${openPositions}`);
  console.log(`Pending orders: ${pendingOrders}`);

  if (openPositions === 0 && pendingOrders === 0 && currentFrozen > 0.01) {
    console.log(`\n⚠️  Found ghost margin: $${currentFrozen.toFixed(4)}`);
    console.log('🔨 Releasing ghost margin...\n');

    // Update account to zero frozen balance
    const result = await accountsCol.updateOne(
      { $or: [{ _id: accountId }, { id: accountId }] },
      {
        $set: {
          frozenBalance: 0,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Ghost margin released!');
      console.log(`   Released: $${currentFrozen.toFixed(4)}`);
      console.log(`   New frozen balance: $0.0000`);
      console.log(`   New available balance: $${((account.balance || 0) + currentFrozen).toFixed(4)}`);
    } else {
      console.log('⚠️  No changes made');
    }
  } else if (currentFrozen <= 0.01) {
    console.log('✅ No ghost margin found');
  } else {
    console.log('✅ Frozen margin is accounted for (has open positions or pending orders)');
  }

  await mongoose.disconnect();
  console.log('\n✅ Done\n');
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
