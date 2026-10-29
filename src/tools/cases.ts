import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";
import { ADDITIVE_IDEMPOTENT, CREATE, DESTRUCTIVE, READ_ONLY, UPDATE } from "./annotations.js";
import { formatJson, settleWithConcurrency } from "./output.js";
import { registerTool, type ToolSafetyOptions } from "./safety.js";

const caseStatusSchema = z.enum([
  "New",
  "InProgress",
  "TruePositive",
  "FalsePositive",
  "Indeterminate",
  "Duplicated",
  "Other",
]);
const resolutionStatusSchema = z.enum([
  "TruePositive",
  "FalsePositive",
  "Indeterminate",
  "Duplicated",
  "Other",
]);
const impactStatusSchema = z.enum(["NoImpact", "WithImpact", "NotApplicable"]);
const customFieldsSchema = z.record(z.string(), z.unknown());

export function registerCaseTools(
  server: McpServer,
  client: TheHiveClient,
  options: ToolSafetyOptions = {},
): void {
  registerTool(server, options,
    "thehive_list_cases",
    "List cases from TheHive with optional filters",
    {
      status: z
        .enum(caseStatusSchema.options)
        .optional()
        .describe("Filter by status: New, InProgress, TruePositive, FalsePositive, Indeterminate, Duplicated, Other"),
      severity: z
        .number()
        .int()
        .min(1)
        .max(4)
        .optional()
        .describe("Filter by severity: 1=Low, 2=Medium, 3=High, 4=Critical"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Filter by tags"),
      owner: z
        .string()
        .optional()
        .describe("Filter by case owner/assignee"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe("Maximum number of results (default: 50, max: 500)"),
    },
    READ_ONLY,
    async ({ status, severity, tags, owner, limit }) => {
      try {
        const cases = await client.listCases({
          status,
          severity,
          tags,
          owner,
          limit,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: formatJson(cases),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing cases: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_get_case",
    "Get detailed information about a specific case",
    {
      caseId: z.string().describe("The case ID (e.g. ~123456)"),
    },
    READ_ONLY,
    async ({ caseId }) => {
      try {
        const theCase = await client.getCase(caseId);
        return {
          content: [
            {
              type: "text" as const,
              text: formatJson(theCase),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting case: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_create_case",
    "Create a new case in TheHive",
    {
      title: z.string().describe("Case title"),
      description: z
        .string()
        .optional()
        .describe("Case description (supports markdown)"),
      severity: z
        .number()
        .int()
        .min(1)
        .max(4)
        .optional()
        .describe("Severity: 1=Low, 2=Medium, 3=High, 4=Critical (default: 2)"),
      tlp: z
        .number()
        .int()
        .min(0)
        .max(3)
        .optional()
        .describe("TLP: 0=Clear, 1=Green, 2=Amber, 3=Red (default: 2)"),
      pap: z
        .number()
        .int()
        .min(0)
        .max(3)
        .optional()
        .describe("PAP: 0=Clear, 1=Green, 2=Amber, 3=Red (default: 2)"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Tags to apply to the case"),
      flag: z
        .boolean()
        .optional()
        .describe("Whether to flag/star the case"),
      owner: z
        .string()
        .optional()
        .describe("Username to assign as case owner"),
      template: z
        .string()
        .optional()
        .describe("Case template name to use"),
      customFields: customFieldsSchema
        .optional()
        .describe("Case custom fields keyed by TheHive custom field name"),
    },
    CREATE,
    async ({ title, description, severity, tlp, pap, tags, flag, owner, template, customFields }) => {
      try {
        const created = await client.createCase({
          title,
          description,
          severity,
          tlp,
          pap,
          tags,
          flag,
          owner,
          template,
          customFields,
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
              text: `Error creating case: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_update_case",
    "Update an existing case",
    {
      caseId: z.string().describe("The case ID to update"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      severity: z
        .number()
        .int()
        .min(1)
        .max(4)
        .optional()
        .describe("New severity: 1=Low, 2=Medium, 3=High, 4=Critical"),
      tlp: z
        .number()
        .int()
        .min(0)
        .max(3)
        .optional()
        .describe("New TLP level"),
      pap: z
        .number()
        .int()
        .min(0)
        .max(3)
        .optional()
        .describe("New PAP level"),
      tags: z.array(z.string()).optional().describe("New tags (replaces existing)"),
      status: z
        .enum(caseStatusSchema.options)
        .optional()
        .describe("New status: New, InProgress, TruePositive, FalsePositive, Indeterminate, Duplicated, Other"),
      summary: z.string().optional().describe("Case summary/conclusion"),
      owner: z.string().optional().describe("New case owner"),
      impactStatus: z
        .enum(impactStatusSchema.options)
        .optional()
        .describe("Impact status: NoImpact, WithImpact, NotApplicable"),
      resolutionStatus: z
        .enum(resolutionStatusSchema.options)
        .optional()
        .describe("Resolution status: TruePositive, FalsePositive, Indeterminate, Duplicated, Other"),
      flag: z.boolean().optional().describe("Flag/star the case"),
      customFields: customFieldsSchema
        .optional()
        .describe("Custom fields to update, keyed by TheHive custom field name"),
    },
    UPDATE,
    async ({ caseId, ...data }) => {
      try {
        const updated = await client.updateCase(caseId, data);
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
              text: `Error updating case: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_search_cases",
    "Search cases by title keyword",
    {
      query: z.string().describe("Search query to match against case titles"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe("Maximum number of results (default: 50)"),
    },
    READ_ONLY,
    async ({ query, limit }) => {
      try {
        const cases = await client.searchCases(query, limit);
        return {
          content: [
            {
              type: "text" as const,
              text: formatJson(cases),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching cases: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_close_case",
    "Close/resolve a case. In TheHive 5, the status field is the resolution status directly.",
    {
      caseId: z.string().describe("The case ID to close"),
      status: z
        .enum(resolutionStatusSchema.options)
        .describe("Resolution status (becomes the case status in TheHive 5)"),
      impactStatus: z
        .enum(impactStatusSchema.options)
        .optional()
        .describe("Impact status"),
      summary: z
        .string()
        .describe("Case summary/conclusion explaining the resolution"),
    },
    UPDATE,
    async ({ caseId, status, impactStatus, summary }) => {
      try {
        const updated = await client.updateCase(caseId, {
          status,
          ...(impactStatus && { impactStatus }),
          summary,
        });
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
              text: `Error closing case: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_assign_case",
    "Assign a case to a TheHive user by username or login",
    {
      caseId: z.string().describe("The case ID to assign"),
      owner: z.string().min(1).describe("Username or login to assign as case owner"),
    },
    UPDATE,
    async ({ caseId, owner }) => {
      try {
        const updated = await client.updateCase(caseId, { owner });
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
              text: `Error assigning case: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_update_case_custom_fields",
    "Update custom fields on an existing case",
    {
      caseId: z.string().describe("The case ID to update"),
      customFields: customFieldsSchema.describe("Custom fields keyed by TheHive custom field name"),
    },
    UPDATE,
    async ({ caseId, customFields }) => {
      try {
        const updated = await client.updateCase(caseId, { customFields });
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
              text: `Error updating case custom fields: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_add_case_tags",
    "Add tags to a case without removing existing tags",
    {
      caseId: z.string().describe("The case ID to update"),
      tags: z.array(z.string().min(1)).min(1).describe("Tags to add"),
    },
    ADDITIVE_IDEMPOTENT,
    async ({ caseId, tags }) => {
      try {
        const theCase = await client.getCase(caseId);
        const mergedTags = Array.from(new Set([...(theCase.tags ?? []), ...tags]));
        const updated = await client.updateCase(caseId, { tags: mergedTags });
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
              text: `Error adding case tags: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_remove_case_tags",
    "Remove tags from a case while preserving other tags",
    {
      caseId: z.string().describe("The case ID to update"),
      tags: z.array(z.string().min(1)).min(1).describe("Tags to remove"),
    },
    UPDATE,
    async ({ caseId, tags }) => {
      try {
        const theCase = await client.getCase(caseId);
        const removeSet = new Set(tags);
        const remainingTags = (theCase.tags ?? []).filter((tag) => !removeSet.has(tag));
        const updated = await client.updateCase(caseId, { tags: remainingTags });
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
              text: `Error removing case tags: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_set_case_flag",
    "Set or clear the case flag",
    {
      caseId: z.string().describe("The case ID to update"),
      flag: z.boolean().describe("Whether the case should be flagged"),
    },
    UPDATE,
    async ({ caseId, flag }) => {
      try {
        const updated = await client.updateCase(caseId, { flag });
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
              text: `Error setting case flag: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_bulk_assign_cases",
    "Assign multiple cases to a TheHive user. Requires THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true.",
    {
      caseIds: z.array(z.string()).min(1).max(50).describe("Case IDs to assign"),
      owner: z.string().min(1).describe("Username or login to assign as case owner"),
    },
    UPDATE,
    async ({ caseIds, owner }) => {
      const results = await settleWithConcurrency(caseIds, async (caseId) =>
        client.updateCase(caseId, { owner }),
      );
      const summary = summarizeSettledResults(caseIds, results);
      return {
        content: [
          {
            type: "text" as const,
            text: formatJson(summary),
          },
        ],
        isError: summary.failed > 0,
      };
    },
  );

  registerTool(server, options,
    "thehive_bulk_close_cases",
    "Close multiple cases with the same resolution status and summary. Requires THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true.",
    {
      caseIds: z.array(z.string()).min(1).max(50).describe("Case IDs to close"),
      status: z
        .enum(resolutionStatusSchema.options)
        .describe("Resolution status (becomes the case status in TheHive 5)"),
      impactStatus: z
        .enum(impactStatusSchema.options)
        .optional()
        .describe("Impact status"),
      summary: z.string().min(1).describe("Case summary/conclusion explaining the resolution"),
    },
    UPDATE,
    async ({ caseIds, status, impactStatus, summary }) => {
      const results = await settleWithConcurrency(caseIds, async (caseId) =>
        client.updateCase(caseId, {
          status,
          ...(impactStatus && { impactStatus }),
          summary,
        }),
      );
      const resultSummary = summarizeSettledResults(caseIds, results);
      return {
        content: [
          {
            type: "text" as const,
            text: formatJson(resultSummary),
          },
        ],
        isError: resultSummary.failed > 0,
      };
    },
  );

  registerTool(server, options,
    "thehive_case_timeline_summary",
    "Summarize a case with related tasks, observables, and comments",
    {
      caseId: z.string().describe("The case ID to summarize"),
      limit: z.number().int().min(1).max(100).optional().describe("Maximum related items per category (default: 25)"),
    },
    READ_ONLY,
    async ({ caseId, limit }) => {
      try {
        const clampedLimit = limit ?? 25;
        const [theCase, tasks, observables, comments] = await Promise.all([
          client.getCase(caseId),
          client.listTasks(caseId, { limit: clampedLimit }),
          client.listObservables(caseId, { limit: clampedLimit }),
          client.listComments(caseId, clampedLimit),
        ]);
        const summary = {
          case: {
            id: theCase._id,
            number: theCase.number,
            title: theCase.title,
            status: theCase.status,
            severity: theCase.severity,
            owner: theCase.owner,
            tags: theCase.tags ?? [],
            createdAt: theCase._createdAt,
            updatedAt: theCase._updatedAt,
          },
          counts: {
            tasks: tasks.length,
            observables: observables.length,
            comments: comments.length,
          },
          tasks: tasks.map((task) => ({
            id: task._id,
            title: task.title,
            status: task.status,
            assignee: task.assignee,
            dueDate: task.dueDate,
          })),
          observables: observables.map((observable) => ({
            id: observable._id,
            dataType: observable.dataType,
            data: observable.data,
            ioc: observable.ioc,
            tags: observable.tags ?? [],
          })),
          comments: comments.map((comment) => ({
            id: comment._id,
            author: comment._createdBy,
            createdAt: comment._createdAt,
            message: comment.message,
          })),
        };
        return {
          content: [
            {
              type: "text" as const,
              text: formatJson(summary),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error summarizing case timeline: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_delete_case",
    "Permanently delete a case. Use force=true to delete even if the case has tasks/observables.",
    {
      caseId: z.string().describe("The case ID to delete"),
      force: z
        .boolean()
        .optional()
        .describe("Force delete even if case has children (default: false)"),
    },
    DESTRUCTIVE,
    async ({ caseId, force }) => {
      try {
        await client.deleteCase(caseId, force);
        return {
          content: [
            {
              type: "text" as const,
              text: `Case ${caseId} deleted successfully`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error deleting case: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  registerTool(server, options,
    "thehive_merge_cases",
    "Merge multiple cases into a single case. This is irreversible and data-destructive.",
    {
      caseIds: z
        .array(z.string())
        .min(2)
        .describe("Array of case IDs to merge (minimum 2)"),
    },
    DESTRUCTIVE,
    async ({ caseIds }) => {
      try {
        const merged = await client.mergeCases(caseIds);
        return {
          content: [
            {
              type: "text" as const,
              text: formatJson(merged),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error merging cases: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

function summarizeSettledResults<T>(
  ids: string[],
  results: PromiseSettledResult<T>[],
): {
  succeeded: number;
  failed: number;
  results: Array<{ id: string; ok: boolean; value?: T; error?: string }>;
} {
  const mappedResults = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return { id: ids[index] ?? "", ok: true, value: result.value };
    }
    return {
      id: ids[index] ?? "",
      ok: false,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });

  return {
    succeeded: mappedResults.filter((result) => result.ok).length,
    failed: mappedResults.filter((result) => !result.ok).length,
    results: mappedResults,
  };
}
