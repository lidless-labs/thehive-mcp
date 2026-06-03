import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";
import { rawQueryDisabled, type ToolSafetyOptions } from "./safety.js";

export function registerQueryTools(
  server: McpServer,
  client: TheHiveClient,
  options: ToolSafetyOptions = {},
): void {
  server.tool(
    "thehive_query",
    `Execute a raw TheHive Query API request. Use this for complex searches that other tools can't handle (date ranges, AND/OR logic, nested queries, counting, etc.).

Common query filters:
- List entities: {"_name": "listCase"}, {"_name": "listAlert"}, {"_name": "listObservable"}
- Filter by field: {"_name": "filter", "_field": "severity", "_value": 3}
- Filter by date range: {"_name": "filter", "_gte": {"_field": "_createdAt", "_value": <timestamp_ms>}}
- Like search: {"_name": "filter", "_like": {"_field": "title", "_value": "phishing"}}
- Get children: {"_name": "getCase", "idOrName": "<id>"}, {"_name": "tasks"}
- Count: {"_name": "count"}`,
    {
      query: z
        .string()
        .describe("JSON array of query filter objects (TheHive Query DSL)"),
      range: z
        .string()
        .regex(/^\d+-\d+$/)
        .optional()
        .describe("Result range, e.g. '0-50' (default: '0-100', max 500 results)"),
      sort: z
        .array(z.string().trim().min(1).max(100))
        .optional()
        .describe("Sort fields, prefix with '-' for descending (e.g. ['-_createdAt'])"),
      name: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .optional()
        .describe("Query name for caching/debugging"),
    },
    async ({ query: queryStr, range, sort, name }) => {
      if (!options.enableRawQuery) {
        return rawQueryDisabled();
      }
      try {
        const queryFilters = JSON.parse(queryStr) as Record<string, unknown>[];
        if (!Array.isArray(queryFilters)) {
          throw new Error("Query must be a JSON array of filter objects");
        }
        const results = await client.rawQuery(queryFilters, {
          range: range ?? "0-100",
          sort,
          name,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error executing query: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
