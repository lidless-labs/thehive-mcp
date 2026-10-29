import { registerTool, type ToolSafetyOptions } from "./safety.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";
import { CREATE, READ_ONLY } from "./annotations.js";
import { formatJson } from "./output.js";

const observableDataTypeSchema = z.enum([
  "ip",
  "domain",
  "url",
  "mail",
  "hash",
  "filename",
  "fqdn",
  "user-agent",
  "regexp",
  "other",
]);

function jsonResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: formatJson(value),
      },
    ],
  };
}

function errorResult(action: string, error: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: `Error ${action}: ${error instanceof Error ? error.message : String(error)}`,
      },
    ],
    isError: true,
  };
}

export function registerAlertDetailTools(
  server: McpServer,
  client: TheHiveClient,
  options: ToolSafetyOptions = {},
): void {
  registerTool(server, options,
    "thehive_list_alert_observables",
    "List observables (IOCs) attached to an alert",
    {
      alertId: z.string().describe("The alert ID"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe("Maximum number of results (default: 50)"),
    },
    READ_ONLY,
    async ({ alertId, limit }) => {
      try {
        return jsonResult(await client.listAlertObservables(alertId, limit));
      } catch (error) {
        return errorResult("listing alert observables", error);
      }
    },
  );

  registerTool(server, options,
    "thehive_list_alert_comments",
    "List comments on an alert, newest first",
    {
      alertId: z.string().describe("The alert ID"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe("Maximum number of results (default: 50)"),
    },
    READ_ONLY,
    async ({ alertId, limit }) => {
      try {
        return jsonResult(await client.listAlertComments(alertId, limit));
      } catch (error) {
        return errorResult("listing alert comments", error);
      }
    },
  );

  registerTool(server, options,
    "thehive_create_alert_observable",
    "Add an observable (IOC) to an alert without promoting it to a case",
    {
      alertId: z.string().describe("The alert ID to add the observable to"),
      dataType: z
        .enum(observableDataTypeSchema.options)
        .describe("Observable data type"),
      data: z
        .string()
        .describe("Observable value (e.g. IP address, domain name, hash)"),
      message: z
        .string()
        .optional()
        .describe("Description or context about this observable"),
      tags: z.array(z.string()).optional().describe("Tags to apply"),
      tlp: z
        .number()
        .int()
        .min(0)
        .max(4)
        .optional()
        .describe("TLP 2.0: 0=Clear, 1=Green, 2=Amber, 3=Amber+Strict, 4=Red (default: 2)"),
      pap: z
        .number()
        .int()
        .min(0)
        .max(3)
        .optional()
        .describe("PAP: 0=Clear, 1=Green, 2=Amber, 3=Red (default: 2)"),
      ioc: z
        .boolean()
        .optional()
        .describe("Mark as Indicator of Compromise (default: false)"),
      sighted: z
        .boolean()
        .optional()
        .describe("Mark as sighted in the environment (default: false)"),
      ignoreSimilarity: z
        .boolean()
        .optional()
        .describe("Ignore this observable in similarity calculations"),
    },
    CREATE,
    async ({ alertId, ...observable }) => {
      try {
        return jsonResult(await client.createAlertObservable(alertId, observable));
      } catch (error) {
        return errorResult("creating alert observable", error);
      }
    },
  );

  registerTool(server, options,
    "thehive_create_alert_comment",
    "Add a comment to an alert",
    {
      alertId: z.string().describe("The alert ID to comment on"),
      message: z.string().min(1).describe("Comment message (supports markdown)"),
    },
    CREATE,
    async ({ alertId, message }) => {
      try {
        return jsonResult(await client.createAlertComment(alertId, message));
      } catch (error) {
        return errorResult("creating alert comment", error);
      }
    },
  );
}
