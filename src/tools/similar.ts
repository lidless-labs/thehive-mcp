import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const similarityInput = {
  entityType: z
    .enum(["alert", "case"])
    .describe("Whether entityId refers to an alert or a case"),
  entityId: z.string().min(1).describe("The alert or case ID"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Maximum number of results (default: 50)"),
};

export function registerSimilarTools(
  server: McpServer,
  client: TheHiveClient,
): void {
  server.tool(
    "thehive_get_similar_cases",
    "List cases that share observables with a given alert or case (TheHive similarity matching)",
    similarityInput,
    READ_ONLY,
    async ({ entityType, entityId, limit }) => {
      try {
        const similar = await client.getSimilarCases(entityType, entityId, limit);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(similar, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting similar cases: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "thehive_get_similar_alerts",
    "List alerts that share observables with a given alert or case (TheHive similarity matching)",
    similarityInput,
    READ_ONLY,
    async ({ entityType, entityId, limit }) => {
      try {
        const similar = await client.getSimilarAlerts(entityType, entityId, limit);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(similar, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting similar alerts: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
