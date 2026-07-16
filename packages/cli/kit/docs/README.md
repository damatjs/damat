# Kit capability internals

| Area       | Responsibility |
| ---------- | -------------- |
| `profile/` | Load strict `damat.json` or normalize legacy `damat-kit.json`. |
| `shared/`  | Resolve origins, match receiver profiles, create plans, execute, and report. |
| `add/`     | Stable source and explicit alpha package installation entry. |
| `plan/`    | Non-mutating installation preview. |
| `list/`    | Read Kit records from `damat.lock.json`. |
| `update/`  | Re-resolve recorded provenance and update owned resources. |
| `remove/`  | Remove owned resources with modification and usage protection. |

All origins and mutations are delegated to `@damatjs/installer`. No Kit path
maintains a separate copy algorithm or install record.
