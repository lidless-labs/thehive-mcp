import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig, type TheHiveConfig } from "./config.js";
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

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version?: string };

export function warnForInsecureTls(config: TheHiveConfig): void {
  if (!config.verifySsl) {
    console.error(
      "[thehive-mcp] WARNING: THEHIVE_VERIFY_SSL=false - TLS certificate " +
        "validation is disabled for TheHive requests. This exposes connections " +
        "to man-in-the-middle attacks; use only against trusted hosts.",
    );
  }
}

export interface TheHiveServerDeps {
  config?: TheHiveConfig;
  client?: TheHiveClient;
}

export function createTheHiveMcpServer(deps: TheHiveServerDeps = {}): McpServer {
  const config = deps.config ?? getConfig();
  const client = deps.client ?? new TheHiveClient(config);
  const server = new McpServer({
    name: "thehive-mcp",
    version: packageJson.version ?? "0.0.0",
    description:
      "MCP server for TheHive - security incident response platform. Provides tools for managing cases, alerts, tasks, observables, and incident response workflows.",
  });

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

  return server;
}

function stripSchemaFromToolList(transport: StdioServerTransport): void {
  const send = transport.send.bind(transport);
  (transport as unknown as { send: typeof transport.send }).send = (message) => {
    const tools = (message as { result?: { tools?: unknown } })?.result?.tools;
    if (Array.isArray(tools)) {
      for (const tool of tools) {
        if (tool?.inputSchema) delete tool.inputSchema.$schema;
        if (tool?.outputSchema) delete tool.outputSchema.$schema;
      }
    }
    return send(message);
  };
}

export async function serveMcp(): Promise<void> {
  const config = getConfig();
  warnForInsecureTls(config);
  const server = createTheHiveMcpServer({ config });
  const transport = new StdioServerTransport();
  stripSchemaFromToolList(transport);
  await server.connect(transport);
}
