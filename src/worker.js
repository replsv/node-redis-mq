import "./util/dotenv";
import { createClient } from "./service/redis";
import { handleMessage, pollMessages } from "./service/message";
import "./util/dotenv";

const spawn = async () => {
  console.log("Started worker - message executor");
  const redisClient = createClient();
  setInterval(async () => {
    const message = await pollMessages(redisClient);
    if (message) {
      handleMessage(JSON.parse(message));
      console.log("---");
    }
  }, process.env.WORKER_DELAY || 500);
};

spawn();
