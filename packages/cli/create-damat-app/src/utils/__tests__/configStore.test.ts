import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";
import { getConfigStore } from "../gets/configStore";
import * as realConfigstoreMod from "configstore";
const REAL_CONFIGSTORE = { ...realConfigstoreMod };

// Mock the `configstore` package so no real global config file is created.
const constructorCalls: Array<any[]> = [];
class FakeConfigstore {
  id: string;
  defaults: any;
  options: any;
  constructor(id: string, defaults: any, options: any) {
    constructorCalls.push([id, defaults, options]);
    this.id = id;
    this.defaults = defaults;
    this.options = options;
  }
}

describe("getConfigStore", () => {
  beforeAll(() => {
    // mock.module is global for the whole run; (re)apply in beforeAll so this
    // file's mock is active while its tests run.
    mock.module("configstore", () => ({ default: FakeConfigstore }));
  });

  afterAll(() => {
    mock.module("configstore", () => ({ ...REAL_CONFIGSTORE }));
  });

  it("should return a configstore instance built from the mocked Configstore", () => {
    // getConfigStore lazily constructs `new Configstore("damat", {}, {...})`.
    // The returned store therefore carries the fields our FakeConfigstore set.
    const store = getConfigStore() as unknown as FakeConfigstore;
    expect(store.id).toBe("damat");
    expect(store.defaults).toEqual({});
    expect(store.options).toEqual({ globalConfigPath: true });
  });

  it("should construct the store with the `damat` id and globalConfigPath option", () => {
    const store = getConfigStore() as unknown as FakeConfigstore;
    if (constructorCalls.length > 0) {
      // construction happened here (or earlier in this run): assert the args
      const [id, defaults, options] = constructorCalls[0]!;
      expect(id).toBe("damat");
      expect(defaults).toEqual({});
      expect(options).toEqual({ globalConfigPath: true });
    }
    // either way, the cached singleton must reflect those exact arguments
    expect(store.id).toBe("damat");
    expect(store.defaults).toEqual({});
    expect(store.options).toEqual({ globalConfigPath: true });
  });

  it("should return the same singleton instance on repeated calls", () => {
    const a = getConfigStore();
    const b = getConfigStore();
    const c = getConfigStore();
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("should construct the underlying store lazily and cache it (single instance)", () => {
    const first = getConfigStore();
    // many subsequent calls must not produce a different object
    for (let i = 0; i < 5; i++) {
      expect(getConfigStore()).toBe(first);
    }
  });
});
