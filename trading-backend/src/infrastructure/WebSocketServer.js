const { WebSocketServer: WSServer } = require('ws');
const logger = require('../shared/infrastructure/Logger');

class WebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  initialize(server) {
    logger.info('Initializing WebSocket Server...');
    this.wss = new WSServer({ server });

    this.wss.on('connection', (ws) => {
      logger.info('New WebSocket connection established');
      this.clients.add(ws);

      ws.on('message', (message) => {
        try {
          const parsed = JSON.parse(message);
          logger.debug(`Received WebSocket message:`, parsed);
        } catch (err) {
          logger.error('Failed to parse WebSocket message:', err);
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        logger.error('WebSocket client error:', err);
        this.clients.delete(ws);
      });
      
      // Send a welcome event
      ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to MVX Trading Exchange real-time feed' }));

      // Fetch and send latest market prices immediately so the client doesn't wait
      const mongoose = require('mongoose');
      const MarketPriceModel = mongoose.models.MarketPrice || require('../modules/market/infrastructure/MarketPriceModel');
      
      MarketPriceModel.find({}).then((prices) => {
        if (prices && prices.length > 0) {
          const initialPrices = {};
          prices.forEach((p) => {
            initialPrices[p.symbol] = { price: p.price, change: p.change };
          });
          ws.send(JSON.stringify({
            type: 'market:prices',
            data: initialPrices,
            timestamp: new Date()
          }));
        }
      }).catch((err) => {
        logger.error('Failed to send initial prices over WS:', err.message);
      });
    });

    logger.info('WebSocket Server initialized successfully');
  }

  broadcast(type, data) {
    if (!this.wss) return;
    const message = JSON.stringify({ type, data, timestamp: new Date() });
    for (const client of this.clients) {
      if (client.readyState === 1) { // 1 means OPEN
        client.send(message);
      }
    }
  }

  close() {
    if (this.wss) {
      logger.info('Closing WebSocket Server...');
      this.wss.close();
    }
  }
}

module.exports = new WebSocketServer();
