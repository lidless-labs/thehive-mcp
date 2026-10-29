import { registerTool, type ToolSafetyOptions } from "./safety.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";
import { formatJson } from "./output.js";
import { READ_ONLY } from "./annotations.js";

export function registerUserTools(
  server: McpServer,
  client: TheHiveClient,
  options: ToolSafetyOptions = {},
): void {
  registerTool(server, options,
    "thehive_list_users",
    "List users in the TheHive organization",
    {
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe("Maximum number of results (default: 100)"),
    },
    READ_ONLY,
    async ({ limit }) => {
      try {
        const users = await client.listUsers(limit);
        return {
          content: [
            {
              type: "text" as const,
              text: formatJson(users),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing users: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_get_current_user",
    "Get the currently authenticated user's profile",
    {},
    READ_ONLY,
    async () => {
      try {
        const user = await client.getCurrentUser();
        return {
          content: [
            {
              type: "text" as const,
              text: formatJson(user),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting current user: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
