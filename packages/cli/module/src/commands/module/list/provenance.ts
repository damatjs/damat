export interface ModuleProvenance {
  type?: string;
  owner?: string;
  verification?: string;
}

export function readProvenance(config: string, name: string): ModuleProvenance {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(
    `(?:^|[\\s{,])["']?${escaped}["']?\\s*:\\s*\\{`,
  ).exec(config);
  if (!match) return {};
  const rest = config.slice(match.index + match[0].length);
  const end = rest.indexOf("\n    },");
  const entry = end === -1 ? rest : rest.slice(0, end);
  const source = /source\s*:\s*\{([\s\S]*?)\}/.exec(entry)?.[1];
  if (!source) return {};
  const field = (key: string) =>
    new RegExp(`${key}\\s*:\\s*["']([^"']*)["']`).exec(source)?.[1];
  const result: ModuleProvenance = {};
  const type = field("type");
  const owner = field("owner");
  const verification = field("verification");
  if (type) result.type = type;
  if (owner) result.owner = owner;
  if (verification) result.verification = verification;
  return result;
}
