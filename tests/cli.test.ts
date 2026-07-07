import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { HELP, parseArgs, run, type TheHiveCtrlDeps } from "../src/cli.js";
import {
  CliGateError,
  requireDestructiveCliGate,
  requireRawQueryCliGate,
} from "../src/cli-safety.js";
import type { TheHiveClient } from "../src/client.js";
import type { TheHiveConfig } from "../src/config.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { bin?: Record<string, string> };

const mockConfig: TheHiveConfig = {
  url: "https://thehive.example.com",
  apiKey: "test-api-key-123",
  verifySsl: true,
  timeout: 30_000,
  allowDestructiveTools: false,
  enableRawQuery: false,
};

function capture(client: Partial<TheHiveClient>, deps: Partial<TheHiveCtrlDeps> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const resolvedDeps: Partial<TheHiveCtrlDeps> = {
    out: (text) => out.push(text),
    err: (text) => err.push(text),
    getConfig: () => mockConfig,
    makeClient: () => client as TheHiveClient,
    serve: vi.fn().mockResolvedValue(undefined),
    ...deps,
  };
  return { out, err, deps: resolvedDeps };
}

describe("thehivectrl CLI", () => {
  it("documents thehivectrl as the primary CLI and keeps compatibility bins", () => {
    expect(HELP).toContain("thehivectrl - TheHive incident-response control CLI");
    expect(HELP).toContain("alias: thehivectl");
    expect(packageJson.bin).toMatchObject({
      thehivectrl: "./dist/cli.js",
      thehivectl: "./dist/cli.js",
      "thehive-mcp": "./dist/mcp-bin.js",
    });
  });

  it("parses the first-slice commands", () => {
    expect(parseArgs(["status", "--json"])).toEqual({ kind: "status", json: true });
    expect(parseArgs(["cases", "list", "--limit", "20", "--status", "New"])).toMatchObject({
      kind: "cases list",
      limit: 20,
      status: "New",
    });
    expect(parseArgs(["cases", "get", "~123"])).toEqual({
      kind: "cases get",
      json: false,
      caseId: "~123",
    });
    expect(parseArgs(["alerts", "list", "--source", "Wazuh"])).toMatchObject({
      kind: "alerts list",
      source: "Wazuh",
    });
  });

  it("runs thehivectrl status --json", async () => {
    const client = {
      getStatus: vi.fn().mockResolvedValue({
        versions: {
          Scalligraph: "5.4.11",
          TheHive: "5.4.11",
          Play: "2.8.22",
        },
        config: {
          authType: ["local"],
          capabilities: ["misp", "cortex"],
          ssoAutoLogin: false,
        },
      }),
    };
    const { out, deps } = capture(client);

    await expect(run(["status", "--json"], deps)).resolves.toBe(0);

    const data = JSON.parse(out[0]) as Record<string, any>;
    expect(data.versions.TheHive).toBe("5.4.11");
    expect(data.capabilities).toEqual(["misp", "cortex"]);
    expect(client.getStatus).toHaveBeenCalledTimes(1);
  });

  it("runs thehivectrl cases list --limit 20", async () => {
    const client = {
      listCases: vi.fn().mockResolvedValue([
        {
          _id: "~case-1",
          number: 42,
          title: "Phishing triage",
          status: "New",
          severity: 3,
          owner: "analyst",
          tags: ["phishing"],
          _createdAt: 1783321200000,
        },
      ]),
    };
    const { out, deps } = capture(client);

    await expect(run(["cases", "list", "--limit", "20"], deps)).resolves.toBe(0);

    expect(client.listCases).toHaveBeenCalledWith({
      status: undefined,
      severity: undefined,
      tags: undefined,
      owner: undefined,
      limit: 20,
    });
    expect(out.join("\n")).toContain("cases count=1 limit=20");
    expect(out.join("\n")).toContain("id=~case-1");
    expect(out.join("\n")).toContain("title=\"Phishing triage\"");
  });

  it("runs thehivectrl cases get", async () => {
    const client = {
      getCase: vi.fn().mockResolvedValue({
        _id: "~case-1",
        number: 42,
        title: "Phishing triage",
        status: "InProgress",
        severity: 3,
      }),
    };
    const { out, deps } = capture(client);

    await expect(run(["cases", "get", "~case-1"], deps)).resolves.toBe(0);

    expect(client.getCase).toHaveBeenCalledWith("~case-1");
    expect(out.join("\n")).toContain("id=~case-1");
    expect(out.join("\n")).toContain("status=InProgress");
  });

  it("runs thehivectrl alerts list", async () => {
    const client = {
      listAlerts: vi.fn().mockResolvedValue([
        {
          _id: "~alert-1",
          title: "Wazuh brute force",
          status: "New",
          severity: 2,
          source: "Wazuh",
          type: "wazuh",
          sourceRef: "rule-5710",
        },
      ]),
    };
    const { out, deps } = capture(client);

    await expect(run(["alerts", "list", "--source", "Wazuh"], deps)).resolves.toBe(0);

    expect(client.listAlerts).toHaveBeenCalledWith({
      status: undefined,
      severity: undefined,
      tags: undefined,
      source: "Wazuh",
      type: undefined,
      limit: 50,
    });
    expect(out.join("\n")).toContain("alerts count=1 limit=50");
    expect(out.join("\n")).toContain("source=Wazuh");
  });

  it("redacts API keys from CLI errors", async () => {
    const client = {
      listCases: vi.fn().mockRejectedValue(new Error("boom test-api-key-123 Bearer abc.def.ghi")),
    };
    const { err, deps } = capture(client);

    await expect(run(["cases", "list"], deps)).resolves.toBe(1);

    expect(err.join("\n")).not.toContain("test-api-key-123");
    expect(err.join("\n")).not.toContain("abc.def.ghi");
    expect(err.join("\n")).toContain("[REDACTED]");
  });

  it("delegates thehivectrl mcp to the MCP server", async () => {
    const serve = vi.fn().mockResolvedValue(undefined);
    const { deps } = capture({}, { serve });

    await expect(run(["mcp"], deps)).resolves.toBe(0);

    expect(serve).toHaveBeenCalledTimes(1);
  });
});

describe("thehivectrl safety gates", () => {
  it("requires env opt-in plus flags for destructive CLI commands", () => {
    expect(() =>
      requireDestructiveCliGate({
        toolName: "thehive_delete_case",
        env: {},
        confirm: true,
        destructive: true,
      }),
    ).toThrow(CliGateError);

    expect(() =>
      requireDestructiveCliGate({
        toolName: "thehive_delete_case",
        env: { THEHIVE_ALLOW_DESTRUCTIVE_TOOLS: "true" },
        confirm: true,
        destructive: false,
      }),
    ).toThrow("--confirm and --destructive");

    expect(() =>
      requireDestructiveCliGate({
        toolName: "thehive_delete_case",
        env: { THEHIVE_ALLOW_DESTRUCTIVE_TOOLS: "true" },
        confirm: true,
        destructive: true,
      }),
    ).not.toThrow();
  });

  it("requires env opt-in plus --confirm-raw for raw query CLI commands", () => {
    expect(() =>
      requireRawQueryCliGate({
        env: {},
        confirmRaw: true,
      }),
    ).toThrow(CliGateError);

    expect(() =>
      requireRawQueryCliGate({
        env: { THEHIVE_ENABLE_RAW_QUERY: "true" },
        confirmRaw: false,
      }),
    ).toThrow("--confirm-raw");

    expect(() =>
      requireRawQueryCliGate({
        env: { THEHIVE_ENABLE_RAW_QUERY: "true" },
        confirmRaw: true,
      }),
    ).not.toThrow();
  });
});
