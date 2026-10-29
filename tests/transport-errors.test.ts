import { afterEach, describe, expect, it, vi } from "vitest";
import { TheHiveClient } from "../src/client.js";

const config = { url: "https://thehive.example.com", apiKey: "SYNTHETIC_TEST_TOKEN", verifySsl: true, timeout: 1000, allowDestructiveTools: false, enableRawQuery: false };
afterEach(() => vi.unstubAllGlobals());

describe("safe public transport errors", () => {
  it.each([
    new TypeError("Authorization rejected: Bearer SYNTHETIC_TEST_TOKEN"),
    { message: "SYNTHETIC_TEST_TOKEN", name: "AbortError" },
    "SYNTHETIC_TEST_TOKEN",
  ])("discards unknown fetch rejection details", async failure => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(failure));
    const client = new TheHiveClient(config);
    const error = await client.getCase("example-case").catch(error => error);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("TheHive API request failed");
    expect(String(error)).not.toContain(config.apiKey);
    expect(error.cause).toBeUndefined();
  });

  it.each(["test-token\r\nother", "test-token\u0000other", "test-tokené", ""])("rejects unsafe header keys without echoing them", apiKey => {
    expect(() => new TheHiveClient({ ...config, apiKey })).toThrow(/^THEHIVE_API_KEY must be a nonempty ASCII header value$/);
  });
});
