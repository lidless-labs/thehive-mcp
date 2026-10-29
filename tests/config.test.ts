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
    expect(config.allowDestructiveTools).toBe(false);
    expect(config.enableRawQuery).toBe(false);
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

  it("should reject invalid THEHIVE_VERIFY_SSL values", () => {
    process.env.THEHIVE_URL = "https://thehive.example.com";
    process.env.THEHIVE_API_KEY = "test-key";
    process.env.THEHIVE_VERIFY_SSL = "no";

    expect(() => getConfig()).toThrow("THEHIVE_VERIFY_SSL");
  });

  it("should parse THEHIVE_TIMEOUT", () => {
    process.env.THEHIVE_URL = "https://thehive.example.com";
    process.env.THEHIVE_API_KEY = "test-key";
    process.env.THEHIVE_TIMEOUT = "60";

    const config = getConfig();

    expect(config.timeout).toBe(60000);
  });

  it("should reject invalid THEHIVE_TIMEOUT values", () => {
    process.env.THEHIVE_URL = "https://thehive.example.com";
    process.env.THEHIVE_API_KEY = "test-key";
    process.env.THEHIVE_TIMEOUT = "0";

    expect(() => getConfig()).toThrow("THEHIVE_TIMEOUT");
  });

  it("should reject non-http THEHIVE_URL protocols", () => {
    process.env.THEHIVE_URL = "file:///tmp/thehive";
    process.env.THEHIVE_API_KEY = "test-key";

    expect(() => getConfig()).toThrow("http or https");
  });

  it("should reject credentials in THEHIVE_URL", () => {
    process.env.THEHIVE_URL = "https://user:pass@thehive.example.com";
    process.env.THEHIVE_API_KEY = "test-key";

    expect(() => getConfig()).toThrow("must not include credentials");
  });

  it("should parse THEHIVE_ALLOW_DESTRUCTIVE_TOOLS=true", () => {
    process.env.THEHIVE_URL = "https://thehive.example.com";
    process.env.THEHIVE_API_KEY = "test-key";
    process.env.THEHIVE_ALLOW_DESTRUCTIVE_TOOLS = "true";

    const config = getConfig();

    expect(config.allowDestructiveTools).toBe(true);
  });

  it("should reject invalid THEHIVE_ALLOW_DESTRUCTIVE_TOOLS values", () => {
    process.env.THEHIVE_URL = "https://thehive.example.com";
    process.env.THEHIVE_API_KEY = "test-key";
    process.env.THEHIVE_ALLOW_DESTRUCTIVE_TOOLS = "yes";

    expect(() => getConfig()).toThrow("THEHIVE_ALLOW_DESTRUCTIVE_TOOLS");
  });

  it("should parse THEHIVE_ENABLE_RAW_QUERY=true", () => {
    process.env.THEHIVE_URL = "https://thehive.example.com";
    process.env.THEHIVE_API_KEY = "test-key";
    process.env.THEHIVE_ENABLE_RAW_QUERY = "true";

    const config = getConfig();

    expect(config.enableRawQuery).toBe(true);
  });

  it("should reject invalid THEHIVE_ENABLE_RAW_QUERY values", () => {
    process.env.THEHIVE_URL = "https://thehive.example.com";
    process.env.THEHIVE_API_KEY = "test-key";
    process.env.THEHIVE_ENABLE_RAW_QUERY = "yes";

    expect(() => getConfig()).toThrow("THEHIVE_ENABLE_RAW_QUERY");
  });
});

describe("SOC-3 plaintext transport policy", () => {
  const originalEnv = process.env;
  beforeEach(() => { process.env = { ...originalEnv, THEHIVE_API_KEY: "fixture" }; delete process.env.THEHIVE_ALLOW_INSECURE_HTTP; });
  afterEach(() => { process.env = originalEnv; });
  it.each(["http://thehive.example.com", "http://192.0.2.20", "http://[2001:db8::1]", "http://localhost.example.com"])("rejects remote plaintext %s", (url) => {
    process.env.THEHIVE_URL = url;
    expect(() => getConfig()).toThrow("THEHIVE_ALLOW_INSECURE_HTTP");
  });
  it.each(["http://localhost:9000", "http://127.0.0.1:9000", "http://127.1.2.3", "http://[::1]:9000"])("supports loopback %s", (url) => {
    process.env.THEHIVE_URL = url;
    expect(getConfig().url).toBe(url);
  });
  it("requires a valid explicit opt-in for remote HTTP", () => {
    process.env.THEHIVE_URL = "http://thehive.example.com";
    process.env.THEHIVE_ALLOW_INSECURE_HTTP = "false";
    expect(() => getConfig()).toThrow("THEHIVE_ALLOW_INSECURE_HTTP");
    process.env.THEHIVE_ALLOW_INSECURE_HTTP = "yes";
    expect(() => getConfig()).toThrow("must be true or false");
    process.env.THEHIVE_ALLOW_INSECURE_HTTP = "true";
    expect(getConfig().url).toBe("http://thehive.example.com");
  });
});
