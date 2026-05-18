const redis = require('redis');
const logger = require('./Logger');

/**
 * Redis Cache Implementation
 * Used for account data, positions, and other frequently accessed data
 */
class Cache {
  constructor(url = process.env.REDIS_URL || 'redis://localhost:6379') {
    this.client = redis.createClient({ url });
    this.client.on('error', (err) => logger.error('Redis error:', err));
  }

  async connect() {
    try {
      await this.client.connect();
      logger.info('Redis cache connected');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    try {
      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttlSeconds, serialized);
      logger.debug(`Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(value);
      }
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async delete(key) {
    try {
      await this.client.del(key);
      logger.debug(`Cache DELETE: ${key}`);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.debug(`Cache INVALIDATED: ${keys.length} keys matching ${pattern}`);
      }
    } catch (error) {
      logger.error('Cache invalidate error:', error);
    }
  }

  async disconnect() {
    try {
      await this.client.quit();
      logger.info('Redis cache disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }
}

module.exports = Cache;
