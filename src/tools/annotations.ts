import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

/** Reads data only; repeatable with no side effects. */
export const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

/** Creates new records; repeating the call creates another record. */
export const CREATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

/** Adds data without overwriting; repeating the call has no further effect. */
export const ADDITIVE_IDEMPOTENT: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

/** Overwrites or removes existing fields; repeating the call has no further effect. */
export const UPDATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

/** Deletes, merges, or promotes records and is not safely repeatable. */
export const DESTRUCTIVE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
};

/** Reads data via a Cortex analyzer that may contact third-party services. */
export const READ_ONLY_OPEN_WORLD: ToolAnnotations = {
  ...READ_ONLY,
  openWorldHint: true,
};

/** Submits observables to a Cortex analyzer that may contact third-party services. */
export const CREATE_OPEN_WORLD: ToolAnnotations = {
  ...CREATE,
  openWorldHint: true,
};
