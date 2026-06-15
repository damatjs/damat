#!/usr/bin/env bun
/**
 * damat-mcp — a Model Context Protocol (MCP) server for installing and
 * inspecting Damat modules.
 *
 * It exposes the Damat module registry + the `damat module` CLI to any MCP
 * client (Claude Code, Claude Desktop, Cursor, …) so an AI assistant can:
 *   - discover modules published in a registry            (list_modules / search_modules)
 *   - read a module's details before installing it        (module_info)
 *   - install an existing module into a Damat app         (add_module)
 *   - see what is already installed                        (list_installed)
 *
 * It is intentionally DEPENDENCY-FREE: it speaks the MCP stdio transport
 * (newline-delimited JSON-RPC 2.0) directly and shells out to the `damat`
 * CLI for the actual install. Run it with Bun — no build step required.
 *
 * Configuration (environment variables):
 *   DAMAT_MODULE_REGISTRY  Registry index location: an http(s) URL to the
 *                          index JSON, a path to a registry.json file, or a
 *                          directory containing registry.json. Without it,
 *                          registry tools return guidance and you can still
 *                          install from git/local paths via add_module.
 *   DAMAT_APP_DIR          Working directory of the target Damat app
 *                          (defaults to process.cwd()). Installs and
 *                          "installed" scans run here.
 *   DAMAT_CLI              Command used to invoke the damat CLI
 *                          (default: "damat"). May contain arguments, e.g.
 *                          "bun /abs/path/packages/cli/damat/src/cli.ts".
 *   DAMAT_MODULE_VERIFY    Forwarded to the CLI: off | warn | require.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";

const SERVER_NAME = "damat-mcp";
const SERVER_VERSION = "0.0.10";
const DEFAULT_PROTOCOL = "2025-06-18";

// ---------------------------------------------------------------------------
// Registry types (mirrors @damatjs/module registry/entry.ts — kept inline so
// this server stays dependency-free and runnable without a build).
// ---------------------------------------------------------------------------

interface ModuleRef {
  namespace?: string;
  name: string;
  version?: string;
}

interface RegistryVerification {
  status: "unverified" | "pending" | "verified" | "rejected" | "revoked";
  reason?: string;
  integrity?: string;
}

interface RegistryModuleEntry {
  name?: string;
  source: string;
  description?: string;
  owner?: { namespace: string; verified?: boolean };
  verification?: RegistryVerification;
  versions?: Record<string, { source: string } | string>;
  latest?: string;
  keywords?: string[];
  license?: string;
  homepage?: string;
  repository?: string;
}

interface RegistryIndex {
  modules: Record<string, RegistryModuleEntry>;
}

const REF_PATTERN =
  /^(?:(?<namespace>[a-z][a-z0-9-]*)\/)?(?<name>[a-z][a-z0-9-]*)(?:@(?<version>[\w.^~><=-]+))?$/;

function parseModuleRef(input: string): ModuleRef | null {
  const match = REF_PATTERN.exec(input.trim());
  if (!match?.groups) return null;
  const { namespace, name, version } = match.groups;
  if (!name) return null;
  const ref: ModuleRef = { name };
  if (namespace) ref.namespace = namespace;
  if (version) ref.version = version;
  return ref;
}

function formatModuleRef(ref: ModuleRef): string {
  const ns = ref.namespace ? `${ref.namespace}/` : "";
  const v = ref.version ? `@${ref.version}` : "";
  return `${ns}${ref.name}${v}`;
}

function isUrl(s: string): boolean {
  return /^https?:\/\//.test(s);
}

function registryIndexFile(location: string): string {
  if (existsSync(location) && statSync(location).isDirectory()) {
    return join(location, "registry.json");
  }
  return location;
}

async function loadRegistryIndex(location: string): Promise<RegistryIndex> {
  let raw: unknown;
  if (isUrl(location)) {
    const res = await fetch(location);
    if (!res.ok) {
      throw new Error(`Registry fetch failed (${res.status}): ${location}`);
    }
    raw = await res.json();
  } else {
    const file = registryIndexFile(location);
    if (!existsSync(file)) throw new Error(`Registry index not found: ${file}`);
    raw = JSON.parse(readFileSync(file, "utf-8"));
  }
  if (raw === null || typeof raw !== "object" || typeof (raw as RegistryIndex).modules !== "object") {
    throw new Error('Registry index must be JSON with a "modules" object');
  }
  return raw as RegistryIndex;
}

function lookupEntry(
  index: RegistryIndex,
  ref: ModuleRef,
): { key: string; entry: RegistryModuleEntry } | null {
  const keys = [
    formatModuleRef({ ...(ref.namespace ? { namespace: ref.namespace } : {}), name: ref.name }),
    ref.name,
  ];
  for (const key of keys) {
    const entry = index.modules[key];
    if (entry) return { key, entry };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function appDir(): string {
  return process.env.DAMAT_APP_DIR || process.cwd();
}

function registryLocation(): string | undefined {
  return process.env.DAMAT_MODULE_REGISTRY;
}

function damatCli(): string[] {
  const raw = process.env.DAMAT_CLI || "damat";
  return raw.split(" ").filter(Boolean);
}

/** Run the damat CLI in the app dir and capture output. */
function runDamat(args: string[]): { ok: boolean; output: string } {
  const [cmd, ...prefix] = damatCli();
  const result = spawnSync(cmd, [...prefix, ...args], {
    cwd: appDir(),
    encoding: "utf-8",
    env: process.env,
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  if (result.error) {
    return {
      ok: false,
      output:
        `Failed to run "${[cmd, ...prefix].join(" ")}": ${result.error.message}\n` +
        `Set DAMAT_CLI if the damat binary is not on PATH ` +
        `(e.g. "bun /path/to/packages/cli/damat/src/cli.ts").`,
    };
  }
  return { ok: result.status === 0, output };
}

function summarizeEntry(key: string, entry: RegistryModuleEntry): Record<string, unknown> {
  return {
    ref: key,
    description: entry.description,
    latest: entry.latest,
    versions: entry.versions ? Object.keys(entry.versions) : undefined,
    verification: entry.verification?.status ?? "unverified",
    owner: entry.owner?.namespace,
    keywords: entry.keywords,
    license: entry.license,
    source: entry.source,
    homepage: entry.homepage,
    repository: entry.repository,
  };
}

/** Read installed modules by scanning the app's modules directory. */
function listInstalled(dir: string): Array<Record<string, unknown>> {
  const modulesDir = join(appDir(), dir);
  if (!existsSync(modulesDir)) return [];
  const out: Array<Record<string, unknown>> = [];
  for (const entry of readdirSync(modulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(modulesDir, entry.name, "module.json");
    let version: string | undefined;
    let description: string | undefined;
    if (existsSync(manifestPath)) {
      try {
        const m = JSON.parse(readFileSync(manifestPath, "utf-8"));
        version = m.version;
        description = m.description;
      } catch {
        description = "(invalid module.json)";
      }
    } else {
      description = "(no module.json)";
    }
    out.push({ id: entry.name, version, description });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tool definitions + handlers
// ---------------------------------------------------------------------------

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, any>) => Promise<{ text: string; isError?: boolean }>;
}

const NO_REGISTRY_MSG =
  "No registry configured. Set DAMAT_MODULE_REGISTRY to an index URL, a " +
  "registry.json path, or a directory containing one. You can still install " +
  "modules from a git URL or local path with add_module.";

const tools: ToolDef[] = [
  {
    name: "list_modules",
    description:
      "List all modules available in the configured Damat module registry " +
      "(DAMAT_MODULE_REGISTRY). Returns each module's ref, description, latest " +
      "version, verification status and owner.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async () => {
      const loc = registryLocation();
      if (!loc) return { text: NO_REGISTRY_MSG, isError: true };
      const index = await loadRegistryIndex(loc);
      const modules = Object.entries(index.modules).map(([key, entry]) =>
        summarizeEntry(key, entry),
      );
      return {
        text: JSON.stringify({ registry: loc, count: modules.length, modules }, null, 2),
      };
    },
  },
  {
    name: "search_modules",
    description:
      "Search the configured registry by a query string matched against module " +
      "ref, description and keywords. Use this to find a module to install.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Search text (case-insensitive)" } },
      required: ["query"],
      additionalProperties: false,
    },
    handler: async ({ query }) => {
      const loc = registryLocation();
      if (!loc) return { text: NO_REGISTRY_MSG, isError: true };
      const q = String(query).toLowerCase();
      const index = await loadRegistryIndex(loc);
      const modules = Object.entries(index.modules)
        .filter(([key, entry]) => {
          const hay = [
            key,
            entry.description ?? "",
            (entry.keywords ?? []).join(" "),
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        })
        .map(([key, entry]) => summarizeEntry(key, entry));
      return { text: JSON.stringify({ query, count: modules.length, modules }, null, 2) };
    },
  },
  {
    name: "module_info",
    description:
      "Get full registry details for one module ref (e.g. 'user', " +
      "'damatjs/user@0.2.0'): description, versions, source, owner, license, " +
      "verification status and links. Read this before installing.",
    inputSchema: {
      type: "object",
      properties: {
        ref: { type: "string", description: "Module ref: name, namespace/name, optionally @version" },
      },
      required: ["ref"],
      additionalProperties: false,
    },
    handler: async ({ ref }) => {
      const loc = registryLocation();
      if (!loc) return { text: NO_REGISTRY_MSG, isError: true };
      const parsed = parseModuleRef(String(ref));
      if (!parsed) return { text: `"${ref}" is not a valid module ref`, isError: true };
      const index = await loadRegistryIndex(loc);
      const found = lookupEntry(index, parsed);
      if (!found) {
        return { text: `Registry has no module "${formatModuleRef(parsed)}"`, isError: true };
      }
      return { text: JSON.stringify(summarizeEntry(found.key, found.entry), null, 2) };
    },
  },
  {
    name: "list_installed",
    description:
      "List Damat modules already installed in the target app by scanning its " +
      "modules directory (default src/modules) for module.json manifests.",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "Modules directory (default: src/modules)" },
      },
      additionalProperties: false,
    },
    handler: async ({ dir }) => {
      const modulesDir = (dir as string) || "src/modules";
      const installed = listInstalled(modulesDir);
      return {
        text: JSON.stringify(
          { app: appDir(), dir: modulesDir, count: installed.length, installed },
          null,
          2,
        ),
      };
    },
  },
  {
    name: "add_module",
    description:
      "Install an existing module into the target Damat app by running " +
      "`damat module add`. The source may be a registry ref ('user', " +
      "'damatjs/user@0.2.0'), a local path ('./path/to/module'), a github " +
      "shorthand ('owner/repo' or 'owner/repo/sub/dir'), or a git URL. This " +
      "copies the module into src/modules, registers it in damat.config.ts, " +
      "syncs required env vars to .env.example, and installs npm packages. " +
      "After it succeeds, run migrations (damat-orm migrate:up) and restart.",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "Registry ref, path, github shorthand, or git URL" },
        name: { type: "string", description: "Override the installed module id" },
        dir: { type: "string", description: "Target modules directory (default: src/modules)" },
        force: { type: "boolean", description: "Overwrite if the module already exists" },
      },
      required: ["source"],
      additionalProperties: false,
    },
    handler: async ({ source, name, dir, force }) => {
      if (!source || typeof source !== "string") {
        return { text: "A 'source' string is required", isError: true };
      }
      const args = ["module", "add", source];
      if (name) args.push("--name", String(name));
      if (dir) args.push("--dir", String(dir));
      if (force) args.push("--force");
      const { ok, output } = runDamat(args);
      return { text: output || (ok ? "Done." : "Install failed."), isError: !ok };
    },
  },
];

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 over stdio (MCP transport)
// ---------------------------------------------------------------------------

type JsonRpcId = string | number | null;

function send(message: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(message) + "\n");
}

function reply(id: JsonRpcId, result: unknown): void {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id: JsonRpcId, code: number, message: string): void {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleMessage(msg: any): Promise<void> {
  const { id, method, params } = msg ?? {};
  const isNotification = id === undefined;

  try {
    switch (method) {
      case "initialize": {
        const requested = params?.protocolVersion;
        reply(id, {
          protocolVersion: typeof requested === "string" ? requested : DEFAULT_PROTOCOL,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
          instructions:
            "Use list_modules/search_modules to discover modules, module_info " +
            "to inspect one, then add_module to install it into the app. " +
            "list_installed shows what is already present.",
        });
        return;
      }
      case "notifications/initialized":
      case "initialized":
        return; // notification, no response
      case "ping":
        if (!isNotification) reply(id, {});
        return;
      case "tools/list": {
        reply(id, {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        });
        return;
      }
      case "tools/call": {
        const tool = tools.find((t) => t.name === params?.name);
        if (!tool) {
          replyError(id, -32602, `Unknown tool: ${params?.name}`);
          return;
        }
        try {
          const { text, isError } = await tool.handler(params?.arguments ?? {});
          reply(id, { content: [{ type: "text", text }], isError: Boolean(isError) });
        } catch (e) {
          reply(id, {
            content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],
            isError: true,
          });
        }
        return;
      }
      default:
        if (!isNotification) replyError(id, -32601, `Method not found: ${method}`);
        return;
    }
  } catch (e) {
    if (!isNotification) {
      replyError(id, -32603, e instanceof Error ? e.message : String(e));
    }
  }
}

function main(): void {
  let buffer = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk: string) => {
    buffer += chunk;
    let newline: number;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      let msg: unknown;
      try {
        msg = JSON.parse(line);
      } catch {
        continue; // ignore malformed lines
      }
      void handleMessage(msg);
    }
  });
  process.stdin.on("end", () => process.exit(0));
}

main();
