const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const logger = require('../shared/infrastructure/Logger');

// ── Transaction Log Schema (MongoDB) ──────────────────────────────────────────
const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  accountId:     { type: String, required: true, index: true },
  type:          { type: String, enum: ['DEPOSIT', 'WITHDRAWAL', 'REALIZED_PNL'], required: true },
  amount:        { type: Number, required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter:  { type: Number, required: true },
  reason:        { type: String, default: '' },
  status:        { type: String, default: 'COMPLETED' },
  createdAt:     { type: Date, default: Date.now },
}, { collection: 'transactions' });

const TransactionModel = mongoose.models.Transaction ||
  mongoose.model('Transaction', transactionSchema);

// ── Audit Log Schema ───────────────────────────────────────────────────────────
const auditSchema = new mongoose.Schema({
  eventId:    { type: String, required: true, unique: true },
  accountId:  { type: String, index: true },
  eventType:  { type: String, required: true },
  severity:   { type: String, enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'], default: 'INFO' },
  message:    { type: String, required: true },
  data:       { type: mongoose.Schema.Types.Mixed },
  createdAt:  { type: Date, default: Date.now },
}, { collection: 'audit_logs' });

const AuditModel = mongoose.models.AuditLog ||
  mongoose.model('AuditLog', auditSchema);

// ── Helper: Generate JWT ───────────────────────────────────────────────────────
function generateToken(payload) {
  const secret = process.env.JWT_SECRET || 'mvx-super-secret-key-2024';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

// ── Helper: Verify JWT ─────────────────────────────────────────────────────────
function verifyToken(token) {
  const secret = process.env.JWT_SECRET || 'mvx-super-secret-key-2024';
  return jwt.verify(token, secret);
}

// ── Middleware: Auth ───────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = verifyToken(auth.slice(7));
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Helper: log audit event ────────────────────────────────────────────────────
async function logAudit(accountId, eventType, message, data = {}, severity = 'INFO') {
  try {
    const { v4: uuidv4 } = require('uuid');
    const doc = new AuditModel({
      _id: new mongoose.Types.ObjectId(),
      eventId: uuidv4(),
      accountId,
      eventType,
      severity,
      message,
      data,
    });
    await doc.save();
  } catch (e) {
    logger.error('Failed to write audit log:', e);
  }
}

// ── Route Factory ─────────────────────────────────────────────────────────────
function createAccountRoutes(accountService) {
  const router = express.Router();

  // ──────────────────────────────────────────────────────────────────────────
  // POST /accounts/register
  // ──────────────────────────────────────────────────────────────────────────
  router.post('/register', async (req, res, next) => {
    try {
      const { email, password, phone } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Check duplicate email in DB
      const existing = await accountService.accountRepository.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password & create account
      const passwordHash = await bcrypt.hash(password, 10);
      const accountNumber = 'MVX' + Date.now().toString(36).toUpperCase();
      const { v4: uuidv4 } = require('uuid');
      const accountId = uuidv4();

      // Create account via service (initial balance 0)
      const account = await accountService.createAccount(email, 0);

      // Save extra fields directly (phone, passwordHash, accountNumber)
      const { AccountModel } = require('../modules/accounts/infrastructure/AccountRepository');
      await AccountModel.findByIdAndUpdate(account.id || account._id, {
        phone: phone || '',
        passwordHash,
        accountNumber,
        status: 'ACTIVE',
      });

      await logAudit(account.id, 'ACCOUNT_CREATED', `New account registered: ${email}`, { email, phone });

      return res.status(201).json({
        success: true,
        message: 'Registration successful. Please login.',
        data: { email, accountNumber },
      });
    } catch (error) {
      logger.error('Error registering:', error);
      return next(error);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /accounts/login
  // ──────────────────────────────────────────────────────────────────────────
  router.post('/login', async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { AccountModel } = require('../modules/accounts/infrastructure/AccountRepository');
      const dbAccount = await AccountModel.findOne({ email });

      if (!dbAccount) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // If account was created without password (legacy / seed), allow demo login
      let passwordOk = false;
      if (dbAccount.passwordHash) {
        passwordOk = await bcrypt.compare(password, dbAccount.passwordHash);
      } else {
        // Demo mode: any password works for accounts without hash
        passwordOk = true;
      }

      if (!passwordOk) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const availableBalance = (dbAccount.balance || 0) - (dbAccount.frozenBalance || 0);

      const token = generateToken({
        accountId: dbAccount._id,
        email: dbAccount.email,
        accountNumber: dbAccount.accountNumber,
      });

      await logAudit(dbAccount._id, 'LOGIN', `User logged in: ${email}`, { email });

      return res.json({
        success: true,
        data: {
          token,
          expiresIn: '7d',
          account: {
            _id: dbAccount._id,
            accountNumber: dbAccount.accountNumber || 'MVX-DEMO',
            email: dbAccount.email,
            phone: dbAccount.phone || '',
            balance: dbAccount.balance || 0,
            frozenBalance: dbAccount.frozenBalance || 0,
            availableBalance,
            status: dbAccount.status || 'ACTIVE',
            createdAt: dbAccount.createdAt,
          },
        },
      });
    } catch (error) {
      logger.error('Error logging in:', error);
      return next(error);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /accounts/profile   (requires auth)
  // ──────────────────────────────────────────────────────────────────────────
  router.get('/profile', async (req, res, next) => {
    try {
      // Try JWT first
      let accountId;
      try {
        const auth = req.headers.authorization;
        if (auth && auth.startsWith('Bearer ')) {
          const decoded = verifyToken(auth.slice(7));
          accountId = decoded.accountId;
        }
      } catch (_) {}

      // Fallback: query param
      if (!accountId) accountId = req.query.accountId;
      if (!accountId) return res.status(401).json({ error: 'Unauthorized' });

      const account = await accountService.getAccount(accountId);
      if (!account) return res.status(404).json({ error: 'Account not found' });

      const availableBalance = (account.balance || 0) - (account.frozenBalance || 0);
      return res.json({
        _id: account._id || account.id,
        accountNumber: account.accountNumber || 'MVX-DEMO',
        email: account.email,
        phone: account.phone || '',
        status: account.status || 'ACTIVE',
        balance: account.balance || 0,
        frozenBalance: account.frozenBalance || 0,
        availableBalance,
        createdAt: account.createdAt,
      });
    } catch (error) {
      logger.error('Error fetching profile:', error);
      return next(error);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /accounts  (create without password — internal/admin use)
  // ──────────────────────────────────────────────────────────────────────────
  router.post('/', async (req, res, next) => {
    try {
      const { email, initialBalance } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });
      const account = await accountService.createAccount(email, initialBalance || 0);
      res.status(201).json(account);
    } catch (error) {
      logger.error('Error creating account:', error);
      next(error);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /accounts/:id
  // ──────────────────────────────────────────────────────────────────────────
  router.get('/:id', async (req, res, next) => {
    try {
      const account = await accountService.getAccount(req.params.id);
      if (!account) return res.status(404).json({ error: 'Account not found' });
      res.json(account);
    } catch (error) { next(error); }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /accounts/:id/deposit
  // ──────────────────────────────────────────────────────────────────────────
  router.post('/:id/deposit', async (req, res, next) => {
    try {
      const { amount, reason } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

      const before = await accountService.getAccount(req.params.id);
      const balanceBefore = before?.balance || 0;

      const account = await accountService.deposit(req.params.id, Number(amount), reason || 'Deposit');

      // Log transaction
      const { v4: uuidv4 } = require('uuid');
      await TransactionModel.create({
        transactionId: 'TXN-' + uuidv4().slice(0, 8).toUpperCase(),
        accountId: req.params.id,
        type: 'DEPOSIT',
        amount: Number(amount),
        balanceBefore,
        balanceAfter: balanceBefore + Number(amount),
        reason: reason || 'Deposit',
        status: 'COMPLETED',
      });

      await logAudit(req.params.id, 'DEPOSIT', `Deposit $${amount}`, { amount });
      res.json(account);
    } catch (error) { next(error); }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /accounts/:id/withdraw
  // ──────────────────────────────────────────────────────────────────────────
  router.post('/:id/withdraw', async (req, res, next) => {
    try {
      const { amount, reason } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

      const before = await accountService.getAccount(req.params.id);
      const balanceBefore = before?.balance || 0;

      const account = await accountService.withdraw(req.params.id, Number(amount), reason || 'Withdrawal');

      const { v4: uuidv4 } = require('uuid');
      await TransactionModel.create({
        transactionId: 'TXN-' + uuidv4().slice(0, 8).toUpperCase(),
        accountId: req.params.id,
        type: 'WITHDRAWAL',
        amount: Number(amount),
        balanceBefore,
        balanceAfter: balanceBefore - Number(amount),
        reason: reason || 'Withdrawal',
        status: 'COMPLETED',
      });

      await logAudit(req.params.id, 'WITHDRAWAL', `Withdrawal $${amount}`, { amount });
      res.json(account);
    } catch (error) { next(error); }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /accounts/:id/freeze
  // ──────────────────────────────────────────────────────────────────────────
  router.post('/:id/freeze', async (req, res, next) => {
    try {
      const { amount, reason } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });
      const account = await accountService.freezeBalance(req.params.id, amount, reason || 'Margin freeze');
      res.json(account);
    } catch (error) { next(error); }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /accounts/:id/unfreeze
  // ──────────────────────────────────────────────────────────────────────────
  router.post('/:id/unfreeze', async (req, res, next) => {
    try {
      const { amount, reason } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });
      const account = await accountService.unfreezeBalance(req.params.id, amount, reason || 'Margin release');
      res.json(account);
    } catch (error) { next(error); }
  });

  return router;
}

// Export extra models & middleware for use in server.js
module.exports = createAccountRoutes;
module.exports.TransactionModel = TransactionModel;
module.exports.AuditModel = AuditModel;
module.exports.logAudit = logAudit;
