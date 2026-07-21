export interface ModuleAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface ModuleRegistryMeta {
  namespace?: string;
  keywords?: string[];
  license?: string;
  repository?: string;
  homepage?: string;
}
