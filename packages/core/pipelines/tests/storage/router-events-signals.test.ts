import { beforeEach, expect, test } from "bun:test";
import { defineDurableEvent, publishDurableEvent } from "@damatjs/events";
import {
  clearPipelineRuntime,
  definePipeline,
  registerPipelineEvent,
  routePipelineCycle,
  signalPipelineRun,
  startPipeline,
  syncPipelineDefinitions,
} from "../../src";
import { ensureStorage, uniqueName } from "./context";
import { routeToTerminal } from "./pipeline-fixture";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});
const control = () => ({
  actor: { id: "signal-test", type: "system" as const },
  reason: "release wait",
  idempotencyKey: crypto.randomUUID(),
});

test("event publication uses canonical durable events and correlation", async () => {
  const event = uniqueName("publish-event");
  defineDurableEvent(event);
  registerPipelineEvent({ name: event, inputSchema: { type: "object" } });
  const definition = definePipeline(uniqueName("publisher"), {
    version: 1,
    start: "publish",
    nodes: [
      { id: "publish", kind: "event.publish", event, input: { value: 1 } },
      {
        id: "custom",
        kind: "event.publish",
        event,
        input: { value: 2 },
        correlation: "custom",
      },
    ],
    edges: [{ from: "publish", to: "custom" }],
  });
  await syncPipelineDefinitions();
  const first = await startPipeline(
    definition.name,
    {},
    { correlationId: "run-correlation" },
  );
  expect((await routeToTerminal(first.id)).status).toBe("succeeded");
});

test("event and signal waits park until their durable input arrives", async () => {
  const event = uniqueName("wait-event");
  defineDurableEvent(event);
  registerPipelineEvent({ name: event });
  const eventPipeline = definePipeline(uniqueName("event-wait"), {
    version: 1,
    start: "wait",
    nodes: [{ id: "wait", kind: "event.wait", event, correlation: "expected" }],
    edges: [],
  });
  const signalPipeline = definePipeline(uniqueName("signal-wait"), {
    version: 1,
    start: "wait",
    nodes: [{ id: "wait", kind: "signal.wait", signal: "approve" }],
    edges: [],
  });
  await syncPipelineDefinitions();
  const waitingEvent = await startPipeline(eventPipeline.name, {});
  const waitingSignal = await startPipeline(signalPipeline.name, {});
  await routePipelineCycle(100);
  await publishDurableEvent(
    event,
    { accepted: true },
    { correlationId: "expected" },
  );
  await signalPipelineRun(
    waitingSignal.id,
    "approve",
    { accepted: true },
    control(),
  );
  expect((await routeToTerminal(waitingEvent.id)).status).toBe("succeeded");
  expect((await routeToTerminal(waitingSignal.id)).status).toBe("succeeded");
});
