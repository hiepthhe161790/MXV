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

  // 1. Get transactions
  const transactions = await db.collection('transactions')
    .find({ accountId })
    .sort({ createdAt: 1 })
    .toArray();

  console.log('\n=== TRANSACTIONS FOR ACCOUNT ===');
  transactions.forEach((tx) => {
    console.log(`[${tx.createdAt.toISOString()}] ${tx.transactionId} | Type: ${tx.type} | Amount: ${tx.amount} | Before: ${tx.balanceBefore} | After: ${tx.balanceAfter} | Reason: ${tx.reason}`);
  });

  // 2. Get closed positions or audit logs related to closing positions
  const auditLogs = await db.collection('audit_logs')
    .find({ accountId })
    .sort({ createdAt: 1 })
    .toArray();

  console.log('\n=== AUDIT LOGS FOR ACCOUNT ===');
  auditLogs.forEach((log) => {
    console.log(`[${log.createdAt ? log.createdAt.toISOString() : log.timestamp.toISOString()}] Event: ${log.eventType} | Msg: ${log.message}`);
    if (log.data) {
      console.log('Data:', JSON.stringify(log.data, null, 2));
    }
  });

  await mongoose.disconnect();
}

run().catch(console.error);
