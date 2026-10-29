import { registerTool, type ToolSafetyOptions } from "./safety.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TheHiveClient } from "../client.js";
import { formatJson } from "./output.js";
import { READ_ONLY } from "./annotations.js";

export function registerStatusTools(
  server: McpServer,
  client: TheHiveClient,
  options: ToolSafetyOptions = {},
): void {
  registerTool(server, options,
    "thehive_status",
    "Get TheHive server health status, version info, and capabilities. No authentication required.",
    {},
    READ_ONLY,
    async () => {
      try {
        const status = await client.getStatus();
        return {
          content: [
            {
              type: "text" as const,
              text: formatJson(status),
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
