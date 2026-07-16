import type { PgEntityManager } from "@damatjs/orm-pg";
import {
  createModelMethods,
  createStableModelAccessors,
  type ModelAccessorOptions,
  registerModels,
} from "./modelAccessors";
import type { ModelMethods } from "./methods";
import { ServiceTransactions } from "./transaction";
import type { ModelsMap } from "./type";

export function createModuleState(
  models: ModelsMap,
  config: ModelAccessorOptions,
) {
  const methods = new WeakMap<object, Map<string, ModelMethods>>();
  const accessors = new WeakMap<object, Map<string, ModelMethods>>();
  const transactions = new WeakMap<object, ServiceTransactions>();

  const getTransactions = (service: object) =>
    requireState(transactions, service, "transaction");
  const getMethods = (service: object) =>
    requireState(methods, service, "model methods");

  return {
    initialize(service: object, em: PgEntityManager) {
      registerModels(models, em);
      methods.set(service, createModelMethods(models, em, config));
      transactions.set(service, new ServiceTransactions());
      accessors.set(
        service,
        createStableModelAccessors(models, (name) =>
          getTransactions(service).resolve(name, getMethods(service)),
        ),
      );
    },
    transactions: getTransactions,
    accessor(service: object, name: string): ModelMethods {
      const found = requireState(accessors, service, "model accessors").get(
        name,
      );
      if (!found) throw new Error(`Model accessor is unavailable: ${name}`);
      return found;
    },
  };
}

function requireState<T>(
  storage: WeakMap<object, T>,
  service: object,
  name: string,
): T {
  const found = storage.get(service);
  if (!found) throw new Error(`Service ${name} state is unavailable`);
  return found;
}
