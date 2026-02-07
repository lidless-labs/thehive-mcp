import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";

export function registerTaskLogTools(
  server: McpServer,
  client: TheHiveClient,
): void {
  server.tool(
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
    async ({ taskId, limit }) => {
      try {
        const logs = await client.listTaskLogs(taskId, limit);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(logs, null, 2),
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

  server.tool(
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
              text: JSON.stringify(created, null, 2),
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
