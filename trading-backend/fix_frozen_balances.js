const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  const url = process.env.MONGODB_URL || 'mongodb://localhost:27017/trading_exchange';
  await mongoose.connect(url);

  const AccountSchema = new mongoose.Schema({}, { strict: false, collection: 'accounts' });
  const Account = mongoose.model('Account', AccountSchema);

  const PositionSchema = new mongoose.Schema({}, { strict: false, collection: 'positions' });
  const Position = mongoose.model('Position', PositionSchema);

  const accounts = await Account.find();
  for (const account of accounts) {
    // Find all open positions for this account
    const openPositions = await Position.find({ accountId: account.id || account._id, quantity: { $gt: 0 } });
    
    // Calculate what the frozen balance should be
    const correctFrozen = openPositions.reduce((sum, pos) => sum + (pos.marginUsed || 0), 0);
    
    if (account.frozenBalance !== correctFrozen) {
      console.log(`Fixing account ${account.email}: changing frozenBalance from ${account.frozenBalance} to ${correctFrozen}`);
      await Account.updateOne(
        { _id: account._id },
        { $set: { frozenBalance: correctFrozen } }
      );
    }
  }

  console.log('All stuck frozen balances successfully corrected!');
  await mongoose.disconnect();
}

run().catch(console.error);
