import { createClient, proxyPromises, register, lock, unlock } from "./redis";
import RedisMock from "redis-mock";

describe("Redis service", () => {
  let connection;
  let start;
  beforeAll(async () => {
    connection = RedisMock.createClient();
    start = new Date();
  });

  afterAll(async () => {
    connection.closeConnection();
  });

  test("Proxy client", () => {
    proxyPromises(connection);
    for (const method of [
      "getAsync",
      "zaddAsync",
      "zrangeAsync",
      "zremAsync",
      "lpopAsync",
      "setnxAsync",
      "delAsync",
    ]) {
      expect(connection[method]).toBeDefined();
    }
  });

  test("Register on KOA server", () => {
    const appMock = { context: {}, emit: () => {} };
    register(connection, appMock);
    expect(appMock.context.redis).toBeDefined();
  });

  test("Test locking", async () => {
    const key = `testLock_${start.getTime()}`;
    let result = await lock(connection, key);
    expect(result).toBe(true);
    result = await lock(connection, key);
    expect(result).toBe(false);
  });

  test("Test unlocking", async () => {
    const key = `testUnlock_${start.getTime()}`;
    const connection = createClient();
    let result = await lock(connection, key);
    expect(result).toBe(true);
    result = await unlock(connection, key);
    expect(result).toBe(1);
    result = await lock(connection, key);
    expect(result).toBe(true);
    await unlock(connection, key);
    connection.quit();
  }, 30000);
});
