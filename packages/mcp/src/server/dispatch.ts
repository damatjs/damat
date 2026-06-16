import {
  DEFAULT_PROTOCOL,
  SERVER_INSTRUCTIONS,
  SERVER_NAME,
  SERVER_VERSION,
} from "../constants";
import { tools } from "../tools";
import { reply, replyError } from "./rpc";

/**
 * Route one parsed JSON-RPC message to its MCP method handler. Handler errors
 * are returned as `isError: true` tool results (not JSON-RPC errors) so the
 * assistant sees the message and can recover. Notifications (no `id`) never get
 * a response.
 */
export async function handleMessage(msg: any): Promise<void> {
  const { id, method, params } = msg ?? {};
  const isNotification = id === undefined;

  try {
    switch (method) {
      case "initialize": {
        const requested = params?.protocolVersion;
        reply(id, {
          protocolVersion: typeof requested === "string" ? requested : DEFAULT_PROTOCOL,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
          instructions: SERVER_INSTRUCTIONS,
        });
        return;
      }
      case "notifications/initialized":
      case "initialized":
        return; // notification, no response
      case "ping":
        if (!isNotification) reply(id, {});
        return;
      case "tools/list": {
        reply(id, {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        });
        return;
      }
      case "tools/call": {
        const tool = tools.find((t) => t.name === params?.name);
        if (!tool) {
          replyError(id, -32602, `Unknown tool: ${params?.name}`);
          return;
        }
        try {
          const { text, isError } = await tool.handler(params?.arguments ?? {});
          reply(id, { content: [{ type: "text", text }], isError: Boolean(isError) });
        } catch (e) {
          reply(id, {
            content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],
            isError: true,
          });
        }
        return;
      }
      default:
        if (!isNotification) replyError(id, -32601, `Method not found: ${method}`);
        return;
    }
  } catch (e) {
    if (!isNotification) {
      replyError(id, -32603, e instanceof Error ? e.message : String(e));
    }
  }
}
