import { expect, test } from "bun:test";
import type { AppConfig } from "../../config";
import {
  configureWorkerWakeupPublishers,
  type WakeupPublisherConfigurers,
} from "../../services/initialize/wakeup";

const redis = { duplicate: () => ({}) } as never;

function configure(services: AppConfig["services"]): string[] {
  const calls: string[] = [];
  const record = (name: string) => () => void calls.push(name);
  const configurers: WakeupPublisherConfigurers = {
    jobs: record("jobs"),
    events: record("events"),
    pipelines: record("pipelines"),
  };
  configureWorkerWakeupPublishers(
    {
      projectConfig: { http: { port: 3000, host: "localhost" } },
      services,
    },
    redis,
    configurers,
  );
  return calls;
}

test("enabled capabilities retain their wakeup publishers", () => {
  expect(configure({ jobs: {}, events: { durable: {} } })).toEqual([
    "jobs",
    "events",
  ]);
});

test("pipelines enable their internal job wakeup publisher", () => {
  expect(configure({ pipelines: {} })).toEqual(["jobs", "pipelines"]);
});
