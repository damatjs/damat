import { defineJob } from "@damatjs/jobs";

defineJob("standalone.fixture.echo", async (payload) => ({ payload }));
