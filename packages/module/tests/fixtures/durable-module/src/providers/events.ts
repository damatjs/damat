import { defineDurableEvent, defineDurableEventHandler } from "@damatjs/events";

defineDurableEvent("standalone.fixture.created");
defineDurableEventHandler(
  "standalone.fixture.created",
  "fixture.audit",
  async (payload) => ({ consumer: "audit", payload }),
);
defineDurableEventHandler(
  "standalone.fixture.created",
  "fixture.notify",
  async (payload) => ({ consumer: "notify", payload }),
);
