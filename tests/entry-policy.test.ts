import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Exercise the real entry point with all HTTP replaced inside the child process.
// The tool schema supplies the inventory. No incident instance or socket is used.
describe("entry point mutation policy", () => {
  it.each(["disabled", "preview", "unconfirmed"])("enforces %s for every advertised mutation", async (mode) => {
    const preload = "globalThis.fetch=async()=>{process.stderr.write('UNEXPECTED_FETCH\\n');throw new Error('offline test transport')};";
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", "--import", `data:text/javascript,${encodeURIComponent(preload)}`, "src/index.ts"],
      env: {
        THEHIVE_URL: "https://thehive.example.com", THEHIVE_API_KEY: "fixture",
        THEHIVE_ALLOW_DESTRUCTIVE_TOOLS: mode === "disabled" ? "false" : "true",
      },
      stderr: "pipe",
    });
    let stderr = "";
    transport.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });
    const client = new Client({ name: "entry-policy", version: "0" });
    try {
      await client.connect(transport);
      const { tools } = await client.listTools();
      expect(tools).toHaveLength(57);
      const mutations = tools.filter((tool) => tool.inputSchema.properties?.dryRun);
      expect(mutations).toHaveLength(28);
      for (const tool of mutations) {
        // Supply required fields according to the actual advertised JSON schema.
        function sample(schema: any): unknown {
          if (schema.enum) return schema.enum[0];
          if (schema.type === "boolean") return false;
          if (schema.type === "number" || schema.type === "integer") return schema.minimum ?? 1;
          if (schema.type === "array") return Array.from({ length: Math.max(2, schema.minItems ?? 0) }, () => sample(schema.items));
          if (schema.type === "object") return Object.fromEntries((schema.required ?? []).map((key: string) => [key, sample(schema.properties[key])]));
          return "fixture";
        }
        const args = sample(tool.inputSchema) as Record<string, unknown>;
        const result = await client.callTool({ name: tool.name, arguments: {
          ...args, ...(mode !== "preview" ? { dryRun: false } : {}),
          ...(mode === "disabled" ? { confirm: true } : {}),
        } });
        const text = (result.content as { text: string }[])[0].text;
        if (mode === "preview") {
          expect(result.isError, tool.name).not.toBe(true);
          expect(JSON.parse(text).data.dryRun, tool.name).toBe(true);
        } else {
          expect(result.isError, tool.name).toBe(true);
          expect(text, tool.name).toContain(mode === "disabled" ? "is disabled" : "confirm=true");
        }
      }
      expect(stderr).not.toContain("UNEXPECTED_FETCH");
    } finally {
      await client.close();
    }
  });
});
