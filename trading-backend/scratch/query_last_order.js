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

  // 1. Get last order
  const lastOrders = await db.collection('orders')
    .find({ accountId })
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray();

  console.log('\n=== LAST 3 ORDERS ===');
  lastOrders.forEach((o) => {
    console.log(JSON.stringify(o, null, 2));
  });

  // 2. Get last transactions
  const lastTx = await db.collection('transactions')
    .find({ accountId })
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray();

  console.log('\n=== LAST 3 TRANSACTIONS ===');
  lastTx.forEach((tx) => {
    console.log(JSON.stringify(tx, null, 2));
  });

  // 3. Get last positions
  const lastPos = await db.collection('positions')
    .find({ accountId })
    .toArray();

  console.log('\n=== POSITIONS ===');
  lastPos.forEach((p) => {
    console.log(JSON.stringify(p, null, 2));
  });

  await mongoose.disconnect();
}

run().catch(console.error);
