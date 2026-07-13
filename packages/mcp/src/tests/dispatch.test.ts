import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { NO_REGISTRY_MSG, SERVER_NAME } from "../constants";
import { handleMessage } from "../server/dispatch";
import { tools } from "../tools";

const realWrite = process.stdout.write.bind(process.stdout);

/** Run an async dispatch while capturing every JSON-RPC frame it emits. */
async function dispatchCapture(msg: unknown): Promise<any[]> {
  const frames: any[] = [];
  (process.stdout as any).write = (chunk: string) => {
    frames.push(JSON.parse(String(chunk)));
    return true;
  };
  try {
    await handleMessage(msg);
  } finally {
    process.stdout.write = realWrite;
  }
  return frames;
}

const savedRegistry = process.env.DAMAT_MODULE_REGISTRY;

beforeEach(() => {
  delete process.env.DAMAT_MODULE_REGISTRY;
});

afterEach(() => {
  process.stdout.write = realWrite;
  if (savedRegistry === undefined) delete process.env.DAMAT_MODULE_REGISTRY;
  else process.env.DAMAT_MODULE_REGISTRY = savedRegistry;
});

describe("handleMessage — initialize", () => {
  test("replies with server info and echoes a string protocolVersion", async () => {
    const [res] = await dispatchCapture({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2099-01-01" },
    });
    expect(res.id).toBe(1);
    expect(res.result.protocolVersion).toBe("2099-01-01");
    expect(res.result.serverInfo.name).toBe(SERVER_NAME);
    expect(res.result.capabilities.tools).toBeDefined();
  });

  test("falls back to the default protocol when none is requested", async () => {
    const [res] = await dispatchCapture({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    });
    expect(typeof res.result.protocolVersion).toBe("string");
    expect(res.result.protocolVersion).toBe("2025-06-18");
  });
});

describe("handleMessage — notifications", () => {
  test("initialized notification produces no response", async () => {
    const frames = await dispatchCapture({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });
    expect(frames).toHaveLength(0);
  });

  test("an id-less unknown method produces no error frame", async () => {
    const frames = await dispatchCapture({
      jsonrpc: "2.0",
      method: "whatever",
    });
    expect(frames).toHaveLength(0);
  });
});

describe("handleMessage — ping", () => {
  test("replies with an empty result when given an id", async () => {
    const [res] = await dispatchCapture({
      jsonrpc: "2.0",
      id: 5,
      method: "ping",
    });
    expect(res).toEqual({ jsonrpc: "2.0", id: 5, result: {} });
  });

  test("stays silent for a ping notification", async () => {
    const frames = await dispatchCapture({ jsonrpc: "2.0", method: "ping" });
    expect(frames).toHaveLength(0);
  });
});

describe("handleMessage — tools/list", () => {
  test("lists every tool with name/description/inputSchema", async () => {
    const [res] = await dispatchCapture({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    expect(res.result.tools).toHaveLength(tools.length);
    const names = res.result.tools.map((t: any) => t.name);
    expect(names).toEqual(tools.map((t) => t.name));
    for (const t of res.result.tools) {
      expect(t).toHaveProperty("description");
      expect(t).toHaveProperty("inputSchema");
    }
  });
});

describe("handleMessage — tools/call", () => {
  test("routes a known tool and wraps the result as MCP content", async () => {
    // list_modules with no registry returns a deterministic isError envelope.
    const [res] = await dispatchCapture({
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: { name: "list_modules", arguments: {} },
    });
    expect(res.id).toBe(9);
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0].type).toBe("text");
    expect(res.result.content[0].text).toBe(NO_REGISTRY_MSG);
  });

  test("returns a JSON-RPC error for an unknown tool", async () => {
    const [res] = await dispatchCapture({
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: { name: "does_not_exist", arguments: {} },
    });
    expect(res.error.code).toBe(-32602);
    expect(res.error.message).toMatch(/Unknown tool/);
  });

  test("defaults isError to false on a successful tool result", async () => {
    process.env.DAMAT_MODULE_REGISTRY = "";
    // add_module validates its own args before any spawn; an empty source
    // yields a non-error... actually it errors. Use list_installed which
    // never errors and performs only a (mocked-free, empty-dir) scan.
    const [res] = await dispatchCapture({
      jsonrpc: "2.0",
      id: 11,
      method: "tools/call",
      params: {
        name: "list_installed",
        arguments: { dir: "definitely-missing-dir-xyz" },
      },
    });
    expect(res.result.isError).toBe(false);
    const payload = JSON.parse(res.result.content[0].text);
    expect(payload.count).toBe(0);
    expect(payload.installed).toEqual([]);
  });
});

describe("handleMessage — unknown method", () => {
  test("returns method-not-found for a request with an id", async () => {
    const [res] = await dispatchCapture({
      jsonrpc: "2.0",
      id: 99,
      method: "no/such/method",
    });
    expect(res.error.code).toBe(-32601);
    expect(res.error.message).toMatch(/Method not found/);
  });
});

describe("handleMessage — tool handler failures", () => {
  test("wraps a throwing tool handler as an isError text result", async () => {
    const throwing = {
      name: "explode",
      description: "always throws",
      inputSchema: { type: "object" },
      handler: async () => {
        throw new Error("kaboom");
      },
    };
    tools.push(throwing as never);
    try {
      const [res] = await dispatchCapture({
        jsonrpc: "2.0",
        id: 20,
        method: "tools/call",
        params: { name: "explode", arguments: {} },
      });
      expect(res.id).toBe(20);
      expect(res.result.isError).toBe(true);
      expect(res.result.content[0].text).toBe("kaboom");
    } finally {
      tools.splice(tools.indexOf(throwing as never), 1);
    }
  });

  test("stringifies a non-Error thrown by a tool handler", async () => {
    const throwing = {
      name: "explode-string",
      description: "throws a string",
      inputSchema: { type: "object" },
      handler: async () => {
        throw "plain failure";
      },
    };
    tools.push(throwing as never);
    try {
      const [res] = await dispatchCapture({
        jsonrpc: "2.0",
        id: 21,
        method: "tools/call",
        params: { name: "explode-string", arguments: {} },
      });
      expect(res.result.isError).toBe(true);
      expect(res.result.content[0].text).toBe("plain failure");
    } finally {
      tools.splice(tools.indexOf(throwing as never), 1);
    }
  });
});

describe("handleMessage — unexpected dispatch failure (outer catch)", () => {
  test("replies with an internal error when message handling throws unexpectedly", async () => {
    // A tool whose `name` getter throws makes tools/list's map() throw from
    // outside the tools/call inner try, exercising the outer error boundary.
    const hostile = {
      get name(): string {
        throw new Error("name explosion");
      },
      description: "hostile",
      inputSchema: { type: "object" },
      handler: async () => ({ text: "" }),
    };
    tools.push(hostile as never);
    try {
      const [res] = await dispatchCapture({
        jsonrpc: "2.0",
        id: 30,
        method: "tools/list",
      });
      expect(res.error.code).toBe(-32603);
      expect(res.error.message).toBe("name explosion");
    } finally {
      tools.splice(tools.indexOf(hostile as never), 1);
    }
  });

  test("stays silent on an unexpected failure for a notification (no id)", async () => {
    const hostile = {
      get name(): string {
        throw new Error("silent explosion");
      },
      description: "hostile",
      inputSchema: { type: "object" },
      handler: async () => ({ text: "" }),
    };
    tools.push(hostile as never);
    try {
      const frames = await dispatchCapture({
        jsonrpc: "2.0",
        method: "tools/list",
      });
      // No id -> notification -> the outer catch swallows without replying.
      expect(frames).toHaveLength(0);
    } finally {
      tools.splice(tools.indexOf(hostile as never), 1);
    }
  });
});
