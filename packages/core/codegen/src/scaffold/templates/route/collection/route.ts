
export function routeCollectionRoute(): string {
  return `// Route assembler — the framework mounts the file named \`route.ts\`.
export { GET, POST } from "./api";
export { validators } from "./validator";
export { middleware } from "./middleware";
`;
}
