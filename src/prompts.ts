import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer): void {
  server.prompt(
    "case-summary",
    "Generate a comprehensive incident case summary for reporting",
    { caseId: z.string().describe("The case ID to summarize") },
    ({ caseId }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `Generate a comprehensive incident summary for TheHive case ${caseId}.`,
              "",
              "Use the following tools to gather information:",
              `1. thehive_get_case with caseId="${caseId}" to get case details`,
              `2. thehive_list_tasks with caseId="${caseId}" to get all tasks`,
              `3. thehive_list_observables with caseId="${caseId}" to get all IOCs`,
              `4. thehive_list_comments with caseId="${caseId}" to get analyst notes`,
              "",
              "Then produce a structured report with:",
              "- Executive Summary: One paragraph overview of the incident",
              "- Timeline: Key events in chronological order",
              "- Indicators of Compromise: Table of all observables with type, value, and IOC status",
              "- Analysis: Findings from tasks and analyst comments",
              "- Impact Assessment: Based on severity, TLP, and impact status",
              "- Recommendations: Next steps based on case status and findings",
              "- Status: Current case status and resolution if applicable",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.prompt(
    "alert-triage",
    "Triage and analyze a security alert for escalation decision",
    { alertId: z.string().describe("The alert ID to triage") },
    ({ alertId }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              `Perform triage analysis on TheHive alert ${alertId}.`,
              "",
              "Steps:",
              `1. Use thehive_get_alert with alertId="${alertId}" to get full alert details`,
              `2. Review the alert source, type, severity, and description`,
              `3. Use thehive_search_observables to check if any related IOCs exist in other cases`,
              `4. Use thehive_search_cases to find related cases by keywords from the alert`,
              "",
              "Provide a triage assessment with:",
              "- Alert Overview: Source, type, severity, and key details",
              "- Threat Assessment: What threat does this represent?",
              "- IOC Analysis: Any indicators found and their context",
              "- Related Activity: Similar cases or alerts in the platform",
              "- Escalation Recommendation: Should this be promoted to a case? Why/why not?",
              "- Suggested Priority: If escalated, what severity and TLP to assign",
              "- Immediate Actions: Steps to take right now",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  server.prompt(
    "incident-response",
    "Guided incident response workflow for a new security incident",
    {
      title: z.string().describe("Brief title of the incident"),
      severity: z
        .enum(["low", "medium", "high", "critical"])
        .describe("Initial severity assessment"),
    },
    ({ title, severity }) => {
      const severityMap: Record<string, number> = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4,
      };
      const sevNum = severityMap[severity] ?? 2;

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Begin incident response workflow for: "${title}" (severity: ${severity})`,
                "",
                "Follow this incident response process:",
                "",
                "## Phase 1: Preparation",
                `1. Create a new case: thehive_create_case with title="${title}", severity=${sevNum}`,
                "2. Add initial tags based on the incident type",
                "",
                "## Phase 2: Identification",
                "3. Create tasks for initial triage:",
                "   - 'Initial Assessment' - Review all available information",
                "   - 'IOC Collection' - Gather indicators of compromise",
                "   - 'Scope Determination' - Identify affected systems",
                "",
                "## Phase 3: Containment",
                "4. Create tasks for containment:",
                "   - 'Short-term Containment' - Immediate isolation steps",
                "   - 'Evidence Preservation' - Collect forensic artifacts",
                "",
                "## Phase 4: Investigation",
                "5. Add observables as they are discovered (IPs, domains, hashes, etc.)",
                "6. Document findings as task logs and case comments",
                "",
                "## Phase 5: Resolution",
                "7. Create tasks for remediation:",
                "   - 'Eradication' - Remove threat from environment",
                "   - 'Recovery' - Restore affected systems",
                "   - 'Lessons Learned' - Post-incident review",
                "",
                "Execute each phase, creating tasks and adding observables as you go.",
                "Document all findings as comments on the case.",
              ].join("\n"),
            },
          },
        ],
      };
    },
  );
}
