import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";

export function registerAlertTools(
  server: McpServer,
  client: TheHiveClient,
): void {
  server.tool(
    "thehive_list_alerts",
    "List alerts from TheHive with optional filters",
    {
      status: z
        .string()
        .optional()
        .describe("Filter by status: New, Updated, Ignored, Imported"),
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
      source: z
        .string()
        .optional()
        .describe("Filter by alert source"),
      type: z
        .string()
        .optional()
        .describe("Filter by alert type"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe("Maximum number of results (default: 50, max: 500)"),
    },
    async ({ status, severity, tags, source, type, limit }) => {
      try {
        const alerts = await client.listAlerts({
          status,
          severity,
          tags,
          source,
          type,
          limit,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(alerts, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing alerts: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "thehive_get_alert",
    "Get detailed information about a specific alert",
    {
      alertId: z.string().describe("The alert ID"),
    },
    async ({ alertId }) => {
      try {
        const alert = await client.getAlert(alertId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(alert, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting alert: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "thehive_create_alert",
    "Create a new alert in TheHive",
    {
      title: z.string().describe("Alert title"),
      type: z.string().describe("Alert type (e.g. phishing, malware, intrusion)"),
      source: z.string().describe("Alert source (e.g. SIEM, IDS, email)"),
      sourceRef: z
        .string()
        .describe("Source reference ID (unique identifier from source system)"),
      description: z
        .string()
        .optional()
        .describe("Alert description (supports markdown)"),
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
        .describe("Tags to apply to the alert"),
      follow: z
        .boolean()
        .optional()
        .describe("Whether to follow the alert for updates"),
      caseTemplate: z
        .string()
        .optional()
        .describe("Case template to use when promoting to case"),
    },
    async ({ title, type, source, sourceRef, description, severity, tlp, pap, tags, follow, caseTemplate }) => {
      try {
        const created = await client.createAlert({
          title,
          type,
          source,
          sourceRef,
          description,
          severity,
          tlp,
          pap,
          tags,
          follow,
          caseTemplate,
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
              text: `Error creating alert: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "thehive_update_alert",
    "Update an existing alert",
    {
      alertId: z.string().describe("The alert ID to update"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      severity: z
        .number()
        .int()
        .min(1)
        .max(4)
        .optional()
        .describe("New severity"),
      tlp: z.number().int().min(0).max(3).optional().describe("New TLP level"),
      pap: z.number().int().min(0).max(3).optional().describe("New PAP level"),
      tags: z
        .array(z.string())
        .optional()
        .describe("New tags (replaces existing)"),
      status: z
        .string()
        .optional()
        .describe("New status: New, Updated, Ignored, Imported"),
      follow: z
        .boolean()
        .optional()
        .describe("Whether to follow the alert"),
    },
    async ({ alertId, ...data }) => {
      try {
        const updated = await client.updateAlert(alertId, data);
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
              text: `Error updating alert: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "thehive_promote_alert",
    "Promote an alert to a case. Creates a new case from the alert data.",
    {
      alertId: z.string().describe("The alert ID to promote to a case"),
    },
    async ({ alertId }) => {
      try {
        const promoted = await client.promoteAlert(alertId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(promoted, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error promoting alert: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "thehive_delete_alert",
    "Permanently delete an alert",
    {
      alertId: z.string().describe("The alert ID to delete"),
    },
    async ({ alertId }) => {
      try {
        await client.deleteAlert(alertId);
        return {
          content: [
            {
              type: "text" as const,
              text: `Alert ${alertId} deleted successfully`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error deleting alert: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
