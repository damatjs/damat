import { createServer } from "@damatjs/server-handler";
import appConfig from "../damat.config";
import { initServices } from "./services";
import { setupAuth } from "./auth";

createServer({
  config: appConfig,
  services: initServices,
  customRoutes: setupAuth,
});
