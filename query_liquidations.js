const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/trading_exchange');
  console.log('Connected to MongoDB');

  const accountId = '36073d14-8b36-4a94-8d02-c14f39122f97';

  // Define Transaction Schema
  const TransactionSchema = new mongoose.Schema({}, { strict: false, collection: 'transactions' });
  const Transaction = mongoose.model('Transaction', TransactionSchema);

  // Define Order Schema
  const OrderSchema = new mongoose.Schema({}, { strict: false, collection: 'orders' });
  const Order = mongoose.model('Order', OrderSchema);

  console.log('=== TRANSACTIONS ===');
  const txns = await Transaction.find({ accountId }).sort({ createdAt: -1 });
  txns.forEach(t => {
    console.log(JSON.stringify(t.toJSON(), null, 2));
  });

  console.log('=== ORDERS ===');
  const orders = await Order.find({ accountId }).sort({ createdAt: -1 });
  orders.forEach(o => {
    console.log(JSON.stringify(o.toJSON(), null, 2));
  });

  await mongoose.disconnect();
}

run().catch(console.error);
