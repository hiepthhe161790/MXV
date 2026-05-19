const redis = require('redis');
const logger = require('./Logger');

/**
 * Cache Management Layer
 * Features automatic failover to Node In-Memory cache if Redis server is down,
 * and throttles socket reconnection logs to avoid console flooding.
 */
class Cache {
  constructor(url = process.env.REDIS_URL || 'redis://localhost:6379') {
    this.useRedis = true;
    this.url = url;
    
    // In-Memory cache store fallback
    this.store = new Map();
    this.ttls = new Map();
    
    // Loop detection state
    this.connectionFailuresInRow = 0;
    this.lastFailureTime = 0;
    
    try {
      this.client = redis.createClient({ 
        url,
        socket: {
          // Reconnect strategy: retry up to 3 times before falling back to Memory Cache
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              if (this.useRedis) {
                logger.warn('Redis reconnection failed 3 times. Falling back to local In-Memory Cache.');
                this.useRedis = false;
                this.client.disconnect().catch(() => {});
              }
              return false; // Stop background reconnecting to save CPU and stop log spam
            }
            return Math.min(retries * 100, 2000);
          }
        }
      });
      
      let lastErrorLogged = 0;
      this.client.on('error', (err) => {
        if (!this.useRedis) return; // Mute all logs once memory fallback is engaged
        
        const now = Date.now();
        const errMsg = err?.message || err?.toString() || '';
        
        if (errMsg.includes('Socket closed unexpectedly') || errMsg.includes('ECONNRESET')) {
          // Detect rapid successive connection closures (infinite loop protection)
          if (now - this.lastFailureTime < 5000) {
            this.connectionFailuresInRow++;
          } else {
            this.connectionFailuresInRow = 1;
          }
          this.lastFailureTime = now;
          
          if (this.connectionFailuresInRow >= 5) {
            logger.error('Redis is in an infinite reconnect loop (likely due to protocol mismatch or TLS requirements). Disabling Redis and falling back to memory cache.');
            this.useRedis = false;
            this.client.disconnect().catch(() => {});
            return;
          }
          
          // Throttle socket closure logs to at most once per 30 seconds
          if (now - lastErrorLogged > 30000) {
            logger.warn('Redis connection lost (Socket closed unexpectedly). Gateway is using internal memory cache.');
            lastErrorLogged = now;
          }
        } else {
          logger.error('Redis error:', err);
        }
      });
    } catch (e) {
      logger.error('Failed to create Redis client, defaulting to memory cache:', e);
      this.useRedis = false;
    }
  }

  async connect() {
    if (!this.useRedis) {
      logger.warn('Redis bypassed, running with Node In-Memory cache fallback.');
      return;
    }
    
    try {
      // Connect to Redis with a 3.5 second timeout limit
      const connectPromise = this.client.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 3500)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      logger.info('Redis cache connected successfully');
    } catch (error) {
      logger.warn(`Failed to connect to Redis server (${error.message}). Falling back to local In-Memory Cache.`);
      this.useRedis = false;
      try {
        await this.client.disconnect();
      } catch (disconnectError) {
        // Ignore disconnect errors
      }
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    if (this.useRedis) {
      try {
        const serialized = JSON.stringify(value);
        await this.client.setEx(key, ttlSeconds, serialized);
        logger.debug(`Cache SET (Redis): ${key} (TTL: ${ttlSeconds}s)`);
        return;
      } catch (error) {
        logger.error('Redis set error, falling back to memory:', error);
      }
    }
    
    this.store.set(key, value);
    this.ttls.set(key, Date.now() + ttlSeconds * 1000);
    logger.debug(`Cache SET (Memory): ${key} (TTL: ${ttlSeconds}s)`);
  }

  async get(key) {
    if (this.useRedis) {
      try {
        const value = await this.client.get(key);
        if (value) {
          logger.debug(`Cache HIT (Redis): ${key}`);
          return JSON.parse(value);
        }
        logger.debug(`Cache MISS (Redis): ${key}`);
        return null;
      } catch (error) {
        logger.error('Redis get error, falling back to memory:', error);
      }
    }
    
    // Memory Cache Get implementation
    if (!this.store.has(key)) {
      logger.debug(`Cache MISS (Memory): ${key}`);
      return null;
    }
    
    if (this.ttls.get(key) < Date.now()) {
      this.store.delete(key);
      this.ttls.delete(key);
      logger.debug(`Cache EXPIRED (Memory): ${key}`);
      return null;
    }
    
    logger.debug(`Cache HIT (Memory): ${key}`);
    return this.store.get(key);
  }

  async delete(key) {
    if (this.useRedis) {
      try {
        await this.client.del(key);
        logger.debug(`Cache DELETE (Redis): ${key}`);
        return;
      } catch (error) {
        logger.error('Redis delete error:', error);
      }
    }
    
    this.store.delete(key);
    this.ttls.delete(key);
    logger.debug(`Cache DELETE (Memory): ${key}`);
  }

  async invalidatePattern(pattern) {
    if (this.useRedis) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
          logger.debug(`Cache INVALIDATED (Redis): ${keys.length} keys matching ${pattern}`);
        }
        return;
      } catch (error) {
        logger.error('Redis invalidate error:', error);
      }
    }
    
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let count = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        this.ttls.delete(key);
        count++;
      }
    }
    logger.debug(`Cache INVALIDATED (Memory): ${count} keys matching ${pattern}`);
  }

  async disconnect() {
    if (this.useRedis) {
      try {
        await this.client.quit();
        logger.info('Redis cache disconnected');
      } catch (error) {
        logger.error('Error disconnecting from Redis:', error);
      }
    }
  }
}

module.exports = Cache;

