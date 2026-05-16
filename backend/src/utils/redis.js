const Redis = require('ioredis');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redis;
try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  redis.on('error', (err) => {
    console.error('[Redis] ❌ Error:', err.message);
  });

  redis.on('connect', () => {
    console.log('[Redis] 🔌 Connected to Redis');
  });
} catch (err) {
  console.error('[Redis] ❌ Failed to initialize:', err);
}

const cache = {
  async get(key) {
    if (!redis) return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error(`[Redis] Get error for ${key}:`, err);
      return null;
    }
  },

  async set(key, value, ttlSeconds = 3600) {
    if (!redis) return;
    try {
      const stringified = JSON.stringify(value);
      await redis.set(key, stringified, 'EX', ttlSeconds);
    } catch (err) {
      console.error(`[Redis] Set error for ${key}:`, err);
    }
  },

  async del(key) {
    if (!redis) return;
    try {
      await redis.del(key);
    } catch (err) {
      console.error(`[Redis] Del error for ${key}:`, err);
    }
  },

  async delPrefix(prefix) {
    if (!redis) return;
    try {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      console.error(`[Redis] DelPrefix error for ${prefix}:`, err);
    }
  }
};

module.exports = cache;
