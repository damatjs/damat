# @damatjs/orm-cli Unreleased

## Changed

Module loading resolves source, Node package, and Damat package locations into
explicit entry, model, and migration paths. `migrate:list` preserves resolved
package migration directories.

`migrate:up` selects the shared durability catalog when jobs or durable events
are enabled. Jobs then selects its own catalog in stable order after shared
durability. All-status output includes system migration owners, including in
applications that do not declare feature modules.

## Action required

Run `bun run db:migrate` after enabling durable jobs or events. Package mode
remains early alpha.
