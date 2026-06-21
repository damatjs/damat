export function configSchemaTemplate(): string {
  return `import { z } from "@damatjs/deps/zod";

export const schema = z.object({});

export type schemaType = z.infer<typeof schema>;
`;
}
