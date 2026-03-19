import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TheHiveClient } from "../src/client.js";
import type { TheHiveConfig } from "../src/config.js";

const mockConfig: TheHiveConfig = {
  url: "https://thehive.example.com",
  apiKey: "test-api-key-123",
  verifySsl: true,
  timeout: 30000,
};

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
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

  describe("error handling", () => {
    it("should throw on 401", async () => {
      globalThis.fetch = mockFetch({ message: "Unauthorized" }, 401);

      await expect(client.getCase("~1")).rejects.toThrow(
        "authentication failed",
      );
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
      globalThis.fetch = vi.fn().mockImplementation(
        (_url: string, options: RequestInit) =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({}),
              });
            }, 5000);

            options.signal?.addEventListener("abort", () => {
              clearTimeout(timer);
              const err = new DOMException("The operation was aborted.", "AbortError");
              reject(err);
            });
          }),
      );

      await expect(slowClient.getCase("~1")).rejects.toThrow("timeout");
    });
  });
});
