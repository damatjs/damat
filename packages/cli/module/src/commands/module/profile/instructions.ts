export function moduleInstructions(name: string) {
  return {
    add: [
      `Add ${name} to damat.config.ts modules using its installed entry.`,
      `Add any ${name} TypeScript aliases your application imports.`,
      `Review ${name} environment declarations and update .env files yourself.`,
      `Export and call ${name} routes, workflows, jobs, events, pipelines, or links where needed.`,
    ],
    remove: [
      `Remove ${name} from damat.config.ts and any TypeScript aliases.`,
      `Remove ${name} environment values and integration call sites after reviewing usage warnings.`,
    ],
  };
}
