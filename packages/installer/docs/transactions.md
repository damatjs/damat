# Transactions

Plans are serializable and do not mutate the project. Execution creates one
exclusive active marker and a per-transaction JSON-lines inverse journal.

Before each managed mutation, the journal records either the prior bytes of the
touched file or an instruction to delete a newly created file. Package
operations journal `package.json` and the selected manager's lockfile before
invoking a structured command. `damat.lock.json` is written last.

Ordinary failures replay inverses in reverse and remove the journal. A process
crash leaves the marker and journal for explicit `recoverTransaction` on the
next invocation. Project files, package manifests, manager lockfiles, and the
installer lock are restored exactly; `node_modules` reconciliation is reported
as best-effort.
