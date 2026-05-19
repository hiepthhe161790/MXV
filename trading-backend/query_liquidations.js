const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  const url = process.env.MONGODB_URL || 'mongodb://localhost:27017/trading_exchange';
  await mongoose.connect(url);

  const PositionSchema = new mongoose.Schema({}, { strict: false, collection: 'positions' });
  const Position = mongoose.model('Position', PositionSchema);

  const positions = await Position.find();
  console.log('=== ALL POSITIONS ===');
  positions.forEach(pos => {
    console.log(JSON.stringify(pos.toJSON(), null, 2));
  });

  await mongoose.disconnect();
}

run().catch(console.error);
