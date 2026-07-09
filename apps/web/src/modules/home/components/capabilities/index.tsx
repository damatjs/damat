import { docsUrl } from "@/lib/constants";
import { Cell } from "@/modules/home/components/capabilities/cell";
import {
  CliVisual,
  HttpVisual,
  ModuleTreeVisual,
  OrmVisual,
  RedisVisual,
  WorkflowVisual,
} from "@/modules/home/components/capabilities/visuals";
import { SectionHeader } from "@/modules/layout/components/sectionHeader";

export function Capabilities() {
  return (
    <section className="border-t border-line px-6 py-20 lg:px-10">
      <SectionHeader
        eyebrow="Framework"
        title="Everything a backend needs, nothing bolted on."
      >
        Each capability is a first-class part of the framework — built to
        compose with the others, documented end to end, and replaceable module
        by module.
      </SectionHeader>

      <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        <Cell
          href={docsUrl("concepts")}
          title="Composable modules"
          body="Every concern — users, billing, teams — is a module with its own models, migrations, service, config, and workflows."
          visual={<ModuleTreeVisual />}
        />
        <Cell
          href={docsUrl("models")}
          title="Fluent ORM"
          body="A type-safe model DSL over PostgreSQL with real migrations, generated CRUD, transactions, and pooling."
          visual={<OrmVisual />}
        />
        <Cell
          href={docsUrl("workflows")}
          title="Saga workflows"
          body="Multi-step operations on Effect-TS with per-step compensation, retries, timeouts, and distributed locks."
          visual={<WorkflowVisual />}
        />
        <Cell
          href={docsUrl("http-apis")}
          title="File-based HTTP"
          body="Routes map from files on top of Hono. Handlers, middleware, and zod validation compose cleanly per module."
          visual={<HttpVisual />}
        />
        <Cell
          href={docsUrl("redis")}
          title="Redis, wired"
          body="Cache, queues, locks, sessions, and rate limiting — available the moment you set a REDIS_URL."
          visual={<RedisVisual />}
        />
        <Cell
          href={docsUrl("cli-reference")}
          title="One CLI — and an MCP server"
          body="A single damat command for dev, build, migrations, codegen, and module management — exposed to agents over MCP."
          visual={<CliVisual />}
        />
      </div>
    </section>
  );
}
