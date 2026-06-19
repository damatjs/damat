---
"@damatjs/module": patch
---

Force lingering connections shut on harness teardown so `startModuleApp().stop()`
can't hang. A graceful `server.close()` resolves only once every connection
ends; under Node a keep-alive or still-active socket — e.g. a POST whose request
body the route never read — never closes on its own, so teardown hangs forever.
`stop()` now closes idle + all connections (via a new exported `closeServer`
helper), `?.`-guarded so it's a harmless no-op on runtimes that lack them (Bun,
where `close()` already resolves promptly). This lets apps drop per-route
body-drain workarounds (`await c.req.text()`) added to avoid the hang.

Note: a global request-body-drain middleware was considered and rejected — it
would fully read every otherwise-ignored body (e.g. a large upload a route
rejects early) on the hot path. Force-closing connections fixes the hang for
every route shape with no per-request cost.
