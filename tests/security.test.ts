import { afterEach, describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TheHiveClient } from "../src/client.js";
import { registerCaseTools } from "../src/tools/cases.js";
import { registerAlertTools } from "../src/tools/alerts.js";
import { registerCortexTools } from "../src/tools/cortex.js";

const config = { url: "https://thehive.example.com", apiKey: "fixture", verifySsl: true,
  timeout: 1000, allowDestructiveTools: false, enableRawQuery: false };
const mutations: [string, Record<string, unknown>][] = [
  ["thehive_close_case", { caseId: "~1", status: "FalsePositive", summary: "reviewed" }],
  ["thehive_assign_case", { caseId: "~1", owner: "analyst" }],
  ...["status", "owner", "resolutionStatus", "impactStatus"].map((field): [string, Record<string, unknown>] =>
    ["thehive_update_case", { caseId: "~1", [field]: field === "owner" ? "analyst" : field === "impactStatus" ? "NoImpact" : "FalsePositive" }]),
  ["thehive_create_case", { title: "incident", owner: "analyst" }],
  ["thehive_bulk_assign_cases", { caseIds: ["~1", "~2"], owner: "analyst" }],
  ["thehive_bulk_close_cases", { caseIds: ["~1"], status: "FalsePositive", summary: "reviewed" }],
  ["thehive_delete_case", { caseId: "~1" }],
  ["thehive_merge_cases", { caseIds: ["~1", "~2"] }],
  ["thehive_update_alert", { alertId: "~1", status: "Ignored" }],
  ["thehive_promote_alert", { alertId: "~1" }],
  ["thehive_delete_alert", { alertId: "~1" }],
  ["thehive_run_responder", { objectType: "case", objectId: "~1", responderId: "~r" }],
];
function setup(enabled = false) {
  const server = new McpServer({ name: "security-test", version: "0" });
  const tools = new Map<string, any>();
  server.tool = vi.fn((...args: any[]) => { tools.set(args[0], args.at(-1)); }) as any;
  const client = new TheHiveClient(config);
  registerCaseTools(server, client, { allowDestructiveTools: enabled });
  registerAlertTools(server, client, { allowDestructiveTools: enabled });
  registerCortexTools(server, client, { allowDestructiveTools: enabled });
  const fetchSpy = vi.fn(async () => new Response('{"_id":"~1"}', { status: 200 }));
  vi.stubGlobal("fetch", fetchSpy);
  return { tools, fetchSpy };
}
afterEach(() => vi.unstubAllGlobals());
describe("SOC-1 operator policy at MCP boundary", () => {
  it.each(mutations)("denies %s without operator authority, including confirmed calls", async (name, args) => {
    const { tools, fetchSpy } = setup();
    const result = await tools.get(name)({ ...args, confirm: true, dryRun: false });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("is disabled");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it.each(mutations)("previews %s by default with zero network calls", async (name, args) => {
    const { tools, fetchSpy } = setup(true);
    const result = await tools.get(name)(args);
    expect(result.isError).not.toBe(true);
    expect(result.content[0].text).toContain('"dryRun": true');
    expect(result.content[0].text).toContain(name);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it.each(mutations)("requires confirmation for %s execution", async (name, args) => {
    const { tools, fetchSpy } = setup(true);
    const result = await tools.get(name)({ ...args, dryRun: false });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("confirm=true");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it.each(mutations)("executes explicitly confirmed %s with authority", async (name, args) => {
    const { tools, fetchSpy } = setup(true);
    const result = await tools.get(name)({ ...args, dryRun: false, confirm: true });
    expect(result.isError).not.toBe(true);
    expect(fetchSpy).toHaveBeenCalled();
    for (const [, options] of fetchSpy.mock.calls as unknown as [string, RequestInit][]) {
      expect(options.body ?? "").not.toMatch(/"(?:confirm|dryRun)"/);
    }
  });
  it("keeps reads and non-state case edits available", async () => {
    const { tools, fetchSpy } = setup();
    await tools.get("thehive_get_case")({ caseId: "~1" });
    await tools.get("thehive_update_case")({ caseId: "~1", title: "reviewed" });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});
