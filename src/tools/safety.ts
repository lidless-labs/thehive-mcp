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
        text: `${toolName} is disabled. Set THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true to enable destructive MCP tools.`,
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
  dryRun: z.boolean().optional().describe("Preview protected mutations by default; true also previews other changes. Set false to execute protected mutations."),
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
