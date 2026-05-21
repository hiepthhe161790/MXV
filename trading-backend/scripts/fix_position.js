const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const url = process.env.MONGODB_URL;
  if (!url) {
    console.error('❌ MONGODB_URL is not defined in your .env file!');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB Atlas...');
  await mongoose.connect(url);
  console.log('✅ Connected successfully!');

  const db = mongoose.connection;
  const positionsCollection = db.collection('positions');

  const accountId = '1d9b436c-aa2c-4980-8f30-cfa39115c71e';
  const symbol = 'NGF25';

  console.log(`🔎 Searching for position of account ${accountId} with symbol ${symbol}...`);
  const position = await positionsCollection.findOne({ accountId, symbol });

  if (!position) {
    console.log('❌ No such position found in the database!');
    await mongoose.disconnect();
    return;
  }

  console.log('\n=== CURRENT POSITION DETAILS ===');
  console.log(JSON.stringify(position, null, 2));

  // Let's correct the price to the correct base price (2.8)
  const targetEntryPrice = 2.8;
  const quantity = position.quantity || 1;
  const currentPrice = position.currentPrice || 3.10;
  
  // Recalculate financial formulas
  let unrealizedPnL = 0;
  if (position.side === 'LONG') {
    unrealizedPnL = parseFloat(((currentPrice - targetEntryPrice) * quantity).toFixed(4));
  } else {
    unrealizedPnL = parseFloat(((targetEntryPrice - currentPrice) * quantity).toFixed(4));
  }
  const marginUsed = parseFloat(((quantity * currentPrice) / 10).toFixed(4));

  console.log(`\n✏️ Updating Entry Price from $${position.entryPrice} to $${targetEntryPrice}...`);

  const updateResult = await positionsCollection.updateOne(
    { _id: position._id },
    {
      $set: {
        entryPrice: targetEntryPrice,
        unrealizedPnL: unrealizedPnL,
        marginUsed: marginUsed,
        updatedAt: new Date()
      }
    }
  );

  if (updateResult.modifiedCount > 0) {
    console.log('✅ Position successfully updated in MongoDB!');
    const updatedPosition = await positionsCollection.findOne({ _id: position._id });
    console.log('\n=== UPDATED POSITION DETAILS ===');
    console.log(JSON.stringify(updatedPosition, null, 2));
  } else {
    console.log('⚠️ Position was not modified (perhaps it already had the correct values).');
  }

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB.');
}

run().catch((err) => {
  console.error('❌ An error occurred:', err);
  mongoose.disconnect();
});
