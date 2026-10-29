import { registerTool, type ToolSafetyOptions } from "./safety.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";
import { formatJson } from "./output.js";
import { CREATE, READ_ONLY } from "./annotations.js";

export function registerTaskLogTools(
  server: McpServer,
  client: TheHiveClient,
  options: ToolSafetyOptions = {},
): void {
  registerTool(server, options,
    "thehive_list_task_logs",
    "List log entries for a specific task",
    {
      taskId: z.string().describe("The task ID to list logs for"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe("Maximum number of results (default: 50)"),
    },
    READ_ONLY,
    async ({ taskId, limit }) => {
      try {
        const logs = await client.listTaskLogs(taskId, limit);
        return {
          content: [
            {
              type: "text" as const,
              text: formatJson(logs),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing task logs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_create_task_log",
    "Add a log entry to a task",
    {
      taskId: z.string().describe("The task ID to add the log to"),
      message: z
        .string()
        .describe("Log message content (supports markdown)"),
      includeInTimeline: z
        .number()
        .int()
        .optional()
        .describe("Timeline inclusion flag (0=excluded, 1=included)"),
    },
    CREATE,
    async ({ taskId, message, includeInTimeline }) => {
      try {
        const created = await client.createTaskLog(taskId, {
          message,
          includeInTimeline,
        });
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
              text: `Error creating task log: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
