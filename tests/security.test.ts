import { afterEach, describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TheHiveClient } from "../src/client.js";
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";
import { z } from "zod";
import { registerTool } from "../src/tools/safety.js";
import { READ_ONLY } from "../src/tools/annotations.js";
const modules = import.meta.glob("../src/tools/*.ts", { eager: true });
const registrations = Object.values(modules).flatMap((module: any) =>
  Object.entries(module).filter(([name]) => /^register.*Tools$/.test(name)).map(([, fn]) => fn as Function));

const config = { url: "https://thehive.example.com", apiKey: "fixture", verifySsl: true,
  timeout: 1000, allowDestructiveTools: false, enableRawQuery: false };
const mutations: [string, Record<string, unknown>][] = [
  ["thehive_create_case", { title: "incident" }],
  ["thehive_update_case", { caseId: "~1", title: "reviewed", status: "FalsePositive" }],
  ["thehive_close_case", { caseId: "~1", status: "FalsePositive", summary: "reviewed" }],
  ["thehive_assign_case", { caseId: "~1", owner: "analyst" }],
  ["thehive_update_case_custom_fields", { caseId: "~1", customFields: { reviewed: true } }],
  ["thehive_add_case_tags", { caseId: "~1", tags: ["reviewed"] }],
  ["thehive_remove_case_tags", { caseId: "~1", tags: ["reviewed"] }],
  ["thehive_set_case_flag", { caseId: "~1", flag: true }],
  ["thehive_bulk_assign_cases", { caseIds: ["~1", "~2"], owner: "analyst" }],
  ["thehive_bulk_close_cases", { caseIds: ["~1"], status: "FalsePositive", summary: "reviewed" }],
  ["thehive_delete_case", { caseId: "~1" }],
  ["thehive_merge_cases", { caseIds: ["~1", "~2"] }],
  ["thehive_create_alert", { title: "incident", type: "event", source: "fixture", sourceRef: "1" }],
  ["thehive_update_alert", { alertId: "~1", status: "Ignored" }],
  ["thehive_promote_alert", { alertId: "~1" }],
  ["thehive_delete_alert", { alertId: "~1" }],
  ["thehive_create_alert_observable", { alertId: "~1", dataType: "ip", data: "198.51.100.7" }],
  ["thehive_create_alert_comment", { alertId: "~1", message: "reviewed" }],
  ["thehive_create_task", { caseId: "~1", title: "triage" }],
  ["thehive_update_task", { taskId: "~1", status: "Completed" }],
  ["thehive_create_observable", { caseId: "~1", dataType: "ip", data: "198.51.100.7" }],
  ["thehive_update_observable", { observableId: "~1", ioc: true }],
  ["thehive_create_observable_bulk", { caseId: "~1", dataType: "ip", data: ["198.51.100.7"] }],
  ["thehive_create_task_log", { taskId: "~1", message: "reviewed" }],
  ["thehive_create_comment", { caseId: "~1", message: "reviewed" }],
  ["thehive_run_analyzer", { analyzerId: "fixture", cortexId: "fixture", observableId: "~1" }],
  ["thehive_run_analyzer_and_wait", { analyzerId: "fixture", cortexId: "fixture", observableId: "~1", maxAttempts: 1 }],
  ["thehive_run_responder", { objectType: "case", objectId: "~1", responderId: "~r" }],
];
function setup(enabled = false) {
  const server = new McpServer({ name: "security-test", version: "0" });
  const tools = new Map<string, any>();
  const schemas = new Map<string, any>();
  server.tool = vi.fn((...args: any[]) => { tools.set(args[0], args.at(-1)); schemas.set(args[0], z.object(args[2])); }) as any;
  const client = new TheHiveClient(config);
  for (const register of registrations) register(server, client, { allowDestructiveTools: enabled });
  const fetchSpy = vi.fn(async () => new Response('{"_id":"~1","status":"Success","tags":[]}', { status: 200 }));
  vi.stubGlobal("fetch", fetchSpy);
  return { tools, fetchSpy, schemas };
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
    for (const controls of [{}, { dryRun: true, confirm: true }, { confirm: true }]) {
      const result = await tools.get(name)({ ...args, ...controls });
      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('"dryRun": true');
      expect(result.content[0].text).toContain(name);
    }
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
    const { tools, fetchSpy, schemas } = setup(true);
    const parsed = schemas.get(name).parse({ ...args, dryRun: false, confirm: true });
    const result = await tools.get(name)(parsed);
    expect(result.isError).not.toBe(true);
    expect(fetchSpy).toHaveBeenCalled();
    for (const [, options] of fetchSpy.mock.calls as unknown as [string, RequestInit][]) {
      expect(options.body ?? "").not.toMatch(/"(?:confirm|dryRun)"/);
    }
  });
  it.each([
    ["thehive_update_case", { caseId: "~1", title: "reviewed" }],
    ["thehive_update_alert", { alertId: "~1", title: "reviewed" }],
    ["thehive_create_case", { title: "incident" }],
  ])("honors explicit dry-run for non-state %s changes", async (name, args) => {
    const { tools, fetchSpy } = setup(true);
    const result = await tools.get(name)({ ...args, dryRun: true });
    expect(JSON.parse(result.content[0].text).data.dryRun).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("keeps reads available while ordinary metadata edits require authority", async () => {
    const { tools, fetchSpy } = setup();
    await tools.get("thehive_get_case")({ caseId: "~1" });
    await tools.get("thehive_update_case")({ caseId: "~1", title: "reviewed" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

// Static inventory supplements the executable table: newly added client write sinks,
// handlers, and modules must enter the same negative/positive network checks.
function visit(node: ts.Node, fn: (n: ts.Node) => void) {
  fn(node); ts.forEachChild(node, (child) => visit(child, fn));
}
function parse(path: string) {
  return ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
}
it("covers every registered handler reaching an HTTP mutation sink, independent of annotations", () => {
  const clientMethods = new Map<string, ts.MethodDeclaration>();
  visit(parse("src/client.ts"), (node) => {
    if (ts.isMethodDeclaration(node)) clientMethods.set(node.name.getText(), node);
  });
  function mutates(name: string, seen = new Set<string>()): boolean {
    if (seen.has(name)) return false;
    seen.add(name);
    const method = clientMethods.get(name);
    expect(method, `unresolved client method ${name}`).toBeDefined();
    let result = false;
    visit(method!, (node) => {
      if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) ||
          node.expression.expression.kind !== ts.SyntaxKind.ThisKeyword) return;
      const callee = node.expression.name.text;
      if (["request", "connectorRequest", "fetchJson"].includes(callee)) {
        const options = node.arguments[1];
        if (!options) return; // GET default
        expect(ts.isObjectLiteralExpression(options), "unknown HTTP options require sink review").toBe(true);
        if (!ts.isObjectLiteralExpression(options)) return;
        const verb = options.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText() === "method") as ts.PropertyAssignment | undefined;
        if (!verb) return;
        expect(ts.isStringLiteral(verb.initializer), "dynamic HTTP verb requires review").toBe(true);
        const value = ts.isStringLiteral(verb.initializer) ? verb.initializer.text : "UNKNOWN";
        // TheHive's query endpoint uses POST for reads. No other POST is exempt.
        const path = node.arguments[0].getText();
        const queryRead = value === "POST" && /^`\/query(?:\?|\$\{)/.test(path);
        if (!["GET", "HEAD"].includes(value) && !queryRead) result = true;
      } else if (clientMethods.has(callee) && mutates(callee, new Set(seen))) result = true;
    });
    return result;
  }
  const inventory: string[] = [];
  let registered = 0;
  for (const file of readdirSync("src/tools").filter((f) => f.endsWith(".ts"))) {
    visit(parse(`src/tools/${file}`), (node) => {
      if (!ts.isCallExpression(node)) return;
      if (file !== "safety.ts" && ts.isPropertyAccessExpression(node.expression) &&
          ["tool", "registerTool"].includes(node.expression.name.text)) {
        expect.fail(`${file} bypasses the central tool registration policy`);
      }
      const expression = node.expression.getText();
      if (expression !== "server.tool" && expression !== "registerTool") return;
      const offset = expression === "registerTool" ? 2 : 0;
      const name = node.arguments[offset];
      if (!name || !ts.isStringLiteral(name)) return;
      registered++;
      let writes = false;
      visit(node.arguments.at(-1)!, (child) => {
        if (ts.isCallExpression(child) && ts.isPropertyAccessExpression(child.expression) &&
            child.expression.expression.getText() === "client" && mutates(child.expression.name.text)) writes = true;
      });
      if (writes) inventory.push(name.text);
    });
  }
  expect(registered).toBe(setup().tools.size);
  expect(inventory.sort()).toEqual(mutations.map(([name]) => name).sort());
});

it("denies a future unknown write even if annotated read-only", async () => {
  const server = new McpServer({ name: "future", version: "0" });
  let callback: any;
  server.tool = vi.fn((...args: any[]) => { callback = args.at(-1); }) as any;
  const execute = vi.fn(async () => ({ content: [] }));
  registerTool(server, {}, "thehive_future_write", "new operation", {}, READ_ONLY, execute);
  expect((await callback({ confirm: true, dryRun: false })).isError).toBe(true);
  expect(execute).not.toHaveBeenCalled();
});

it("reports an uncertain existing analyzer job after polling times out without resubmitting", async () => {
  const { tools, fetchSpy } = setup(true);
  fetchSpy.mockImplementation(async () => new Response('{"_id":"untrusted-job-id","status":"InProgress"}'));
  const result = await tools.get("thehive_run_analyzer_and_wait")({
    analyzerId: "fixture", cortexId: "fixture", observableId: "~1", maxAttempts: 1,
    dryRun: false, confirm: true,
  });
  expect(result.isError).toBe(true);
  const parsed = JSON.parse(result.content[0].text);
  expect(parsed.provenance.trust).toBe("untrusted");
  expect(parsed.data.outcome).toBe("uncertain");
  expect(parsed.data.started._id).toBe("untrusted-job-id");
  expect(parsed.data.note).toContain("Do not resubmit");
  expect(fetchSpy.mock.calls.filter(([, options]: any) => options.method === "POST")).toHaveLength(1);
});
