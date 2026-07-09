# @damatjs/link — release notes

Change history for this package. For how it works **now**, read the
[package README](../../packages/link/README.md) and its
[docs](../../packages/link/docs/).

| Version | Summary | Upgrade notes |
|---------|---------|---------------|
| 0.6.0 | Junctions resolve real tables + real PKs (registry-aware `table`/`primaryKey`), explicit `pivotColumns`, conservative singularization, upsert-based `create`, graph root-entity guard | [0.6.0 →](./0.6.0.md) |
| 0.2.0 – 0.5.0 | Lockstep bumps — no change to this package's own behavior | — |
| 0.1.4 | Docs: links are app-only; `defineLink` docstring path fixed (no behavior change). | [0.1.4 →](./0.1.4.md) |
| 0.1.3 | First release: cross-module links — `defineLink`, auto-generated junction tables, `links` config field, per-owner `link:<owner>` migrations, `<table>.links.ts` type augmentations, and a runtime `getModule("link")` service (`create`/`dismiss`/`list`/`listLinkedIds`/`fetch`/`graph`). | [0.1.3 →](./0.1.3.md) |
