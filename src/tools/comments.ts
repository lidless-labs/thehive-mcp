import { registerTool, type ToolSafetyOptions } from "./safety.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";
import { formatJson } from "./output.js";
import { CREATE, READ_ONLY } from "./annotations.js";

export function registerCommentTools(
  server: McpServer,
  client: TheHiveClient,
  options: ToolSafetyOptions = {},
): void {
  registerTool(server, options,
    "thehive_list_comments",
    "List comments on a specific case",
    {
      caseId: z.string().describe("The case ID to list comments for"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe("Maximum number of results (default: 50)"),
    },
    READ_ONLY,
    async ({ caseId, limit }) => {
      try {
        const comments = await client.listComments(caseId, limit);
        return {
          content: [
            {
              type: "text" as const,
              text: formatJson(comments),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing comments: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_create_comment",
    "Add a comment to a case",
    {
      caseId: z.string().describe("The case ID to add the comment to"),
      message: z
        .string()
        .describe("Comment message (supports markdown)"),
    },
    CREATE,
    async ({ caseId, message }) => {
      try {
        const created = await client.createComment(caseId, message);
        return {
          content: [
            {
              type: "text" as const,
              text: formatJson(created),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating comment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
