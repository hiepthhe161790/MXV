const mongoose = require('mongoose');
const logger = require('./Logger');

/**
 * MongoDB Connection Management
 * Handles database connection and initialization
 */
class Database {
  static async connect(mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/trading_exchange') {
    try {
      await mongoose.connect(mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      logger.info('MongoDB connected successfully');
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  static async disconnect() {
    try {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected');
    } catch (error) {
      logger.error('MongoDB disconnect error:', error);
    }
  }

  static async dropDatabase() {
    try {
      await mongoose.connection.dropDatabase();
      logger.info('Database dropped');
    } catch (error) {
      logger.error('Database drop error:', error);
    }
  }
}

module.exports = Database;
