import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
} from "bun:test";
import create from "../../commands/create";

// The create command handler delegates to ProjectCreatorFactory.create(...) then
// invokes the returned creator's create(). Mock the factory module so no real
// project is scaffolded. Snapshot + restore to avoid leaking into other files.
import * as realFactoryMod from "../projectCreator";
const REAL_FACTORY = { ...realFactoryMod };

const mockCreatorCreate = mock(async () => {});
const mockFactoryCreate = mock(async (_args: any, _opts: any) => ({
  create: mockCreatorCreate,
}));

describe("create command handler", () => {
  beforeAll(() => {
    mock.module("../utils/projectCreator", () => ({
      ...REAL_FACTORY,
      ProjectCreatorFactory: { create: mockFactoryCreate },
    }));
    mock.module("../projectCreator", () => ({
      ...REAL_FACTORY,
      ProjectCreatorFactory: { create: mockFactoryCreate },
    }));
  });

  afterAll(() => {
    mock.module("../utils/projectCreator", () => ({ ...REAL_FACTORY }));
    mock.module("../projectCreator", () => ({ ...REAL_FACTORY }));
  });

  beforeEach(() => {
    mockCreatorCreate.mockClear();
    mockFactoryCreate.mockClear();
  });

  it("should build a creator via the factory and run it", async () => {
    const options: any = {
      module: false,
      directoryPath: "/base",
      version: "latest",
    };
    await create(["my-app"], options);

    expect(mockFactoryCreate).toHaveBeenCalledTimes(1);
    expect(mockFactoryCreate.mock.calls[0]![0]).toEqual(["my-app"]);
    expect(mockFactoryCreate.mock.calls[0]![1]).toBe(options);
    expect(mockCreatorCreate).toHaveBeenCalledTimes(1);
  });

  it("should forward an empty args array (interactive name prompt path)", async () => {
    await create([], { module: true, directoryPath: "/d" } as any);
    expect(mockFactoryCreate.mock.calls[0]![0]).toEqual([]);
    expect(mockCreatorCreate).toHaveBeenCalledTimes(1);
  });

  it("should propagate errors from the creator", async () => {
    mockCreatorCreate.mockImplementationOnce(async () => {
      throw new Error("create failed");
    });
    await expect(
      create(["x"], { module: false, directoryPath: "/d" } as any),
    ).rejects.toThrow("create failed");
  });
});
