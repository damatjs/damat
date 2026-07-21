export interface ServerHandle {
  close(): Promise<void>;
}
