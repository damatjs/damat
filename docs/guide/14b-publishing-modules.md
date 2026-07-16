[Damat Guide](../GUIDE.md) › Publishing modules

# 14b. Git-driven registry releases

The CLI does not publish modules. Damat distribution is designed around Git
sources and immutable tags: validate and build a module, push a tag, then let
registry automation create or update the hosted package record.

```bash
damat module validate
damat module build
git tag user-v1.0.0
git push origin user-v1.0.0
```

The current registry index maps `namespace/name@version` to an immutable
origin. `DAMAT_REGISTRY` and `DAMAT_MODULE_REGISTRY` accept an index URL, a
`registry.json` path, or a directory containing that file.

```json
{
  "modules": {
    "damatjs/user": {
      "source": "github:damatjs/user",
      "versions": {
        "1.0.0": { "source": "github:damatjs/user#user-v1.0.0" }
      },
      "owner": { "namespace": "damatjs" },
      "verification": {
        "status": "verified",
        "integrity": "sha256:..."
      }
    }
  }
}
```

Git tags are the stable release boundary. Branch-driven preview automation and
fully automatic registry creation are later registry work. There is no npm-like
`damat module publish` gateway flow to maintain in a module package.

Prev: [← Installing existing modules](./14-installing-modules.md) · [Guide home](../GUIDE.md) · Next: [Installing modules with AI →](./15-installing-modules-with-ai.md)
