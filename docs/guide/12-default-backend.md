[Damat Guide](../GUIDE.md) › The default backend

# 12. The default backend, end to end

[`@damatjs/default`](../../backend/default/README.md) is a complete reference app
demonstrating the whole framework: a `user` module (Better Auth models),
file-based routes (`/health`, `/posts`, `/users/:userId`, `/workflows`),
cross-module `links/`, a `user-onboarding` saga workflow, Redis usage, and a
Docker setup. Read it alongside this guide as a worked example — most patterns
here are taken directly from it. Its README has the full route and feature list.

A good way to learn Damat: open `backend/default/src/` next to these chapters and
trace one feature end to end — its [model](./05-models.md), its
[service](./07-modules-and-services.md), its [route](./08-http-apis.md), and (for
onboarding) its [workflow](./09-workflows.md).

---

Prev: [← Logging](./11-logging.md) · [Guide home](../GUIDE.md) · Next: [Authoring a module →](./13-authoring-modules.md)
