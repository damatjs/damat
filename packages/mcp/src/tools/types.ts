/** A single MCP tool: catalog metadata plus an async handler. */
export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (
    args: Record<string, any>,
  ) => Promise<{ text: string; isError?: boolean }>;
}
