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
import { registerCortexTools } from "../src/tools/cortex.js";
import { registerStatusTools } from "../src/tools/status.js";
import { registerQueryTools } from "../src/tools/query.js";
import { registerTemplateTools } from "../src/tools/templates.js";

const mockConfig = {
  url: "https://thehive.example.com",
  apiKey: "test-key",
  verifySsl: true,
  timeout: 30000,
  allowDestructiveTools: false,
  enableRawQuery: false,
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

  it("should register 16 case tools", () => {
    registerCaseTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(16);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_list_cases");
    expect(toolNames).toContain("thehive_get_case");
    expect(toolNames).toContain("thehive_create_case");
    expect(toolNames).toContain("thehive_update_case");
    expect(toolNames).toContain("thehive_search_cases");
    expect(toolNames).toContain("thehive_close_case");
    expect(toolNames).toContain("thehive_assign_case");
    expect(toolNames).toContain("thehive_update_case_custom_fields");
    expect(toolNames).toContain("thehive_add_case_tags");
    expect(toolNames).toContain("thehive_remove_case_tags");
    expect(toolNames).toContain("thehive_set_case_flag");
    expect(toolNames).toContain("thehive_bulk_assign_cases");
    expect(toolNames).toContain("thehive_bulk_close_cases");
    expect(toolNames).toContain("thehive_case_timeline_summary");
    expect(toolNames).toContain("thehive_delete_case");
    expect(toolNames).toContain("thehive_merge_cases");
  });

  it("should register 6 alert tools", () => {
    registerAlertTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(6);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_list_alerts");
    expect(toolNames).toContain("thehive_get_alert");
    expect(toolNames).toContain("thehive_create_alert");
    expect(toolNames).toContain("thehive_update_alert");
    expect(toolNames).toContain("thehive_promote_alert");
    expect(toolNames).toContain("thehive_delete_alert");
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

  it("should register 5 observable tools", () => {
    registerObservableTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(5);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_list_observables");
    expect(toolNames).toContain("thehive_get_observable");
    expect(toolNames).toContain("thehive_create_observable");
    expect(toolNames).toContain("thehive_create_observable_bulk");
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

  it("should register 10 cortex tools", () => {
    registerCortexTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(10);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_list_responders");
    expect(toolNames).toContain("thehive_run_responder");
    expect(toolNames).toContain("thehive_list_actions");
    expect(toolNames).toContain("thehive_list_analyzers");
    expect(toolNames).toContain("thehive_get_observable_enrichment_options");
    expect(toolNames).toContain("thehive_run_analyzer");
    expect(toolNames).toContain("thehive_run_analyzer_and_wait");
    expect(toolNames).toContain("thehive_get_job");
    expect(toolNames).toContain("thehive_wait_for_job");
    expect(toolNames).toContain("thehive_summarize_job_report");
  });

  it("should register 1 status tool", () => {
    registerStatusTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(1);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_status");
  });

  it("should register 1 query tool", () => {
    registerQueryTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(1);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_query");
  });

  it("should register 1 template tool", () => {
    registerTemplateTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(1);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_list_case_templates");
  });

  it("should register all 50 tools total", () => {
    registerCaseTools(server, client);
    registerAlertTools(server, client);
    registerTaskTools(server, client);
    registerObservableTools(server, client);
    registerTaskLogTools(server, client);
    registerCommentTools(server, client);
    registerUserTools(server, client);
    registerCortexTools(server, client);
    registerStatusTools(server, client);
    registerQueryTools(server, client);
    registerTemplateTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(50);
  });

  it("should disable destructive case tools by default", async () => {
    registerCaseTools(server, client);

    const deleteTool = toolSpy.mock.calls.find(
      (call: unknown[]) => call[0] === "thehive_delete_case",
    );
    expect(deleteTool).toBeDefined();
    const handler = deleteTool?.[3] as (args: { caseId: string }) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

    const result = await handler({ caseId: "~123" });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true");
  });

  it("should disable destructive alert tools by default", async () => {
    registerAlertTools(server, client);

    const deleteTool = toolSpy.mock.calls.find(
      (call: unknown[]) => call[0] === "thehive_delete_alert",
    );
    expect(deleteTool).toBeDefined();
    const handler = deleteTool?.[3] as (args: { alertId: string }) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

    const result = await handler({ alertId: "~alert" });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true");
  });

  it("should gate thehive_merge_cases behind allowDestructiveTools", async () => {
    registerCaseTools(server, client);

    const mergeTool = toolSpy.mock.calls.find(
      (call: unknown[]) => call[0] === "thehive_merge_cases",
    );
    expect(mergeTool).toBeDefined();
    const handler = mergeTool?.[3] as (args: { caseIds: string[] }) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

    const result = await handler({ caseIds: ["~1", "~2"] });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("thehive_merge_cases is disabled");
    expect(result.content[0]?.text).toContain("THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true");
  });

  it("should allow thehive_merge_cases when allowDestructiveTools is true", async () => {
    const mergeSpy = vi
      .spyOn(client, "mergeCases")
      .mockResolvedValue({ _id: "~merged" } as never);
    registerCaseTools(server, client, { allowDestructiveTools: true });

    const mergeTool = toolSpy.mock.calls.find(
      (call: unknown[]) => call[0] === "thehive_merge_cases",
    );
    const handler = mergeTool?.[3] as (args: { caseIds: string[] }) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

    const result = await handler({ caseIds: ["~1", "~2"] });

    expect(result.isError).toBeUndefined();
    expect(mergeSpy).toHaveBeenCalledWith(["~1", "~2"]);
  });

  it("should gate thehive_promote_alert behind allowDestructiveTools", async () => {
    registerAlertTools(server, client);

    const promoteTool = toolSpy.mock.calls.find(
      (call: unknown[]) => call[0] === "thehive_promote_alert",
    );
    expect(promoteTool).toBeDefined();
    const handler = promoteTool?.[3] as (args: { alertId: string }) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

    const result = await handler({ alertId: "~alert" });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("thehive_promote_alert is disabled");
    expect(result.content[0]?.text).toContain("THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true");
  });

  it("should allow thehive_promote_alert when allowDestructiveTools is true", async () => {
    const promoteSpy = vi
      .spyOn(client, "promoteAlert")
      .mockResolvedValue({ _id: "~case" } as never);
    registerAlertTools(server, client, { allowDestructiveTools: true });

    const promoteTool = toolSpy.mock.calls.find(
      (call: unknown[]) => call[0] === "thehive_promote_alert",
    );
    const handler = promoteTool?.[3] as (args: { alertId: string }) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

    const result = await handler({ alertId: "~alert" });

    expect(result.isError).toBeUndefined();
    expect(promoteSpy).toHaveBeenCalledWith("~alert");
  });

  it("should disable raw query tools by default", async () => {
    registerQueryTools(server, client);

    const queryTool = toolSpy.mock.calls.find(
      (call: unknown[]) => call[0] === "thehive_query",
    );
    expect(queryTool).toBeDefined();
    const handler = queryTool?.[3] as (args: { query: string }) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

    const result = await handler({ query: "[{\"_name\":\"listCase\"}]" });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("THEHIVE_ENABLE_RAW_QUERY=true");
  });

  describe("cortex responder tools", () => {
    type ToolResult = { isError?: boolean; content: Array<{ text: string }> };
    const handlerOf = (name: string) => {
      const call = toolSpy.mock.calls.find((c: unknown[]) => c[0] === name);
      expect(call, name).toBeDefined();
      return call?.at(-1) as (args: Record<string, unknown>) => Promise<ToolResult>;
    };
    const runArgs = {
      responderId: "~r1",
      objectType: "case",
      objectId: "~c1",
    };

    it("gates thehive_run_responder and sends no request when disabled", async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const runSpy = vi.spyOn(client, "runResponder");
      registerCortexTools(server, client);

      const result = await handlerOf("thehive_run_responder")(runArgs);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("thehive_run_responder is disabled");
      expect(result.content[0]?.text).toContain("THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true");
      expect(runSpy).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it("runs a responder when allowDestructiveTools is true", async () => {
      const runSpy = vi
        .spyOn(client, "runResponder")
        .mockResolvedValue({ _id: "~act1" });
      registerCortexTools(server, client, { allowDestructiveTools: true });

      const result = await handlerOf("thehive_run_responder")({
        ...runArgs,
        cortexId: "cortex",
        parameters: { message: "notify" },
        tlp: 2,
      });

      expect(result.isError).toBeUndefined();
      expect(runSpy).toHaveBeenCalledWith({
        ...runArgs,
        cortexId: "cortex",
        parameters: { message: "notify" },
        tlp: 2,
      });
    });

    it("reports upstream errors from thehive_run_responder", async () => {
      vi.spyOn(client, "runResponder").mockRejectedValue(
        new Error("TheHive API access denied - insufficient permissions"),
      );
      registerCortexTools(server, client, { allowDestructiveTools: true });

      const result = await handlerOf("thehive_run_responder")(runArgs);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("Error running responder");
    });

    it("lists responders and actions without the destructive flag", async () => {
      const respondersSpy = vi
        .spyOn(client, "listResponders")
        .mockResolvedValue([{ id: "~r1" }]);
      const actionsSpy = vi
        .spyOn(client, "listActions")
        .mockResolvedValue([{ _id: "~act1" }]);
      registerCortexTools(server, client);

      const responders = await handlerOf("thehive_list_responders")({
        entityType: "case",
        entityId: "~c1",
      });
      const actions = await handlerOf("thehive_list_actions")({
        entityType: "alert",
        entityId: "~a1",
      });

      expect(responders.isError).toBeUndefined();
      expect(respondersSpy).toHaveBeenCalledWith("case", "~c1");
      expect(actions.isError).toBeUndefined();
      expect(actionsSpy).toHaveBeenCalledWith("alert", "~a1");
    });

    it("reports upstream errors from the read tools", async () => {
      vi.spyOn(client, "listResponders").mockRejectedValue(new Error("TheHive API resource not found"));
      vi.spyOn(client, "listActions").mockRejectedValue(new Error("TheHive API resource not found"));
      registerCortexTools(server, client);

      const responders = await handlerOf("thehive_list_responders")({ entityType: "case", entityId: "~c1" });
      const actions = await handlerOf("thehive_list_actions")({ entityType: "case", entityId: "~c1" });

      expect(responders.isError).toBe(true);
      expect(actions.isError).toBe(true);
    });

    it("annotates the run tool as destructive and the read tools as read-only", () => {
      registerCortexTools(server, client);
      const annotationsOf = (name: string) =>
        toolSpy.mock.calls.find((c: unknown[]) => c[0] === name)?.[3] as Record<string, boolean>;

      expect(annotationsOf("thehive_run_responder")).toMatchObject({
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      });
      expect(annotationsOf("thehive_list_responders").readOnlyHint).toBe(true);
      expect(annotationsOf("thehive_list_actions").readOnlyHint).toBe(true);
    });
  });
});
