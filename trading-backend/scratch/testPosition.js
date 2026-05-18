const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  _id: String,
  side: { type: String, enum: ['LONG', 'SHORT'], required: true },
});

const Model = mongoose.model('TestPos', schema);

async function run() {
  await mongoose.connect('mongodb://localhost:27017/mvx_test');
  
  try {
    const res = await Model.findByIdAndUpdate(
      'test-id',
      { _id: 'test-id', side: 'SELL' },
      { upsert: true, new: true }
    );
    console.log('Saved:', res);
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await mongoose.disconnect();
}

run();
