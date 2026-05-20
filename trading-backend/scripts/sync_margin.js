/**
 * sync_margin.js
 * One-time script: reconcile account.frozenBalance with actual open position marginUsed.
 * Run with: node scripts/sync_margin.js
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
  console.log('✅ Connected\n');

  const db = mongoose.connection;
  const accountsCol = db.collection('accounts');
  const positionsCol = db.collection('positions');

  // Fetch all accounts
  const accounts = await accountsCol.find({}).toArray();
  console.log(`Found ${accounts.length} account(s)\n`);

  for (const account of accounts) {
    const accountId = account._id?.toString() || account.id;
    const currentFrozen = account.frozenBalance || 0;

    // Sum marginUsed of all open (quantity > 0) positions for this account
    const openPositions = await positionsCol.find({
      accountId,
      quantity: { $gt: 0 },
    }).toArray();

    const totalMarginRequired = openPositions.reduce(
      (sum, p) => sum + (p.marginUsed || 0), 0
    );

    console.log(`Account: ${accountId} (${account.email || 'N/A'})`);
    console.log(`  frozenBalance (current) : $${currentFrozen.toFixed(4)}`);
    console.log(`  marginUsed from positions: $${totalMarginRequired.toFixed(4)}`);
    console.log(`  Open positions          : ${openPositions.length}`);

    if (Math.abs(currentFrozen - totalMarginRequired) > 0.001) {
      const newFrozen = parseFloat(totalMarginRequired.toFixed(6));
      await accountsCol.updateOne(
        { _id: account._id },
        { $set: { frozenBalance: newFrozen, updatedAt: new Date() } }
      );
      console.log(`  ✅ frozenBalance updated → $${newFrozen.toFixed(4)}\n`);
    } else {
      console.log(`  ✔ frozenBalance already in sync\n`);
    }
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
}

run().catch((err) => {
  console.error('❌ Error:', err);
  mongoose.disconnect();
});
