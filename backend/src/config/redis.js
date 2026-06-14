// backend/src/config/redis.js
// Conexão Redis via ioredis

const Redis = require('ioredis');
const env = require('./env');

let redis = null;

function getRedis() {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      lazyConnect: true,
    });

    redis.on('connect', () => {
      console.log('✅ Redis conectado');
    });

    redis.on('error', (err) => {
      console.error('❌ Redis erro:', err.message);
    });
  }

  return redis;
}

module.exports = { getRedis };
