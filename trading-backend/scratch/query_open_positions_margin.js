const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const url = process.env.MONGODB_URL;
  await mongoose.connect(url);
  console.log('✅ Connected to MongoDB.');

  const db = mongoose.connection;
  const accountId = '1d9b436c-aa2c-4980-8f30-cfa39115c71e';

  // 1. Get open positions
  const openPositions = await db.collection('positions')
    .find({ accountId, quantity: { $gt: 0 } })
    .toArray();

  console.log('\n=== ACTIVE OPEN POSITIONS ===');
  let totalCalculatedMargin = 0;
  openPositions.forEach((pos) => {
    console.log(`\n📌 Symbol: ${pos.symbol} | Side: ${pos.side} | Quantity: ${pos.quantity}`);
    console.log(`   Entry Price: $${pos.entryPrice} | Current Price: $${pos.currentPrice}`);
    console.log(`   Margin Used: $${pos.marginUsed} | Unrealized P&L: $${pos.unrealizedPnL}`);
    totalCalculatedMargin += pos.marginUsed;
  });

  console.log(`\n💰 Total Margin Used by Open Positions: $${totalCalculatedMargin}`);

  // 2. Compare with account details
  const account = await db.collection('accounts').findOne({ _id: accountId });
  console.log('\n=== CURRENT ACCOUNT DETAILS ===');
  console.log(`   Total Balance: $${account.balance}`);
  console.log(`   Frozen Balance (Ký quỹ): $${account.frozenBalance}`);
  console.log(`   Available Balance: $${account.balance - account.frozenBalance}`);

  await mongoose.disconnect();
}

run().catch(console.error);
