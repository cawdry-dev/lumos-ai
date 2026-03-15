import { createMCPClient } from "@ai-sdk/mcp";
import type { McpServerConfig } from "@/lib/db/schema";

export type MCPClientHandle = Awaited<ReturnType<typeof createMCPClient>>;

export interface McpToolsResult {
  /** Merged tool map from all reachable MCP servers. */
  tools: Record<string, unknown>;
  /** Extra instructions gathered from server configs. */
  instructions: string[];
  /** Open clients that must be closed when the request finishes. */
  clients: MCPClientHandle[];
}

/**
 * Connects to every configured MCP server, gathers their tools, and returns
 * a merged tool map plus any extra instructions.
 *
 * Unreachable servers are logged and skipped — they never fail the request.
 */
export async function getMcpTools(
  servers: McpServerConfig[],
): Promise<McpToolsResult> {
  const tools: Record<string, unknown> = {};
  const instructions: string[] = [];
  const clients: MCPClientHandle[] = [];

  await Promise.all(
    servers.map(async (server) => {
      try {
        const client = await createMCPClient({
          transport: {
            type: "http",
            url: server.url,
            headers: {
              ...(server.apiKey
                ? { Authorization: `Bearer ${server.apiKey}` }
                : {}),
              ...server.headers,
            },
          },
        });

        clients.push(client);

        const serverTools = await client.tools();
        // Prefix tool names with the server name to avoid collisions
        for (const [name, tool] of Object.entries(serverTools)) {
          const prefixedName = `${server.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${name}`;
          tools[prefixedName] = tool;
        }

        if (server.instructions) {
          instructions.push(server.instructions);
        }
      } catch (error) {
        console.error(
          `[mcp] Failed to connect to MCP server "${server.name}" at ${server.url}:`,
          error,
        );
        // Continue without this server's tools
      }
    }),
  );

  return { tools, instructions, clients };
}

/**
 * Closes all open MCP clients. Safe to call even if some clients error.
 */
export async function closeMcpClients(clients: MCPClientHandle[]): Promise<void> {
  await Promise.allSettled(clients.map((c) => c.close()));
}

