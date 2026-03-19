import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";

export function registerCortexTools(
  server: McpServer,
  client: TheHiveClient,
): void {
  server.tool(
    "thehive_list_analyzers",
    "List available Cortex analyzers that can be run on observables",
    {
      dataType: z
        .string()
        .optional()
        .describe("Filter analyzers by observable data type (e.g. ip, domain, hash)"),
    },
    async ({ dataType }) => {
      try {
        const analyzers = await client.listAnalyzers(dataType);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(analyzers, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing analyzers: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "thehive_run_analyzer",
    "Run a Cortex analyzer on a specific observable. Returns the job ID for tracking.",
    {
      analyzerId: z
        .string()
        .describe("The Cortex analyzer ID to run"),
      cortexId: z
        .string()
        .describe("The Cortex server ID (e.g. 'cortex')"),
      observableId: z
        .string()
        .describe("The observable ID to analyze"),
    },
    async ({ analyzerId, cortexId, observableId }) => {
      try {
        const job = await client.runAnalyzer(analyzerId, cortexId, observableId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(job, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error running analyzer: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "thehive_get_job",
    "Get the status and results of a Cortex analyzer job",
    {
      jobId: z
        .string()
        .describe("The Cortex job ID"),
    },
    async ({ jobId }) => {
      try {
        const job = await client.getJob(jobId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(job, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting job: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
