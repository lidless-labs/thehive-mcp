import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";

export function registerUserTools(
  server: McpServer,
  client: TheHiveClient,
): void {
  server.tool(
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
    async ({ limit }) => {
      try {
        const users = await client.listUsers(limit);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(users, null, 2),
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

  server.tool(
    "thehive_get_current_user",
    "Get the currently authenticated user's profile",
    {},
    async () => {
      try {
        const user = await client.getCurrentUser();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(user, null, 2),
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
