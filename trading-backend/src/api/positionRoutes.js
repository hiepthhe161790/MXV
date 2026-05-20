const express = require('express');
const logger = require('../shared/infrastructure/Logger');

/**
 * Position API Routes
 */
function createPositionRoutes(positionService) {
  const router = express.Router();

  /**
   * GET /positions/account/:accountId - Get account positions
   */
  router.get('/account/:accountId', async (req, res, next) => {
    try {
      const positions = await positionService.getOpenPositions(req.params.accountId);
      res.json(positions);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /positions/:accountId/:symbol/close - Close position
   */
  router.post('/:accountId/:symbol/close', async (req, res, next) => {
    try {
      const { closePrice } = req.body;

      if (!closePrice || closePrice <= 0) {
        return res.status(400).json({ error: 'Close price must be positive' });
      }

      const position = await positionService.closePosition(
        req.params.accountId,
        req.params.symbol,
        closePrice
      );

      res.json(position);
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /positions/:accountId/:symbol/sl-tp - Update SL/TP levels
   */
  router.post('/:accountId/:symbol/sl-tp', async (req, res, next) => {
    try {
      const { stopLossPrice, takeProfitPrice } = req.body;
      const position = await positionService.updateSLTP(
        req.params.accountId,
        req.params.symbol,
        stopLossPrice,
        takeProfitPrice
      );
      res.json(position);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /positions/:accountId/:symbol - Get specific position
   */
  router.get('/:accountId/:symbol', async (req, res, next) => {
    try {
      const { accountId, symbol } = req.params;
      const positions = await positionService.getOpenPositions(accountId);
      const position = positions.find((p) => p.symbol === symbol);

      if (!position) {
        return res.status(404).json({ error: 'Position not found' });
      }

      res.json(position);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /positions/:accountId/:symbol - Get specific position
   */
  router.get('/:accountId/:symbol', async (req, res, next) => {
    try {
      const positions = await positionService.getPositionsByAccount(req.params.accountId);
      const position = positions.find((p) => p.symbol === req.params.symbol);

      if (!position) {
        return res.status(404).json({ error: 'Position not found' });
      }

      res.json(position);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /positions/summary - Get positions summary
   */
  router.get('/summary', async (req, res, next) => {
    try {
      const { accountId } = req.query;
      if (!accountId) {
        return res.status(400).json({ error: 'accountId required' });
      }

      const positions = await positionService.getOpenPositions(accountId);
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

  /**
   * GET /positions - Get all positions (with optional account filter)
   */
  router.get('/', async (req, res, next) => {
    try {
      const { accountId } = req.query;
      if (accountId) {
        const positions = await positionService.getOpenPositions(accountId);
        return res.json(positions);
      }
      res.json([]);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createPositionRoutes;
