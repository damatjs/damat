# @damatjs/module — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/module/README.md) and its
[docs](../../packages/module/docs/).

| Version | Summary | Upgrade notes |
|---------|---------|---------------|
| 0.2.0 | Link helpers removed from the authoring surface; new non-binding `pairsWith` manifest hint; codegen-first scaffold conventions. | [0.2.0 →](./0.2.0.md) |
| 0.1.3 | Re-exports the `@damatjs/link` cross-module authoring surface (`defineLink` / `collectLinkModels` / `defineLinkModule` + `Link*` types) from the single `@damatjs/module` import, and force-closes lingering connections so `startModuleApp().stop()` can't hang in dev/test teardown. | [0.1.3 →](./0.1.3.md) |
| 0.1.2 | Maintenance / dependency bumps (relation-by-table-name lands in the ORM packages; no `@damatjs/module` API change). | — |
| 0.1.1 | Maintenance / dependency bumps (CI + test cleanup). | — |
| 0.1.0 | First minor release: the module system in one package — authoring surface, the `module.json` manifest contract, standalone dev/test harness, module-as-app runtime, migration/codegen tooling, and registry refs/readiness/verification. | [0.1.0 →](./0.1.0.md) |
