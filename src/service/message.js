import { v4 as Uuidv4 } from "uuid";
import * as Joi from "joi";
import { lock, getLockName, unlock } from "./redis";

// immediate handler set
export const execQueue = process.env.EXEC_QUEUE || "exec";
// sorted set name
export const delayedSet = process.env.DELAYED_SET || "delayed";

// validation schema
export const schema = Joi.object({
  message: Joi.string().required(),
  time: Joi.date().min("now"),
  timestamp: Joi.date().timestamp().optional(),
  id: Joi.string().uuid().optional(),
});

// create message from payload
export const create = ({ time, message }) => {
  return {
    id: Uuidv4(),
    time,
    timestamp: new Date(time).getTime(),
    message,
  };
};

export const validate = (payload) => {
  return schema.validate(payload);
};

export const handleMessage = (message) => {
  console.log(`PID: ${process.pid} - handleMessage`, message);
  return message.id;
};

// read from exec list and pop elements
export const pollMessages = (redisClient) => {
  return redisClient.lpopAsync(execQueue);
};

// schedule message
export const scheduleMessage = async (redisClient, message) => {
  if (message.timestamp <= new Date().getTime()) {
    scheduleNow(redisClient, JSON.stringify(message));
    return { now: true };
  } else {
    await scheduleDelayed(redisClient, message);
    return {
      delayed: true,
    };
  }
};

const scheduleNow = (redisClient, message) => {
  return redisClient.rpush(execQueue, message);
};

const scheduleDelayed = (redisClient, message) => {
  return redisClient.zadd(
    delayedSet,
    message.timestamp,
    JSON.stringify(message)
  );
};

export const readDelayedAndSchedule = async (redisClient) => {
  const now = new Date().getTime();
  const item = await redisClient.zrangeAsync(delayedSet, 0, 0, "WITHSCORES");
  if (item.length) {
    const [rawMessage, scheduledAt] = item;
    if (now >= scheduledAt) {
      const message = JSON.parse(rawMessage);
      const isFree = await lock(redisClient, message.id);
      if (isFree) {
        await redisClient.zremAsync(delayedSet, rawMessage);
        await scheduleNow(redisClient, rawMessage);
        await unlock(redisClient, getLockName(message.id));
        return true;
      } else {
        console.log(`PID: ${process.pid} - Locked resource: ${message.id}`);
      }
    }
  }
  return false;
};
