import { defineConfig, loadEnv } from "@damatjs/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

export default defineConfig({
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
  modules: [
    {
      resolve: "./src/modules/user",
      id: "user",
    },
  ],
});
