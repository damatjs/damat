import { defineModule } from "@damatjs/services";

class ProducerEventService {}

export default defineModule("producer-event-fixture", {
  service: ProducerEventService,
  credentials: () => ({}),
});
