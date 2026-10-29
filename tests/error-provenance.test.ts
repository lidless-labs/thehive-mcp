import { afterEach, describe, expect, it, vi } from "vitest";
import { TheHiveClient } from "../src/client.js";

const config = { url: "https://thehive.example.com", apiKey: "fixture-auth", verifySsl: true,
  timeout: 1000, allowDestructiveTools: false, enableRawQuery: false };
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

describe("external data in client exceptions", () => {
  it("does not include upstream failure bodies", async () => {
    globalThis.fetch = vi.fn(async () => new Response("upstream-marker", { status: 400 }));
    await expect(new TheHiveClient(config).listCases()).rejects.toThrow(/^TheHive API error \(400\)$/);
  });
  it("does not include malformed successful response text", async () => {
    globalThis.fetch = vi.fn(async () => new Response("upstream-marker"));
    await expect(new TheHiveClient(config).listCases()).rejects.toThrow(/^TheHive API returned invalid JSON$/);
  });
  it("does not include JSON adapter parser error text", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200,
      json: async () => { throw new SyntaxError("upstream-marker"); } });
    await expect(new TheHiveClient(config).listCases()).rejects.toThrow(/^TheHive API returned invalid JSON$/);
  });
  it("does not include a remote job identifier in polling failures", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ _id: "upstream-marker", status: "InProgress" })));
    await expect(new TheHiveClient(config).waitForJob("upstream-marker", { maxAttempts: 1 }))
      .rejects.toThrow(/^Cortex job did not complete before the polling limit$/);
  });
});
