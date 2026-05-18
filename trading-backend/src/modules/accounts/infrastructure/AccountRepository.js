const mongoose = require('mongoose');

/**
 * Account MongoDB Schema
 * Persists account data to MongoDB
 */
const accountSchema = new mongoose.Schema({
  _id: String,
  email: { type: String, required: true, unique: true, index: true },
  phone: { type: String, default: '' },
  passwordHash: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  status: { type: String, default: 'ACTIVE' },
  balance: { type: Number, required: true, default: 0 },
  frozenBalance: { type: Number, required: true, default: 0 },
  isActive: { type: Boolean, required: true, default: true },
  createdAt: { type: Date, required: true, default: Date.now },
  updatedAt: { type: Date, required: true, default: Date.now },
}, { collection: 'accounts' });

// Create index for balance queries
accountSchema.index({ balance: 1 });
accountSchema.index({ frozenBalance: 1 });

const AccountModel = mongoose.model('Account', accountSchema);

/**
 * Account Repository - handles persistence
 * Reads and writes accounts from/to MongoDB
 */
class AccountRepository {
  async save(account) {
    const accountData = account.toJSON();
    const doc = await AccountModel.findByIdAndUpdate(
      account.id,
      { ...accountData, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    return doc;
  }

  async findById(id) {
    return await AccountModel.findById(id);
  }

  async findByEmail(email) {
    return await AccountModel.findOne({ email });
  }

  async findAll() {
    return await AccountModel.find();
  }

  async delete(id) {
    return await AccountModel.deleteOne({ _id: id });
  }
}

module.exports = { AccountModel, AccountRepository };
