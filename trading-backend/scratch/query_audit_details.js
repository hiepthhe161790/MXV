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

  // Find audit logs with realized pnl
  const auditLogs = await db.collection('audit_logs')
    .find({ accountId, eventType: 'REALIZED_PNL' })
    .toArray();

  console.log('\n=== DETAILED REALIZED PNL AUDIT LOGS ===');
  auditLogs.forEach((log) => {
    console.log(`\n-------------------------------------`);
    console.log(`Timestamp: ${log.timestamp ? log.timestamp.toISOString() : log.createdAt.toISOString()}`);
    console.log(`Message: ${log.message}`);
    console.log(`Data:`, JSON.stringify(log.data, null, 2));
  });

  // Let's also check if there are any other audit logs of eventType MarginCall, AutoLiquidation, or AutoCloseTriggered
  const systemLogs = await db.collection('audit_logs')
    .find({ accountId, eventType: { $in: ['MarginCall', 'AutoLiquidation', 'AutoCloseTriggered', 'MarginCallTriggered', 'AutoLiquidationTriggered'] } })
    .toArray();

  console.log('\n=== DETAILED SYSTEM TRIGGER LOGS ===');
  systemLogs.forEach((log) => {
    console.log(`\n-------------------------------------`);
    console.log(`Event: ${log.eventType} | Message: ${log.message}`);
    console.log(`Data:`, JSON.stringify(log.data, null, 2));
  });

  await mongoose.disconnect();
}

run().catch(console.error);
