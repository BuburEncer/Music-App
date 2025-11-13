const redis = require("redis");

class CacheService {
  constructor() {
    this._client = redis.createClient({
      socket: {
        host: process.env.REDIS_SERVER || "localhost",
        port: process.env.REDIS_PORT || 6379,
      },
    });

    this._client.on("error", (error) => {
      console.error("Redis Client Error:", error);
    });

    this._client.connect();
  }

  async set(key, value, expirationInSecond = 3600) {
    await this._client.set(key, JSON.stringify(value), {
      EX: expirationInSecond,
    });
  }

  async get(key) {
    const result = await this._client.get(key);

    if (result === null) {
      return null;
    }

    return JSON.parse(result);
  }

  async delete(key) {
    return this._client.del(key);
  }
}

module.exports = CacheService;
