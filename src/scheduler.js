import { createClient } from "./service/redis";
import { readDelayedAndSchedule } from "./service/message";
import "./util/dotenv";

const spawn = async () => {
  console.log("Started scheduler - delayed list reader");
  const redisClient = createClient();
  setInterval(() => {
    readDelayedAndSchedule(redisClient);
  }, process.env.WORKER_DELAY || 200);
};

spawn();
