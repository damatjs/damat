import "reflect-metadata";
import { defineConfig } from "@damatjs/utils";

// Service modules
import userModule from "./src/modules/user";

// =============================================================================
// APP CONFIGURATION
// =============================================================================

const appConfig = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL,
    http: {
      port: Number(process.env.PORT) || 3000,
      host: process.env.HOST || "0.0.0.0",
      jwtSecret: process.env.JWT_SECRET ?? "",
      cookieSecret: process.env.COOKIE_SECRET ?? "",
      corsOrigin: process.env.FRONTEND_CORS ?? "",
    },
  },
  modules: [userModule],
});


export default appConfig;
