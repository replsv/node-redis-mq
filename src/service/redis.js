import * as Redis from "redis";
import { promisify } from "util";

// Create a new client instance
export const createClient = () => {
  const redisClient = Redis.createClient(
    process.env.REDIS_DSN || "redis://localhost:6379/0"
  );
  proxyPromises(redisClient);
  return redisClient;
};

export const proxyPromises = (redisClient) => {
  // promisify decorators
  redisClient.getAsync = promisify(redisClient.get).bind(redisClient);
  redisClient.zaddAsync = promisify(redisClient.zadd).bind(redisClient);
  redisClient.zrangeAsync = promisify(redisClient.zrange).bind(redisClient);
  redisClient.zremAsync = promisify(redisClient.zrem).bind(redisClient);
  redisClient.lpopAsync = promisify(redisClient.lpop).bind(redisClient);
  redisClient.setnxAsync = promisify(redisClient.setnx).bind(redisClient);
  redisClient.delAsync = promisify(redisClient.del).bind(redisClient);
};

// Register on server
export const register = (redisClient, app) => {
  redisClient.on("connect", () => app.emit("log", "info", "redis connected"));
  redisClient.on("error", (err) => app.emit("error", err));
  app.context.redis = redisClient;
};

// locking mechanism
export const lock = async (redisClient, id) => {
  const locked = await redisClient.setnxAsync(getLockName(id), 1);
  return locked === 1;
};

export const unlock = async (redisClient, id) => {
  return redisClient.delAsync(getLockName(id), 1);
};

export const getLockName = (name) =>
  `lock_${name}`.replace(/[.,\/#!$%\^&\*;:{}=\-`~()]/g, "");
