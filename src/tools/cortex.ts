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
    "thehive_get_observable_enrichment_options",
    "List Cortex analyzers that can enrich a specific observable",
    {
      observableId: z
        .string()
        .describe("The observable ID to find enrichment analyzers for"),
    },
    async ({ observableId }) => {
      try {
        const observable = await client.getObservable(observableId);
        const analyzers = await client.listAnalyzers(observable.dataType);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  observable: {
                    id: observable._id,
                    dataType: observable.dataType,
                    data: observable.data,
                    tags: observable.tags ?? [],
                    ioc: observable.ioc,
                  },
                  analyzers: analyzers.map((analyzer) => ({
                    id: analyzer.id,
                    name: analyzer.name,
                    version: analyzer.version,
                    description: analyzer.description,
                    cortexIds: analyzer.cortexIds ?? [],
                    dataTypeList: analyzer.dataTypeList ?? [],
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting enrichment options: ${error instanceof Error ? error.message : String(error)}`,
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
    "thehive_run_analyzer_and_wait",
    "Run a Cortex analyzer on an observable and wait for a terminal job status",
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
      maxAttempts: z
        .number()
        .int()
        .min(1)
        .max(60)
        .optional()
        .describe("Maximum polling attempts (default: 20, max: 60)"),
      intervalMs: z
        .number()
        .int()
        .min(100)
        .max(10000)
        .optional()
        .describe("Polling interval in milliseconds (default: 2000)"),
    },
    async ({ analyzerId, cortexId, observableId, maxAttempts, intervalMs }) => {
      try {
        const started = await client.runAnalyzer(analyzerId, cortexId, observableId);
        const jobId = started._id;
        if (!jobId) {
          throw new Error("Analyzer job did not return a job ID");
        }
        const completed = await client.waitForJob(jobId, { maxAttempts, intervalMs });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  started,
                  completed,
                  summary: summarizeJob(completed),
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error running analyzer and waiting: ${error instanceof Error ? error.message : String(error)}`,
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

  server.tool(
    "thehive_wait_for_job",
    "Poll a Cortex analyzer job until it reaches a terminal status",
    {
      jobId: z
        .string()
        .describe("The Cortex job ID"),
      maxAttempts: z
        .number()
        .int()
        .min(1)
        .max(60)
        .optional()
        .describe("Maximum polling attempts (default: 20, max: 60)"),
      intervalMs: z
        .number()
        .int()
        .min(100)
        .max(10000)
        .optional()
        .describe("Polling interval in milliseconds (default: 2000)"),
    },
    async ({ jobId, maxAttempts, intervalMs }) => {
      try {
        const job = await client.waitForJob(jobId, { maxAttempts, intervalMs });
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
              text: `Error waiting for job: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "thehive_summarize_job_report",
    "Fetch a Cortex job and return a compact report summary",
    {
      jobId: z
        .string()
        .describe("The Cortex job ID"),
      includeRawReport: z
        .boolean()
        .optional()
        .describe("Include the raw report object in the response (default: false)"),
    },
    async ({ jobId, includeRawReport }) => {
      try {
        const job = await client.getJob(jobId);
        const summary = summarizeJob(job);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  ...summary,
                  ...(includeRawReport && { rawReport: job.report }),
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error summarizing job report: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

function summarizeJob(job: {
  _id: string;
  analyzerId?: string;
  analyzerName?: string;
  status?: string;
  report?: Record<string, unknown>;
}): Record<string, unknown> {
  const report = job.report ?? {};
  return {
    jobId: job._id,
    analyzerId: job.analyzerId,
    analyzerName: job.analyzerName,
    status: job.status,
    verdict: findFirstString(report, ["verdict", "level", "severity", "status"]),
    summary: findFirstString(report, ["summary", "message", "description", "full"]),
    taxonomies: Array.isArray(report.taxonomies) ? report.taxonomies : undefined,
    hasArtifacts: Array.isArray(report.artifacts) && report.artifacts.length > 0,
    artifactCount: Array.isArray(report.artifacts) ? report.artifacts.length : 0,
  };
}

function findFirstString(value: unknown, keys: string[]): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  for (const [key, child] of Object.entries(value)) {
    if (keys.includes(key) && typeof child === "string" && child.trim()) {
      return child;
    }
  }

  for (const child of Object.values(value)) {
    const found = findFirstString(child, keys);
    if (found) {
      return found;
    }
  }

  return undefined;
}
