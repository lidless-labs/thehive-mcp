import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getConfig, type TheHiveConfig } from "./config.js";
import { TheHiveClient } from "./client.js";
import { serveMcp } from "./mcp-server.js";
import { safeCaughtErrorMessage } from "./safe-error.js";
import type { TheHiveAlert, TheHiveCase, TheHiveStatus } from "./types.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version?: string };

export const HELP = `thehivectrl - TheHive incident-response control CLI (alias: thehivectl; MCP adapter: thehive-mcp)

Usage:
  thehivectrl <command> [options]

Commands:
  status [--json]                         Show TheHive status and version data
  cases list [options]                    List cases
  cases get <case-id> [--json]            Get one case
  alerts list [options]                   List alerts
  mcp                                     Start the MCP server over stdio
  help                                    Show this help
  --version                               Show package version

List options:
  --limit <n>                             Maximum results, 1-500 (default: 50)
  --status <status>                       Filter by status
  --severity <n>                          Filter by severity, 1-4
  --tag <tag>                             Filter by tag, repeatable
  --owner <owner>                         Filter cases by owner
  --source <source>                       Filter alerts by source
  --type <type>                           Filter alerts by type

Global options:
  --json                                  Emit JSON instead of a concise summary
`;

type Parsed =
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "mcp" }
  | { kind: "status"; json: boolean }
  | {
      kind: "cases list";
      json: boolean;
      limit: number;
      status?: string;
      severity?: number;
      tags?: string[];
      owner?: string;
    }
  | { kind: "cases get"; json: boolean; caseId: string }
  | {
      kind: "alerts list";
      json: boolean;
      limit: number;
      status?: string;
      severity?: number;
      tags?: string[];
      source?: string;
      type?: string;
    };

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

export interface TheHiveCtrlDeps {
  out: (text: string) => void;
  err: (text: string) => void;
  getConfig: () => TheHiveConfig;
  makeClient: (config: TheHiveConfig) => TheHiveClient;
  serve: () => Promise<void>;
}

const DEFAULT_DEPS: TheHiveCtrlDeps = {
  out: (text) => console.log(text),
  err: (text) => console.error(text),
  getConfig,
  makeClient: (config) => new TheHiveClient(config),
  serve: serveMcp,
};

function stripJson(args: string[]): { args: string[]; json: boolean } {
  let json = false;
  const rest: string[] = [];
  for (const arg of args) {
    if (arg === "--json") {
      json = true;
    } else {
      rest.push(arg);
    }
  }
  return { args: rest, json };
}

function flagValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new UsageError(`${flag} requires a value`);
  }
  return value;
}

function intFlag(value: string, flag: string, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new UsageError(`${flag} must be an integer from ${min} to ${max}`);
  }
  return parsed;
}

function parseListOptions(
  rest: string[],
  mode: "cases" | "alerts",
): {
  limit: number;
  status?: string;
  severity?: number;
  tags?: string[];
  owner?: string;
  source?: string;
  type?: string;
} {
  const parsed: {
    limit: number;
    status?: string;
    severity?: number;
    tags?: string[];
    owner?: string;
    source?: string;
    type?: string;
  } = { limit: 50 };

  for (let i = 0; i < rest.length; i += 1) {
    const option = rest[i];
    if (option === "--limit") {
      parsed.limit = intFlag(flagValue(rest, i, option), option, 1, 500);
      i += 1;
    } else if (option === "--status") {
      parsed.status = flagValue(rest, i, option);
      i += 1;
    } else if (option === "--severity") {
      parsed.severity = intFlag(flagValue(rest, i, option), option, 1, 4);
      i += 1;
    } else if (option === "--tag") {
      parsed.tags = [...(parsed.tags ?? []), flagValue(rest, i, option)];
      i += 1;
    } else if (mode === "cases" && option === "--owner") {
      parsed.owner = flagValue(rest, i, option);
      i += 1;
    } else if (mode === "alerts" && option === "--source") {
      parsed.source = flagValue(rest, i, option);
      i += 1;
    } else if (mode === "alerts" && option === "--type") {
      parsed.type = flagValue(rest, i, option);
      i += 1;
    } else {
      throw new UsageError(`Unknown ${mode} list option: ${option}`);
    }
  }

  return parsed;
}

export function parseArgs(rawArgs: string[]): Parsed {
  const { args, json } = stripJson(rawArgs);
  const [first, second, third, ...rest] = args;

  if (!first || first === "help" || first === "--help" || first === "-h") return { kind: "help" };
  if (first === "--version" || first === "version") return { kind: "version" };
  if (first === "mcp") return { kind: "mcp" };
  if (first === "status") {
    if (second) throw new UsageError(`Unknown status option: ${second}`);
    return { kind: "status", json };
  }
  if (first === "cases" && second === "list") {
    return { kind: "cases list", json, ...parseListOptions(third ? [third, ...rest] : rest, "cases") };
  }
  if (first === "cases" && second === "get") {
    if (!third) throw new UsageError("cases get requires a case id");
    if (rest.length > 0) throw new UsageError(`Unknown cases get option: ${rest[0]}`);
    return { kind: "cases get", json, caseId: third };
  }
  if (first === "alerts" && second === "list") {
    return { kind: "alerts list", json, ...parseListOptions(third ? [third, ...rest] : rest, "alerts") };
  }

  throw new UsageError(`Unknown command: ${args.join(" ")}`);
}

function dateText(value: number | undefined): string | undefined {
  return typeof value === "number" ? new Date(value).toISOString() : undefined;
}

function caseSummary(theCase: TheHiveCase): Record<string, unknown> {
  return {
    id: theCase._id,
    number: theCase.number,
    title: theCase.title,
    status: theCase.status,
    severity: theCase.severity,
    owner: theCase.owner,
    tags: theCase.tags,
    created_at: dateText(theCase._createdAt),
    updated_at: dateText(theCase._updatedAt),
  };
}

function alertSummary(alert: TheHiveAlert): Record<string, unknown> {
  return {
    id: alert._id,
    title: alert.title,
    status: alert.status,
    severity: alert.severity,
    source: alert.source,
    type: alert.type,
    source_ref: alert.sourceRef,
    case_id: alert.caseId,
    tags: alert.tags,
    created_at: dateText(alert._createdAt),
    updated_at: dateText(alert._updatedAt),
  };
}

function statusSummary(status: TheHiveStatus): Record<string, unknown> {
  return {
    versions: status.versions,
    auth_type: status.config.authType,
    capabilities: status.config.capabilities,
    sso_auto_login: status.config.ssoAutoLogin,
  };
}

function compactLine(values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

async function runStatus(parsed: Extract<Parsed, { kind: "status" }>, client: TheHiveClient) {
  const status = await client.getStatus();
  const result = statusSummary(status);
  if (parsed.json) return { code: 0, text: JSON.stringify(result, null, 2) };
  return {
    code: 0,
    text: compactLine([
      "status=ok",
      `thehive=${status.versions.TheHive}`,
      `scalligraph=${status.versions.Scalligraph}`,
      `play=${status.versions.Play}`,
    ]),
  };
}

async function runCasesList(parsed: Extract<Parsed, { kind: "cases list" }>, client: TheHiveClient) {
  const cases = await client.listCases({
    status: parsed.status,
    severity: parsed.severity,
    tags: parsed.tags,
    owner: parsed.owner,
    limit: parsed.limit,
  });
  const result = {
    cases: cases.map(caseSummary),
    count: cases.length,
    limit: parsed.limit,
  };
  if (parsed.json) return { code: 0, text: JSON.stringify(result, null, 2) };
  const lines = [`cases count=${cases.length} limit=${parsed.limit}`];
  for (const theCase of result.cases) {
    lines.push(
      compactLine([
        `id=${theCase.id}`,
        theCase.number ? `number=${theCase.number}` : undefined,
        `title=${JSON.stringify(theCase.title)}`,
        theCase.status ? `status=${theCase.status}` : undefined,
        theCase.severity ? `severity=${theCase.severity}` : undefined,
        theCase.owner ? `owner=${theCase.owner}` : undefined,
      ]),
    );
  }
  return { code: 0, text: lines.join("\n") };
}

async function runCaseGet(parsed: Extract<Parsed, { kind: "cases get" }>, client: TheHiveClient) {
  const theCase = await client.getCase(parsed.caseId);
  const result = caseSummary(theCase);
  if (parsed.json) return { code: 0, text: JSON.stringify(result, null, 2) };
  return {
    code: 0,
    text: compactLine([
      `id=${result.id}`,
      result.number ? `number=${result.number}` : undefined,
      `title=${JSON.stringify(result.title)}`,
      result.status ? `status=${result.status}` : undefined,
      result.severity ? `severity=${result.severity}` : undefined,
      result.owner ? `owner=${result.owner}` : undefined,
    ]),
  };
}

async function runAlertsList(parsed: Extract<Parsed, { kind: "alerts list" }>, client: TheHiveClient) {
  const alerts = await client.listAlerts({
    status: parsed.status,
    severity: parsed.severity,
    tags: parsed.tags,
    source: parsed.source,
    type: parsed.type,
    limit: parsed.limit,
  });
  const result = {
    alerts: alerts.map(alertSummary),
    count: alerts.length,
    limit: parsed.limit,
  };
  if (parsed.json) return { code: 0, text: JSON.stringify(result, null, 2) };
  const lines = [`alerts count=${alerts.length} limit=${parsed.limit}`];
  for (const alert of result.alerts) {
    lines.push(
      compactLine([
        `id=${alert.id}`,
        `title=${JSON.stringify(alert.title)}`,
        alert.status ? `status=${alert.status}` : undefined,
        alert.severity ? `severity=${alert.severity}` : undefined,
        alert.source ? `source=${alert.source}` : undefined,
        alert.type ? `type=${alert.type}` : undefined,
      ]),
    );
  }
  return { code: 0, text: lines.join("\n") };
}

export async function run(rawArgs: string[], deps: Partial<TheHiveCtrlDeps> = {}): Promise<number> {
  const resolvedDeps = { ...DEFAULT_DEPS, ...deps };
  let parsed: Parsed;
  try {
    parsed = parseArgs(rawArgs);
  } catch (error) {
    if (error instanceof UsageError) {
      resolvedDeps.err(error.message);
      resolvedDeps.err("Run thehivectrl help for usage.");
      return 2;
    }
    throw error;
  }

  if (parsed.kind === "help") {
    resolvedDeps.out(HELP);
    return 0;
  }
  if (parsed.kind === "version") {
    resolvedDeps.out(packageJson.version ?? "0.0.0");
    return 0;
  }
  if (parsed.kind === "mcp") {
    await resolvedDeps.serve();
    return 0;
  }

  let config: TheHiveConfig | undefined;
  try {
    config = resolvedDeps.getConfig();
    const client = resolvedDeps.makeClient(config);
    const result =
      parsed.kind === "status"
        ? await runStatus(parsed, client)
        : parsed.kind === "cases list"
          ? await runCasesList(parsed, client)
          : parsed.kind === "cases get"
            ? await runCaseGet(parsed, client)
            : await runAlertsList(parsed, client);
    resolvedDeps.out(result.text);
    return result.code;
  } catch (error) {
    resolvedDeps.err(JSON.stringify({ error: safeCaughtErrorMessage(error, "Unexpected error", [config?.apiKey ?? ""]) }));
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
