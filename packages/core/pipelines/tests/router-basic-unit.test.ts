import { expect, test } from "bun:test";
import { processControlNode } from "../src/router/basic";
import { serializePipelineError } from "../src/router/outcome";
import { waitNode } from "../src/router/update";
import { projectTerminalJob } from "../src/router/terminal";

const execution = { id: "node", run_id: "run", status: "ready" } as never;

test("generic control processing parks join nodes", async () => {
  const queries: string[] = [];
  const executor = {
    query: async (sql: string) => {
      queries.push(sql);
      return { rows: [], rowCount: 1 };
    },
  };
  await processControlNode(executor as never, {} as never, execution, {
    id: "node",
    kind: "join",
  });
  expect(queries.some((sql) => sql.includes("status"))).toBe(true);
});

test("waiting an already parked node without a deadline is a no-op", async () => {
  let called = false;
  await waitNode(
    {
      query: async () => {
        called = true;
      },
    } as never,
    {
      ...execution,
      status: "waiting",
    } as never,
  );
  expect(called).toBe(false);
});

test("pipeline errors serialize Error instances and arbitrary failures", () => {
  expect(serializePipelineError(new TypeError("bad"))).toEqual({
    name: "TypeError",
    message: "bad",
  });
  expect(serializePipelineError("bad")).toEqual({
    name: "Error",
    message: "bad",
  });
});

test("terminal projection rejects nodes absent from the pinned manifest", async () => {
  const executor = {
    query: async () => ({
      rows: [{ id: "run", manifest: { start: "other", nodes: [], edges: [] } }],
      rowCount: 1,
    }),
  };
  await expect(
    projectTerminalJob(
      executor as never,
      {
        run_id: "run",
        node_id: "missing",
        phase: "forward",
        job_status: "succeeded",
        job_error: null,
      } as never,
    ),
  ).rejects.toThrow("missing from its pinned manifest");
});
