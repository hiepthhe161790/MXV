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

  // Get raw audit logs
  const logs = await db.collection('audit_logs')
    .find({ accountId })
    .toArray();

  console.log('\n=== RAW AUDIT LOG DOCUMENTS ===');
  console.log(JSON.stringify(logs, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
