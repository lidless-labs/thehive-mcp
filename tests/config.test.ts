import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getConfig } from "../src/config.js";

describe("getConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return config from environment variables", () => {
    process.env.THEHIVE_URL = "https://thehive.example.com";
    process.env.THEHIVE_API_KEY = "test-key";

    const config = getConfig();

    expect(config.url).toBe("https://thehive.example.com");
    expect(config.apiKey).toBe("test-key");
    expect(config.verifySsl).toBe(true);
    expect(config.timeout).toBe(30000);
  });

  it("should strip trailing slashes from URL", () => {
    process.env.THEHIVE_URL = "https://thehive.example.com///";
    process.env.THEHIVE_API_KEY = "test-key";

    const config = getConfig();

    expect(config.url).toBe("https://thehive.example.com");
  });

  it("should throw when THEHIVE_URL is missing", () => {
    delete process.env.THEHIVE_URL;
    process.env.THEHIVE_API_KEY = "test-key";

    expect(() => getConfig()).toThrow("THEHIVE_URL");
  });

  it("should throw when THEHIVE_API_KEY is missing", () => {
    process.env.THEHIVE_URL = "https://thehive.example.com";
    delete process.env.THEHIVE_API_KEY;

    expect(() => getConfig()).toThrow("THEHIVE_API_KEY");
  });

  it("should parse THEHIVE_VERIFY_SSL=false", () => {
    process.env.THEHIVE_URL = "https://thehive.example.com";
    process.env.THEHIVE_API_KEY = "test-key";
    process.env.THEHIVE_VERIFY_SSL = "false";

    const config = getConfig();

    expect(config.verifySsl).toBe(false);
  });

  it("should parse THEHIVE_TIMEOUT", () => {
    process.env.THEHIVE_URL = "https://thehive.example.com";
    process.env.THEHIVE_API_KEY = "test-key";
    process.env.THEHIVE_TIMEOUT = "60";

    const config = getConfig();

    expect(config.timeout).toBe(60000);
  });
});
