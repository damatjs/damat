[Damat Guide](../GUIDE.md) › The default backend

# 12. The default backend, end to end

> **Heads-up:** this chapter is a guided tour of the framework's reference app,
> which lives in the [`damatjs/damat`](https://github.com/damatjs/damat)
> monorepo. You don't need it to build your own app — but reading it is the
> fastest way to see every pattern in this guide working together in one place.

[`@damatjs/default`](../../backend/default/README.md) is a complete reference app
demonstrating the whole framework: `user` and `organization` modules,
file-based routes under `/api` (`/api/posts`, `/api/users/:userId`, `/api/workflows`) plus a top-level `/health`,
cross-module `links/`, a `user-onboarding` saga workflow, Redis usage, and a
durable jobs and events, headless inspection, process roles, and a same-image
Docker setup. Most patterns in this guide are taken directly from it. Its
README has the full route and feature list.

To explore it, clone the repo (see
[Getting started → Option B](./03-getting-started.md)) and open
`backend/default/src/`. Then trace **one feature end to end** across the code
and the matching chapter:

| What to trace                     | Where it lives                      | Chapter                                                      |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| The `users` table definition      | `src/modules/user/models/`          | [Defining models](./05-models.md)                            |
| The user service & generated CRUD | `src/modules/user/service.ts`       | [Modules & services](./07-modules-and-services.md)           |
| `GET /api/users/:userId`          | `src/api/routes/users/[userId]/`    | [Building HTTP APIs](./08-http-apis.md)                      |
| The `user-onboarding` saga        | `src/workflows/`                    | [Workflows](./09-workflows.md)                               |
| The cross-module link             | `src/links/`                        | [Composing & linking](./17-composing-and-linking-modules.md) |
| `reports.generate`                | `src/jobs/`                         | [Events & jobs](./10b-events-and-jobs.md)                    |
| `user.created` + two consumers    | `src/events/`                       | [Events & jobs](./10b-events-and-jobs.md)                    |
| Atomic enqueue and publish        | `src/examples/transactionalWork.ts` | [Events & jobs](./10b-events-and-jobs.md)                    |
| Headless operational inspection   | `src/examples/inspectWork.ts`       | [Events & jobs](./10b-events-and-jobs.md)                    |
| Migration/API/jobs/events roles   | `docker-compose.yml`                | [Deployment](./19-deployment.md)                             |

If you can follow one row of that table through the code, you understand the
framework — everything else is more of the same.

The four Compose roles use the same built image. The one-shot migration role
finishes first; API runs HTTP only, while jobs and events run as headless
workers selected by environment variables.

---

Prev: [← Logging](./11-logging.md) · [Guide home](../GUIDE.md) · Next: [Authoring a module →](./13-authoring-modules.md)
