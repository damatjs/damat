import { describe, expect, mock, test } from "bun:test";
import type { DurableEventHandlerContext } from "@damatjs/framework";
import {
  AUDIT_USER_CONSUMER,
  NOTIFY_USER_CONSUMER,
  USER_CREATED_EVENT,
  auditUserConsumer,
  notifyUserConsumer,
  userCreatedEvent,
} from "@/events";
import { createReferenceInspection } from "@/examples/inspectWork";
import { referenceInspectionPolicy } from "@/examples/inspectionPolicy";
import config from "../damat.config";

function context(consumer: string): DurableEventHandlerContext {
  return {
    eventId: "evt_1",
    deliveryId: `delivery_${consumer}`,
    consumer,
    attemptNumber: 1,
    maxAttempts: 5,
    metadata: {},
    signal: new AbortController().signal,
    progress: mock(async () => undefined),
    log: mock(async () => undefined),
  } as DurableEventHandlerContext;
}

describe("reference durable event", () => {
  test("registers two stable independent consumers", () => {
    expect(USER_CREATED_EVENT).toBe("user.created");
    expect(userCreatedEvent.name).toBe(USER_CREATED_EVENT);
    expect([...userCreatedEvent.consumers.keys()].sort()).toEqual([
      AUDIT_USER_CONSUMER,
      NOTIFY_USER_CONSUMER,
    ]);
  });

  test("runs audit and notification handlers independently", async () => {
    const payload = { userId: "usr_1", email: "user@example.com" };
    const audit = await auditUserConsumer.handler(
      payload,
      context(AUDIT_USER_CONSUMER),
    );
    const notify = await notifyUserConsumer.handler(
      payload,
      context(NOTIFY_USER_CONSUMER),
    );
    expect(audit).toEqual({ audited: true, userId: "usr_1" });
    expect(notify).toEqual({ notified: true, userId: "usr_1" });
  });

  test("exposes headless inspection clients", () => {
    const operations = createReferenceInspection("task-12-cursor-key");
    expect(operations.jobs.listRuns).toBeFunction();
    expect(operations.events.listEvents).toBeFunction();
  });

  test("shares one inspection policy with application config", () => {
    expect(config.services?.durability).toBe(referenceInspectionPolicy);
    expect(referenceInspectionPolicy.inspectionVisibility).toBe("metadata");
  });
});
