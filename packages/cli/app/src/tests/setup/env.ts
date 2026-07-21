import { mock } from "bun:test";

export const loadEnvCalls: Array<[string, string]> = [];
export const mockLoadEnv = mock((env: string, cwd: string) => {
  loadEnvCalls.push([env, cwd]);
});

mock.module("@damatjs/load-env", () => ({ loadEnv: mockLoadEnv }));
