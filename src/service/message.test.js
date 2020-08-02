import { createClient, lock } from "./redis";
import {
  create,
  validate,
  handleMessage,
  delayedSet,
  scheduleMessage,
  execQueue,
  pollMessages,
  readDelayedAndSchedule,
} from "./message";

function sleep(s) {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}

describe("Message service", () => {
  let start;
  let connection;
  beforeAll(async () => {
    start = new Date();
  });

  beforeEach(() => {
    connection = createClient();
  });

  afterEach(async () => {
    // clear saved data through current test
    const items = await connection.zrangeAsync(delayedSet, 0, -1);
    for (const item of items) {
      await connection.zremAsync(delayedSet, item);
    }
    for (let i = 0; i < 100; i++) {
      const result = await connection.lpopAsync(execQueue);
      if (!result) {
        break;
      }
    }
    connection.quit();
  });

  test("Create message", () => {
    const time = "2020-08-04T00:01:10";
    const message = `Hello ${start.getTime()}`;
    const object = create({ time, message });
    expect(object.time).toBe(time);
    expect(object.message).toBe(message);
    expect(object.timestamp).toBe(new Date(time).getTime());
    expect(object.id).toBeDefined();
  });

  test("Validate message", () => {
    const date = new Date();
    const message = "Hello";
    date.setMinutes(date.getMinutes() + 30);
    let result = validate({ message, time: date.toISOString() });
    // valid
    expect(result.error).toBeUndefined();
    // invalid - empty message
    result = validate({ message: "", time: date.toISOString() });
    expect(result.error).toBeDefined();
    expect(result.error.details.length).toBe(1);
    // invalid - past date
    date.setMinutes(date.getMinutes() - 60);
    result = validate({ message, time: date.toISOString() });
    expect(result.error).toBeDefined();
    expect(result.error.details.length).toBe(1);
  });

  test("Handle message", () => {
    const id = `someId_${start.getTime()}`;
    const result = handleMessage({ id: id });
    expect(result).toBe(id);
  });

  test("Test scheduler - delayed or immediate", async () => {
    const date = new Date();
    const text = "Hello";
    date.setMinutes(date.getMinutes() + 30);
    let message = create({ time: date.toISOString(), message: text });
    let result = await scheduleMessage(connection, message);
    expect(result.delayed).toBe(true);
    date.setMinutes(date.getMinutes() - 60);
    message = create({ time: date.toISOString(), message: text });
    result = await scheduleMessage(connection, message);
    expect(result.now).toBe(true);
  });

  test("Poll message from immediate exec queue", async () => {
    const date = new Date();
    const text = "Hello";
    date.setMinutes(date.getMinutes() - 1);
    await scheduleMessage(
      connection,
      create({ time: date.toISOString(), message: text })
    );
    const result = await pollMessages(connection);
    expect(result).toBeDefined();
  });

  test("Read from delayed set and schedule", async () => {
    let date = new Date();
    const text = "Hello";
    date.setMinutes(date.getMinutes() + 30);
    let message = create({ time: date.toISOString(), message: text });
    await scheduleMessage(connection, message);
    // see if there's any due message
    let result = await readDelayedAndSchedule(connection);
    expect(result).toBe(false);

    // exec message delayed for now
    date = new Date();
    date.setSeconds(date.getSeconds() + 3);
    message = create({ time: date.toISOString(), message: text });
    await scheduleMessage(connection, message);
    await sleep(3);
    result = await readDelayedAndSchedule(connection);
    expect(result).toBe(true);

    // read locked message
    date = new Date();
    date.setSeconds(date.getSeconds() + 3);
    message = create({ time: date.toISOString(), message: text });
    await scheduleMessage(connection, message);
    await sleep(3);
    await lock(connection, message.id);
    result = await readDelayedAndSchedule(connection);
    expect(result).toBe(false);
  }, 15000);
});
