import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TheHiveClient } from "../src/client.js";
import { registerCaseTools } from "../src/tools/cases.js";
import { registerAlertTools } from "../src/tools/alerts.js";
import { registerTaskTools } from "../src/tools/tasks.js";
import { registerObservableTools } from "../src/tools/observables.js";
import { registerTaskLogTools } from "../src/tools/task-logs.js";
import { registerCommentTools } from "../src/tools/comments.js";
import { registerUserTools } from "../src/tools/users.js";

const mockConfig = {
  url: "https://thehive.example.com",
  apiKey: "test-key",
  verifySsl: true,
  timeout: 30000,
};

describe("tool registration", () => {
  let server: McpServer;
  let client: TheHiveClient;
  let toolSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    server = new McpServer({
      name: "test-thehive",
      version: "0.0.0",
    });
    client = new TheHiveClient(mockConfig);
    toolSpy = vi.fn();
    server.tool = toolSpy as unknown as typeof server.tool;
  });

  it("should register 6 case tools", () => {
    registerCaseTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(6);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_list_cases");
    expect(toolNames).toContain("thehive_get_case");
    expect(toolNames).toContain("thehive_create_case");
    expect(toolNames).toContain("thehive_update_case");
    expect(toolNames).toContain("thehive_search_cases");
    expect(toolNames).toContain("thehive_merge_cases");
  });

  it("should register 5 alert tools", () => {
    registerAlertTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(5);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_list_alerts");
    expect(toolNames).toContain("thehive_get_alert");
    expect(toolNames).toContain("thehive_create_alert");
    expect(toolNames).toContain("thehive_update_alert");
    expect(toolNames).toContain("thehive_promote_alert");
  });

  it("should register 4 task tools", () => {
    registerTaskTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(4);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_list_tasks");
    expect(toolNames).toContain("thehive_get_task");
    expect(toolNames).toContain("thehive_create_task");
    expect(toolNames).toContain("thehive_update_task");
  });

  it("should register 4 observable tools", () => {
    registerObservableTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(4);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_list_observables");
    expect(toolNames).toContain("thehive_get_observable");
    expect(toolNames).toContain("thehive_create_observable");
    expect(toolNames).toContain("thehive_search_observables");
  });

  it("should register 2 task log tools", () => {
    registerTaskLogTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(2);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_list_task_logs");
    expect(toolNames).toContain("thehive_create_task_log");
  });

  it("should register 2 comment tools", () => {
    registerCommentTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(2);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_list_comments");
    expect(toolNames).toContain("thehive_create_comment");
  });

  it("should register 2 user tools", () => {
    registerUserTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(2);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_list_users");
    expect(toolNames).toContain("thehive_get_current_user");
  });

  it("should register all 25 tools total", () => {
    registerCaseTools(server, client);
    registerAlertTools(server, client);
    registerTaskTools(server, client);
    registerObservableTools(server, client);
    registerTaskLogTools(server, client);
    registerCommentTools(server, client);
    registerUserTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(25);
  });
});
