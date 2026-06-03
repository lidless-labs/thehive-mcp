export interface ToolSafetyOptions {
  allowDestructiveTools?: boolean;
  enableRawQuery?: boolean;
}

export function destructiveToolDisabled(toolName: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: `${toolName} is disabled. Set THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true to enable destructive MCP tools.`,
      },
    ],
    isError: true,
  };
}

export function rawQueryDisabled() {
  return {
    content: [
      {
        type: "text" as const,
        text: "thehive_query is disabled. Set THEHIVE_ENABLE_RAW_QUERY=true to enable raw TheHive Query DSL execution.",
      },
    ],
    isError: true,
  };
}
