import { ModuleDefinition, ModuleInstance } from "./type";

export function defineModule<TService extends object>(
  name: string,
  definition: ModuleDefinition<TService>
): ModuleInstance<TService> {

  let instance: TService | null = null;

  const parseCredentials = definition.credentials(process.env);

  const init = () => {
    instance = new definition.service(parseCredentials);
    console.log("instance setup", name)

    return instance;
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
    credentials: parseCredentials,
    init,
  };
}
