const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const url = process.env.MONGODB_URL;
  await mongoose.connect(url);
  console.log('✅ Connected to MongoDB.');

  const db = mongoose.connection;
  const positionIds = [
    "c1eed34a-e5fb-4001-a33f-999981cc94c8",
    "557287b0-9ebd-4b40-961c-ac4d9aeb5088"
  ];

  const positions = await db.collection('positions')
    .find({ _id: { $in: positionIds } })
    .toArray();

  console.log('\n=== DETAILED CLOSED POSITIONS ===');
  console.log(JSON.stringify(positions, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
