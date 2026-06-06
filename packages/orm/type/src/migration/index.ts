export interface OrmModule {
  id: string;
  name: string;
  path: string;
  resolve: string;
}

export interface OrmModuleContainer {
  [x: string]: OrmModule;
}
