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

  // 1. Get ALL positions
  const allPositions = await db.collection('positions')
    .find({ accountId })
    .toArray();

  console.log('\n=== ALL POSITIONS IN DB ===');
  allPositions.forEach((pos) => {
    console.log(`📌 ID: ${pos._id} | Symbol: ${pos.symbol} | Side: ${pos.side} | Quantity: ${pos.quantity} | Margin Used: $${pos.marginUsed}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
