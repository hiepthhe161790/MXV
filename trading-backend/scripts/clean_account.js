const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Cache = require('../src/shared/infrastructure/Cache');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const mongoUrl = process.env.MONGODB_URL;
  if (!mongoUrl) {
    console.error('❌ MONGODB_URL is not defined!');
    process.exit(1);
  }

  const redisUrl = process.env.REDIS_URL;
  console.log(`🔌 Redis URL: ${redisUrl}`);

  // Initialize and connect to Mongo
  console.log('🔌 Connecting to MongoDB Atlas...');
  await mongoose.connect(mongoUrl);
  console.log('✅ Connected to MongoDB successfully!');

  const db = mongoose.connection;
  const accountId = '1d9b436c-aa2c-4980-8f30-cfa39115c71e';

  // 1. Delete all positions for this account in DB
  console.log(`🧹 Deleting all positions for account ${accountId} in MongoDB...`);
  const posDeleteResult = await db.collection('positions').deleteMany({ accountId });
  console.log(`   -> Deleted ${posDeleteResult.deletedCount} positions.`);

  // 2. Delete all transactions for this account in DB
  console.log(`🧹 Deleting all transactions for account ${accountId} in MongoDB...`);
  const txDeleteResult = await db.collection('transactions').deleteMany({ accountId });
  console.log(`   -> Deleted ${txDeleteResult.deletedCount} transactions.`);

  // 3. Delete all audit logs for this account in DB
  console.log(`🧹 Deleting all audit logs for account ${accountId} in MongoDB...`);
  const auditDeleteResult = await db.collection('audit_logs').deleteMany({ accountId });
  console.log(`   -> Deleted ${auditDeleteResult.deletedCount} audit logs.`);

  // 4. Delete all pending orders for this account in DB
  console.log(`🧹 Deleting all orders for account ${accountId} in MongoDB...`);
  const orderDeleteResult = await db.collection('orders').deleteMany({ accountId });
  console.log(`   -> Deleted ${orderDeleteResult.deletedCount} orders.`);

  // 5. Reset account balance to exactly $10,000.00 in DB
  const initialBalance = 10000.00;
  console.log(`✏️ Resetting account balance to exactly $${initialBalance} and frozen balance to $0 in MongoDB...`);
  await db.collection('accounts').updateOne(
    { _id: accountId },
    {
      $set: {
        balance: initialBalance,
        frozenBalance: 0,
        updatedAt: new Date()
      }
    }
  );

  // 6. Create a clean initial Deposit transaction
  console.log(`📝 Creating a clean initial DEPOSIT transaction entry (TXN-1073EB93)...`);
  await db.collection('transactions').insertOne({
    transactionId: 'TXN-1073EB93',
    accountId: accountId,
    type: 'DEPOSIT',
    amount: initialBalance,
    balanceBefore: 0,
    balanceAfter: initialBalance,
    reason: 'Nộp tiền',
    status: 'COMPLETED',
    createdAt: new Date('2026-05-20T01:18:13.705Z')
  });

  // 7. Create clean initial Audit Logs
  console.log(`📝 Creating clean initial audit log records...`);
  await db.collection('audit_logs').insertMany([
    {
      _id: new mongoose.Types.ObjectId().toString(),
      accountId: accountId,
      eventType: 'ACCOUNT_CREATED',
      severity: 'INFO',
      timestamp: new Date('2026-05-20T01:18:00.875Z')
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      accountId: accountId,
      eventType: 'DEPOSIT',
      severity: 'INFO',
      timestamp: new Date('2026-05-20T01:18:13.714Z')
    }
  ]);

  // 8. WIPE REDIS CACHE KEYS!
  console.log('\n⚡ Connecting to Redis Cache layer to invalidate old cached records...');
  const cache = new Cache(redisUrl);
  await cache.connect();

  const keysToInvalidate = [
    `account:${accountId}`,
    `positions:account:${accountId}`,
    `positions:account:${accountId}:all`,
    `orders:account:${accountId}:all`,
    `orders:account:${accountId}:pending`
  ];

  for (const key of keysToInvalidate) {
    console.log(`🧹 Invalidating cache key: ${key}`);
    await cache.delete(key);
  }

  // Also invalidate patterns using wildcard
  console.log('🧹 Invalidating cache pattern: positions:account:*');
  await cache.invalidatePattern(`positions:account:${accountId}`);
  console.log('🧹 Invalidating cache pattern: orders:account:*');
  await cache.invalidatePattern(`orders:account:${accountId}`);

  await cache.disconnect();
  console.log('⚡ Redis Cache layer cleanup done!');

  console.log('\n🎉 SUCCESS! Account cleaned up, DB reset, and Cache purged successfully!');
  
  // Verify final account details from DB
  const account = await db.collection('accounts').findOne({ _id: accountId });
  console.log('\n=== FINAL ACCOUNT DETAILS IN DB ===');
  console.log(JSON.stringify(account, null, 2));

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB.');
}

run().catch((err) => {
  console.error('❌ An error occurred:', err);
  mongoose.disconnect();
});
