# @damatjs/codegen internals

`@damatjs/codegen` is a compatibility boundary with no implementation of its
own.

## Source map

| Path                              | Responsibility                                  |
| --------------------------------- | ----------------------------------------------- |
| `src/index.ts`                    | Re-export both owner-package runtime APIs.      |
| `src/types/index.ts`              | Re-export both owner-package type APIs.         |
| `src/tests/compatibility.test.ts` | Prove facade exports are owner export identity. |

## Ownership

- Pure schema rendering belongs to
  [`@damatjs/schema-codegen`](../../schema-codegen/docs/README.md).
- Damat discovery and filesystem generation belong to
  [`@damatjs/module-generator`](../../../module-generator/docs/README.md).

The facade must stay silent, contain no generation logic, and remain unused by
other packages in this repository.
