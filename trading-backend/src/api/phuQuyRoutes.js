const express = require('express');
const phuQuyService = require('../modules/phuquy/application/PhuQuyService');
const logger = require('../shared/infrastructure/Logger');
const { AuditModel } = require('./accountRoutes');
const { v4: uuidv4 } = require('uuid');

/**
 * Audit log helper specifically for PhuQuy integration.
 * Makes these gateway actions visible in the system's global Audit Log dashboard!
 */
async function logGatewayAudit(eventType, message, data = {}, severity = 'INFO') {
  try {
    if (AuditModel) {
      const doc = new AuditModel({
        eventId: uuidv4(),
        accountId: 'SYSTEM_GATEWAY',
        eventType,
        severity,
        message,
        data,
        createdAt: new Date(),
      });
      await doc.save();
    }
  } catch (e) {
    logger.error('Failed to write gateway audit log:', e);
  }
}

function createPhuQuyRoutes() {
  const router = express.Router();

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/phuquy/pricelist
  // ──────────────────────────────────────────────────────────────────────────
  router.get('/pricelist', async (req, res, next) => {
    try {
      const result = await phuQuyService.syncPriceList();
      return res.json(result);
    } catch (error) {
      logger.error('Gateway Gold Pricelist Error:', error);
      return res.status(500).json({
        success: false,
        error: 'gateway_error',
        message: error.message || 'Failed to fetch price list from partner gateway',
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/phuquy/qr-search
  // ──────────────────────────────────────────────────────────────────────────
  router.get('/qr-search', async (req, res, next) => {
    try {
      const { qr_serial } = req.query;
      if (!qr_serial) {
        return res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Mã qr_serial là bắt buộc',
        });
      }

      const result = await phuQuyService.searchByQRSerial(qr_serial);
      
      // Log lookup in audits
      if (result.success) {
        await logGatewayAudit(
          'PHUQUY_QR_LOOKUP',
          `Tra cứu QR thành công: ${qr_serial} (${result.source})`,
          { qr_serial, source: result.source },
          'INFO'
        );
      } else {
        await logGatewayAudit(
          'PHUQUY_QR_LOOKUP_FAILED',
          `Tra cứu QR thất bại: ${qr_serial}`,
          { qr_serial, message: result.message },
          'WARNING'
        );
      }

      return res.json(result);
    } catch (error) {
      logger.error('Gateway QR Search Error:', error);
      return res.status(500).json({
        success: false,
        error: 'gateway_error',
        message: error.message || 'Failed to perform QR lookup from partner gateway',
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/phuquy/sync
  // ──────────────────────────────────────────────────────────────────────────
  router.post('/sync', async (req, res, next) => {
    try {
      logger.info('Manual PhuQuy Price synchronization triggered...');
      const result = await phuQuyService.syncPriceList();
      
      if (result.success) {
        await logGatewayAudit(
          'PHUQUY_PRICE_SYNC',
          `Đồng bộ bảng giá Phú Quý thành công (${result.source})`,
          { source: result.source, itemsCount: result.data ? result.data.length : 0 },
          'INFO'
        );
        return res.json({
          success: true,
          message: 'Đồng bộ bảng giá thành công',
          data: result,
        });
      } else {
        await logGatewayAudit(
          'PHUQUY_PRICE_SYNC_FAILED',
          `Đồng bộ bảng giá Phú Quý thất bại: ${result.message}`,
          { error: result.message },
          'ERROR'
        );
        return res.status(502).json(result);
      }
    } catch (error) {
      logger.error('Gateway Sync POST Error:', error);
      return res.status(500).json({
        success: false,
        error: 'gateway_error',
        message: error.message || 'Failed to sync prices with partner',
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/phuquy/status
  // ──────────────────────────────────────────────────────────────────────────
  router.get('/status', async (req, res, next) => {
    try {
      const result = await phuQuyService.getIntegrationStatus();
      return res.json(result);
    } catch (error) {
      logger.error('Gateway Status Error:', error);
      return res.status(500).json({
        success: false,
        error: 'gateway_error',
        message: error.message || 'Failed to retrieve gateway status',
      });
    }
  });

  return router;
}

module.exports = createPhuQuyRoutes;
