---
"@damatjs/module": minor
---

Expose the cross-module link authoring surface from `@damatjs/module`. Module
code can now `import { defineLink, collectLinkModels, defineLinkModule }` (and the
`LinkService` / `LinkDefinition` / `LinkEndpoint` / `LinkOptions` / `LinkRowRef` /
`LinkModelRef` types) from the same single authoring import, matching the
`@damatjs/framework` surface used by app code. Links still live in the app's
`src/links/`; the runtime service remains `getModule("link")`.
