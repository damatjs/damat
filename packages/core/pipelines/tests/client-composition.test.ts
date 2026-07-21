import { expect, test } from "bun:test";
import { validatePipelineComposition } from "../src/client/composition";

const manifest = (children: Array<[string, "child" | "foreach" | "loop"]>) => ({
  start: "start",
  edges: [],
  nodes: [
    { id: "start", kind: "delay", delayMs: 0 },
    ...children.map(([pipeline, kind], index) =>
      kind === "child"
        ? { id: `child-${index}`, kind, pipeline }
        : kind === "foreach"
          ? { id: `foreach-${index}`, kind, pipeline, items: [], maxItems: 1 }
          : {
              id: `loop-${index}`,
              kind,
              pipeline,
              until: { op: "eq", left: 1, right: 1 },
              maxIterations: 1,
            },
    ),
  ],
});

const executor = (rows: unknown[]) => ({
  query: async () => ({ rows, rowCount: rows.length }),
});

test("composition accepts acyclic child graphs and revisits shared children safely", async () => {
  const rows = [
    {
      name: "root",
      manifest: manifest([
        ["shared", "child"],
        ["leaf", "foreach"],
        ["shared", "loop"],
      ]),
    },
    { name: "shared", manifest: manifest([["leaf", "child"]]) },
    { name: "leaf", manifest: manifest([["external", "child"]]) },
  ];
  await expect(
    validatePipelineComposition(executor(rows) as never),
  ).resolves.toBeUndefined();
});

test("composition rejects unbounded child cycles with the full path", async () => {
  const rows = [
    { name: "a", manifest: manifest([["b", "child"]]) },
    { name: "b", manifest: manifest([["a", "loop"]]) },
  ];
  await expect(
    validatePipelineComposition(executor(rows) as never),
  ).rejects.toThrow("a -> b -> a");
});
