import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const dockerfile = read("backend/default/Dockerfile");
const compose = read("backend/default/docker-compose.yml");
const postgres = read("backend/default/postgres/init-roles.sh");
const redis = read("backend/default/redis/entrypoint.sh");
const config = read("backend/default/damat.config.ts");
const requirements: Array<[string, string, string]> = [
  ["Docker runtime user", dockerfile, "USER bun"],
  ["Frozen dependency install", dockerfile, "bun install --frozen-lockfile"],
  ["Production dependencies", dockerfile, "bun install --production"],
  ["Read-only app filesystem", compose, "read_only: true"],
  ["Dropped capabilities", compose, 'cap_drop: ["ALL"]'],
  [
    "No privilege escalation",
    compose,
    'security_opt: ["no-new-privileges:true"]',
  ],
  ["Local-only default bind", compose, "127.0.0.1}:9000:9000"],
  ["Required metrics secret", compose, "METRICS_TOKEN:?set METRICS_TOKEN"],
  ["Restricted runtime DB role", postgres, "CREATE ROLE damat_runtime"],
  ["Restricted backup DB role", postgres, "CREATE ROLE damat_backup"],
  ["No schema creation by public", postgres, "REVOKE CREATE ON SCHEMA public"],
  ["Redis default account disabled", redis, "user default off"],
  ["Redis admin commands denied", redis, "-@admin -@dangerous"],
  ["Redis durable channels", redis, "&damat:* &damat-events"],
  ["Production JSON logs", config, 'format: production ? "json"'],
  ["Protected metrics route", config, "installMetricsRoute"],
];
const errors = requirements
  .filter(([, contents, expected]) => !contents.includes(expected))
  .map(([name]) => name);
if (/nopass|postgresql:\/\/postgres:/.test(`${compose}\n${redis}`))
  errors.push("Default or administrative credentials are enabled");
if (/FROM\s+\S+:latest/i.test(dockerfile))
  errors.push("Docker image uses latest tag");
if (errors.length) {
  console.error(`Deployment security scan failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Deployment security controls passed.");
