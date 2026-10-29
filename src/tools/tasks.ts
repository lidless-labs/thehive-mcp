import { registerTool, type ToolSafetyOptions } from "./safety.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";
import { formatJson } from "./output.js";
import { CREATE, READ_ONLY, UPDATE } from "./annotations.js";

const taskStatusSchema = z.enum(["Waiting", "InProgress", "Completed", "Cancel"]);

export function registerTaskTools(
  server: McpServer,
  client: TheHiveClient,
  options: ToolSafetyOptions = {},
): void {
  registerTool(server, options,
    "thehive_list_tasks",
    "List tasks for a specific case",
    {
      caseId: z.string().describe("The case ID to list tasks for"),
      status: z
        .enum(taskStatusSchema.options)
        .optional()
        .describe("Filter by status: Waiting, InProgress, Completed, Cancel"),
      assignee: z
        .string()
        .optional()
        .describe("Filter by assignee username"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe("Maximum number of results (default: 50)"),
    },
    READ_ONLY,
    async ({ caseId, status, assignee, limit }) => {
      try {
        const tasks = await client.listTasks(caseId, {
          status,
          assignee,
          limit,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: formatJson(tasks),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing tasks: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_get_task",
    "Get detailed information about a specific task",
    {
      taskId: z.string().describe("The task ID"),
    },
    READ_ONLY,
    async ({ taskId }) => {
      try {
        const task = await client.getTask(taskId);
        return {
          content: [
            {
              type: "text" as const,
              text: formatJson(task),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting task: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_create_task",
    "Create a new task in a case",
    {
      caseId: z.string().describe("The case ID to add the task to"),
      title: z.string().describe("Task title"),
      description: z
        .string()
        .optional()
        .describe("Task description (supports markdown)"),
      status: z
        .enum(taskStatusSchema.options)
        .optional()
        .describe("Initial status: Waiting, InProgress (default: Waiting)"),
      flag: z.boolean().optional().describe("Whether to flag the task"),
      order: z
        .number()
        .int()
        .optional()
        .describe("Task order/position in the list"),
      group: z
        .string()
        .optional()
        .describe("Task group for organization"),
      assignee: z
        .string()
        .optional()
        .describe("Username to assign the task to"),
      dueDate: z
        .number()
        .optional()
        .describe("Due date as Unix timestamp in milliseconds"),
    },
    CREATE,
    async ({ caseId, title, description, status, flag, order, group, assignee, dueDate }) => {
      try {
        const created = await client.createTask(caseId, {
          title,
          description,
          status,
          flag,
          order,
          group,
          assignee,
          dueDate,
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
              text: `Error creating task: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_update_task",
    "Update an existing task",
    {
      taskId: z.string().describe("The task ID to update"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      status: z
        .enum(taskStatusSchema.options)
        .optional()
        .describe("New status: Waiting, InProgress, Completed, Cancel"),
      flag: z.boolean().optional().describe("Flag the task"),
      order: z.number().int().optional().describe("New order/position"),
      group: z.string().optional().describe("New group"),
      assignee: z.string().optional().describe("New assignee username"),
      dueDate: z
        .number()
        .optional()
        .describe("New due date as Unix timestamp in milliseconds"),
    },
    UPDATE,
    async ({ taskId, ...data }) => {
      try {
        const updated = await client.updateTask(taskId, data);
        return {
          content: [
            {
              type: "text" as const,
              text: formatJson(updated),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error updating task: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
