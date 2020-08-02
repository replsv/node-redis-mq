import Koa from "koa";
import Router from "koa-router";
import KoaErrorHandler from "koa-better-error-handler";
// middlewares
import MBodyParser from "koa-bodyparser";
import MLogger from "koa-logger";
import MJson from "koa-json";
import MCors from "@koa/cors";
import M404 from "koa-404-handler";
import { registerScheduleToStorage as MScheduler } from "./middleware/scheduler";

// routes
import HandlerMessage from "./handler/message";

import "./util/dotenv";
import {
  register as registerRedis,
  createClient as createRedisClient,
} from "./service/redis";

const start = async () => {
  const app = new Koa();
  const router = new Router();
  app.context.onerror = KoaErrorHandler;

  middlewares(app);
  registerRedis(createRedisClient(), app);

  // routes
  routes(router);

  router.post("/message", async (ctx) => {});

  app.use(router.routes()).use(router.allowedMethods());
  app.listen(process.env.HTTP_PORT || 8080, () => {
    console.log(`App listening on port: ${process.env.HTTP_PORT || 8080}`);
  });
};

const middlewares = (app) => {
  app.use(MBodyParser());
  app.use(MJson());
  app.use(MLogger());
  app.use(MCors());
  app.use(M404);
  MScheduler(app);
};

const routes = (router) => {
  router.get("/status", async (ctx, next) => {
    ctx.body = { success: true };
    await next();
  });
  HandlerMessage.register(router);
};

start();
