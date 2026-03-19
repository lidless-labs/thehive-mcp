import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TheHiveClient } from "../client.js";

export function registerStatusTools(
  server: McpServer,
  client: TheHiveClient,
): void {
  server.tool(
    "thehive_status",
    "Get TheHive server health status, version info, and capabilities. No authentication required.",
    {},
    async () => {
      try {
        const status = await client.getStatus();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting status: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
