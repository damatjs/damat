import type { OriginRequest } from "../types/origin";
import {
  assertRecord,
  optionalString,
  rejectUnknownKeys,
  requiredString,
} from "./assert";

function safeSubdir(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const segments = value.split("/");
  const unsafe =
    value.includes("\\") ||
    value.startsWith("/") ||
    /^[A-Za-z]:/.test(value) ||
    segments.includes("..");
  if (unsafe) throw new TypeError("subdir must stay inside the artifact");
  return value;
}

function parseLocal(record: Record<string, unknown>): OriginRequest {
  rejectUnknownKeys(record, ["type", "path"]);
  return { type: "local", path: requiredString(record, "path") };
}

function parseGit(record: Record<string, unknown>): OriginRequest {
  rejectUnknownKeys(record, ["type", "url", "ref", "subdir"]);
  const ref = optionalString(record, "ref");
  const subdir = safeSubdir(optionalString(record, "subdir"));
  return {
    type: "git",
    url: requiredString(record, "url"),
    ...(ref && { ref }),
    ...(subdir && { subdir }),
  };
}

function parseRegistry(record: Record<string, unknown>): OriginRequest {
  rejectUnknownKeys(record, ["type", "ref"]);
  return { type: "registry", ref: requiredString(record, "ref") };
}

function parseNpm(record: Record<string, unknown>): OriginRequest {
  rejectUnknownKeys(record, ["type", "name", "version", "registryUrl"]);
  const version = optionalString(record, "version");
  const registryUrl = optionalString(record, "registryUrl");
  return {
    type: "npm",
    name: requiredString(record, "name"),
    ...(version && { version }),
    ...(registryUrl && { registryUrl }),
  };
}

function parseTarball(record: Record<string, unknown>): OriginRequest {
  rejectUnknownKeys(record, ["type", "url", "integrity"]);
  const integrity = optionalString(record, "integrity");
  return {
    type: "tarball",
    url: requiredString(record, "url"),
    ...(integrity && { integrity }),
  };
}

export function parseOriginRequest(input: unknown): OriginRequest {
  const record = assertRecord(input, "origin");
  const type = requiredString(record, "type");
  if (type === "local") return parseLocal(record);
  if (type === "git") return parseGit(record);
  if (type === "registry") return parseRegistry(record);
  if (type === "npm") return parseNpm(record);
  if (type === "tarball") return parseTarball(record);
  throw new TypeError(`unknown origin type: ${type}`);
}
