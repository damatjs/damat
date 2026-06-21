
export function routeIdRoute(): string {
  return `// Route assembler — the framework mounts the file named \`route.ts\`.
export { GET, PATCH, DELETE } from "./api";
export { validators } from "./validator";
export { middleware } from "./middleware";
`;
}
