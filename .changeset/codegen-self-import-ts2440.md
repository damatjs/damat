---
"@damatjs/codegen": patch
---

Fix invalid self-import (TS2440) for self-referential tables. When a table has
a relation back to itself (e.g. a category tree with `parent`/`children`),
file-per-table codegen emitted `import type { Category } from "./category";`
into `category.ts` — a self-import that conflicts with the locally declared
`export interface Category`. `getRelationImports` now skips relations whose
target is the source table; the relation fields still reference the locally
declared type.
