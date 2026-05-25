import { z } from "@damatjs/deps/zod";
import { ModuleDefinition, ModuleInstance } from "./type";


export function defineModule<
  TService extends object,
  TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>
>(
  name: string,
  definition: ModuleDefinition<TService, TSchema>
): ModuleInstance<TService, TSchema> {
  let instance: TService | null = null;

  const parseCredentials = (): z.infer<TSchema> => {
    const raw = definition.credentials.load(process.env);
    const result = definition.credentials.schema.safeParse(raw);
    if (!result.success) {
      const errors = result.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
      throw new Error(`Module "${name}" credentials validation failed:\n${errors}`);
    }
    return result.data;
  };

  let parsedCreds: z.infer<TSchema> = parseCredentials();

  const init = () => {
    parsedCreds = parseCredentials();
    instance = new definition.service(parsedCreds);
  };

  const getService = (): TService => {
    if (!instance) {
      init();
    }
    return instance!;
  };

  const proxy = new Proxy({} as TService, {
    get(_, prop) {
      const svc = getService();
      const val = (svc as any)[prop];
      return typeof val === "function" ? val.bind(svc) : val;
    },
    set(_, prop, val) {
      (getService() as any)[prop] = val;
      return true;
    },
  });

  return {
    name,
    service: proxy,
    credentials: parsedCreds,
    init,
  };
}
