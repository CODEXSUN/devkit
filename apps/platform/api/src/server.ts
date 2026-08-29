import { registerGracefulShutdown, startApiServer } from "@codexsun/framework/api";
import { createApp } from "./app.js";
import { env } from "./env.js";

const app = await createApp();
registerGracefulShutdown(app);
await startApiServer({
  app,
  host: env.NODE_ENV === "production" ? "0.0.0.0" : env.PLATFORM_API_HOST,
  port: env.PLATFORM_API_PORT,
  readyLabel: "  ok api ready: {address}"
});
