/**
 * Dependency inversion for cross-module hydration.
 *
 * The link service must call *other* modules' services to load linked rows, but
 * the module registry / `getModule` lives in `@damatjs/framework`, which depends
 * on this package. To keep the dependency one-way (framework -> link, never the
 * reverse), the framework injects its resolver here at boot and the link service
 * reads it lazily at call time.
 */
type ModuleResolver = (id: string) => unknown;

let _resolver: ModuleResolver | null = null;

/** Called once by the framework during boot: `setLinkModuleResolver(getModule)`. */
export function setLinkModuleResolver(fn: ModuleResolver | null | undefined): void {
  _resolver = fn ?? null;
}

export function hasLinkModuleResolver(): boolean {
  return _resolver != null;
}

/** Resolve another module's service instance, throwing a clear error if unwired. */
export function resolveLinkedModule(id: string): any {
  if (!_resolver) {
    throw new Error(
      "Link module resolver not set. The framework must call " +
        "setLinkModuleResolver(getModule) during boot before links are queried.",
    );
  }
  const svc = _resolver(id);
  if (!svc) {
    throw new Error(`Module "${id}" is not registered; cannot load linked records.`);
  }
  return svc;
}
