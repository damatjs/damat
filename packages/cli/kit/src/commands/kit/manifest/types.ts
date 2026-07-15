export const KIT_MANIFEST_FILENAME = "damat-kit.json";

export interface KitMapping {
  from: string;
  to: string;
}

export interface KitManifest {
  name: string;
  description?: string;
  version?: string;
  mappings: KitMapping[];
  fallback?: string;
  ignore?: string[];
  packages?: Record<string, string>;
  notes?: string;
}
