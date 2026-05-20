const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  const url = process.env.MONGODB_URL || 'mongodb://localhost:27017/trading_exchange';
  await mongoose.connect(url);

  const AccountSchema = new mongoose.Schema({}, { strict: false, collection: 'accounts' });
  const Account = mongoose.model('Account', AccountSchema);

  const accountId = '36073d14-8b36-4a94-8d02-c14f39122f97';
  const account = await Account.findOne({ id: accountId });

  console.log('=== ACCOUNT DETAILS ===');
  console.log(JSON.stringify(account.toJSON(), null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
