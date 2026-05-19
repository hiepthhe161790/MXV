require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('express-async-errors');
const http = require('http');
const logger = require('./shared/infrastructure/Logger');
const webSocketServer = require('./infrastructure/WebSocketServer');
const PriceFeedService = require('./modules/market/application/PriceFeedService');

// Services & Repositories
const Database = require('./shared/infrastructure/Database');
const Cache = require('./shared/infrastructure/Cache');
const RabbitMQEventBus = require('./shared/infrastructure/RabbitMQEventBus');

// Account Service
const AccountService = require('./modules/accounts/application/AccountService');
const { AccountRepository } = require('./modules/accounts/infrastructure/AccountRepository');

// Order Service
const OrderService = require('./modules/orders/application/OrderService');
const { OrderRepository } = require('./modules/orders/infrastructure/OrderRepository');

// Risk Service
const RiskService = require('./modules/risk/application/RiskService');

// Position Service
const PositionService = require('./modules/positions/application/PositionService');
const { PositionRepository } = require('./modules/positions/infrastructure/PositionRepository');

// Matching Engine
const MatchingEngine = require('./modules/matching/application/MatchingEngine');

// Settlement Service
const SettlementService = require('./modules/settlement/application/SettlementService');
const { SettlementRepository } = require('./modules/settlement/infrastructure/SettlementRepository');

// API Routes
const createAccountRoutes = require('./api/accountRoutes');
const { TransactionModel, AuditModel, logAudit } = require('./api/accountRoutes');
const createOrderRoutes = require('./api/orderRoutes');
const createPositionRoutes = require('./api/positionRoutes');
const createPhuQuyRoutes = require('./api/phuQuyRoutes');

// PhuQuy Service
const phuQuyService = require('./modules/phuquy/application/PhuQuyService');


const app = express();
const eventBusEnabled = process.env.ENABLE_RABBITMQ !== 'false';

const EventEmitter = require('events');

class InMemoryEventBus {
  constructor() {
    this.emitter = new EventEmitter();
  }
  async connect() {}

  async publish(event) {
    setImmediate(() => {
      this.emitter.emit(event.eventType, event);
    });
  }

  async subscribe(eventType, handler, queueName) {
    this.emitter.on(eventType, async (event) => {
      try {
        await handler(event);
      } catch (err) {
        logger.error(`Error in InMemoryEventBus handler for ${eventType}:`, err);
      }
    });
  }

  async disconnect() {}
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Global error handler:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code,
  });
});

// Initialize services
let services = {};

async function initializeServices() {
  try {
    logger.info('Initializing services...');

    // Connect to database
    await Database.connect();

    // Connect to cache
    services.cache = new Cache();
    await services.cache.connect();

    // Connect to event bus when available; otherwise continue with a no-op bus.
    if (eventBusEnabled) {
      services.eventBus = new RabbitMQEventBus();
      try {
        await services.eventBus.connect();
      } catch (error) {
        logger.warn('RabbitMQ unavailable, continuing with local in-memory event bus');
        services.eventBus = new InMemoryEventBus();
      }
    } else {
      logger.warn('RabbitMQ disabled by ENABLE_RABBITMQ=false, continuing with local in-memory event bus');
      services.eventBus = new InMemoryEventBus();
    }

    // Initialize repositories
    services.accountRepository = new AccountRepository();
    services.orderRepository = new OrderRepository();
    services.positionRepository = new PositionRepository();
    services.settlementRepository = new SettlementRepository();

    // Initialize application services
    services.accountService = new AccountService(
      services.accountRepository,
      services.eventBus,
      services.cache
    );

    services.orderService = new OrderService(
      services.orderRepository,
      services.eventBus,
      services.cache
    );

    services.riskService = new RiskService(services.eventBus);

    services.positionService = new PositionService(
      services.positionRepository,
      services.eventBus,
      services.cache
    );

    services.matchingEngine = new MatchingEngine(services.eventBus);

    services.settlementService = new SettlementService(
      services.settlementRepository,
      services.eventBus
    );

    // Wire up EventBus to PhuQuy gateway integration
    phuQuyService.eventBus = services.eventBus;

    logger.info('All services initialized successfully');

    return services;
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// Setup API routes
async function setupRoutes() {
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  // API Info
  app.get('/api', (req, res) => {
    res.json({
      name: 'Commodity Trading Exchange',
      version: '1.0.0',
      description: 'Event-driven microservice trading platform',
      status: 'running',
    });
  });

  // Account routes
  app.use('/api/accounts', createAccountRoutes(services.accountService));

  // Order routes
  app.use('/api/orders', createOrderRoutes(
    services.orderService,
    services.riskService,
    services.matchingEngine,
    services.accountService,
    services.positionService
  ));

  // Position routes
  app.use('/api/positions', createPositionRoutes(services.positionService));

  // PhuQuy integration gateway routes
  app.use('/api/phuquy', createPhuQuyRoutes());

  // Transaction routes (wrapper around account operations)
  app.post('/api/transactions/deposit', async (req, res, next) => {
    try {
      const { accountId, amount, reason } = req.body;
      if (!accountId || !amount) {
        return res.status(400).json({ error: 'accountId and amount required' });
      }
      const result = await services.accountService.deposit(accountId, amount, reason || 'Deposit');
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/transactions/withdraw', async (req, res, next) => {
    try {
      const { accountId, amount, reason } = req.body;
      if (!accountId || !amount) {
        return res.status(400).json({ error: 'accountId and amount required' });
      }
      const result = await services.accountService.withdraw(accountId, amount, reason || 'Withdrawal');
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Get account balance
  app.get('/api/transactions/balance', async (req, res, next) => {
    try {
      const { accountId } = req.query;
      if (!accountId) {
        return res.status(400).json({ error: 'accountId required' });
      }

      const account = await services.accountService.getAccount(accountId);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      res.json({
        totalBalance: account.balance || 0,
        frozenAmount: account.frozenBalance || 0,
        availableBalance: (account.balance || 0) - (account.frozenBalance || 0),
        marginLevel: 100,
        marginStatus: 'HEALTHY',
      });
    } catch (error) {
      next(error);
    }
  });

  // Get transactions — real data from MongoDB
  app.get('/api/transactions', async (req, res, next) => {
    try {
      const { accountId, limit = 50 } = req.query;
      if (!accountId) return res.status(400).json({ error: 'accountId required' });
      const txns = await TransactionModel.find({ accountId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
      res.json(txns);
    } catch (error) { next(error); }
  });

  // Get audit logs
  app.get('/api/audit-logs', async (req, res, next) => {
    try {
      const { accountId, limit = 100, eventType } = req.query;
      const filter = {};
      if (accountId) filter.accountId = accountId;
      if (eventType) filter.eventType = eventType;
      const logs = await AuditModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
      res.json(logs);
    } catch (error) { next(error); }
  });

  // Trigger EOD Settlement
  app.post('/api/settlement/eod', async (req, res, next) => {
    try {
      const result = await services.settlementService.performEODSettlement();
      await logAudit(null, 'EOD_SETTLEMENT', 'EOD Settlement triggered manually', result, 'INFO');
      res.json({ success: true, message: 'EOD Settlement completed', result });
    } catch (error) { next(error); }
  });

  // Get Risk stats for an account
  app.get('/api/risk/status', async (req, res, next) => {
    try {
      const { accountId } = req.query;
      if (!accountId) return res.status(400).json({ error: 'accountId required' });
      const account = await services.accountService.getAccount(accountId);
      if (!account) return res.status(404).json({ error: 'Account not found' });
      const positions = await services.positionService.getOpenPositions(accountId);

      const totalMarginUsed = positions.reduce((s, p) => s + (p.marginUsed || 0), 0);
      const totalUnrealizedPnL = positions.reduce((s, p) => s + (p.unrealizedPnL || 0), 0);
      const totalExposure = positions.reduce((s, p) => s + Math.abs((p.openQuantity || 0) * (p.currentPrice || p.entryPrice || 0)), 0);
      const equity = (account.balance || 0) + totalUnrealizedPnL;
      const marginLevel = totalMarginUsed > 0 ? (equity / totalMarginUsed) * 100 : 100;

      res.json({
        accountId,
        balance: account.balance || 0,
        frozenBalance: account.frozenBalance || 0,
        availableBalance: (account.balance || 0) - (account.frozenBalance || 0),
        equity,
        totalMarginUsed,
        totalUnrealizedPnL,
        totalExposure,
        marginLevel: parseFloat(marginLevel.toFixed(2)),
        marginStatus: marginLevel >= 200 ? 'HEALTHY' : marginLevel >= 100 ? 'WARNING' : 'DANGER',
        openPositions: positions.length,
        maxExposureLimit: 100000,
        exposureUsedPct: parseFloat(((totalExposure / 100000) * 100).toFixed(2)),
      });
    } catch (error) { next(error); }
  });

  // Get account profile
  app.get('/api/accounts/profile', async (req, res, next) => {
    try {
      const { accountId } = req.query;
      if (!accountId) {
        return res.status(400).json({ error: 'accountId required' });
      }

      const account = await services.accountService.getAccount(accountId);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      res.json({
        _id: account._id || account.id,
        accountNumber: account.accountNumber,
        email: account.email,
        status: account.status || 'ACTIVE',
        balance: account.balance || 0,
        frozenBalance: account.frozenBalance || 0,
        availableBalance: (account.balance || 0) - (account.frozenBalance || 0),
        createdAt: account.createdAt,
      });
    } catch (error) {
      next(error);
    }
  });

  // Positions API - Get all or by account
  app.get('/api/positions', async (req, res, next) => {
    try {
      const { accountId } = req.query;
      if (accountId) {
        const positions = await services.positionService.getOpenPositions(accountId);
        return res.json(positions || []);
      }
      // Return all positions if no account specified
      const positions = await services.positionService.positionRepository.findAll();
      res.json(positions || []);
    } catch (error) {
      next(error);
    }
  });

  // Positions summary - Get aggregate stats
  app.get('/api/positions/summary', async (req, res, next) => {
    try {
      const { accountId } = req.query;
      const positions = accountId
        ? await services.positionService.getOpenPositions(accountId)
        : await services.positionService.positionRepository.findAll();

      const summary = {
        totalPositions: positions.length,
        totalRealizedPnL: positions.reduce((sum, p) => sum + (p.realizedPnL || 0), 0),
        totalUnrealizedPnL: positions.reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0),
        totalMarginUsed: positions.reduce((sum, p) => sum + (p.marginUsed || 0), 0),
      };
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  // Close position
  app.post('/api/positions/:accountId/:symbol/close', async (req, res, next) => {
    try {
      const { accountId, symbol } = req.params;
      const { closePrice } = req.body;

      if (!closePrice || closePrice <= 0) {
        return res.status(400).json({ error: 'Close price must be positive' });
      }

      const position = await services.positionService.closePosition(accountId, symbol, closePrice);
      res.json(position);
    } catch (error) {
      next(error);
    }
  });

  logger.info('API routes configured');
}

// Subscribe to events
async function setupEventSubscribers() {
  // We no longer skip subscribers for InMemoryEventBus since it can actually handle events.
  
  // Order sent event - send to matching engine
  await services.eventBus.subscribe('OrderSent', async (event) => {
    try {
      const order = await services.orderService.getOrder(event.aggregateId);
      if (order) {
        await services.matchingEngine.submitOrder(order);
      }
    } catch (error) {
      logger.error('Error processing OrderSent event:', error);
    }
  }, 'order-sent-queue');

  // Trade executed event - fill orders
  await services.eventBus.subscribe('TradeExecuted', async (event) => {
    try {
      const trade = event.data;
      if (trade.buyOrderId && !trade.buyOrderId.startsWith('mock-liq-')) {
        await services.orderService.fillOrder(trade.buyOrderId, trade.quantity, trade.price);
      }
      if (trade.sellOrderId && !trade.sellOrderId.startsWith('mock-liq-')) {
        await services.orderService.fillOrder(trade.sellOrderId, trade.quantity, trade.price);
      }
    } catch (error) {
      logger.error('Error processing TradeExecuted event:', error);
    }
  }, 'trade-executed-queue');

  // Order filled event - update positions
  await services.eventBus.subscribe('OrderFilled', async (event) => {
    try {
      const orderId = event.data.orderId || event.aggregateId;
      if (!orderId) return;
      const order = await services.orderService.getOrder(orderId);
      if (!order) return; // Ignore if order not found

      if (order.state === 'FILLED' || order.state === 'PARTIALLY_FILLED') {
        await services.positionService.addTrade(
          order.accountId,
          order.symbol,
          order.side,
          event.data.filledQuantity,
          event.data.price
        );
      }
    } catch (error) {
      logger.error('Error processing OrderFilled event:', error);
    }
  }, 'order-filled-queue');

  // Order Cancelled / Rejected - Unfreeze margin
  const unfreezeOrderMargin = async (event) => {
    try {
      const orderId = event.data.orderId || event.aggregateId;
      if (!orderId) return;
      const order = await services.orderService.getOrder(orderId);
      if (!order) return;

      const unfilledQuantity = order.quantity - (order.filledQuantity || 0);
      if (unfilledQuantity <= 0) return;

      const price = order.limitPrice || order.stopPrice || 100;
      const marginToRelease = (unfilledQuantity * price) / 10;

      if (marginToRelease > 0) {
        await services.accountService.unfreezeBalance(
          order.accountId, 
          marginToRelease, 
          `Release margin for order ${orderId} (${event.eventType})`
        );
      }
    } catch (error) {
      logger.error(`Error unfreezing margin for ${event.eventType}:`, error);
    }
  };

  await services.eventBus.subscribe('OrderCancelled', unfreezeOrderMargin, 'order-cancelled-queue');
  await services.eventBus.subscribe('OrderRejected', unfreezeOrderMargin, 'order-rejected-queue');

  // Position closed - Unfreeze margin and apply PnL
  await services.eventBus.subscribe('PositionClosed', async (event) => {
    try {
      const positionId = event.aggregateId;
      // Note: position is already closed, but we can reconstruct from event
      const pnl = event.data.realizedPnL;
      // We don't have accountId directly in event, but we can try to fetch from cache/db
      const positions = await services.positionService.positionRepository.findAll();
      const position = positions.find(p => p.id === positionId || p._id === positionId);
      
      if (!position) return;
      
      // Calculate released margin based on last known state before close, 
      // but marginUsed is passed in event.data.marginUsed from our recent changes!
      const marginReleased = event.data.marginUsed || 0;

      if (marginReleased > 0) {
        await services.accountService.unfreezeBalance(position.accountId, marginReleased, `Close position ${position.symbol}`);
      }
      
      if (pnl > 0) {
        await services.accountService.deposit(position.accountId, pnl, `Realized PnL for ${position.symbol}`);
      } else if (pnl < 0) {
        await services.accountService.withdraw(position.accountId, Math.abs(pnl), `Realized PnL for ${position.symbol}`);
      }
    } catch (error) {
      logger.error('Error processing PositionClosed event:', error);
    }
  }, 'position-closed-queue');

  // Margin call event
  await services.eventBus.subscribe('MarginCallTriggered', async (event) => {
    try {
      logger.warn(`Margin call triggered for account: ${event.aggregateId}`);
      await services.settlementService.logAuditEvent(
        event.aggregateId,
        'MarginCall',
        'MARGIN_CALL',
        event.aggregateId,
        {},
        event.data,
        'Margin level dropped below threshold',
        'WARNING'
      );
    } catch (error) {
      logger.error('Error processing MarginCallTriggered event:', error);
    }
  }, 'margin-call-queue');

  // Auto liquidation event - Close positions and audit
  await services.eventBus.subscribe('AutoLiquidationTriggered', async (event) => {
    try {
      const accountId = event.aggregateId;
      logger.error(`Auto-liquidation triggered for account: ${accountId}`);

      // Log the event to database audit
      await services.settlementService.logAuditEvent(
        accountId,
        'AutoLiquidation',
        'LIQUIDATION',
        accountId,
        {},
        event.data,
        'Account auto-liquidated due to margin breach',
        'CRITICAL'
      );

      // Liquidate positions: Close them all at their currentPrice
      const positionsToLiquidate = await services.positionService.getOpenPositions(accountId);
      
      for (const pos of positionsToLiquidate) {
        if (pos.quantity > 0) {
          logger.warn(`Liquidating position: ${pos.symbol} for account ${accountId} at price ${pos.currentPrice}`);
          
          await services.positionService.closePosition(
            accountId, 
            pos.symbol, 
            pos.currentPrice || pos.entryPrice
          );
        }
      }
    } catch (error) {
      logger.error('Error processing AutoLiquidationTriggered event:', error);
    }
  }, 'liquidation-queue');

  // PhuQuy prices synced event - Update open positions prices
  await services.eventBus.subscribe('PhuQuyPricesSynced', async (event) => {
    try {
      const { prices } = event.data;
      if (!Array.isArray(prices)) return;

      logger.info(`Processing ${prices.length} synced prices from PhuQuy to update positions...`);

      const positions = await services.positionService.positionRepository.findAll();
      const openPositions = positions.filter(p => p.quantity > 0);

      for (const pos of openPositions) {
        const priceItem = prices.find(p => p.goods_id === pos.symbol);
        if (priceItem) {
          // LONG positions close at buy price, SHORT positions close at sell price
          const marketPrice = pos.side === 'LONG' ? priceItem.buy_price : priceItem.sell_price;
          
          if (marketPrice && marketPrice > 0) {
            logger.debug(`Updating price of position ${pos.symbol} for account ${pos.accountId} to ${marketPrice}`);
            await services.positionService.updatePrice(pos.accountId, pos.symbol, marketPrice);
          }
        }
      }
    } catch (error) {
      logger.error('Error processing PhuQuyPricesSynced event:', error);
    }
  }, 'phuquy-prices-synced-queue');

  // Position Price Updated event - Check SL/TP and Risk Limits (Margin Call / Liquidation)
  await services.eventBus.subscribe('PriceUpdated', async (event) => {
    try {
      const positionId = event.aggregateId;
      const positions = await services.positionService.positionRepository.findAll();
      const position = positions.find(p => p.id === positionId || p._id === positionId);
      if (!position || position.quantity === 0) return;

      const { currentPrice } = event.data;

      // 1. Check Stop Loss (SL) & Take Profit (TP)
      let shouldClose = false;
      let closeReason = '';

      if (position.side === 'LONG') {
        if (position.stopLossPrice && currentPrice <= position.stopLossPrice) {
          shouldClose = true;
          closeReason = `Stop Loss triggered at ${currentPrice} (SL=${position.stopLossPrice})`;
        } else if (position.takeProfitPrice && currentPrice >= position.takeProfitPrice) {
          shouldClose = true;
          closeReason = `Take Profit triggered at ${currentPrice} (TP=${position.takeProfitPrice})`;
        }
      } else if (position.side === 'SHORT') {
        if (position.stopLossPrice && currentPrice >= position.stopLossPrice) {
          shouldClose = true;
          closeReason = `Stop Loss triggered at ${currentPrice} (SL=${position.stopLossPrice})`;
        } else if (position.takeProfitPrice && currentPrice <= position.takeProfitPrice) {
          shouldClose = true;
          closeReason = `Take Profit triggered at ${currentPrice} (TP=${position.takeProfitPrice})`;
        }
      }

      if (shouldClose) {
        logger.warn(`Auto-closing position ${position.symbol} for account ${position.accountId}: ${closeReason}`);
        
        const closedPos = await services.positionService.closePosition(position.accountId, position.symbol, currentPrice);
        
        await services.settlementService.logAuditEvent(
          position.accountId,
          'AutoCloseTriggered',
          'AUTO_CLOSE',
          position.id,
          position,
          closedPos,
          closeReason,
          'INFO'
        );
        
        return; // Position closed, no need to perform margin checks
      }

      // 2. Check Margin Call and Auto-Liquidation Conditions
      const account = await services.accountService.getAccount(position.accountId);
      const accountPositions = await services.positionService.getOpenPositions(position.accountId);

      if (account && accountPositions.length > 0) {
        await services.riskService.handleMarginCheck(account, accountPositions);
        await services.riskService.handleAutoLiquidation(account, accountPositions);
      }
    } catch (error) {
      logger.error('Error processing PriceUpdated event:', error);
    }
  }, 'price-updated-queue');

  logger.info('Event subscribers configured');
}

// Start server
let httpServer;
let priceFeedService;

async function startServer() {
  try {
    await initializeServices();
    await setupRoutes();
    await setupEventSubscribers();

    const port = process.env.PORT || 3001;
    
    // Wrap Express app with HTTP Server
    httpServer = http.createServer(app);
    
    // Initialize WebSocket server
    webSocketServer.initialize(httpServer);
    
    // Initialize and start Real-time Yahoo Price Feed
    priceFeedService = new PriceFeedService(
      services.positionService,
      services.matchingEngine,
      webSocketServer
    );
    priceFeedService.start(10000); // Sync every 10 seconds

    httpServer.listen(port, () => {
      logger.info(`Trading Exchange API started on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  if (priceFeedService) priceFeedService.stop();
  webSocketServer.close();
  if (httpServer) httpServer.close();
  if (services.cache) await services.cache.disconnect();
  if (services.eventBus) await services.eventBus.disconnect();
  await Database.disconnect();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
