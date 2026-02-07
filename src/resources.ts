import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TheHiveClient } from "./client.js";

export function registerResources(
  server: McpServer,
  client: TheHiveClient,
): void {
  server.resource(
    "open-cases",
    "thehive://cases/open",
    {
      description: "List of currently open cases in TheHive",
      mimeType: "application/json",
    },
    async () => {
      const cases = await client.listCases({ status: "New", limit: 100 });
      const inProgress = await client.listCases({
        status: "InProgress",
        limit: 100,
      });
      const allOpen = [...cases, ...inProgress];

      return {
        contents: [
          {
            uri: "thehive://cases/open",
            mimeType: "application/json",
            text: JSON.stringify(allOpen, null, 2),
          },
        ],
      };
    },
  );

  server.resource(
    "new-alerts",
    "thehive://alerts/new",
    {
      description: "List of new/unprocessed alerts",
      mimeType: "application/json",
    },
    async () => {
      const alerts = await client.listAlerts({
        status: "New",
        limit: 100,
      });

      return {
        contents: [
          {
            uri: "thehive://alerts/new",
            mimeType: "application/json",
            text: JSON.stringify(alerts, null, 2),
          },
        ],
      };
    },
  );

  server.resource(
    "current-user",
    "thehive://user/current",
    {
      description: "Currently authenticated TheHive user",
      mimeType: "application/json",
    },
    async () => {
      const user = await client.getCurrentUser();

      return {
        contents: [
          {
            uri: "thehive://user/current",
            mimeType: "application/json",
            text: JSON.stringify(user, null, 2),
          },
        ],
      };
    },
  );
}
