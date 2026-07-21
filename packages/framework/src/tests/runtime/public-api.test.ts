import { expect, test } from "bun:test";
import {
  createDurabilityClient,
  createDurableEventInspectionClient,
  createJobInspectionClient,
  getAccelerationHealth,
  rebuildAccelerationProjection,
  setRetentionOverride,
  subscribeDurableInvalidations,
  resolveRuntime,
} from "../../index";

test("framework exposes runtime and headless durability clients", () => {
  expect(resolveRuntime).toBeFunction();
  expect(createDurabilityClient).toBeFunction();
  expect(createJobInspectionClient).toBeFunction();
  expect(createDurableEventInspectionClient).toBeFunction();
  expect(getAccelerationHealth).toBeFunction();
  expect(rebuildAccelerationProjection).toBeFunction();
  expect(setRetentionOverride).toBeFunction();
  expect(subscribeDurableInvalidations).toBeFunction();
});
