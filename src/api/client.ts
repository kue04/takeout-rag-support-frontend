/**
 * 统一 API 客户端。
 *
 * 【2026-09-23 契约变更 · P0-1】
 * 1. 身份只来自 `Authorization: Bearer <JWT>`；
 *    `X-User-Role` / `X-Operator-Id` 已彻底失效（后端只记日志、不参与判定）。
 * 2. 业务错误的 `detail` 有三种形状，必须分别解析：
 *    - 422（Pydantic 校验失败）→ `detail` 是数组；
 *    - 业务错误 → `detail` 是 `{ error_code, message }` 对象；
 *    - 其他 → `detail` 是字符串。
 *    旧实现只取字符串，会把 `{error_code: ...}` 显示成 `[object Object]`，
 *    并把 503 的 `chunk_index_unavailable` 丢掉 —— 那是「检索还没接入」的唯一线索。
 */

import { decodeJwtPayload } from "../lib/jwt";

/**
 * 后端基地址。
 *
 * 【2026-09-24 修正 · 踩坑 C8】原实现默认值是 `http://127.0.0.1:8000`。
 * 关键在于 Vite 会把 `import.meta.env.VITE_*` 在**构建期**内联成字符串字面量 ——
 * 于是这个地址被焊死在 `dist/*.js` 里。部署上线后，每个访客的浏览器都会去请求
 * **他自己那台机器**的 8000 端口（那里当然没有后端），服务器上的服务从头到尾没人访问到。
 *
 * 现在默认留空：`""` ⇒ 拼出来是相对路径（`/chat/prompt`），由反向代理把 `/` 转发到后端。
 * 本地开发仍由 `.env.local` 显式指定（本项目是 `http://127.0.0.1:8001`）。
 *
 * 判据：`npm run build` 之后，产物里 grep 不到任何 `127.0.0.1` / `localhost`。
 */
const RAW_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
const API_BASE_URL = RAW_BASE_URL.replace(/\/$/, "");

/** 展示给用户的地址文案。同源时 base 是空串，直接用会让错误信息以 `（/chat/prompt` 开头。 */
const BASE_URL_LABEL = API_BASE_URL || "(同源)";

/**
 * 开发期令牌。
 *
 * 【2026-09-24 修正 · 踩坑 C8】`VITE_` 前缀的变量**会被内联进前端产物** ——
 * 只要这里有值，就会随 `dist/*.js` 一起公开发布。原注释写的是「绝不硬编码进仓库」，
 * 方向对但防错了地方：仓库有 `.gitignore` 护着（`.env.*` / `dist/` 都不入库），
 * 真正暴露的是**部署产物**，它一上线就是人人可 `curl` 的一份静态文件。
 *
 * 所以生产构建必须留空（见 `.env.production`），身份改由运行时登录换取。
 * 前端**任何时候都不应该持有长期凭据**。
 */
const DEV_TOKEN = String(import.meta.env.VITE_DEV_TOKEN ?? "").trim();

export const apiBaseUrl = API_BASE_URL;

export function hasAuthToken() {
  return DEV_TOKEN.length > 0;
}

/**
 * 当前开发令牌的 payload（**只用于界面显隐**，不参与任何授权判断）。
 * 此前 `App.tsx` 把角色写死成 `"agent"`，导致「记忆 / JSON」两个诊断 tab
 * 在演示环境里永远看不到 —— 契约漂移因此长期没人发现。
 */
export function getTokenClaims() {
  return DEV_TOKEN ? decodeJwtPayload(DEV_TOKEN) : null;
}

/** 令牌里的角色列表；解不出来返回空数组（调用方自行决定 fallback）。 */
export function getTokenRoles(): string[] {
  const roles = getTokenClaims()?.roles;
  return Array.isArray(roles) ? roles.filter((role): role is string => typeof role === "string") : [];
}

/**
 * 错误分类。前端据此决定「提示什么 + 能不能重试 + 该隐藏还是该引导」。
 * 分类依据见交接文档主文档 §4.4 的状态码对照表。
 */
export type ApiErrorKind =
  | "unauthorized" // 401 缺令牌 / 令牌无效
  | "forbidden" // 403 令牌合法但缺 scope
  | "not_found" // 404 资源不存在
  | "unsupported" // 415 文件类型不支持
  | "validation" // 422 请求体校验失败
  | "unavailable" // 503 可用性问题（索引未建），可稍后重试
  | "server" // 500 部署/依赖问题，重试无用
  | "network" // 根本没连上
  | "unknown";

export class ApiError extends Error {
  status: number;
  path: string;
  kind: ApiErrorKind;
  /** 后端 `detail.error_code`，例如 `chunk_index_unavailable`。 */
  code?: string;
  /** 422 的字段级错误数组。 */
  issues?: unknown[];
  /** 503 / 网络错误 → true；500 等部署问题 → false（重试无用）。 */
  retryable: boolean;

  constructor(params: {
    path: string;
    status: number;
    kind: ApiErrorKind;
    message: string;
    code?: string;
    issues?: unknown[];
    retryable: boolean;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.path = params.path;
    this.status = params.status;
    this.kind = params.kind;
    this.code = params.code;
    this.issues = params.issues;
    this.retryable = params.retryable;
  }
}

/** 请求参数。`formData` 用于 multipart 上传（字段名后端要求是 `file`）。 */
export type ApiRequestOptions<TBody> = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: TBody;
  formData?: FormData;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
};

export async function apiRequest<TResponse, TBody = unknown>(
  path: string,
  options: ApiRequestOptions<TBody> = {},
): Promise<TResponse> {
  const url = `${API_BASE_URL}${path}${buildQuery(options.query)}`;
  const headers: Record<string, string> = { Accept: "application/json" };

  // 身份唯一来源。
  if (DEV_TOKEN) {
    headers.Authorization = `Bearer ${DEV_TOKEN}`;
  }

  let body: BodyInit | undefined;
  if (options.formData) {
    // multipart 由浏览器补 Content-Type + boundary，手写会破坏 boundary。
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    // 注意：走到这里**不代表**后端没启动。
    // 2026-09-23 实测：后端未处理异常返回的 500 **不带** `Access-Control-Allow-Origin`
    // （Starlette 的 ServerErrorMiddleware 在 CORSMiddleware 外层），
    // 浏览器会把它报成 CORS/网络失败 —— 前端拿不到 500 的状态码和 body。
    // 对照：503（HTTPException）是带 CORS 头的，所以能被正常读到。
    throw new ApiError({
      path,
      status: 0,
      kind: "network",
      message: `没有拿到响应（${BASE_URL_LABEL}${path}）。可能是后端未启动、后端 500 缺 CORS 头被浏览器拦下、或前端用了局域网 IP —— 判据见界面上的下一步提示。`,
      retryable: true,
    });
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    throw buildApiError(path, response.status, raw);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const text = await response.text();
  if (!text) {
    return undefined as TResponse;
  }
  return JSON.parse(text) as TResponse;
}

function buildQuery(query?: ApiRequestOptions<unknown>["query"]) {
  if (!query) {
    return "";
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

/** 三种 `detail` 形状 → 一个结构化错误。 */
function buildApiError(path: string, status: number, raw: string): ApiError {
  const parsed = parseErrorBody(raw);
  const kind = classifyStatus(status);
  const base = {
    path,
    status,
    kind,
    retryable: status === 503,
  };

  if (parsed.kind === "string") {
    return new ApiError({ ...base, message: parsed.message || defaultMessage(status) });
  }
  if (parsed.kind === "array") {
    // 422：Pydantic 校验失败，detail 是数组。字段级信息挂在 issues 上。
    return new ApiError({
      ...base,
      message: `请求参数不合法（${parsed.issues.length} 处）`,
      issues: parsed.issues,
    });
  }
  if (parsed.kind === "object") {
    return new ApiError({
      ...base,
      message: parsed.message || parsed.code || defaultMessage(status),
      code: parsed.code,
    });
  }
  return new ApiError({ ...base, message: raw || defaultMessage(status) });
}

type ParsedErrorBody =
  | { kind: "empty" }
  | { kind: "string"; message: string }
  | { kind: "array"; issues: unknown[] }
  | { kind: "object"; message?: string; code?: string };

function parseErrorBody(raw: string): ParsedErrorBody {
  if (!raw) {
    return { kind: "empty" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "string", message: raw };
  }

  if (!parsed || typeof parsed !== "object") {
    return { kind: "string", message: raw };
  }

  const detail = (parsed as { detail?: unknown }).detail;

  if (typeof detail === "string") {
    return { kind: "string", message: detail };
  }
  if (Array.isArray(detail)) {
    return { kind: "array", issues: detail };
  }
  if (detail && typeof detail === "object") {
    const record = detail as { error_code?: unknown; message?: unknown };
    return {
      kind: "object",
      code: typeof record.error_code === "string" ? record.error_code : undefined,
      message: typeof record.message === "string" ? record.message : undefined,
    };
  }
  return { kind: "empty" };
}

function classifyStatus(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 415) return "unsupported";
  if (status === 422) return "validation";
  if (status === 503) return "unavailable";
  if (status >= 500) return "server";
  if (status >= 400) return "unknown";
  return "unknown";
}

function defaultMessage(status: number) {
  if (status === 401) return "登录状态无效：缺少或过期的 Authorization 令牌";
  if (status === 403) return "当前身份无此权限";
  if (status === 404) return "资源不存在";
  if (status === 415) return "文件类型不支持";
  if (status === 500) return "服务端故障";
  if (status === 503) return "服务暂时不可用";
  return `接口请求失败（HTTP ${status}）`;
}
