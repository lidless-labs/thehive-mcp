import type { TheHiveConfig } from "./config.js";
import type {
  TheHiveCase,
  TheHiveAlert,
  TheHiveTask,
  TheHiveObservable,
  TheHiveTaskLog,
  TheHiveComment,
  TheHiveUser,
  TheHiveAnalyzer,
  TheHiveJob,
  TheHiveStatus,
  TheHiveCaseTemplate,
} from "./types.js";

export class TheHiveClient {
  private readonly baseUrl: string;
  private readonly connectorBaseUrl: string;
  private readonly statusUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeout: number;
  private readonly apiKey: string;

  constructor(config: TheHiveConfig) {
    this.baseUrl = `${config.url}/api/v1`;
    this.connectorBaseUrl = `${config.url}/api`;
    this.statusUrl = `${config.url}/api/status`;
    this.apiKey = config.apiKey;
    this.headers = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    };
    this.timeout = config.timeout;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    return this.fetchJson<T>(`${this.baseUrl}${path}`, options);
  }

  private async connectorRequest<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    return this.fetchJson<T>(`${this.connectorBaseUrl}${path}`, options);
  }

  private async fetchJson<T>(
    url: string,
    options: RequestInit = {},
    authenticated = true,
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const headers = authenticated
      ? {
          ...this.headers,
          ...(options.headers as Record<string, string> | undefined),
        }
      : options.headers;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const message = this.getErrorMessage(response.status, body);
        throw new Error(message);
      }

      // Handle 204 No Content (e.g. PATCH updates in TheHive 5)
      if (response.status === 204) {
        return {} as T;
      }

      if (typeof response.text === "function") {
        const body = await response.text();
        if (!body) {
          return {} as T;
        }
        return JSON.parse(body) as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`TheHive API timeout after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getErrorMessage(status: number, body: string): string {
    const detail = this.formatErrorDetail(body);
    switch (status) {
      case 401:
        return `TheHive API authentication failed - check your API key${detail}`;
      case 403:
        return `TheHive API access denied - insufficient permissions${detail}`;
      case 404:
        return `TheHive API resource not found${detail}`;
      case 429:
        return `TheHive API rate limit exceeded${detail}`;
      case 500:
        return `TheHive API internal server error${detail}`;
      default:
        return `TheHive API error (${status})${detail}`;
    }
  }

  private formatErrorDetail(body: string): string {
    const sanitized = this.redactSensitiveText(body)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
    return sanitized ? `: ${sanitized}` : "";
  }

  private redactSensitiveText(text: string): string {
    return text
      .replaceAll(this.apiKey, "[REDACTED]")
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
      .replace(/("(?:api[_-]?key|authorization|token|password)"\s*:\s*")([^"]+)(")/gi, "$1[REDACTED]$3");
  }

  private async query<T>(
    name: string,
    filters: Record<string, unknown>[],
    options: { range?: string; sort?: string[] } = {},
  ): Promise<T[]> {
    const body = {
      query: filters,
      ...(options.range && { range: options.range }),
      ...(options.sort && { sort: options.sort }),
    };

    return this.request<T[]>(
      `/query?name=${encodeURIComponent(name)}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  }

  // --- Cases ---

  async listCases(
    filters: {
      status?: string;
      severity?: number;
      tags?: string[];
      owner?: string;
      limit?: number;
    } = {},
  ): Promise<TheHiveCase[]> {
    const queryFilters: Record<string, unknown>[] = [
      { _name: "listCase" },
    ];

    if (filters.status) {
      queryFilters.push({ _name: "filter", _field: "status", _value: filters.status });
    }
    if (filters.severity) {
      queryFilters.push({ _name: "filter", _field: "severity", _value: filters.severity });
    }
    if (filters.owner) {
      queryFilters.push({ _name: "filter", _field: "owner", _value: filters.owner });
    }
    if (filters.tags && filters.tags.length > 0) {
      for (const tag of filters.tags) {
        queryFilters.push({ _name: "filter", _field: "tags", _value: tag });
      }
    }

    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
    return this.query<TheHiveCase>("cases", queryFilters, {
      range: `0-${limit}`,
      sort: ["-_createdAt"],
    });
  }

  async getCase(caseId: string): Promise<TheHiveCase> {
    return this.request<TheHiveCase>(`/case/${encodeURIComponent(caseId)}`);
  }

  async createCase(data: {
    title: string;
    description?: string;
    severity?: number;
    tlp?: number;
    pap?: number;
    tags?: string[];
    flag?: boolean;
    owner?: string;
    template?: string;
    customFields?: Record<string, unknown>;
  }): Promise<TheHiveCase> {
    return this.request<TheHiveCase>("/case", {
      method: "POST",
      body: JSON.stringify({
        title: data.title,
        ...(data.description && { description: data.description }),
        ...(data.severity !== undefined && { severity: data.severity }),
        ...(data.tlp !== undefined && { tlp: data.tlp }),
        ...(data.pap !== undefined && { pap: data.pap }),
        ...(data.tags && { tags: data.tags }),
        ...(data.flag !== undefined && { flag: data.flag }),
        ...(data.owner && { owner: data.owner }),
        ...(data.template && { caseTemplate: data.template }),
        ...(data.customFields && { customFields: data.customFields }),
      }),
    });
  }

  async updateCase(
    caseId: string,
    data: {
      title?: string;
      description?: string;
      severity?: number;
      tlp?: number;
      pap?: number;
      tags?: string[];
      status?: string;
      summary?: string;
      owner?: string;
      impactStatus?: string;
      resolutionStatus?: string;
      flag?: boolean;
      customFields?: Record<string, unknown>;
    },
  ): Promise<TheHiveCase> {
    await this.request<Record<string, never>>(
      `/case/${encodeURIComponent(caseId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
    return this.getCase(caseId);
  }

  async searchCases(
    queryString: string,
    limit: number = 50,
  ): Promise<TheHiveCase[]> {
    const queryFilters: Record<string, unknown>[] = [
      { _name: "listCase" },
      { _name: "filter", _like: { _field: "title", _value: queryString } },
    ];

    const clampedLimit = Math.min(Math.max(limit, 1), 500);
    return this.query<TheHiveCase>("cases", queryFilters, {
      range: `0-${clampedLimit}`,
      sort: ["-_createdAt"],
    });
  }

  async deleteCase(caseId: string, force?: boolean): Promise<void> {
    const path = force
      ? `/case/${encodeURIComponent(caseId)}/force`
      : `/case/${encodeURIComponent(caseId)}`;
    await this.request<Record<string, never>>(path, { method: "DELETE" });
  }

  async mergeCases(caseIds: string[]): Promise<TheHiveCase> {
    return this.request<TheHiveCase>("/case/_merge", {
      method: "POST",
      body: JSON.stringify({ caseIds }),
    });
  }

  // --- Alerts ---

  async listAlerts(
    filters: {
      status?: string;
      severity?: number;
      tags?: string[];
      source?: string;
      type?: string;
      limit?: number;
    } = {},
  ): Promise<TheHiveAlert[]> {
    const queryFilters: Record<string, unknown>[] = [
      { _name: "listAlert" },
    ];

    if (filters.status) {
      queryFilters.push({ _name: "filter", _field: "status", _value: filters.status });
    }
    if (filters.severity) {
      queryFilters.push({ _name: "filter", _field: "severity", _value: filters.severity });
    }
    if (filters.source) {
      queryFilters.push({ _name: "filter", _field: "source", _value: filters.source });
    }
    if (filters.type) {
      queryFilters.push({ _name: "filter", _field: "type", _value: filters.type });
    }
    if (filters.tags && filters.tags.length > 0) {
      for (const tag of filters.tags) {
        queryFilters.push({ _name: "filter", _field: "tags", _value: tag });
      }
    }

    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
    return this.query<TheHiveAlert>("alerts", queryFilters, {
      range: `0-${limit}`,
      sort: ["-_createdAt"],
    });
  }

  async getAlert(alertId: string): Promise<TheHiveAlert> {
    return this.request<TheHiveAlert>(`/alert/${encodeURIComponent(alertId)}`);
  }

  async createAlert(data: {
    title: string;
    description?: string;
    severity?: number;
    tlp?: number;
    pap?: number;
    tags?: string[];
    type: string;
    source: string;
    sourceRef: string;
    follow?: boolean;
    caseTemplate?: string;
  }): Promise<TheHiveAlert> {
    return this.request<TheHiveAlert>("/alert", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAlert(
    alertId: string,
    data: {
      title?: string;
      description?: string;
      severity?: number;
      tlp?: number;
      pap?: number;
      tags?: string[];
      status?: string;
      follow?: boolean;
    },
  ): Promise<TheHiveAlert> {
    await this.request<Record<string, never>>(
      `/alert/${encodeURIComponent(alertId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
    return this.getAlert(alertId);
  }

  async deleteAlert(alertId: string): Promise<void> {
    await this.request<Record<string, never>>(
      `/alert/${encodeURIComponent(alertId)}`,
      { method: "DELETE" },
    );
  }

  async promoteAlert(alertId: string): Promise<TheHiveCase> {
    return this.request<TheHiveCase>(
      `/alert/${encodeURIComponent(alertId)}/case`,
      { method: "POST", body: JSON.stringify({}) },
    );
  }

  // --- Tasks ---

  async listTasks(
    caseId: string,
    filters: { status?: string; assignee?: string; limit?: number } = {},
  ): Promise<TheHiveTask[]> {
    const queryFilters: Record<string, unknown>[] = [
      { _name: "getCase", idOrName: caseId },
      { _name: "tasks" },
    ];

    if (filters.status) {
      queryFilters.push({ _name: "filter", _field: "status", _value: filters.status });
    }
    if (filters.assignee) {
      queryFilters.push({ _name: "filter", _field: "assignee", _value: filters.assignee });
    }

    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
    return this.query<TheHiveTask>("case-tasks", queryFilters, {
      range: `0-${limit}`,
      sort: ["order"],
    });
  }

  async getTask(taskId: string): Promise<TheHiveTask> {
    return this.request<TheHiveTask>(`/task/${encodeURIComponent(taskId)}`);
  }

  async createTask(
    caseId: string,
    data: {
      title: string;
      description?: string;
      status?: string;
      flag?: boolean;
      order?: number;
      group?: string;
      assignee?: string;
      dueDate?: number;
    },
  ): Promise<TheHiveTask> {
    return this.request<TheHiveTask>(
      `/case/${encodeURIComponent(caseId)}/task`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  async updateTask(
    taskId: string,
    data: {
      title?: string;
      description?: string;
      status?: string;
      flag?: boolean;
      order?: number;
      group?: string;
      assignee?: string;
      dueDate?: number;
    },
  ): Promise<TheHiveTask> {
    await this.request<Record<string, never>>(
      `/task/${encodeURIComponent(taskId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
    return this.getTask(taskId);
  }

  // --- Observables ---

  async listObservables(
    caseId: string,
    filters: { dataType?: string; ioc?: boolean; limit?: number } = {},
  ): Promise<TheHiveObservable[]> {
    const queryFilters: Record<string, unknown>[] = [
      { _name: "getCase", idOrName: caseId },
      { _name: "observables" },
    ];

    if (filters.dataType) {
      queryFilters.push({ _name: "filter", _field: "dataType", _value: filters.dataType });
    }
    if (filters.ioc !== undefined) {
      queryFilters.push({ _name: "filter", _field: "ioc", _value: filters.ioc });
    }

    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
    return this.query<TheHiveObservable>("case-observables", queryFilters, {
      range: `0-${limit}`,
      sort: ["-_createdAt"],
    });
  }

  async getObservable(observableId: string): Promise<TheHiveObservable> {
    return this.request<TheHiveObservable>(
      `/observable/${encodeURIComponent(observableId)}`,
    );
  }

  async createObservable(
    caseId: string,
    data: {
      dataType: string;
      data: string;
      message?: string;
      tags?: string[];
      tlp?: number;
      pap?: number;
      ioc?: boolean;
      sighted?: boolean;
      ignoreSimilarity?: boolean;
    },
  ): Promise<TheHiveObservable> {
    // TheHive 5 returns an array of observables from this endpoint
    const result = await this.request<TheHiveObservable | TheHiveObservable[]>(
      `/case/${encodeURIComponent(caseId)}/observable`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    return Array.isArray(result) ? result[0] : result;
  }

  async createObservableBulk(
    caseId: string,
    data: {
      dataType: string;
      data: string[];
      message?: string;
      tags?: string[];
      tlp?: number;
      pap?: number;
      ioc?: boolean;
      sighted?: boolean;
      ignoreSimilarity?: boolean;
    },
  ): Promise<TheHiveObservable[]> {
    // TheHive 5 supports data as array for bulk creation
    const result = await this.request<TheHiveObservable[]>(
      `/case/${encodeURIComponent(caseId)}/observable`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    return Array.isArray(result) ? result : [result];
  }

  async searchObservables(
    filters: {
      dataType?: string;
      data?: string;
      tags?: string[];
      ioc?: boolean;
      limit?: number;
    } = {},
  ): Promise<TheHiveObservable[]> {
    const queryFilters: Record<string, unknown>[] = [
      { _name: "listObservable" },
    ];

    if (filters.dataType) {
      queryFilters.push({ _name: "filter", _field: "dataType", _value: filters.dataType });
    }
    if (filters.data) {
      queryFilters.push({ _name: "filter", _field: "data", _value: filters.data });
    }
    if (filters.ioc !== undefined) {
      queryFilters.push({ _name: "filter", _field: "ioc", _value: filters.ioc });
    }
    if (filters.tags && filters.tags.length > 0) {
      for (const tag of filters.tags) {
        queryFilters.push({ _name: "filter", _field: "tags", _value: tag });
      }
    }

    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
    return this.query<TheHiveObservable>("observables", queryFilters, {
      range: `0-${limit}`,
      sort: ["-_createdAt"],
    });
  }

  // --- Task Logs ---

  async listTaskLogs(
    taskId: string,
    limit: number = 50,
  ): Promise<TheHiveTaskLog[]> {
    const queryFilters: Record<string, unknown>[] = [
      { _name: "getTask", idOrName: taskId },
      { _name: "logs" },
    ];

    const clampedLimit = Math.min(Math.max(limit, 1), 500);
    return this.query<TheHiveTaskLog>("task-logs", queryFilters, {
      range: `0-${clampedLimit}`,
      sort: ["-_createdAt"],
    });
  }

  async createTaskLog(
    taskId: string,
    data: { message: string; includeInTimeline?: number },
  ): Promise<TheHiveTaskLog> {
    return this.request<TheHiveTaskLog>(
      `/task/${encodeURIComponent(taskId)}/log`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  // --- Comments ---

  async listComments(
    caseId: string,
    limit: number = 50,
  ): Promise<TheHiveComment[]> {
    const queryFilters: Record<string, unknown>[] = [
      { _name: "getCase", idOrName: caseId },
      { _name: "comments" },
    ];

    const clampedLimit = Math.min(Math.max(limit, 1), 500);
    return this.query<TheHiveComment>("case-comments", queryFilters, {
      range: `0-${clampedLimit}`,
      sort: ["-_createdAt"],
    });
  }

  async createComment(
    caseId: string,
    message: string,
  ): Promise<TheHiveComment> {
    return this.request<TheHiveComment>(
      `/case/${encodeURIComponent(caseId)}/comment`,
      {
        method: "POST",
        body: JSON.stringify({ message }),
      },
    );
  }

  // --- Users ---

  async listUsers(limit: number = 100): Promise<TheHiveUser[]> {
    const queryFilters: Record<string, unknown>[] = [
      { _name: "listUser" },
    ];

    const clampedLimit = Math.min(Math.max(limit, 1), 500);
    return this.query<TheHiveUser>("users", queryFilters, {
      range: `0-${clampedLimit}`,
      sort: ["name"],
    });
  }

  async getCurrentUser(): Promise<TheHiveUser> {
    return this.request<TheHiveUser>("/user/current");
  }

  // --- Templates ---

  async listCaseTemplates(limit: number = 100): Promise<TheHiveCaseTemplate[]> {
    const queryFilters: Record<string, unknown>[] = [
      { _name: "listCaseTemplate" },
    ];

    const clampedLimit = Math.min(Math.max(limit, 1), 500);
    return this.query<TheHiveCaseTemplate>("case-templates", queryFilters, {
      range: `0-${clampedLimit}`,
      sort: ["name"],
    });
  }

  // --- Raw Query ---

  async rawQuery(
    queryFilters: Record<string, unknown>[],
    options: { range?: string; sort?: string[]; name?: string } = {},
  ): Promise<unknown[]> {
    const normalizedOptions = this.normalizeRawQueryOptions(queryFilters, options);
    const body: Record<string, unknown> = {
      query: queryFilters,
    };
    if (normalizedOptions.range) body.range = normalizedOptions.range;
    if (normalizedOptions.sort) body.sort = normalizedOptions.sort;

    const nameParam = normalizedOptions.name ? `?name=${encodeURIComponent(normalizedOptions.name)}` : "";
    return this.request<unknown[]>(`/query${nameParam}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  private normalizeRawQueryOptions(
    queryFilters: Record<string, unknown>[],
    options: { range?: string; sort?: string[]; name?: string },
  ): { range?: string; sort?: string[]; name?: string } {
    if (!Array.isArray(queryFilters) || queryFilters.some((filter) => !isPlainObject(filter))) {
      throw new Error("Query must be a JSON array of filter objects");
    }

    const normalized: { range?: string; sort?: string[]; name?: string } = {};
    if (options.range !== undefined) {
      normalized.range = normalizeQueryRange(options.range);
    }
    if (options.sort !== undefined) {
      normalized.sort = normalizeQuerySort(options.sort);
    }
    if (options.name !== undefined) {
      normalized.name = normalizeQueryName(options.name);
    }
    return normalized;
  }

  // --- Cortex ---

  async listAnalyzers(dataType?: string): Promise<TheHiveAnalyzer[]> {
    const path = dataType
      ? `/connector/cortex/analyzer/type/${encodeURIComponent(dataType)}`
      : "/connector/cortex/analyzer";
    return this.connectorRequest<TheHiveAnalyzer[]>(path);
  }

  async runAnalyzer(
    analyzerId: string,
    cortexId: string,
    observableId: string,
  ): Promise<TheHiveJob> {
    return this.connectorRequest<TheHiveJob>(
      `/connector/cortex/job`,
      {
        method: "POST",
        body: JSON.stringify({
          analyzerId,
          cortexId,
          artifactId: observableId,
        }),
      },
    );
  }

  async getJob(jobId: string): Promise<TheHiveJob> {
    return this.connectorRequest<TheHiveJob>(
      `/connector/cortex/job/${encodeURIComponent(jobId)}`,
    );
  }

  async waitForJob(
    jobId: string,
    options: { maxAttempts?: number; intervalMs?: number } = {},
  ): Promise<TheHiveJob> {
    const maxAttempts = Math.min(Math.max(options.maxAttempts ?? 20, 1), 60);
    const intervalMs = Math.min(Math.max(options.intervalMs ?? 2000, 100), 10000);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const job = await this.getJob(jobId);
      if (isTerminalJobStatus(job.status)) {
        return job;
      }

      if (attempt < maxAttempts) {
        await sleep(intervalMs);
      }
    }

    throw new Error(`Cortex job ${jobId} did not complete after ${maxAttempts} attempts`);
  }

  // --- Status ---

  async getStatus(): Promise<TheHiveStatus> {
    return this.fetchJson<TheHiveStatus>(this.statusUrl, {}, false);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeQueryRange(range: string): string {
  if (typeof range !== "string") {
    throw new Error("Query range must be a string");
  }
  const match = range.trim().match(/^(\d+)-(\d+)$/);
  if (!match) {
    throw new Error("Query range must use start-end format, for example 0-100");
  }

  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start) {
    throw new Error("Query range end must be greater than or equal to start");
  }

  return `${start}-${Math.min(end, start + 500)}`;
}

function normalizeQuerySort(sort: string[]): string[] {
  if (!Array.isArray(sort)) {
    throw new Error("Query sort must be an array of field names");
  }

  return sort.map((field) => {
    if (typeof field !== "string") {
      throw new Error("Query sort fields must be strings");
    }
    const normalized = field.trim();
    if (!normalized || normalized.length > 100) {
      throw new Error("Query sort fields must be non-empty strings up to 100 characters");
    }
    return normalized;
  });
}

function normalizeQueryName(name: string): string {
  if (typeof name !== "string") {
    throw new Error("Query name must be a string");
  }
  const normalized = name.trim();
  if (!normalized || normalized.length > 100) {
    throw new Error("Query name must be a non-empty string up to 100 characters");
  }
  return normalized;
}

function isTerminalJobStatus(status: string | undefined): boolean {
  if (!status) {
    return false;
  }

  return ["success", "failure", "error", "deleted"].includes(status.toLowerCase());
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
