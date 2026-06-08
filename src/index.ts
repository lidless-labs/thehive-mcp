import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "./config.js";
import { TheHiveClient } from "./client.js";
import { registerCaseTools } from "./tools/cases.js";
import { registerAlertTools } from "./tools/alerts.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerObservableTools } from "./tools/observables.js";
import { registerTaskLogTools } from "./tools/task-logs.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerUserTools } from "./tools/users.js";
import { registerCortexTools } from "./tools/cortex.js";
import { registerStatusTools } from "./tools/status.js";
import { registerQueryTools } from "./tools/query.js";
import { registerTemplateTools } from "./tools/templates.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version?: string };
const serverVersion = packageJson.version ?? "0.0.0";

async function main(): Promise<void> {
  const config = getConfig();

  if (!config.verifySsl) {
    console.error(
      "[thehive-mcp] WARNING: THEHIVE_VERIFY_SSL=false - TLS certificate " +
        "validation is disabled for TheHive requests. This exposes connections " +
        "to man-in-the-middle attacks; use only against trusted hosts.",
    );
  }

  const server = new McpServer({
    name: "thehive-mcp",
    version: serverVersion,
    description:
      "MCP server for TheHive - security incident response platform. Provides tools for managing cases, alerts, tasks, observables, and incident response workflows.",
  });

  const client = new TheHiveClient(config);

  registerCaseTools(server, client, {
    allowDestructiveTools: config.allowDestructiveTools,
  });
  registerAlertTools(server, client, {
    allowDestructiveTools: config.allowDestructiveTools,
  });
  registerTaskTools(server, client);
  registerObservableTools(server, client);
  registerTaskLogTools(server, client);
  registerCommentTools(server, client);
  registerUserTools(server, client);
  registerCortexTools(server, client);
  registerStatusTools(server, client);
  registerQueryTools(server, client, {
    enableRawQuery: config.enableRawQuery,
  });
  registerTemplateTools(server, client);
  registerResources(server, client);
  registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
