import {
  enqueueJob,
  getModule,
  publishDurableEvent,
  type DurabilityExecutor,
} from "@damatjs/framework";
import { USER_CREATED_EVENT } from "../events";
import { GENERATE_REPORT_JOB } from "../jobs";

interface UserInput {
  email: string;
  name?: string;
  reportId: string;
}

interface UserRecord {
  id: string;
  email: string;
  name?: string;
}

interface WorkOptions {
  executor: unknown;
  correlationId: string;
  deduplication?: { key: string };
  idempotencyKey?: string;
}

interface WorkDependencies {
  service: {
    users: { create(input: { data: object }): Promise<unknown> };
    transaction(run: (executor: unknown) => Promise<unknown>): Promise<unknown>;
  };
  enqueue(
    name: string,
    payload: object,
    options: WorkOptions,
  ): Promise<unknown>;
  publish(
    name: string,
    payload: object,
    options: WorkOptions,
  ): Promise<unknown>;
}

export function createDefaultDependencies(
  resolve = getModule as (name: string) => WorkDependencies["service"] | null,
  enqueue = enqueueJob,
  publish = publishDurableEvent,
): WorkDependencies {
  const service = resolve("user");
  if (!service) throw new Error('Module "user" is not initialized');
  return {
    service,
    enqueue: (name, payload, options) =>
      enqueue(name, payload, {
        ...options,
        executor: options.executor as DurabilityExecutor,
      }),
    publish: (name, payload, options) =>
      publish(name, payload, {
        ...options,
        executor: options.executor as DurabilityExecutor,
      }),
  };
}

export async function createUserWithDurableWork(
  input: UserInput,
  dependencies: WorkDependencies = createDefaultDependencies(),
) {
  return dependencies.service.transaction(async (executor) => {
    const user = (await dependencies.service.users.create({
      data: { email: input.email, name: input.name },
    })) as UserRecord;
    const job = await dependencies.enqueue(
      GENERATE_REPORT_JOB,
      { reportId: input.reportId, requestedBy: user.id },
      {
        executor,
        correlationId: user.id,
        deduplication: { key: `report:${input.reportId}` },
      },
    );
    const event = await dependencies.publish(
      USER_CREATED_EVENT,
      { userId: user.id, email: user.email },
      {
        executor,
        correlationId: user.id,
        idempotencyKey: `user.created:${user.id}`,
      },
    );
    return { user, job, event };
  });
}
