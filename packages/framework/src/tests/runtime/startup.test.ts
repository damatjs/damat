import { expect, test } from "bun:test";
import { startResolvedRuntime, type ResolvedRuntime } from "../../runtime";
import type { ShutdownRegistration } from "../../shutdown";

const cases: Array<[string, ResolvedRuntime, boolean]> = [
  ["server", { mode: "server", workers: [], servesHttp: true }, true],
  [
    "jobs worker",
    { mode: "worker", workers: ["jobs"], servesHttp: false },
    false,
  ],
  [
    "events worker",
    { mode: "worker", workers: ["events"], servesHttp: false },
    false,
  ],
  [
    "combined worker",
    { mode: "worker", workers: ["jobs", "events"], servesHttp: false },
    false,
  ],
  ["all", { mode: "all", workers: ["jobs", "events"], servesHttp: true }, true],
];

for (const [name, runtime, serves] of cases) {
  test(`${name} initializes its runtime and HTTP selection`, async () => {
    const initialized: ResolvedRuntime[] = [];
    const registered: ShutdownRegistration[] = [];
    let httpStarts = 0;
    let httpCloses = 0;
    await startResolvedRuntime(runtime, {
      initialize: async (value) => {
        initialized.push(value);
        return {
          shutdownHandlers: [
            { name: "redis", phase: "redis", handler: () => {} },
          ],
        };
      },
      startHttp: async () => {
        httpStarts++;
        return { close: async () => void httpCloses++ };
      },
      register: (handler) => registered.push(handler),
    });
    expect(initialized).toEqual([runtime]);
    expect(httpStarts).toBe(serves ? 1 : 0);
    expect(registered.map(({ name: item }) => item)).toEqual(
      serves ? ["redis", "http"] : ["redis"],
    );
    if (serves) await registered.at(-1)!.handler();
    expect(httpCloses).toBe(serves ? 1 : 0);
  });
}
