import { validate, create } from "../service/message";

const register = (router) => {
  router.post("/echoAtTime", async (ctx) => {
    const body = ctx.request.body;
    const v = validate(body);
    if (v.error) {
      ctx.status = 400;
      ctx.body = v.error.details;
    } else {
      ctx.body = create(body);
      ctx.app.emit("scheduleMessage", ctx);
    }
  });
};

export default { register };
