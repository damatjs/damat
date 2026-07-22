import { defineModule } from "@damatjs/services";

class StandaloneFixtureService {}

export default defineModule("standalone-durable-fixture", {
  service: StandaloneFixtureService,
  credentials: () => ({}),
});
