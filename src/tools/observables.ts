import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TheHiveClient } from "../client.js";

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

export function registerObservableTools(
  server: McpServer,
  client: TheHiveClient,
): void {
  server.tool(
    "thehive_list_observables",
    "List observables (IOCs) for a specific case",
    {
      caseId: z.string().describe("The case ID to list observables for"),
      dataType: z
        .enum(observableDataTypeSchema.options)
        .optional()
        .describe(
          "Filter by data type: ip, domain, url, mail, hash, filename, fqdn, user-agent, regexp, other",
        ),
      ioc: z
        .boolean()
        .optional()
        .describe("Filter to only IOC-flagged observables"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe("Maximum number of results (default: 50)"),
    },
    async ({ caseId, dataType, ioc, limit }) => {
      try {
        const observables = await client.listObservables(caseId, {
          dataType,
          ioc,
          limit,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(observables, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing observables: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "thehive_get_observable",
    "Get detailed information about a specific observable",
    {
      observableId: z.string().describe("The observable ID"),
    },
    async ({ observableId }) => {
      try {
        const observable = await client.getObservable(observableId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(observable, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting observable: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "thehive_create_observable",
    "Add a new observable (IOC) to a case",
    {
      caseId: z.string().describe("The case ID to add the observable to"),
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
      tags: z
        .array(z.string())
        .optional()
        .describe("Tags to apply"),
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
    async ({
      caseId,
      dataType,
      data,
      message,
      tags,
      tlp,
      pap,
      ioc,
      sighted,
      ignoreSimilarity,
    }) => {
      try {
        const created = await client.createObservable(caseId, {
          dataType,
          data,
          message,
          tags,
          tlp,
          pap,
          ioc,
          sighted,
          ignoreSimilarity,
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
              text: `Error creating observable: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "thehive_create_observable_bulk",
    "Add multiple observables of the same type to a case in one request. More efficient than creating one at a time.",
    {
      caseId: z.string().describe("The case ID to add observables to"),
      dataType: z
        .enum(observableDataTypeSchema.options)
        .describe("Observable data type (all items must be the same type)"),
      data: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe("Array of observable values (e.g. multiple IPs, domains, or hashes)"),
      message: z
        .string()
        .optional()
        .describe("Description or context for all observables"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Tags to apply to all observables"),
      tlp: z
        .number()
        .int()
        .min(0)
        .max(3)
        .optional()
        .describe("TLP level for all observables"),
      pap: z
        .number()
        .int()
        .min(0)
        .max(3)
        .optional()
        .describe("PAP level for all observables"),
      ioc: z
        .boolean()
        .optional()
        .describe("Mark all as IOCs (default: false)"),
      sighted: z
        .boolean()
        .optional()
        .describe("Mark all as sighted (default: false)"),
    },
    async ({ caseId, dataType, data, message, tags, tlp, pap, ioc, sighted }) => {
      try {
        const created = await client.createObservableBulk(caseId, {
          dataType,
          data,
          message,
          tags,
          tlp,
          pap,
          ioc,
          sighted,
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
              text: `Error creating observables: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "thehive_search_observables",
    "Search observables across all cases",
    {
      dataType: z
        .enum(observableDataTypeSchema.options)
        .optional()
        .describe("Filter by data type"),
      data: z
        .string()
        .optional()
        .describe("Filter by exact data value"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Filter by tags"),
      ioc: z
        .boolean()
        .optional()
        .describe("Filter to IOC-flagged only"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe("Maximum number of results (default: 50)"),
    },
    async ({ dataType, data, tags, ioc, limit }) => {
      try {
        const observables = await client.searchObservables({
          dataType,
          data,
          tags,
          ioc,
          limit,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(observables, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching observables: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
