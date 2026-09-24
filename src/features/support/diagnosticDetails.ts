/**
 * 诊断面板「步骤详情」解析（2026-09-23）。
 *
 * ## 为什么要有这个文件
 *
 * 原本时间线卡片只把后端 `full_trace[i]` 的 `output_summary` / `metadata` 原样打印，
 * 于是出现了三种「等于没写」的展示：
 *
 *   - `读取上下文` → `recent=0, user_memory_fields=0`（只有计数，看不到读到了什么）
 *   - `识别意图`   → `退款进度`（只有意图名，没有置信度、证据、次要意图）
 *   - `风险预检`   → `rag`（一个裸枚举值，谁也看不懂）
 *
 * 但这些信息**后端其实已经返回了**，只是放在顶层字段里（`memory_snapshot` /
 * `intent_analysis` / `tool_results`），时间线没去取。
 *
 * ## 前后端同步约定（重要）
 *
 * 每个字段的取值顺序统一是：**`step.metadata` 里的新字段 → 顶层字段兜底**。
 * 后端将来把内容补进 trace（见交付说明的后端清单）之后，前端不需要再改；
 * 顶层兜底可以保留，也可以在那时删掉。
 *
 * 这个文件只产出**纯文本行**，不产出 JSX，方便单独校验。
 */

import type { ChatResponse } from "../../types/api";
import { describeRiskLevel, describeRouting } from "../../lib/status";

type TraceStep = NonNullable<ChatResponse["full_trace"]>[number];

export type DetailLine = {
  label: string;
  value: string;
  /** true 表示这行是「数据缺失及原因」，渲染时按弱化样式处理。 */
  missing?: boolean;
};

export type StepDetail = {
  /** 一句话说清这一步到底做了什么（人话）。 */
  what?: string;
  lines: DetailLine[];
  /** 数据来源与已知局限。诚实写清楚，别让读者以为这是完整真相。 */
  caveat?: string;
};

const NOT_RETURNED = "未返回（后端未返回该字段）";

/** 把 `{k: v}` 渲染成 `k=v；k=v`，空对象给明确说明而不是空串。 */
function formatPairs(obj: Record<string, unknown> | undefined, emptyText: string): string {
  const entries = Object.entries(obj ?? {});
  if (!entries.length) {
    return emptyText;
  }
  return entries
    .map(([key, value]) => {
      if (value === null || value === undefined) {
        return `${key}=(空)`;
      }
      return `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`;
    })
    .join("；");
}

function readMetaString(step: TraceStep, key: string): string | undefined {
  const value = step.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readMetaNumber(step: TraceStep, key: string): number | undefined {
  const value = step.metadata?.[key];
  return typeof value === "number" ? value : undefined;
}

function readMetaStringArray(step: TraceStep, key: string): string[] | undefined {
  const value = step.metadata?.[key];
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((item): item is string => typeof item === "string");
}

/* ------------------------------------------------------------------ *
 * 读取上下文 · memory_loaded
 * ------------------------------------------------------------------ */

function buildMemoryDetail(step: TraceStep, diagnostics: ChatResponse | null): StepDetail {
  const memory = diagnostics?.memory_snapshot;
  const lines: DetailLine[] = [];

  // 后端将来若把预览写进 metadata，优先用；现在回落到顶层 memory_snapshot。
  const metaPreview = readMetaStringArray(step, "recent_preview");
  const recent = memory?.short_term?.recent_messages ?? [];

  if (metaPreview?.length) {
    lines.push({ label: "本轮读到的历史消息", value: metaPreview.join("\n") });
  } else if (recent.length) {
    lines.push({
      label: `本轮读到的历史消息（${recent.length} 条）`,
      value: recent
        .map((message, index) => {
          const who = message.role === "assistant" ? "客服" : "用户";
          const intent = message.intent?.primary_intent ? `〔意图：${message.intent.primary_intent}〕` : "";
          return `${index + 1}. ${who}：${message.content || "（未返回内容）"}${intent}`;
        })
        .join("\n"),
    });
  } else {
    lines.push({ label: "本轮读到的历史消息", value: "0 条（本次是该会话的第一条消息）", missing: true });
  }

  const facts = memory?.short_term?.facts;
  lines.push({
    label: "会话事实（short_term.facts）",
    // 「字段不存在」和「返回了空对象」是两件事，不能都说成「无」。
    value:
      facts === undefined
        ? NOT_RETURNED
        : formatPairs(facts, "（返回了空对象：该会话还没有沉淀出结构化事实）"),
    missing: !facts || !Object.keys(facts).length,
  });

  const longFields = memory?.long_term?.fields;
  const longUsed = memory?.long_term?.used;
  if (longUsed === false) {
    lines.push({ label: "长期记忆", value: "未使用（long_term.used = false，本轮没有画像字段参与）", missing: true });
  } else {
    lines.push({
      label: "长期记忆字段（long_term.fields）",
      value:
        readMetaString(step, "long_term_summary") ??
        (longFields === undefined
          ? NOT_RETURNED
          : formatPairs(longFields, "（返回了空对象：本轮没有画像字段参与）")),
      missing: !longFields || !Object.keys(longFields).length,
    });
  }

  // 同一份数据两个口径：step 里的计数是「进入这一步时已存在的历史」，
  // snapshot 是「整轮处理完之后的快照」，会多出当前这一条。必须说明，否则像 bug。
  const stepCount = /recent=(\d+)/.exec(step.output_summary ?? "")?.[1];
  const caveat = [
    "内容取自本次响应最终的 memory_snapshot（顶层字段），不是该步骤当时的瞬时值。",
    stepCount !== undefined
      ? `因此步骤摘要里的 recent=${stepCount} 与这里的 ${recent.length} 条会差 ${recent.length - Number(stepCount)} 条（差值就是当前这一轮），不是数据不一致。`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return {
    what: "把该会话的短期上下文（历史消息 + 事实）与用户长期画像读进本轮请求。",
    lines,
    caveat,
  };
}

/* ------------------------------------------------------------------ *
 * 识别意图 · intent_detected
 * ------------------------------------------------------------------ */

function buildIntentDetail(step: TraceStep, diagnostics: ChatResponse | null): StepDetail {
  const analysis = diagnostics?.intent_analysis;
  const lines: DetailLine[] = [];

  const primary =
    readMetaString(step, "primary_intent") ?? analysis?.primary_intent ?? (step.output_summary || NOT_RETURNED);
  lines.push({ label: "主意图", value: primary });

  const primaryEntry = analysis?.intents?.find((intent) => intent.name === primary);
  const confidence = readMetaNumber(step, "confidence") ?? primaryEntry?.confidence;
  if (typeof confidence === "number") {
    const advice =
      confidence < 0.6
        ? "　← 低置信度：命中证据薄弱，按现有链路仍会照常检索，建议改走澄清"
        : "";
    lines.push({ label: "主意图置信度", value: `${(confidence * 100).toFixed(0)}%${advice}` });
  } else {
    lines.push({ label: "主意图置信度", value: NOT_RETURNED, missing: true });
  }

  // 后端 B5（2026-09-24）：继承来的意图必须和「直接命中」区分开，否则猜的会被当成命中的。
  const inherited = readMetaString(step, "inherited_from_context") ?? analysis?.inherited_from_context;
  const evidence = readMetaStringArray(step, "evidence") ?? primaryEntry?.evidence;
  if (evidence) {
    lines.push({
      label: "命中证据（原文片段）",
      value: evidence.length
        ? evidence.join("、")
        : inherited
          ? "无（继承来的意图，本句没有任何关键词命中）"
          : "无（兜底意图不携带证据）",
      missing: !evidence.length,
    });
  } else {
    lines.push({ label: "命中证据（原文片段）", value: NOT_RETURNED, missing: true });
  }

  lines.push(
    inherited
      ? {
          label: "意图来源",
          value: `继承上文 —— 本句没有命中任何关键词，沿用上一轮的「${inherited}」，置信度固定为 0.6`,
          missing: true,
        }
      : {
          label: "意图来源",
          value: primaryEntry?.evidence?.length ? "本句关键词直接命中" : "兜底（无规则命中，也未继承到上文）",
          missing: !primaryEntry?.evidence?.length,
        },
  );

  const secondary = readMetaStringArray(step, "secondary_intents") ?? analysis?.secondary_intents;
  if (secondary === undefined) {
    lines.push({ label: "次要意图", value: NOT_RETURNED, missing: true });
  } else {
    lines.push({
      label: "次要意图",
      value: secondary.length ? secondary.join("、") : "无（本次只有 1 个意图命中）",
      missing: !secondary.length,
    });
  }

  const allIntents = analysis?.intents ?? [];
  if (allIntents.length > 1) {
    lines.push({
      label: `候选意图全表（${allIntents.length} 个）`,
      value: allIntents
        .map((intent) => `${intent.name} ${(intent.confidence * 100).toFixed(0)}% · ${intent.risk_level}`)
        .join("\n"),
    });
  }

  return {
    what: "按关键词规则匹配意图，取优先级最高者为主意图，其余进入次要意图。",
    lines,
    caveat:
      "意图来自后端关键词规则匹配。后端已于 2026-09-24 补齐两处：" +
      "① 修饰词归一化，插入语与程度副词会先被剥掉再比对（「骑手一直联系不上」现在能命中「骑手联系不上」）；" +
      "② 本句零命中且含指代词时继承上文主意图，置信度固定 0.6，低于任何直接命中。" +
      "仍然做不到的是规则表外的说法 —— 例如「菜不新鲜」不在食品安全投诉的关键词里，识别不出来。",
  };
}

/* ------------------------------------------------------------------ *
 * 风险预检 · risk_precheck
 * ------------------------------------------------------------------ */

function buildRiskDetail(step: TraceStep, diagnostics: ChatResponse | null): StepDetail {
  const analysis = diagnostics?.intent_analysis;
  const lines: DetailLine[] = [];

  const routing = readMetaString(step, "routing") ?? analysis?.routing ?? step.output_summary ?? "";
  lines.push({ label: "路由去向", value: describeRouting(routing) });

  const riskLevel = readMetaString(step, "risk_level") ?? analysis?.risk_level;
  lines.push({
    label: "风险等级",
    value: riskLevel ? `${describeRiskLevel(riskLevel)}　← 取自上一步「识别意图」，本步不重新判定` : NOT_RETURNED,
    missing: !riskLevel,
  });

  const highRiskIntents = (analysis?.intents ?? []).filter(
    (intent) => intent.risk_level === "high" || intent.risk_level === "critical",
  );
  lines.push({
    label: "命中的高风险意图",
    value: highRiskIntents.length
      ? highRiskIntents.map((intent) => `${intent.name}（${intent.risk_level}）`).join("、")
      : "无",
    missing: !highRiskIntents.length,
  });

  const needsPrefix = readMetaNumber(step, "requires_safety_prefix") ?? (analysis?.requires_safety_prefix ? 1 : 0);
  lines.push({
    label: "是否加安全前缀",
    value: needsPrefix ? "是（回复需先给安全提示）" : "否",
  });

  return {
    what: "把意图分析写入缓存、把风险状态挂到会话上，并决定这条请求走哪条链路。",
    lines,
    caveat:
      "这一步自身不做任何风险检测 —— 风险等级完全继承自上一步「识别意图」，" +
      "这里只做三件事：把意图写进缓存、把风险状态挂到会话、决定走哪条链路。" +
      "所以上面的风险等级不是本步判出来的，别当成这里又判了一次。" +
      "（routing 原先在界面上裸显示成 rag，现已翻译；risk_source 由后端标注来源。）",
  };
}

/* ------------------------------------------------------------------ *
 * 订单工具 · order_tool_called
 * ------------------------------------------------------------------ */

function buildToolDetail(step: TraceStep, diagnostics: ChatResponse | null): StepDetail {
  const tools = diagnostics?.tool_results ?? [];
  const lines: DetailLine[] = [];

  if (!tools.length) {
    return {
      what: "调用订单相关工具取实时状态。",
      lines: [{ label: "工具调用明细", value: "未返回（后端未返回 tool_results）", missing: true }],
      caveat: "步骤摘要显示有工具被调用，但顶层 tool_results 为空，两者对不上，需要后端核对。",
    };
  }

  lines.push({
    label: `工具调用明细（${tools.length} 次）`,
    value: tools
      .map((tool, index) => {
        const name = tool.tool_name || `tool_${index + 1}`;
        const latency = typeof tool.latency_ms === "number" ? ` · ${tool.latency_ms}ms` : "";
        const error = tool.error_type ? ` · ${tool.error_type}${tool.retryable ? "（可重试）" : "（不可重试）"}` : "";
        const summary = summarizeTool(tool);
        return `${index + 1}. ${name} · ${tool.status ?? "-"}${latency}${error}\n    ${summary}`;
      })
      .join("\n"),
  });

  // 步骤摘要会把多个工具的相同结果拼在一起，出现重复且分不清是哪个工具返回的。
  const raw = step.output_summary ?? "";
  const parts = raw.split("；").map((part) => part.trim()).filter(Boolean);
  const duplicated = parts.length > 1 && new Set(parts).size < parts.length;
  if (duplicated) {
    lines.push({
      label: "后端步骤摘要（原文）",
      value: raw,
      missing: true,
    });
  }

  return {
    what: "调用订单 / 退款查询工具，把实时状态作为事实来源提供给后续生成。",
    lines,
    caveat:
      tools.length && !tools.some((tool) => tool.status === "success")
        ? "本次工具调用全部未成功：生成阶段拿不到实时订单状态，回答只能给通用指引。"
        : duplicated
          ? "后端步骤摘要把多个工具的相同结果直接拼起来，会出现重复文本且不标工具名；上面按 tool_results 逐条列出，以后者为准。"
          : undefined,
  };
}

function summarizeTool(tool: NonNullable<ChatResponse["tool_results"]>[number]): string {
  const output = tool.output;
  if (output && typeof output === "object") {
    const data = output as Record<string, unknown>;
    const summary = data.summary || data.status_label || data.refund_status || data.delivery_status || data.error;
    if (summary) {
      return String(summary);
    }
  }
  if (tool.status === "skipped") {
    return "待补充订单信息";
  }
  if (tool.status === "failed") {
    return "暂时无法查询";
  }
  return "（后端未给出可读摘要）";
}

/* ------------------------------------------------------------------ *
 * 入口
 * ------------------------------------------------------------------ */

const BUILDERS: Record<string, (step: TraceStep, diagnostics: ChatResponse | null) => StepDetail> = {
  memory_loaded: buildMemoryDetail,
  intent_detected: buildIntentDetail,
  risk_precheck: buildRiskDetail,
  order_tool_called: buildToolDetail,
};

/** 返回该步骤的富详情；没有专门解析器的步骤返回 null（走原有的摘要渲染）。 */
export function resolveStepDetail(step: TraceStep, diagnostics: ChatResponse | null): StepDetail | null {
  if (!step.step) {
    return null;
  }
  const builder = BUILDERS[step.step];
  return builder ? builder(step, diagnostics) : null;
}
