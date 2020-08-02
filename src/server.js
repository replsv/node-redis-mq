import Koa from "koa";
import Router from "koa-router";
import KoaErrorHandler from "koa-better-error-handler";

// middlewares
import MBodyParser from "koa-bodyparser";
import MLogger from "koa-logger";
import MJson from "koa-json";
import MCors from "@koa/cors";
import M404 from "koa-404-handler";

// listeners
import { registerScheduleToStorage as LScheduler } from "./listener/scheduler";

// entity routes
import HandlerMessage from "./handler/message";

// utils
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
  listeners(app);
  services(app);

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
};

const listeners = (app) => {
  LScheduler(app);
};

const services = (app) => {
  registerRedis(createRedisClient(), app);
};

const routes = (router) => {
  // status route
  router.get("/status", async (ctx, next) => {
    ctx.body = { success: true };
    await next();
  });
  // handlers by entity
  HandlerMessage.register(router);
};

start();
