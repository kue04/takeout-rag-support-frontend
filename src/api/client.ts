const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  path: string;

  constructor(path: string, status: number, detail: string) {
    super(`${path} -> HTTP ${status}: ${detail}`);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
  }
}

export function buildOperatorHeaders(role: string, operatorId: string) {
  return {
    "X-Operator-Id": operatorId,
    "X-User-Role": role,
  };
}

export async function apiRequest<TResponse, TBody = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT";
    body?: TBody;
    headers?: Record<string, string>;
    role?: string;
    operatorId?: string;
    signal?: AbortSignal;
  } = {},
): Promise<TResponse> {
  const operatorHeaders =
    options.role && options.operatorId
      ? buildOperatorHeaders(options.role, options.operatorId)
      : {};
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...operatorHeaders,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new ApiError(path, response.status, normalizeErrorDetail(detail));
  }

  return response.json() as Promise<TResponse>;
}

function normalizeErrorDetail(detail: string) {
  if (!detail) {
    return "接口请求失败";
  }

  try {
    const parsed = JSON.parse(detail) as { detail?: unknown };
    return typeof parsed.detail === "string" ? parsed.detail : detail;
  } catch {
    return detail;
  }
}
