const express = require('express');
const logger = require('../shared/infrastructure/Logger');

/**
 * Order API Routes
 */
function createOrderRoutes(orderService, riskService, matchingEngine, accountService, positionService) {
  const router = express.Router();

  /**
   * GET /orders - Get all orders or filter by account
   */
  router.get('/', async (req, res, next) => {
    try {
      const { accountId, state } = req.query;
      
      if (accountId) {
        const orders = await orderService.getOrdersByAccount(accountId, state);
        return res.json(orders);
      }

      const orders = await orderService.getAllOrders(state);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /orders - Place new order
   */
  router.post('/', async (req, res, next) => {
    try {
      const { accountId, symbol, side, quantity, orderType, limitPrice, stopPrice, idempotencyKey } = req.body;

      // Validate input
      if (!accountId || !symbol || !side || !quantity || !orderType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get account and check status
      const account = await accountService.getAccount(accountId);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      // Check account status - reject orders for suspended/liquidated accounts
      if (account.status && account.status !== 'ACTIVE') {
        return res.status(403).json({ 
          error: `Cannot place order: account status is ${account.status}`,
          code: 'ACCOUNT_NOT_ACTIVE'
        });
      }

      const positions = await positionService.getPositionsByAccount(accountId);

      // Validate against risk rules
      const mockOrder = { id: 'temp', symbol, side, quantity, limitPrice, stopPrice };
      const riskValidation = await riskService.validateOrderForPlacement(mockOrder, account, positions);

      if (!riskValidation.isValid) {
        return res.status(400).json({ error: riskValidation.reason, code: riskValidation.code });
      }

      // Freeze balance before placing order
      let marginFrozen = false;
      const marginRequired = riskValidation.marginRequired || 0;
      if (marginRequired > 0) {
        await accountService.freezeBalance(accountId, marginRequired, `Order margin for ${symbol}`);
        marginFrozen = true;
      }

      try {
        // Place order
        const order = await orderService.placeOrder(
          accountId,
          symbol,
          side,
          quantity,
          orderType,
          limitPrice,
          stopPrice,
          idempotencyKey
        );

        // Send to matching engine
        const updatedOrder = await orderService.sendOrder(order.id);

        res.status(201).json(updatedOrder);
      } catch (placeError) {
        if (marginFrozen) {
          await accountService.unfreezeBalance(accountId, marginRequired, `Refund order margin for ${symbol} (failed)`);
        }
        throw placeError;
      }
    } catch (error) {
      logger.error('Error placing order:', error);
      next(error);
    }
  });

  /**
   * GET /orders/:id - Get order details
   */
  router.get('/:id', async (req, res, next) => {
    try {
      const order = await orderService.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json(order);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /orders/account/:accountId - Get account orders
   */
  router.get('/account/:accountId', async (req, res, next) => {
    try {
      const { state } = req.query;
      const orders = await orderService.getOrdersByAccount(req.params.accountId, state);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /orders/:id - Cancel order
   */
  router.delete('/:id', async (req, res, next) => {
    try {
      const order = await orderService.cancelOrder(req.params.id);
      res.json(order);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createOrderRoutes;
