export class CliGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliGateError";
  }
}

function envEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function requireDestructiveCliGate(options: {
  toolName: string;
  env?: NodeJS.ProcessEnv;
  confirm?: boolean;
  destructive?: boolean;
}): void {
  const env = options.env ?? process.env;
  if (!envEnabled(env.THEHIVE_ALLOW_DESTRUCTIVE_TOOLS)) {
    throw new CliGateError(
      `${options.toolName} is disabled. Set THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true and pass --confirm --destructive to run destructive CLI commands.`,
    );
  }
  if (!options.confirm || !options.destructive) {
    throw new CliGateError(
      `${options.toolName} requires --confirm and --destructive for destructive CLI commands.`,
    );
  }
}

export function requireRawQueryCliGate(options: {
  env?: NodeJS.ProcessEnv;
  confirmRaw?: boolean;
}): void {
  const env = options.env ?? process.env;
  if (!envEnabled(env.THEHIVE_ENABLE_RAW_QUERY)) {
    throw new CliGateError(
      "thehive query is disabled. Set THEHIVE_ENABLE_RAW_QUERY=true and pass --confirm-raw to run raw Query DSL commands.",
    );
  }
  if (!options.confirmRaw) {
    throw new CliGateError("thehive query requires --confirm-raw for raw Query DSL commands.");
  }
}
