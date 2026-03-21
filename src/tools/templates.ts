import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";

export function registerTemplateTools(
  server: McpServer,
  client: TheHiveClient,
): void {
  server.tool(
    "thehive_list_case_templates",
    "List available case templates. Use these when creating cases to auto-populate fields and tasks.",
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
        const templates = await client.listCaseTemplates(limit);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(templates, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing case templates: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
