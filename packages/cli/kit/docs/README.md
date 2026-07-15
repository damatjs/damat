# Kit capability internals

| Area        | Responsibility                                      |
| ----------- | --------------------------------------------------- |
| `manifest/` | Types, path safety, validation, and JSON reading.   |
| `plan/`     | Glob matching, safe file discovery, and placement.  |
| `source.ts` | Local and Git source resolution with cleanup.       |
| `add/`      | Preview, copy, install record, and package handling. |

The package depends only on CLI contracts and CLI support. It has no Damat
application, module, codegen, or executable-composer dependency.
