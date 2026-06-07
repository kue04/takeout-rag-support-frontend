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

export async function apiRequest<TResponse, TBody = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT";
    body?: TBody;
  } = {},
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
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
