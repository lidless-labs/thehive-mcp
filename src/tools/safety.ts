import type { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { formatJson } from "./output.js";

export interface ToolSafetyOptions {
  allowDestructiveTools?: boolean;
  enableRawQuery?: boolean;
}

export function destructiveToolDisabled(toolName: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: `${toolName} is disabled. Set THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true to enable mutating MCP tools.`,
      },
    ],
    isError: true,
  };
}

export function rawQueryDisabled() {
  return {
    content: [
      {
        type: "text" as const,
        text: "thehive_query is disabled. Set THEHIVE_ENABLE_RAW_QUERY=true to enable raw TheHive Query DSL execution.",
      },
    ],
    isError: true,
  };
}

/** Explicit execution controls for tools with consequential side effects. */
export const mutationControls = {
  dryRun: z.boolean().optional().describe("Preview this mutation by default. Set false only to execute an approved operation."),
  confirm: z.boolean().optional().describe("Set true only after the operator approves this exact operation."),
};

/** Return a denial or a local plan before any upstream call. */
export function mutationPreflight(
  toolName: string,
  options: ToolSafetyOptions,
  controls: { dryRun?: boolean; confirm?: boolean },
  operation: Record<string, unknown>,
) {
  if (!options.allowDestructiveTools) return destructiveToolDisabled(toolName);
  if (controls.dryRun !== false) {
    return { content: [{ type: "text" as const, text: formatJson({
      dryRun: true, tool: toolName, operation,
      note: "No requests sent. Review the targets and parameters, then use dryRun=false and confirm=true to execute.",
    }) }] };
  }
  if (controls.confirm !== true) {
    return { isError: true, content: [{ type: "text" as const,
      text: `${toolName} requires confirm=true and dryRun=false after operator approval.`,
    }] };
  }
  return undefined;
}

/** Reviewed read operations. Unknown registrations fail closed as mutations.
 * Annotations describe tools to clients and never grant execution authority.
 */
const readTools = new Set([
  "thehive_case_timeline_summary",
  "thehive_get_alert",
  "thehive_get_case",
  "thehive_get_current_user",
  "thehive_get_job",
  "thehive_get_observable",
  "thehive_get_observable_enrichment_options",
  "thehive_get_similar_alerts",
  "thehive_get_similar_cases",
  "thehive_get_task",
  "thehive_list_actions",
  "thehive_list_alert_comments",
  "thehive_list_alert_observables",
  "thehive_list_alerts",
  "thehive_list_analyzers",
  "thehive_list_case_templates",
  "thehive_list_cases",
  "thehive_list_comments",
  "thehive_list_observables",
  "thehive_list_responders",
  "thehive_list_task_logs",
  "thehive_list_tasks",
  "thehive_list_users",
  "thehive_query",
  "thehive_search_cases",
  "thehive_search_observables",
  "thehive_status",
  "thehive_summarize_job_report",
  "thehive_wait_for_job",
]);

/** The only tool registration boundary, shared by the entry point and modules. */
export function registerTool<Args extends z.ZodRawShape>(
  server: McpServer,
  options: ToolSafetyOptions,
  name: string,
  description: string,
  schema: Args,
  annotations: ToolAnnotations,
  handler: (args: z.output<z.ZodObject<Args>>) => Promise<CallToolResult>,
) {
  // Bridge Zod 4 inference to the SDK callback conditional supporting Zod 3 and 4.
  if (readTools.has(name)) {
    return server.tool(name, description, schema, annotations, handler as unknown as ToolCallback<Args>);
  }
  return server.tool(
    name,
    `${description} Requires operator authority (THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true). Preview by default. Execution requires dryRun=false and confirm=true after approval.`,
    { ...schema, ...mutationControls },
    { ...annotations, readOnlyHint: false },
    (async (args: z.output<z.ZodObject<Args>> & { dryRun?: boolean; confirm?: boolean }) => {
      const { dryRun, confirm, ...operation } = args;
      const preflight = mutationPreflight(name, options, { dryRun, confirm }, operation);
      if (preflight) return preflight;
      return handler(operation as z.output<z.ZodObject<Args>>);
    }) as unknown as ToolCallback<Args & typeof mutationControls>,
  );
}
