import { defineModuleConfig } from "../../../src";

export default defineModuleConfig({
  projectConfig: {
    loggerConfig: { level: "fatal", format: "pretty", timestamp: false },
    http: { host: "127.0.0.1", port: 0 },
  },
});
