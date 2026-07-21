# App capability internals

| Area                | Responsibility                                     |
| ------------------- | -------------------------------------------------- |
| `capability.ts`     | Stable lifecycle command ordering and metadata.    |
| `commands/create/`  | Scaffold, install, create PostgreSQL, and migrate. |
| `commands/clone/`   | Resolve Git sources and apply clone options.       |
| `commands/dev.ts`   | Run a watched development entry.                   |
| `commands/start.ts` | Run a previously built production entry.           |
| `commands/build/`   | Type-check and bundle application/config files.    |

The package depends on CLI contracts and explicit support helpers. It does not
import the Damat executable composer, module, kit, or codegen capabilities.

The create scaffold writes an optional receiver `damat.json` whose accepts map
defines the backend's module, route, workflow, job, event, pipeline, link,
test, migration, model, and generated-type locations.

`create` shares database option/prompt handling with module init. The generated
app enables the jobs, durable events, and pipelines workers in all mode, so
`damat-orm database:setup` selects every required system migration. Setup may be
deferred with `--no-database-setup`; the generated dev script remains a safe
idempotent preflight.
