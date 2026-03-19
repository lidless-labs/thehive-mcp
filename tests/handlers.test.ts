import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TheHiveClient } from "../src/client.js";
import type { TheHiveConfig } from "../src/config.js";

const mockConfig: TheHiveConfig = {
  url: "https://thehive.example.com",
  apiKey: "test-api-key-123",
  verifySsl: true,
  timeout: 30000,
};

describe("TheHiveClient handler behavior", () => {
  let client: TheHiveClient;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new TheHiveClient(mockConfig);
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Cases ---

  describe("listCases", () => {
    it("should return cases with default filters", async () => {
      const mockCases = [
        { _id: "case-1", title: "Phishing Alert", severity: 2, status: "New" },
        { _id: "case-2", title: "Malware Detection", severity: 3, status: "InProgress" },
      ];
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCases),
      });

      const result = await client.listCases();

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/api/v1/query?name=cases");
      expect(opts.method).toBe("POST");
      expect(result).toEqual(mockCases);
    });

    it("should apply severity and status filters", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await client.listCases({ status: "New", severity: 3 });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      const filters = body.query;
      expect(filters).toContainEqual({ _name: "filter", _field: "status", _value: "New" });
      expect(filters).toContainEqual({ _name: "filter", _field: "severity", _value: 3 });
    });

    it("should clamp limit to 500", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await client.listCases({ limit: 1000 });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.range).toBe("0-500");
    });
  });

  describe("getCase", () => {
    it("should fetch a single case by ID", async () => {
      const mockCase = { _id: "case-1", title: "Test Case", severity: 2 };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCase),
      });

      const result = await client.getCase("case-1");

      expect(result).toEqual(mockCase);
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain("/api/v1/case/case-1");
    });
  });

  describe("createCase", () => {
    it("should create a case with required and optional fields", async () => {
      const created = { _id: "case-new", title: "New Incident", severity: 3 };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(created),
      });

      const result = await client.createCase({
        title: "New Incident",
        severity: 3,
        tlp: 2,
        tags: ["apt", "critical"],
      });

      expect(result).toEqual(created);
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.title).toBe("New Incident");
      expect(body.severity).toBe(3);
      expect(body.tlp).toBe(2);
      expect(body.tags).toEqual(["apt", "critical"]);
    });
  });

  describe("updateCase", () => {
    it("should patch a case then re-fetch it", async () => {
      const updated = { _id: "case-1", title: "Updated", severity: 4 };
      // First call: PATCH returns 204
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
      });
      // Second call: GET re-fetches the updated case
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updated),
      });

      const result = await client.updateCase("case-1", { severity: 4, status: "InProgress" });

      expect(result).toEqual(updated);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(opts.method).toBe("PATCH");
      expect(url).toContain("/case/case-1");
    });
  });

  describe("mergeCases", () => {
    it("should merge multiple cases", async () => {
      const merged = { _id: "case-merged", title: "Merged Case" };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(merged),
      });

      const result = await client.mergeCases(["case-1", "case-2", "case-3"]);

      expect(result).toEqual(merged);
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.caseIds).toEqual(["case-1", "case-2", "case-3"]);
    });
  });

  // --- Alerts ---

  describe("listAlerts", () => {
    it("should list alerts with source filter", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ _id: "alert-1", source: "Wazuh" }]),
      });

      const result = await client.listAlerts({ source: "Wazuh" });

      expect(result).toHaveLength(1);
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.query).toContainEqual({ _name: "filter", _field: "source", _value: "Wazuh" });
    });
  });

  describe("promoteAlert", () => {
    it("should promote an alert to a case", async () => {
      const newCase = { _id: "case-from-alert", title: "Promoted" };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newCase),
      });

      const result = await client.promoteAlert("alert-1");

      expect(result).toEqual(newCase);
      const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/alert/alert-1/case");
      expect(opts.method).toBe("POST");
    });
  });

  // --- Tasks ---

  describe("listTasks", () => {
    it("should list tasks for a case", async () => {
      const tasks = [{ _id: "task-1", title: "Investigate" }];
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tasks),
      });

      const result = await client.listTasks("case-1");

      expect(result).toEqual(tasks);
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.query[0]).toEqual({ _name: "getCase", idOrName: "case-1" });
      expect(body.query[1]).toEqual({ _name: "tasks" });
    });
  });

  describe("createTask", () => {
    it("should create a task on a case", async () => {
      const task = { _id: "task-new", title: "Contain threat" };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(task),
      });

      const result = await client.createTask("case-1", {
        title: "Contain threat",
        status: "Waiting",
        assignee: "analyst@example.com",
      });

      expect(result).toEqual(task);
      const [url] = fetchSpy.mock.calls[0] as [string];
      expect(url).toContain("/case/case-1/task");
    });
  });

  // --- Observables ---

  describe("createObservable", () => {
    it("should create an observable on a case", async () => {
      const obs = { _id: "obs-1", dataType: "ip", data: "10.0.0.1" };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(obs),
      });

      const result = await client.createObservable("case-1", {
        dataType: "ip",
        data: "10.0.0.1",
        ioc: true,
        tlp: 2,
        tags: ["suspicious"],
      });

      expect(result).toEqual(obs);
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.dataType).toBe("ip");
      expect(body.ioc).toBe(true);
    });
  });

  describe("searchObservables", () => {
    it("should search observables globally", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await client.searchObservables({ dataType: "domain", ioc: true });

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.query).toContainEqual({ _name: "listObservable" });
      expect(body.query).toContainEqual({ _name: "filter", _field: "dataType", _value: "domain" });
      expect(body.query).toContainEqual({ _name: "filter", _field: "ioc", _value: true });
    });
  });

  // --- Error handling ---

  describe("error handling", () => {
    it("should throw on 401 with auth message", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      await expect(client.getCase("case-1")).rejects.toThrow("authentication failed");
    });

    it("should throw on 403 with permissions message", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Forbidden"),
      });

      await expect(client.getCase("case-1")).rejects.toThrow("access denied");
    });

    it("should throw on 404 with not found message", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not Found"),
      });

      await expect(client.getCase("nonexistent")).rejects.toThrow("not found");
    });

    it("should throw timeout error on abort", async () => {
      fetchSpy.mockImplementationOnce(() => {
        const error = new Error("AbortError");
        error.name = "AbortError";
        return Promise.reject(error);
      });

      await expect(client.getCase("case-1")).rejects.toThrow("timeout");
    });

    it("should throw on 429 rate limit", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve("Too Many Requests"),
      });

      await expect(client.listCases()).rejects.toThrow("rate limit");
    });
  });

  // --- Task Logs ---

  describe("createTaskLog", () => {
    it("should create a task log entry", async () => {
      const log = { _id: "log-1", message: "Found malicious file" };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(log),
      });

      const result = await client.createTaskLog("task-1", {
        message: "Found malicious file",
      });

      expect(result).toEqual(log);
      const [url] = fetchSpy.mock.calls[0] as [string];
      expect(url).toContain("/task/task-1/log");
    });
  });

  // --- Comments ---

  describe("createComment", () => {
    it("should create a comment on a case", async () => {
      const comment = { _id: "comment-1", message: "Escalating to Tier 2" };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(comment),
      });

      const result = await client.createComment("case-1", "Escalating to Tier 2");

      expect(result).toEqual(comment);
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.message).toBe("Escalating to Tier 2");
    });
  });

  // --- Users ---

  describe("getCurrentUser", () => {
    it("should fetch current user", async () => {
      const user = { _id: "user-1", name: "analyst", login: "analyst@example.com" };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(user),
      });

      const result = await client.getCurrentUser();

      expect(result).toEqual(user);
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain("/user/current");
    });
  });
});
