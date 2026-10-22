import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TheHiveClient } from "../src/client.js";
import { registerCaseTools } from "../src/tools/cases.js";
import { registerAlertTools } from "../src/tools/alerts.js";
import { registerAlertDetailTools } from "../src/tools/alert-details.js";
import { registerTaskTools } from "../src/tools/tasks.js";
import { registerObservableTools } from "../src/tools/observables.js";
import { registerTaskLogTools } from "../src/tools/task-logs.js";
import { registerCommentTools } from "../src/tools/comments.js";
import { registerUserTools } from "../src/tools/users.js";
import { registerCortexTools } from "../src/tools/cortex.js";
import { registerStatusTools } from "../src/tools/status.js";
import { registerQueryTools } from "../src/tools/query.js";
import { registerTemplateTools } from "../src/tools/templates.js";
import { MAX_OUTPUT_CHARS } from "../src/tools/output.js";

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

  it("should register 4 alert detail tools", () => {
    registerAlertDetailTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(4);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
    expect(toolNames).toContain("thehive_list_alert_observables");
    expect(toolNames).toContain("thehive_list_alert_comments");
    expect(toolNames).toContain("thehive_create_alert_observable");
    expect(toolNames).toContain("thehive_create_alert_comment");
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

  it("should register 7 cortex tools", () => {
    registerCortexTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(7);

    const toolNames = toolSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );
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

  it("should register all 51 tools total", () => {
    registerCaseTools(server, client);
    registerAlertTools(server, client);
    registerAlertDetailTools(server, client);
    registerTaskTools(server, client);
    registerObservableTools(server, client);
    registerTaskLogTools(server, client);
    registerCommentTools(server, client);
    registerUserTools(server, client);
    registerCortexTools(server, client);
    registerStatusTools(server, client);
    registerQueryTools(server, client);
    registerTemplateTools(server, client);

    expect(toolSpy).toHaveBeenCalledTimes(51);
  });

  it("should disable destructive case tools by default", async () => {
    registerCaseTools(server, client);

    const deleteTool = toolSpy.mock.calls.find(
      (call: unknown[]) => call[0] === "thehive_delete_case",
    );
    expect(deleteTool).toBeDefined();
    const handler = deleteTool?.at(-1) as (args: { caseId: string }) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

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
    const handler = deleteTool?.at(-1) as (args: { alertId: string }) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

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
    const handler = mergeTool?.at(-1) as (args: { caseIds: string[] }) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

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
    const handler = mergeTool?.at(-1) as (args: { caseIds: string[] }) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

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
    const handler = promoteTool?.at(-1) as (args: { alertId: string }) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

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
    const handler = promoteTool?.at(-1) as (args: { alertId: string }) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

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
    const handler = queryTool?.at(-1) as (args: { query: string }) => Promise<{ isError?: boolean; content: Array<{ text: string }> }>;

    const result = await handler({ query: "[{\"_name\":\"listCase\"}]" });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("THEHIVE_ENABLE_RAW_QUERY=true");
  });

  describe("alert detail tools", () => {
    type ToolResult = { isError?: boolean; content: Array<{ text: string }> };
    const handlerOf = (name: string) => {
      registerAlertDetailTools(server, client);
      const call = toolSpy.mock.calls.find((c: unknown[]) => c[0] === name);
      expect(call, name).toBeDefined();
      return call?.at(-1) as (args: Record<string, unknown>) => Promise<ToolResult>;
    };
    const schemaOf = (name: string) => {
      registerAlertDetailTools(server, client);
      const call = toolSpy.mock.calls.find((c: unknown[]) => c[0] === name);
      return z.object(call?.[2] as z.ZodRawShape);
    };

    it("lists alert observables and comments", async () => {
      const obsSpy = vi
        .spyOn(client, "listAlertObservables")
        .mockResolvedValue([{ _id: "~o1", dataType: "ip" }] as never);
      const commentSpy = vi
        .spyOn(client, "listAlertComments")
        .mockResolvedValue([{ _id: "~m1", message: "hi" }] as never);

      const observables = await handlerOf("thehive_list_alert_observables")({
        alertId: "~a1",
        limit: 10,
      });
      const comments = await handlerOf("thehive_list_alert_comments")({ alertId: "~a1" });

      expect(obsSpy).toHaveBeenCalledWith("~a1", 10);
      expect(JSON.parse(observables.content[0]?.text ?? "[]")[0]._id).toBe("~o1");
      expect(commentSpy).toHaveBeenCalledWith("~a1", undefined);
      expect(JSON.parse(comments.content[0]?.text ?? "[]")[0]._id).toBe("~m1");
    });

    it("creates an alert observable and comment without any gate", async () => {
      const obsSpy = vi
        .spyOn(client, "createAlertObservable")
        .mockResolvedValue({ _id: "~o2", dataType: "ip" } as never);
      const commentSpy = vi
        .spyOn(client, "createAlertComment")
        .mockResolvedValue({ _id: "~m2", message: "Triaged" } as never);

      const observable = await handlerOf("thehive_create_alert_observable")({
        alertId: "~a1",
        dataType: "ip",
        data: "198.51.100.7",
        ioc: true,
      });
      const comment = await handlerOf("thehive_create_alert_comment")({
        alertId: "~a1",
        message: "Triaged",
      });

      expect(observable.isError).toBeUndefined();
      expect(obsSpy).toHaveBeenCalledWith("~a1", {
        dataType: "ip",
        data: "198.51.100.7",
        ioc: true,
      });
      expect(comment.isError).toBeUndefined();
      expect(commentSpy).toHaveBeenCalledWith("~a1", "Triaged");
    });

    it("returns isError when an upstream call fails", async () => {
      vi.spyOn(client, "listAlertObservables").mockRejectedValue(new Error("TheHive API resource not found"));
      vi.spyOn(client, "listAlertComments").mockRejectedValue(new Error("TheHive API resource not found"));
      vi.spyOn(client, "createAlertObservable").mockRejectedValue(new Error("TheHive API access denied"));
      vi.spyOn(client, "createAlertComment").mockRejectedValue(new Error("TheHive API access denied"));

      const results = [
        await handlerOf("thehive_list_alert_observables")({ alertId: "~a1" }),
        await handlerOf("thehive_list_alert_comments")({ alertId: "~a1" }),
        await handlerOf("thehive_create_alert_observable")({ alertId: "~a1", dataType: "ip", data: "198.51.100.7" }),
        await handlerOf("thehive_create_alert_comment")({ alertId: "~a1", message: "x" }),
      ];

      for (const result of results) {
        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toMatch(/^Error /);
      }
    });

    it("validates arguments", () => {
      const listSchema = schemaOf("thehive_list_alert_observables");
      expect(listSchema.safeParse({ alertId: "~a1", limit: 0 }).success).toBe(false);
      expect(listSchema.safeParse({ alertId: "~a1", limit: 501 }).success).toBe(false);
      expect(listSchema.safeParse({ alertId: "~a1", limit: 500 }).success).toBe(true);

      const createSchema = schemaOf("thehive_create_alert_observable");
      expect(createSchema.safeParse({ alertId: "~a1", dataType: "bogus", data: "x" }).success).toBe(false);
      expect(createSchema.safeParse({ alertId: "~a1", dataType: "ip", data: "x", tlp: 9 }).success).toBe(false);
      expect(createSchema.safeParse({ alertId: "~a1", dataType: "ip", data: "x", tlp: 4 }).success).toBe(true);

      const commentSchema = schemaOf("thehive_create_alert_comment");
      expect(commentSchema.safeParse({ alertId: "~a1", message: "" }).success).toBe(false);
      expect(commentSchema.safeParse({ alertId: "~a1" }).success).toBe(false);
    });
  });
  type ToolResult = { isError?: boolean; content: Array<{ text: string }> };
  const handlerOf = (name: string) =>
    toolSpy.mock.calls.find((call: unknown[]) => call[0] === name)?.at(-1) as (
      args: Record<string, unknown>,
    ) => Promise<ToolResult>;

  it("should gate bulk case tools behind allowDestructiveTools", async () => {
    const updateSpy = vi.spyOn(client, "updateCase");
    registerCaseTools(server, client);

    const assigned = await handlerOf("thehive_bulk_assign_cases")({
      caseIds: ["~1", "~2"],
      owner: "analyst@example.com",
    });
    const closed = await handlerOf("thehive_bulk_close_cases")({
      caseIds: ["~1", "~2"],
      status: "FalsePositive",
      summary: "Duplicate of an earlier case",
    });

    for (const result of [assigned, closed]) {
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true");
    }
    expect(assigned.content[0]?.text).toContain("thehive_bulk_assign_cases is disabled");
    expect(closed.content[0]?.text).toContain("thehive_bulk_close_cases is disabled");
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("should run bulk case tools when allowDestructiveTools is true", async () => {
    const updateSpy = vi
      .spyOn(client, "updateCase")
      .mockResolvedValue({ _id: "~ok" } as never);
    registerCaseTools(server, client, { allowDestructiveTools: true });

    const assigned = await handlerOf("thehive_bulk_assign_cases")({
      caseIds: ["~1", "~2"],
      owner: "analyst@example.com",
    });
    const closed = await handlerOf("thehive_bulk_close_cases")({
      caseIds: ["~3"],
      status: "TruePositive",
      summary: "Confirmed",
    });

    expect(assigned.isError).toBe(false);
    expect(JSON.parse(assigned.content[0]?.text ?? "{}").succeeded).toBe(2);
    expect(closed.isError).toBe(false);
    expect(updateSpy).toHaveBeenCalledWith("~1", { owner: "analyst@example.com" });
    expect(updateSpy).toHaveBeenCalledWith("~3", {
      status: "TruePositive",
      summary: "Confirmed",
    });
  });

  it("should declare annotations on every tool", () => {
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

    for (const call of toolSpy.mock.calls as unknown[][]) {
      const annotations = call[3] as Record<string, unknown> | undefined;
      expect(annotations, `${String(call[0])} annotations`).toBeDefined();
      expect(typeof annotations?.readOnlyHint, `${String(call[0])} readOnlyHint`).toBe("boolean");
      expect(typeof annotations?.destructiveHint, `${String(call[0])} destructiveHint`).toBe("boolean");
      expect(typeof annotations?.idempotentHint, `${String(call[0])} idempotentHint`).toBe("boolean");
      expect(typeof annotations?.openWorldHint, `${String(call[0])} openWorldHint`).toBe("boolean");
    }
  });

  it("should mark gated tools as destructive and list tools as read-only", () => {
    registerCaseTools(server, client);
    registerAlertTools(server, client);

    const annotationsOf = (name: string) =>
      toolSpy.mock.calls.find((call: unknown[]) => call[0] === name)?.[3] as {
        readOnlyHint: boolean;
        destructiveHint: boolean;
      };

    for (const name of [
      "thehive_delete_case",
      "thehive_merge_cases",
      "thehive_delete_alert",
      "thehive_promote_alert",
      "thehive_bulk_assign_cases",
      "thehive_bulk_close_cases",
    ]) {
      expect(annotationsOf(name).readOnlyHint, name).toBe(false);
      expect(annotationsOf(name).destructiveHint, name).toBe(true);
    }
    for (const name of ["thehive_list_cases", "thehive_get_case", "thehive_list_alerts"]) {
      expect(annotationsOf(name).readOnlyHint, name).toBe(true);
    }
  });

  it("should truncate oversized tool output", async () => {
    const huge = Array.from({ length: 5000 }, (_, i) => ({
      _id: `~${i}`,
      title: "x".repeat(60),
    }));
    vi.spyOn(client, "listCases").mockResolvedValue(huge as never);
    registerCaseTools(server, client);

    const result = await handlerOf("thehive_list_cases")({});

    const text = result.content[0]?.text ?? "";
    expect(text.length).toBeLessThan(MAX_OUTPUT_CHARS + 500);
    expect(text).toContain("output truncated");
  });
});
