/**
 * 状态语义与「缺失原因」统一模块（2026-09-23）
 *
 * 设计依据：交接文档 §8.2 + 验收规范 §4.2 / §4.3。
 * 三条硬规则：
 *  1. 颜色 + 图标 + 文字三者同现，不许只靠颜色；
 *  2. `skipped` 必须说明为什么，不许当「0 毫秒成功」；
 *  3. 缺失不能只放空或 `--`，必须给原因；「未测 / 无样本」≠ 0。
 *
 * 这里放纯逻辑（无 JSX），渲染在 components/StatusPill.tsx 与 components/Notice.tsx。
 */

import { ApiError, hasAuthToken } from "../api/client";

export type StatusTone = "success" | "progress" | "warning" | "danger" | "neutral";

export type StatusIconName = "check" | "spinner" | "clock" | "alert" | "x" | "slash" | "info";

export type StatusMeta = {
  tone: StatusTone;
  icon: StatusIconName;
  /** 中文语义词，直接展示。 */
  label: string;
  /** 后端原始值，保留可追溯。 */
  raw: string;
  /** 附加说明；skipped / duplicate / archived 必须有。 */
  note?: string;
};

/** 状态词表（交接文档 §8.2）。 */
const STATUS_TABLE: Record<string, { tone: StatusTone; label: string; icon: StatusIconName }> = {
  // 成功
  succeeded: { tone: "success", label: "成功", icon: "check" },
  published: { tone: "success", label: "已发布", icon: "check" },
  completed: { tone: "success", label: "完成", icon: "check" },
  pass: { tone: "success", label: "通过", icon: "check" },
  accepted: { tone: "success", label: "已受理", icon: "check" },
  approved: { tone: "success", label: "已审核", icon: "check" },
  success: { tone: "success", label: "成功", icon: "check" },
  // 进行中
  pending: { tone: "progress", label: "排队中", icon: "clock" },
  running: { tone: "progress", label: "处理中", icon: "spinner" },
  building: { tone: "progress", label: "构建中", icon: "spinner" },
  received: { tone: "progress", label: "已接收", icon: "clock" },
  stored: { tone: "progress", label: "已存储", icon: "clock" },
  parsed: { tone: "progress", label: "已解析", icon: "clock" },
  normalized: { tone: "progress", label: "已归一化", icon: "clock" },
  chunked: { tone: "progress", label: "已切分", icon: "clock" },
  persisted: { tone: "progress", label: "已落库", icon: "clock" },
  indexed: { tone: "progress", label: "已建索引", icon: "clock" },
  pending_agent_review: { tone: "warning", label: "待人工确认", icon: "clock" },
  pending_review: { tone: "warning", label: "待审核", icon: "clock" },
  // 警告 / 重试
  retrying: { tone: "warning", label: "重试中", icon: "alert" },
  needs_review: { tone: "warning", label: "需要复核", icon: "alert" },
  warn: { tone: "warning", label: "警告", icon: "alert" },
  marked_bad_case: { tone: "warning", label: "已标记 bad case", icon: "alert" },
  degraded: { tone: "warning", label: "降级", icon: "alert" },
  partial: { tone: "warning", label: "部分完成", icon: "alert" },
  needs_clarification: { tone: "warning", label: "待澄清", icon: "alert" },
  draft: { tone: "neutral", label: "草稿", icon: "info" },
  // 失败 / 拦截
  failed: { tone: "danger", label: "失败", icon: "x" },
  blocked: { tone: "danger", label: "已拦截", icon: "x" },
  fail: { tone: "danger", label: "不通过", icon: "x" },
  rejected: { tone: "danger", label: "已拒绝", icon: "x" },
  refused: { tone: "danger", label: "已拒答", icon: "x" },
  cancelled: { tone: "neutral", label: "已取消", icon: "slash" },
  canceled: { tone: "neutral", label: "已取消", icon: "slash" },
  // 未运行 / 不适用（必须带原因）
  skipped: { tone: "neutral", label: "已跳过", icon: "slash" },
  duplicate: { tone: "neutral", label: "重复内容", icon: "slash" },
  archived: { tone: "neutral", label: "已归档", icon: "slash" },
  rollback: { tone: "neutral", label: "已回滚", icon: "slash" },
};

export function describeStatus(value?: string | null, note?: string): StatusMeta {
  const raw = (value ?? "").trim();
  if (!raw) {
    return { tone: "neutral", icon: "info", label: "未返回状态", raw: "", note: note ?? "后端未返回该字段" };
  }
  const hit = STATUS_TABLE[raw.toLowerCase()];
  if (hit) {
    return { ...hit, raw, note };
  }
  return { tone: "neutral", icon: "info", label: raw, raw, note };
}

/* ------------------------------------------------------------------ *
 * 意图路由词表（2026-09-23）
 *
 * 背景：`risk_precheck` 步骤把 `intent_analysis.routing` 这个**枚举值**直接当
 * 「处理结果」打到界面上（见后端 `services/chat_service.py:925`），
 * 用户看到的就是一个孤零零的 `rag`。routing 回答的是「这条请求走哪条链路」，
 * 不是「风险有多大」—— 必须翻译，否则等于没写。
 * ------------------------------------------------------------------ */

const ROUTING_TEXT: Record<string, string> = {
  rag: "普通 RAG 链路",
  high_risk_rag: "高风险 RAG 链路（需加安全前缀）",
  // 2026-09-24 后端 B7 落地后新增：主意图置信度 < 0.6 时给这个路由，
  // 语义是「链路认为该先澄清而不是硬猜」。注意继承的意图置信度固定 0.6，
  // 不 < 0.6，所以继承**不会**走进 clarify（与后端 CLARIFY_CONFIDENCE_THRESHOLD 口径一致）。
  clarify: "澄清链路（置信度过低，先向用户确认诉求）",
};

/** 把 routing 枚举翻成人话；未知值原样返回并标注「未收录」。 */
export function describeRouting(value?: string | null): string {
  const raw = (value ?? "").trim();
  if (!raw) {
    return "未返回（后端未给 intent_analysis.routing）";
  }
  const hit = ROUTING_TEXT[raw];
  return hit ? `${hit}（${raw}）` : `${raw}（未收录的路由值，词表待补）`;
}

/** 风险等级的中文，供展示用；低置信度不等于低风险，别混。 */
const RISK_LEVEL_TEXT: Record<string, string> = {
  critical: "严重",
  high: "高",
  medium: "中",
  low: "低",
};

export function describeRiskLevel(value?: string | null): string {
  const raw = (value ?? "").trim();
  if (!raw) {
    return "未返回（后端未给 risk_level）";
  }
  const hit = RISK_LEVEL_TEXT[raw];
  return hit ? `${hit}（${raw}）` : raw;
}

/* ------------------------------------------------------------------ *
 * 缺失原因词表（验收规范 §4.2：缺失必须显示原因）
 * ------------------------------------------------------------------ */

export type MissingReasonCode =
  | "NOT_RETURNED"
  | "RETRIEVAL_NOT_RECORDED"
  | "TOKEN_NOT_RECORDED"
  | "INDEX_UNAVAILABLE"
  | "OFFLINE_EVALUATION_ONLY"
  | "GROUND_TRUTH_REQUIRED"
  | "NOT_IMPLEMENTED_BACKEND"
  | "NO_STREAMING"
  | "PERMISSION_DENIED"
  | "NOT_IN_THIS_RESPONSE";

const MISSING_REASON_TEXT: Record<MissingReasonCode, string> = {
  NOT_RETURNED: "后端未返回该字段",
  RETRIEVAL_NOT_RECORDED: "本次未产生检索证据（trace.retrieval_count = 0）",
  TOKEN_NOT_RECORDED: "后端未记录 token（token_usage 为空对象）",
  INDEX_UNAVAILABLE: "本租户还没有生效的 chunk 索引",
  OFFLINE_EVALUATION_ONLY: "只有离线脚本，未接入在线接口",
  GROUND_TRUTH_REQUIRED: "需要 gold 评测集，后端无评测执行接口",
  NOT_IMPLEMENTED_BACKEND: "后端未实现该概念，不是前端漏做",
  NO_STREAMING: "非流式架构，该指标不存在",
  PERMISSION_DENIED: "当前身份无此权限，接口会返回 403",
  NOT_IN_THIS_RESPONSE: "不在本次响应里（重新打开会话取不回诊断）",
};

export function missingReason(code: MissingReasonCode) {
  return MISSING_REASON_TEXT[code];
}

/** 统一格式化「缺失」：永远带原因，绝不返回空串或裸 `--`。 */
export function formatOrReason(value: unknown, code: MissingReasonCode | string): string {
  const reason = MISSING_REASON_TEXT[code as MissingReasonCode] ?? code;
  if (value === undefined || value === null || value === "") {
    return "未返回（" + reason + "）";
  }
  if (typeof value === "number") {
    return value.toLocaleString("zh-CN");
  }
  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }
  if (Array.isArray(value)) {
    return value.length ? value.join("、") : "无（" + reason + "）";
  }
  return String(value);
}

/** token 数：空对象 / 缺字段 → 「未记录」，不是 0。 */
export function formatTokenCount(value?: number): string {
  if (typeof value !== "number") {
    return "未记录（" + MISSING_REASON_TEXT.TOKEN_NOT_RECORDED + "）";
  }
  return value.toLocaleString("zh-CN");
}

export function formatLatency(value?: number): string {
  if (typeof value !== "number") {
    return "未记录";
  }
  if (value < 1000) {
    return value.toFixed(value < 10 ? 2 : 1) + " ms";
  }
  return (value / 1000).toFixed(2) + " s";
}

export function formatScore(value?: number | null, digits = 4): string {
  return typeof value === "number" ? value.toFixed(digits) : "未返回";
}

export function formatPercent(value?: number): string {
  return typeof value === "number" ? (value * 100).toFixed(1) + "%" : "未返回";
}

/* ------------------------------------------------------------------ *
 * 错误呈现（交接文档 §4.4 状态码对照表）
 * ------------------------------------------------------------------ */

export type ErrorPresentation = {
  tone: StatusTone;
  title: string;
  /** 后端原话（能拿到就拿）。 */
  detail: string;
  /** 下一步动作 —— 错误提示必须可操作。 */
  action: string;
  retryable: boolean;
  status: number;
  code?: string;
  /** 出错路径，便于排查。 */
  path?: string;
};

/**
 * 网络类失败的分环境提示。
 *
 * 末句只对本地开发成立：dev server 固定在 5173，后端 CORS 白名单也只放行
 * `localhost` / `127.0.0.1`。生产环境这句话是错的，而且它含字面量
 * `http://localhost:5173` —— 会被构建期内联进产物（踩坑 C8 那条判据要卡的东西）。
 *
 * 用 `import.meta.env.DEV` 门控：Vite 在 build 时把它静态替换为 false，
 * 常量折叠 + 死代码消除会把整句连同字符串一起剔除，产物里查不到 localhost。
 * 判据是机器执行的，不靠人记得 —— 见 `scripts/check-build-artifacts.mjs`。
 */
const DEV_NETWORK_HINT = import.meta.env.DEV
  ? "③ 前端必须用 http://localhost:5173 访问，局域网 IP 会被 CORS 白名单拒掉。"
  : "";

const NETWORK_ACTION =
  "按顺序排除：① 后端进程是否在跑；② 看后端终端有没有 Traceback —— 未处理异常返回的 500 不带 CORS 头，浏览器会报成网络错误，前端读不到状态码。" +
  DEV_NETWORK_HINT;

export function describeApiError(error: unknown): ErrorPresentation {
  if (error instanceof ApiError) {
    const base = {
      status: error.status,
      code: error.code,
      path: error.path,
      retryable: error.retryable,
      detail: error.message,
    };

    switch (error.kind) {
      case "unauthorized":
        return {
          ...base,
          tone: "danger",
          title: "登录状态无效",
          action: hasAuthToken()
            ? "令牌可能已过期：用 scripts/mint_dev_token.py 重新签一个，写进 .env.local 的 VITE_DEV_TOKEN 后重启 dev server。"
            : "前端没有配 VITE_DEV_TOKEN。在 .env.local 写入 VITE_DEV_TOKEN=<mint_dev_token.py 的输出> 后重启 dev server。",
        };
      case "forbidden":
        return {
          ...base,
          tone: "danger",
          title: "当前身份无此权限",
          action: "这是授权结果，不是故障：该功能入口对当前身份隐藏，重试无用。需要换更高权限的角色令牌。",
        };
      case "not_found":
        return {
          ...base,
          tone: "warning",
          title: "资源不存在",
          action: "确认 ID 是否正确（后端原文见下方），然后返回列表重新选择。",
        };
      case "unsupported":
        return {
          ...base,
          tone: "warning",
          title: "文件类型不支持",
          action: "换一个受支持的格式（PDF / DOCX / HTML / MD / TXT），注意内容要与扩展名一致。",
        };
      case "validation":
        return {
          ...base,
          tone: "warning",
          title: "请求参数不合法",
          action: "按表单字段提示修正后重试（422 是 Pydantic 校验失败，不是服务端故障）。",
        };
      case "unavailable":
        return {
          ...base,
          tone: "warning",
          title: error.code === "chunk_index_unavailable" ? "检索尚未接入" : "服务暂时不可用",
          action:
            error.code === "chunk_index_unavailable"
              ? "这不是故障：本租户还没有生效的 chunk 索引。先上传文档并重建索引，再回来检索。"
              : "这是可用性问题，可以稍后重试。",
        };
      case "server":
        return {
          ...base,
          tone: "danger",
          title: "服务端故障",
          action: "不要重试。这属于部署 / 依赖问题，请把下方原文报给后端排查。",
        };
      case "network":
        return {
          ...base,
          tone: "danger",
          title: "没有拿到响应",
          action: NETWORK_ACTION,
        };
      default:
        return {
          ...base,
          tone: "warning",
          title: "接口请求失败（HTTP " + error.status + "）",
          action: "查看下方后端原文后决定是否重试。",
        };
    }
  }

  if (error instanceof Error) {
    return {
      tone: "danger",
      title: "前端异常",
      detail: error.message,
      action: "这是前端运行时错误，请查看浏览器控制台。",
      retryable: false,
      status: 0,
    };
  }

  return {
    tone: "danger",
    title: "未知错误",
    detail: String(error),
    action: "请重试；若持续出现，查看浏览器控制台。",
    retryable: false,
    status: 0,
  };
}

/** 从任意抛出的东西里取一句可展示的话（保留后端原文）。 */
export function errorMessage(error: unknown, fallback = "请求失败"): string {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}
