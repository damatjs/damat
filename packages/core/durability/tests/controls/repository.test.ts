import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  getWorkControl,
  listWorkControlActivity,
  pauseWork,
  recordMaintenanceActivity,
  resumeWork,
} from "../../src";
import { createRepositoryContext, testId } from "../repositoryContext";
import { actor, transaction } from "./context";

let context: Awaited<ReturnType<typeof createRepositoryContext>>;

beforeAll(async () => {
  context = await createRepositoryContext();
});
afterAll(async () => context.pool.end());

describe("control repository", () => {
  test("rejects a nontransactional executor before either control write", async () => {
    let queries = 0;
    const executor = {
      query: async () => {
        queries += 1;
        return { rows: [], rowCount: 0 };
      },
    };
    await expect(
      pauseWork({ kind: "job", scope: "default", actor, executor }),
    ).rejects.toThrow("work control");
    expect(queries).toBe(0);
  });

  test("durably pauses and resumes with immutable actor activity", async () => {
    const scope = testId("queue");
    await transaction(context, (executor) =>
      pauseWork({ kind: "job", scope, reason: "deploy", actor, executor }),
    );
    expect(
      await getWorkControl({ kind: "job", scope, executor: context.pool }),
    ).toMatchObject({ paused: true, reason: "deploy", actor });
    await transaction(context, (executor) =>
      resumeWork({ kind: "job", scope, actor, executor }),
    );
    const activity = await listWorkControlActivity({
      kind: "job",
      scope,
      executor: context.pool,
    });
    expect(activity.map(({ action }) => action)).toEqual(["paused", "resumed"]);
    expect(activity[0]?.actor).toEqual(actor);
  });

  test("records maintenance activity and serializes upsert races", async () => {
    const scope = testId("consumer");
    await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        transaction(context, (executor) =>
          pauseWork({
            kind: "event",
            scope,
            reason: String(index),
            actor,
            executor,
          }),
        ),
      ),
    );
    expect(
      await getWorkControl({ kind: "event", scope, executor: context.pool }),
    ).toMatchObject({ paused: true });
    expect(
      (
        await listWorkControlActivity({
          kind: "event",
          scope,
          executor: context.pool,
        })
      ).length,
    ).toBe(6);
    const recorded = await recordMaintenanceActivity({
      operation: "retention",
      kind: "event",
      scope,
      status: "requested",
      actor,
      details: { maxAgeDays: 30 },
      executor: context.pool,
    });
    expect(recorded).toMatchObject({ operation: "retention", actor });
  });
});
