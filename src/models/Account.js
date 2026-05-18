// src/models/Account.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const accountSchema = new mongoose.Schema(
  {
    // Identifiers
    accountNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
      match: /^MVX\d{6}$/
    },
    clientId: {
      type: String,
      required: true,
      index: true
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      index: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    phone: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },

    // Status
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED'],
      default: 'PENDING',
      index: true
    },

    // KYC Information
    kyc: {
      fullName: String,
      identityType: {
        type: String,
        enum: ['PASSPORT', 'ID_CARD', 'DRIVER_LICENSE']
      },
      identityNumber: String,
      dateOfBirth: Date,
      nationality: String,
      address: String,
      city: String,
      country: String,
      postalCode: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      verificationDocuments: [String]
    },

    // Balance Information
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    frozenAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalDeposit: { type: Number, default: 0 },
    totalWithdraw: { type: Number, default: 0 },
    unrealizedPnL: { type: Number, default: 0 },
    realizedPnL: { type: Number, default: 0 },

    // Trading Configuration
    accountType: {
      type: String,
      enum: ['INDIVIDUAL', 'CORPORATE'],
      default: 'INDIVIDUAL'
    },
    riskProfile: {
      type: String,
      enum: ['LOW', 'MODERATE', 'AGGRESSIVE'],
      default: 'MODERATE'
    },
    maxPositionLimit: { type: Number, default: 1000 },
    maxExposureLimit: { type: Number, default: 1000000 },
    tradingPermission: {
      type: [String],
      default: ['FUTURES']
    },

    // Linked Banks
    linkedBanks: [
      {
        bankCode: String,
        accountNumber: String,
        accountHolder: String,
        verified: Boolean,
        verifiedAt: Date
      }
    ],

    // Settings
    country: String,
    timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
    language: { type: String, default: 'vi' },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },

    // Last Activities
    lastLoginAt: Date,
    lastOrderAt: Date,
    passwordChangedAt: Date,

    // Timestamps
    kycVerifiedAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Hash password before saving
accountSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
accountSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// Get available balance virtual
accountSchema.virtual('availableBalance').get(function() {
  return this.balance - this.frozenAmount;
});

// Calculate margin level
accountSchema.methods.getMarginLevel = function() {
  if (this.frozenAmount === 0) return 100;
  return (this.balance / this.frozenAmount) * 100;
};

// Convert to JSON without password
accountSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFactorSecret;
  return obj;
};

// Indexes
accountSchema.index({ accountNumber: 1 });
accountSchema.index({ email: 1 });
accountSchema.index({ status: 1 });
accountSchema.index({ createdAt: -1 });
accountSchema.index({ 'kyc.verified': 1, status: 1 });

module.exports = mongoose.model('Account', accountSchema);
