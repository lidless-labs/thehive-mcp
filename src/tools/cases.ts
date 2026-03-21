import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";

export function registerCaseTools(
  server: McpServer,
  client: TheHiveClient,
): void {
  server.tool(
    "thehive_list_cases",
    "List cases from TheHive with optional filters",
    {
      status: z
        .string()
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
              text: JSON.stringify(cases, null, 2),
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

  server.tool(
    "thehive_get_case",
    "Get detailed information about a specific case",
    {
      caseId: z.string().describe("The case ID (e.g. ~123456)"),
    },
    async ({ caseId }) => {
      try {
        const theCase = await client.getCase(caseId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(theCase, null, 2),
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

  server.tool(
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
    },
    async ({ title, description, severity, tlp, pap, tags, flag, owner, template }) => {
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
              text: `Error creating case: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
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
        .string()
        .optional()
        .describe("New status: New, InProgress, TruePositive, FalsePositive, Indeterminate, Duplicated, Other"),
      summary: z.string().optional().describe("Case summary/conclusion"),
      owner: z.string().optional().describe("New case owner"),
      impactStatus: z
        .string()
        .optional()
        .describe("Impact status: NoImpact, WithImpact, NotApplicable"),
      resolutionStatus: z
        .string()
        .optional()
        .describe("Resolution status: TruePositive, FalsePositive, Indeterminate, Duplicated, Other"),
      flag: z.boolean().optional().describe("Flag/star the case"),
    },
    async ({ caseId, ...data }) => {
      try {
        const updated = await client.updateCase(caseId, data);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(updated, null, 2),
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

  server.tool(
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
    async ({ query, limit }) => {
      try {
        const cases = await client.searchCases(query, limit);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(cases, null, 2),
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

  server.tool(
    "thehive_close_case",
    "Close/resolve a case. In TheHive 5, the status field is the resolution status directly.",
    {
      caseId: z.string().describe("The case ID to close"),
      status: z
        .enum(["TruePositive", "FalsePositive", "Indeterminate", "Duplicated", "Other"])
        .describe("Resolution status (becomes the case status in TheHive 5)"),
      impactStatus: z
        .enum(["NoImpact", "WithImpact", "NotApplicable"])
        .optional()
        .describe("Impact status"),
      summary: z
        .string()
        .describe("Case summary/conclusion explaining the resolution"),
    },
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
              text: JSON.stringify(updated, null, 2),
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

  server.tool(
    "thehive_delete_case",
    "Permanently delete a case. Use force=true to delete even if the case has tasks/observables.",
    {
      caseId: z.string().describe("The case ID to delete"),
      force: z
        .boolean()
        .optional()
        .describe("Force delete even if case has children (default: false)"),
    },
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

  server.tool(
    "thehive_merge_cases",
    "Merge multiple cases into a single case",
    {
      caseIds: z
        .array(z.string())
        .min(2)
        .describe("Array of case IDs to merge (minimum 2)"),
    },
    async ({ caseIds }) => {
      try {
        const merged = await client.mergeCases(caseIds);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(merged, null, 2),
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
