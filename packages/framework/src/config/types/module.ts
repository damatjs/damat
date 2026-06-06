export interface ModuleConfigObject {
  [x: string]: ModuleConfig;
}


export interface ModuleConfig {
  id?: string;
  resolve: string;
  options?: Record<string, unknown>;
}
