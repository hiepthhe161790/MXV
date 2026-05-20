const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const url = process.env.MONGODB_URL;
  if (!url) {
    console.error('❌ MONGODB_URL is not defined!');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB Atlas...');
  await mongoose.connect(url);
  console.log('✅ Connected successfully!');

  const db = mongoose.connection;
  const accountId = '1d9b436c-aa2c-4980-8f30-cfa39115c71e';

  // 1. Restore account balance and frozen balance
  const targetBalance = 10018.97;
  console.log(`\n✏️ Restoring account balance to $${targetBalance}...`);
  await db.collection('accounts').updateOne(
    { _id: accountId },
    {
      $set: {
        balance: targetBalance,
        frozenBalance: 0,
        updatedAt: new Date()
      }
    }
  );

  // 2. Remove the faulty liquidation transactions
  const faultyTxIds = ['TXN-3773FB6B', 'TXN-C9E70FAF'];
  console.log(`❌ Deleting faulty transactions: ${faultyTxIds.join(', ')}...`);
  await db.collection('transactions').deleteMany({
    transactionId: { $in: faultyTxIds }
  });

  // 3. Remove the corresponding audit logs
  console.log(`❌ Deleting related system audit logs...`);
  await db.collection('audit_logs').deleteMany({
    accountId: accountId,
    eventType: { $in: ['MarginCall', 'AutoLiquidation', 'REALIZED_PNL'] },
    timestamp: { $gte: new Date('2026-05-20T07:36:00.000Z') } // only delete the ones from the liquidation time
  });

  console.log('\n🎉 Account restored successfully to pristine state!');
  
  // Verify account state
  const account = await db.collection('accounts').findOne({ _id: accountId });
  console.log('\n=== CURRENT ACCOUNT DETAILS ===');
  console.log(JSON.stringify(account, null, 2));

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB.');
}

run().catch((err) => {
  console.error('❌ An error occurred:', err);
  mongoose.disconnect();
});
