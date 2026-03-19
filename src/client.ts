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
} from "./types.js";

export class TheHiveClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;

  constructor(config: TheHiveConfig) {
    this.baseUrl = `${config.url}/api/v1`;
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
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...(options.headers as Record<string, string>),
        },
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
    const detail = body ? `: ${body.slice(0, 200)}` : "";
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

  /**
   * Connector endpoints live under /api/connector/ not /api/v1/
   */
  private async connectorRequest<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl.replace("/api/v1", "/api")}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...(options.headers as Record<string, string>),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(this.getErrorMessage(response.status, body));
      }

      if (response.status === 204) {
        return {} as T;
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

  // --- Status ---

  async getStatus(): Promise<TheHiveStatus> {
    const url = this.baseUrl.replace("/api/v1", "/api/status");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(this.getErrorMessage(response.status, body));
      }

      return (await response.json()) as TheHiveStatus;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`TheHive API timeout after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
