import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TheHiveClient } from "../src/client.js";
import type { TheHiveConfig } from "../src/config.js";

const mockConfig: TheHiveConfig = {
  url: "https://thehive.example.com",
  apiKey: "test-api-key-123",
  verifySsl: true,
  timeout: 30000,
  allowDestructiveTools: false,
  enableRawQuery: false,
};

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function mockSlowFetch(delayMs = 5000) {
  return vi.fn().mockImplementation(
    (_url: string, options: RequestInit) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve("{}"),
          });
        }, delayMs);

        options.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          const err = new DOMException(
            "The operation was aborted.",
            "AbortError",
          );
          reject(err);
        });
      }),
  );
}

describe("TheHiveClient", () => {
  let client: TheHiveClient;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    client = new TheHiveClient(mockConfig);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should configure base URL from config", () => {
      expect(client).toBeDefined();
    });
  });

  describe("TLS verification scoping", () => {
    it("should not pass a dispatcher when SSL verification is enabled", async () => {
      const fetchMock = mockFetch([]);
      globalThis.fetch = fetchMock;

      const secureClient = new TheHiveClient({ ...mockConfig, verifySsl: true });
      await secureClient.listCases();

      const [, options] = fetchMock.mock.calls[0];
      expect(options.dispatcher).toBeUndefined();
    });

    it("should pass a per-request dispatcher (not mutate global TLS) when SSL verification is disabled", async () => {
      const originalGlobal = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      const fetchMock = mockFetch([]);
      globalThis.fetch = fetchMock;

      const insecureClient = new TheHiveClient({ ...mockConfig, verifySsl: false });
      await insecureClient.listCases();

      const [, options] = fetchMock.mock.calls[0];
      expect(options.dispatcher).toBeDefined();
      // The process-global must never be touched by constructing the client.
      expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBeUndefined();

      if (originalGlobal === undefined) {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      } else {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalGlobal;
      }
    });
  });

  describe("cases", () => {
    it("should list cases with filters", async () => {
      const mockCases = [
        { _id: "~1", title: "Test Case", severity: 2, status: "New" },
      ];
      globalThis.fetch = mockFetch(mockCases);

      const result = await client.listCases({ status: "New", limit: 10 });

      expect(result).toEqual(mockCases);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(url).toBe(
        "https://thehive.example.com/api/v1/query?name=cases",
      );
      expect(options.method).toBe("POST");
      expect(options.headers).toMatchObject({
        Authorization: "Bearer test-api-key-123",
        "Content-Type": "application/json",
      });

      const body = JSON.parse(options.body);
      expect(body.query).toContainEqual({ _name: "listCase" });
      expect(body.query).toContainEqual({
        _name: "filter",
        _field: "status",
        _value: "New",
      });
      expect(body.range).toBe("0-10");
    });

    it("should list cases with tag filters", async () => {
      globalThis.fetch = mockFetch([]);

      await client.listCases({ tags: ["phishing", "malware"] });

      const body = JSON.parse(
        (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      );
      expect(body.query).toContainEqual({
        _name: "filter",
        _field: "tags",
        _value: "phishing",
      });
      expect(body.query).toContainEqual({
        _name: "filter",
        _field: "tags",
        _value: "malware",
      });
    });

    it("should get a case by ID", async () => {
      const mockCase = {
        _id: "~123",
        title: "Phishing Incident",
        severity: 3,
      };
      globalThis.fetch = mockFetch(mockCase);

      const result = await client.getCase("~123");

      expect(result).toEqual(mockCase);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(url).toBe(
        "https://thehive.example.com/api/v1/case/~123",
      );
    });

    it("should create a case", async () => {
      const created = { _id: "~456", title: "New Incident", severity: 2 };
      globalThis.fetch = mockFetch(created);

      const result = await client.createCase({
        title: "New Incident",
        severity: 2,
        tags: ["test"],
        customFields: { businessUnit: "finance" },
      });

      expect(result).toEqual(created);
      const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mock.calls[0];
      expect(url).toBe("https://thehive.example.com/api/v1/case");
      expect(options.method).toBe("POST");

      const body = JSON.parse(options.body);
      expect(body.title).toBe("New Incident");
      expect(body.severity).toBe(2);
      expect(body.tags).toEqual(["test"]);
      expect(body.customFields).toEqual({ businessUnit: "finance" });
    });

    it("should update a case", async () => {
      const updated = { _id: "~123", title: "Updated", status: "Resolved" };
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve({}), text: () => Promise.resolve("") })
        .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(updated), text: () => Promise.resolve(JSON.stringify(updated)) });
      globalThis.fetch = fetchMock;

      const result = await client.updateCase("~123", {
        status: "Resolved",
        summary: "False positive",
      });

      expect(result).toEqual(updated);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://thehive.example.com/api/v1/case/~123");
      expect(options.method).toBe("PATCH");
    });

    it("should search cases by title", async () => {
      globalThis.fetch = mockFetch([]);

      await client.searchCases("phishing");

      const body = JSON.parse(
        (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      );
      expect(body.query).toContainEqual({
        _name: "filter",
        _like: { _field: "title", _value: "phishing" },
      });
    });

    it("should merge cases", async () => {
      const merged = { _id: "~789", title: "Merged Case" };
      globalThis.fetch = mockFetch(merged);

      const result = await client.mergeCases(["~123", "~456"]);

      expect(result).toEqual(merged);
      const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mock.calls[0];
      expect(url).toBe("https://thehive.example.com/api/v1/case/_merge");
      expect(JSON.parse(options.body)).toEqual({ caseIds: ["~123", "~456"] });
    });

    it("should update case custom fields", async () => {
      const updated = {
        _id: "~123",
        title: "Updated",
        customFields: { businessUnit: "finance" },
      };
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve({}), text: () => Promise.resolve("") })
        .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(updated), text: () => Promise.resolve(JSON.stringify(updated)) });
      globalThis.fetch = fetchMock;

      const result = await client.updateCase("~123", {
        customFields: { businessUnit: "finance" },
      });

      expect(result).toEqual(updated);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.customFields).toEqual({ businessUnit: "finance" });
    });

    it("should clamp limit to valid range", async () => {
      globalThis.fetch = mockFetch([]);

      await client.listCases({ limit: 1000 });

      const body = JSON.parse(
        (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      );
      expect(body.range).toBe("0-500");
    });
  });

  describe("alerts", () => {
    it("should list alerts", async () => {
      const mockAlerts = [
        { _id: "~a1", title: "Suspicious Login", type: "intrusion" },
      ];
      globalThis.fetch = mockFetch(mockAlerts);

      const result = await client.listAlerts({ type: "intrusion" });

      expect(result).toEqual(mockAlerts);
      const body = JSON.parse(
        (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      );
      expect(body.query).toContainEqual({
        _name: "filter",
        _field: "type",
        _value: "intrusion",
      });
    });

    it("should create an alert", async () => {
      const created = { _id: "~a2", title: "New Alert" };
      globalThis.fetch = mockFetch(created);

      const result = await client.createAlert({
        title: "New Alert",
        type: "phishing",
        source: "email-gateway",
        sourceRef: "EG-12345",
      });

      expect(result).toEqual(created);
      const body = JSON.parse(
        (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      );
      expect(body.source).toBe("email-gateway");
      expect(body.sourceRef).toBe("EG-12345");
    });

    it("should promote an alert to a case", async () => {
      const promoted = { _id: "~c1", title: "Promoted Case" };
      globalThis.fetch = mockFetch(promoted);

      const result = await client.promoteAlert("~a1");

      expect(result).toEqual(promoted);
      const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mock.calls[0];
      expect(url).toBe(
        "https://thehive.example.com/api/v1/alert/~a1/case",
      );
      expect(options.method).toBe("POST");
    });
  });

  describe("tasks", () => {
    it("should list tasks for a case", async () => {
      const mockTasks = [
        { _id: "~t1", title: "Investigate", status: "Waiting" },
      ];
      globalThis.fetch = mockFetch(mockTasks);

      const result = await client.listTasks("~c1", { status: "Waiting" });

      expect(result).toEqual(mockTasks);
      const body = JSON.parse(
        (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      );
      expect(body.query).toContainEqual({
        _name: "getCase",
        idOrName: "~c1",
      });
      expect(body.query).toContainEqual({ _name: "tasks" });
    });

    it("should create a task", async () => {
      const created = { _id: "~t2", title: "New Task" };
      globalThis.fetch = mockFetch(created);

      const result = await client.createTask("~c1", {
        title: "New Task",
        assignee: "analyst1",
      });

      expect(result).toEqual(created);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(url).toBe(
        "https://thehive.example.com/api/v1/case/~c1/task",
      );
    });

    it("should update a task", async () => {
      const updated = { _id: "~t1", status: "Completed" };
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve({}), text: () => Promise.resolve("") })
        .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(updated), text: () => Promise.resolve(JSON.stringify(updated)) });
      globalThis.fetch = fetchMock;

      const result = await client.updateTask("~t1", { status: "Completed" });

      expect(result).toEqual(updated);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://thehive.example.com/api/v1/task/~t1");
      expect(options.method).toBe("PATCH");
    });
  });

  describe("observables", () => {
    it("should list observables for a case", async () => {
      const mockObs = [
        { _id: "~o1", dataType: "ip", data: "10.0.0.1", ioc: true },
      ];
      globalThis.fetch = mockFetch(mockObs);

      const result = await client.listObservables("~c1", { ioc: true });

      expect(result).toEqual(mockObs);
    });

    it("should create an observable", async () => {
      const created = { _id: "~o2", dataType: "domain", data: "evil.com" };
      globalThis.fetch = mockFetch(created);

      const result = await client.createObservable("~c1", {
        dataType: "domain",
        data: "evil.com",
        ioc: true,
        tags: ["malware"],
      });

      expect(result).toEqual(created);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(url).toBe(
        "https://thehive.example.com/api/v1/case/~c1/observable",
      );
    });

    it("should search observables globally", async () => {
      globalThis.fetch = mockFetch([]);

      await client.searchObservables({
        dataType: "ip",
        data: "10.0.0.1",
      });

      const body = JSON.parse(
        (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      );
      expect(body.query).toContainEqual({ _name: "listObservable" });
      expect(body.query).toContainEqual({
        _name: "filter",
        _field: "dataType",
        _value: "ip",
      });
      expect(body.query).toContainEqual({
        _name: "filter",
        _field: "data",
        _value: "10.0.0.1",
      });
    });
  });

  describe("task logs", () => {
    it("should list task logs", async () => {
      const mockLogs = [{ _id: "~l1", message: "Found suspicious activity" }];
      globalThis.fetch = mockFetch(mockLogs);

      const result = await client.listTaskLogs("~t1");

      expect(result).toEqual(mockLogs);
    });

    it("should create a task log", async () => {
      const created = { _id: "~l2", message: "Updated findings" };
      globalThis.fetch = mockFetch(created);

      const result = await client.createTaskLog("~t1", {
        message: "Updated findings",
      });

      expect(result).toEqual(created);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(url).toBe(
        "https://thehive.example.com/api/v1/task/~t1/log",
      );
    });
  });

  describe("comments", () => {
    it("should list comments", async () => {
      const mockComments = [
        { _id: "~cm1", message: "Initial analysis complete" },
      ];
      globalThis.fetch = mockFetch(mockComments);

      const result = await client.listComments("~c1");

      expect(result).toEqual(mockComments);
    });

    it("should create a comment", async () => {
      const created = { _id: "~cm2", message: "Escalating to tier 2" };
      globalThis.fetch = mockFetch(created);

      const result = await client.createComment(
        "~c1",
        "Escalating to tier 2",
      );

      expect(result).toEqual(created);
      const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mock.calls[0];
      expect(url).toBe(
        "https://thehive.example.com/api/v1/case/~c1/comment",
      );
      expect(JSON.parse(options.body)).toEqual({
        message: "Escalating to tier 2",
      });
    });
  });

  describe("users", () => {
    it("should list users", async () => {
      const mockUsers = [
        { _id: "~u1", login: "admin", name: "Admin User" },
      ];
      globalThis.fetch = mockFetch(mockUsers);

      const result = await client.listUsers();

      expect(result).toEqual(mockUsers);
    });

    it("should get current user", async () => {
      const mockUser = { _id: "~u1", login: "analyst", name: "SOC Analyst" };
      globalThis.fetch = mockFetch(mockUser);

      const result = await client.getCurrentUser();

      expect(result).toEqual(mockUser);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(url).toBe(
        "https://thehive.example.com/api/v1/user/current",
      );
    });
  });

  describe("raw query", () => {
    it("should execute a guarded raw query", async () => {
      globalThis.fetch = mockFetch([]);

      await client.rawQuery(
        [{ _name: "listCase" }],
        { range: "0-1000", sort: ["-_createdAt"], name: "case search" },
      );

      const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mock.calls[0];
      expect(url).toBe("https://thehive.example.com/api/v1/query?name=case%20search");
      const body = JSON.parse(options.body);
      expect(body.query).toEqual([{ _name: "listCase" }]);
      expect(body.range).toBe("0-500");
      expect(body.sort).toEqual(["-_createdAt"]);
    });

    it("should reject non-object raw query entries", async () => {
      await expect(
        client.rawQuery([["listCase"] as unknown as Record<string, unknown>]),
      ).rejects.toThrow("array of filter objects");
    });

    it("should reject invalid raw query ranges", async () => {
      await expect(
        client.rawQuery([{ _name: "listCase" }], { range: "all" }),
      ).rejects.toThrow("start-end");
    });
  });

  describe("cortex", () => {
    it("should wait for a completed Cortex job", async () => {
      const job = { _id: "~job1", status: "Success", report: { summary: "clean" } };
      globalThis.fetch = mockFetch(job);

      const result = await client.waitForJob("~job1", {
        maxAttempts: 1,
        intervalMs: 100,
      });

      expect(result).toEqual(job);
      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(url).toBe("https://thehive.example.com/api/connector/cortex/job/~job1");
    });

    it("should fail when a Cortex job does not complete in time", async () => {
      globalThis.fetch = mockFetch({ _id: "~job1", status: "InProgress" });

      await expect(
        client.waitForJob("~job1", { maxAttempts: 1, intervalMs: 100 }),
      ).rejects.toThrow("did not complete");
    });
  });

  describe("status", () => {
    it("should fetch status without authentication headers", async () => {
      globalThis.fetch = mockFetch({
        versions: { Scalligraph: "1", TheHive: "5", Play: "2" },
        config: {},
      });

      await client.getStatus();

      const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mock.calls[0];
      expect(url).toBe("https://thehive.example.com/api/status");
      expect(options.headers).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("should throw on 401", async () => {
      globalThis.fetch = mockFetch({ message: "Unauthorized" }, 401);

      await expect(client.getCase("~1")).rejects.toThrow(
        "authentication failed",
      );
    });

    it("should redact sensitive error response details", async () => {
      globalThis.fetch = mockFetch(
        { message: "Bearer test-api-key-123 token leaked" },
        500,
      );

      await expect(client.getCase("~1")).rejects.toThrow("[REDACTED]");
      await expect(client.getCase("~1")).rejects.not.toThrow("test-api-key-123");
    });

    it("should throw on 403", async () => {
      globalThis.fetch = mockFetch({ message: "Forbidden" }, 403);

      await expect(client.getCase("~1")).rejects.toThrow("access denied");
    });

    it("should throw on 404", async () => {
      globalThis.fetch = mockFetch({ message: "Not Found" }, 404);

      await expect(client.getCase("~1")).rejects.toThrow("not found");
    });

    it("should throw on 500", async () => {
      globalThis.fetch = mockFetch({ message: "Internal Error" }, 500);

      await expect(client.getCase("~1")).rejects.toThrow(
        "internal server error",
      );
    });

    it("should handle timeout", async () => {
      const slowClient = new TheHiveClient({ ...mockConfig, timeout: 1 });
      globalThis.fetch = mockSlowFetch();

      await expect(slowClient.getCase("~1")).rejects.toThrow("timeout");
    });
  });

  describe("HTTP request path", () => {
    describe("timeout behavior", () => {
      it("should pass an AbortSignal to fetch", async () => {
        globalThis.fetch = mockFetch({ _id: "~1" });

        await client.getCase("~1");

        const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
          .calls[0];
        expect(options.signal).toBeInstanceOf(AbortSignal);
      });

      it("should include the configured timeout duration in timeout errors", async () => {
        vi.useFakeTimers();
        try {
          const timedClient = new TheHiveClient({ ...mockConfig, timeout: 2500 });
          globalThis.fetch = mockSlowFetch(5000);

          const promise = timedClient.getCase("~1");
          const expectation = expect(promise).rejects.toThrow(
            "TheHive API timeout after 2500ms",
          );
          await vi.advanceTimersByTimeAsync(2500);
          await expectation;
        } finally {
          vi.useRealTimers();
        }
      });

      it("should abort the request when the configured timeout elapses", async () => {
        vi.useFakeTimers();
        try {
          const timedClient = new TheHiveClient({ ...mockConfig, timeout: 100 });
          globalThis.fetch = mockSlowFetch(5000);

          const promise = timedClient.getCase("~1");
          const expectation = expect(promise).rejects.toThrow(
            "TheHive API timeout after 100ms",
          );
          await vi.advanceTimersByTimeAsync(100);
          await expectation;
        } finally {
          vi.useRealTimers();
        }
      });

      it("should clear the timeout timer after a successful response", async () => {
        const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
        globalThis.fetch = mockFetch({ _id: "~1" });

        await client.getCase("~1");

        expect(clearTimeoutSpy).toHaveBeenCalled();
        clearTimeoutSpy.mockRestore();
      });

      it("should clear the timeout timer after a failed response", async () => {
        const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
        globalThis.fetch = mockFetch({ message: "Not Found" }, 404);

        await expect(client.getCase("~1")).rejects.toThrow("not found");
        expect(clearTimeoutSpy).toHaveBeenCalled();
        clearTimeoutSpy.mockRestore();
      });
    });

    describe("error-to-response mapping", () => {
      it("should throw on 429 rate limit", async () => {
        globalThis.fetch = mockFetch({ message: "Too Many Requests" }, 429);

        await expect(client.getCase("~1")).rejects.toThrow("rate limit");
      });

      it("should use a generic message for unmapped status codes", async () => {
        globalThis.fetch = mockFetch({ message: "Bad Gateway" }, 502);

        await expect(client.getCase("~1")).rejects.toThrow(
          "TheHive API error (502)",
        );
      });

      it("should append sanitized error body detail to HTTP error messages", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          text: () => Promise.resolve("invalid case id"),
        });

        await expect(client.getCase("~1")).rejects.toThrow(
          "TheHive API error (400): invalid case id",
        );
      });

      it("should collapse whitespace in error body detail", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          text: () => Promise.resolve("  invalid   case   id  "),
        });

        await expect(client.getCase("~1")).rejects.toThrow(
          ": invalid case id",
        );
      });

      it("should truncate long error bodies to 200 characters", async () => {
        const longBody = "x".repeat(250);
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          text: () => Promise.resolve(longBody),
        });

        const error = await client.getCase("~1").catch((err: Error) => err);
        expect(error.message).toContain(`: ${"x".repeat(200)}`);
        expect(error.message).not.toContain("x".repeat(201));
      });

      it("should redact sensitive JSON fields in error detail", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () =>
            Promise.resolve('{"api_key":"leaked-secret","message":"failed"}'),
        });

        const error = await client.getCase("~1").catch((err: Error) => err);
        expect(error.message).toContain("[REDACTED]");
        expect(error.message).not.toContain("leaked-secret");
      });

      it("should omit detail when the error response body cannot be read", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.reject(new Error("read failed")),
        });

        const error = await client.getCase("~1").catch((err: Error) => err);
        expect(error.message).toBe("TheHive API internal server error");
      });

      it("should return an empty object for 204 No Content responses", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 204,
          text: () => Promise.resolve(""),
        });

        const result = await client.getCase("~1");

        expect(result).toEqual({});
      });

      it("should return an empty object for successful responses with empty bodies", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          text: () => Promise.resolve(""),
        });

        const result = await client.getCase("~1");

        expect(result).toEqual({});
      });
    });

    describe("abort semantics", () => {
      it("should map DOMException AbortError to a timeout error", async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(
          new DOMException("The operation was aborted.", "AbortError"),
        );

        await expect(client.getCase("~1")).rejects.toThrow(
          "TheHive API timeout after 30000ms",
        );
      });

      it("should map Error AbortError to a timeout error", async () => {
        const abortError = new Error("The operation was aborted.");
        abortError.name = "AbortError";
        globalThis.fetch = vi.fn().mockRejectedValue(abortError);

        await expect(client.getCase("~1")).rejects.toThrow(
          "TheHive API timeout after 30000ms",
        );
      });

      it("should rethrow non-abort fetch errors unchanged", async () => {
        const networkError = new TypeError("fetch failed");
        globalThis.fetch = vi.fn().mockRejectedValue(networkError);

        await expect(client.getCase("~1")).rejects.toBe(networkError);
      });

      it("should not map non-Error abort-like rejections to timeout errors", async () => {
        const abortLike = { name: "AbortError" };
        globalThis.fetch = vi.fn().mockRejectedValue(abortLike);

        await expect(client.getCase("~1")).rejects.toEqual(abortLike);
      });
    });
  });
});
