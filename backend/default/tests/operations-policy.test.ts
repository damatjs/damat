import { expect, test } from "bun:test";
import { imagePolicyErrors } from "../ops/image-policy";
import { rollbackImageAllowed } from "../ops/rollback-policy";

const digest = `sha256:${"a".repeat(64)}`;

test("release images require immutable digests", () => {
  expect(
    imagePolicyErrors({
      DAMAT_IMAGE: `registry.example/damat@${digest}`,
      POSTGRES_IMAGE: digest,
      REDIS_IMAGE: `redis@${digest}`,
    }),
  ).toEqual([]);
  expect(imagePolicyErrors({ DAMAT_IMAGE: "damat:latest" })).toHaveLength(3);
});

test("rollback rejects mutable tags outside an explicit local drill", () => {
  expect(rollbackImageAllowed(`registry.example/damat@${digest}`)).toBeTrue();
  expect(rollbackImageAllowed("damat:previous")).toBeFalse();
  expect(rollbackImageAllowed("damat:previous", true)).toBeTrue();
});
