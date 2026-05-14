export type { LogLevel, LogFormat, LogContext, LoggerConfig, LogEntry, ILogger, FileTransportConfig } from "./types";
export { Logger } from "./logger";
export { FileTransport } from "./file-transport";
export { createLogger, setGlobalLogger, getLogger, closeLogger, debug, info, warn, error, fatal } from "./global";
