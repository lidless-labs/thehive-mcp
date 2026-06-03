export interface TheHiveConfig {
  url: string;
  apiKey: string;
  verifySsl: boolean;
  timeout: number;
  allowDestructiveTools: boolean;
  enableRawQuery: boolean;
}

const DEFAULT_TIMEOUT_SECONDS = 30;
const MAX_TIMEOUT_SECONDS = 300;

export function getConfig(): TheHiveConfig {
  const url = process.env.THEHIVE_URL?.trim();
  if (!url) {
    throw new Error("THEHIVE_URL environment variable is required");
  }

  const apiKey = process.env.THEHIVE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("THEHIVE_API_KEY environment variable is required");
  }

  const parsedUrl = parseTheHiveUrl(url);
  const verifySsl = parseVerifySsl(process.env.THEHIVE_VERIFY_SSL);
  const timeout = parseTimeout(process.env.THEHIVE_TIMEOUT);
  const allowDestructiveTools = parseBooleanEnv(
    process.env.THEHIVE_ALLOW_DESTRUCTIVE_TOOLS,
    "THEHIVE_ALLOW_DESTRUCTIVE_TOOLS",
    false,
  );
  const enableRawQuery = parseBooleanEnv(
    process.env.THEHIVE_ENABLE_RAW_QUERY,
    "THEHIVE_ENABLE_RAW_QUERY",
    false,
  );

  return {
    url: parsedUrl,
    apiKey,
    verifySsl,
    timeout,
    allowDestructiveTools,
    enableRawQuery,
  };
}

function parseTheHiveUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("THEHIVE_URL must be a valid absolute URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("THEHIVE_URL must use http or https");
  }

  if (parsed.username || parsed.password) {
    throw new Error("THEHIVE_URL must not include credentials");
  }

  return parsed.toString().replace(/\/+$/, "");
}

function parseVerifySsl(rawValue: string | undefined): boolean {
  return parseBooleanEnv(rawValue, "THEHIVE_VERIFY_SSL", true);
}

function parseBooleanEnv(
  rawValue: string | undefined,
  name: string,
  defaultValue: boolean,
): boolean {
  if (rawValue === undefined || rawValue.trim() === "") {
    return defaultValue;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  throw new Error(`${name} must be true or false`);
}

function parseTimeout(rawValue: string | undefined): number {
  const normalized = rawValue?.trim();
  if (!normalized) {
    return DEFAULT_TIMEOUT_SECONDS * 1000;
  }

  if (!/^\d+$/.test(normalized)) {
    throw new Error("THEHIVE_TIMEOUT must be a positive integer number of seconds");
  }

  const seconds = Number(normalized);
  if (seconds < 1 || seconds > MAX_TIMEOUT_SECONDS) {
    throw new Error(`THEHIVE_TIMEOUT must be between 1 and ${MAX_TIMEOUT_SECONDS} seconds`);
  }

  return seconds * 1000;
}
