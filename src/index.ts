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
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

const server = new McpServer({
  name: "thehive-mcp",
  version: "1.0.0",
  description:
    "MCP server for TheHive - security incident response platform. Provides tools for managing cases, alerts, tasks, observables, and incident response workflows.",
});

const config = getConfig();
const client = new TheHiveClient(config);

registerCaseTools(server, client);
registerAlertTools(server, client);
registerTaskTools(server, client);
registerObservableTools(server, client);
registerTaskLogTools(server, client);
registerCommentTools(server, client);
registerUserTools(server, client);
registerResources(server, client);
registerPrompts(server);

const transport = new StdioServerTransport();
await server.connect(transport);
