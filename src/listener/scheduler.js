import { scheduleMessage } from "../service/message";

export const registerScheduleToStorage = (app) => {
  app.on("scheduleMessage", async (ctx) => {
    const result = await scheduleMessage(ctx.redis, ctx.body);
    console.log("onScheduledMessage fulfilled", result);
  });
};
