/**
 * check_positions.js — in ra toàn bộ positions và entryPrice
 * node scripts/check_positions.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URL);
  const db = mongoose.connection;
  const positionsCol = db.collection('positions');

  const all = await positionsCol.find({}).sort({ accountId: 1, symbol: 1 }).toArray();
  console.log(`Found ${all.length} positions:\n`);
  for (const p of all) {
    console.log(`${p.symbol} | ${p.side} | qty=${p.quantity} | entry=$${p.entryPrice} | current=$${p.currentPrice} | marginUsed=$${p.marginUsed} | account=${p.accountId}`);
  }
  await mongoose.disconnect();
}
run().catch(console.error);
