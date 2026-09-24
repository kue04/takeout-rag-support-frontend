/**
 * 前端类型层（2026-09-23 重构 · P0-4）
 *
 * 规则：
 * 1. **接口返回值的形状以 `./backendContract.ts` 为准**（那份是 `scripts/export_frontend_contract.py`
 *    从后端 OpenAPI 生成的，禁止手抄）。本文件不再复写任何端点响应字段。
 * 2. 本文件只放两类东西：
 *    a) 对生成类型的**直接别名**（为了让业务代码少写一层命名空间）；
 *    b) **页面 ViewModel** —— 只对契约里被标成 `Record<string, unknown>` / `object` 的字段
 *       做收窄（TypeScript 需要具体字段名才能访问）。收窄不新增字段、不伪造字段。
 * 3. 后端新增可选字段不会破坏这里；**字段被删除或改名是破坏性变更**，
 *    升级时先 diff `docs/frontend/openapi.json`，再改本文件。
 *
 * 漂移修正记录：旧版把 `/retrieval/search` 定义成 `RetrievalSearchResponse`，
 * 真实响应是 `ChunkRetrievalResponse`（B7 换过语义）。现已分开：
 * - `RetrievalSearchResponse` → `/retrieval/search-demo`（演示路径 · 种子 FAQ）
 * - `ChunkRetrievalResponse` → `/retrieval/search`（正式路径 · chunk 级）
 */

import type * as Contract from "./backendContract";

export type * from "./backendContract";

/* ------------------------------------------------------------------ *
 * a) 直接别名：形状一律来自生成契约
 * ------------------------------------------------------------------ */

export type ApiChatRequest = Contract.ChatRequest;
export type ChatReviewAction = Contract.ChatReviewActionRequest["action"];
export type ChatReviewActionRequest = Contract.ChatReviewActionRequest;
export type ChatReviewActionResponse = Contract.ChatReviewActionResponse;
export type PromptContextItem = Contract.PromptContextItemResponse;

export type FeedbackRequest = Contract.FeedbackRequest;
export type FeedbackItem = Contract.FeedbackItem;
export type RecentFeedbackResponse = Contract.RecentFeedbackResponse;
export type ExportEvalCaseResponse = Contract.ExportEvalCaseResponse;

export type OpsMetrics = Contract.OpsMetricsResponse;
export type ModelInfo = Contract.ModelInfoResponse;

export type KnowledgeItem = Contract.KnowledgeItem;
export type KnowledgePayload = Contract.KnowledgeItemPayload;
export type KnowledgeListResponse = Contract.KnowledgeListResponse;
export type KnowledgeExportResponse = Contract.KnowledgeExportResponse;
export type KnowledgePublishHistoryItem = Contract.KnowledgePublishHistoryItem;
export type KnowledgePublishHistoryResponse = Contract.KnowledgePublishHistoryResponse;
export type KnowledgePublishResponse = Contract.KnowledgePublishResponse;

export type PromptVersionItem = Contract.PromptVersionItem;
export type PromptVersionPayload = Contract.PromptVersionPayload;
export type PromptVersionListResponse = Contract.PromptVersionListResponse;

export type AuditLogItem = Contract.AuditLogItem;
export type AuditLogListResponse = Contract.AuditLogListResponse;
export type ReleaseChecklistItem = Contract.ReleaseChecklistItem;
export type ReleaseChecklistResponse = Contract.ReleaseChecklistResponse;

export type OrderStatePayload = Contract.OrderStateRequest;
export type OrderStateResponse = Contract.OrderStateResponse;

export type CategoriesResponse = Contract.CategoriesResponse;
export type ExamplesByCategoryResponse = Contract.ExamplesByCategoryResponse;
export type ExampleSearchResponse = Contract.SearchExamplesResponse;
export type KnowledgeExample = Contract.ExampleItem;

export type RetrievalMode = NonNullable<Contract.RetrievalSearchRequest["mode"]>;
export type RetrievalConfig = Contract.RagConfigResponse;

/* --- 向后兼容别名：旧代码用的名字，指向同一个契约类型 --- */
export type KnowledgeOpsItem = Contract.KnowledgeItem;
export type RetrievalResult = Contract.RetrievalResultItem;
export type RetrievalPromptPreviewResponse = Contract.PromptPreviewResponse;
/** @deprecated 用 ChatRequest 的契约别名 `ApiChatRequest`。 */
export type ChatRequest = Contract.ChatRequest;

/** 演示路径（A 轨 · 种子 FAQ，无权限过滤）请求/响应。 */
export type RetrievalSearchRequest = Contract.RetrievalSearchRequest;
export type RetrievalResultItem = Contract.RetrievalResultItem;
export type RetrievalSearchResponse = Contract.RetrievalSearchResponse;
export type PromptPreviewResponse = Contract.PromptPreviewResponse;

/** 正式路径（chunk 级，服务端权限过滤）请求/响应。**注意：没有 `mode` 字段。** */
export type ChunkRetrievalRequest = Contract.ChunkRetrievalRequest;
export type ChunkRetrievalItem = Contract.ChunkRetrievalItem;
export type ChunkIndexInfo = Contract.ChunkIndexInfo;
export type ChunkRetrievalResponse = Contract.ChunkRetrievalResponse;

export type IndexRebuildResponse = Contract.IndexRebuildResponse;
export type DocumentUploadResponse = Contract.DocumentUploadResponse;
export type IngestionJobDetail = Contract.IngestionJobDetail;
export type DocumentDetail = Contract.DocumentDetail;
export type DocumentVersionListResponse = Contract.DocumentVersionListResponse;
export type ParseWarningItem = Contract.ParseWarningItem;

export type ChatHistoryMessage = Contract.ChatHistoryMessage;
export type ChatHistoryResponse = Contract.ChatHistoryResponse;

/** 抽干诊断数据只能从**当次** `/chat/prompt` 的 `trace` 拿，后端没有 `GET /traces/{id}`。 */
export type ChatTrace = Contract.ChatTrace;

/* ------------------------------------------------------------------ *
 * b) 页面 ViewModel：只收窄契约里的 Record<string, unknown> / object
 * ------------------------------------------------------------------ */

export type IntentAnalysis = {
  primary_intent?: string;
  secondary_intents?: string[];
  risk_level?: string;
  routing?: string;
  requires_safety_prefix?: boolean;
  /**
   * 后端 B5（2026-09-24）新增：主意图是本句零命中、从上文继承来的。
   * 值是继承的来源意图名。**存在就意味着「猜的」**，必须和直接命中区分展示。
   */
  inherited_from_context?: string;
  intents?: Array<{
    name: string;
    confidence: number;
    risk_level: string;
    priority?: number;
    evidence?: string[];
    /** 该候选是否由上下文继承而来（继承时 confidence 固定 0.6、evidence 为空）。 */
    inherited_from_context?: boolean;
  }>;
};

export type SafetyStatus = {
  passed?: boolean;
  blocked?: boolean;
  issues?: string[];
  fallback_applied?: boolean;
};

export type ToolResult = {
  tool_name?: string;
  status?: string;
  input?: unknown;
  output?: unknown;
  error_type?: string | null;
  latency_ms?: number;
  retryable?: boolean;
};

/**
 * 契约里 `retrieved_items` / `evidence_citations` 等都是 `object[]`。
 * 这里收窄到后端实际返回的类（与检索响应同构）。
 *
 * 待验证：本机 `/chat/prompt` 恒走降级（`retrieval_count=0`），
 * 因此**没有实测到非空的 `retrieved_items`**。字段名按 `RetrievalResultItem` 推断。
 */
export type RetrievedItem = Contract.RetrievalResultItem;

export type EvidenceCitation = {
  evidence_id?: string;
  knowledge_id?: string;
  source_type?: string;
  source?: string;
  category?: string;
  intent?: string;
  risk_level?: string;
  version?: string | number;
  updated_at?: string;
  score?: number;
  evidence_role?: string;
  quote?: string;
  title?: string;
};

export type FullTraceStep = {
  step?: string;
  status?: string;
  input_summary?: string;
  output_summary?: string;
  latency_ms?: number;
  metadata?: Record<string, unknown>;
};

/**
 * `token_usage` 实测可能是空对象 `{}` → 前端必须显示「未记录」，不能显示 0。
 */
export type TokenUsage = {
  provider?: string;
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  counting_method?: string;
};

/**
 * `/chat/prompt` 的 `memory_snapshot`。
 *
 * 【2026-09-23 漂移修正】旧版本读的是 `short_term_summary` / `session_summary` /
 * `current_order_state` / `used_fields` / `long_term_memory` / `user_memory` /
 * `used_long_term_memory` —— 实测这些字段**一个都不存在**，真实的顶层键只有
 * `short_term` 和 `long_term`（见后端 `services/chat_service.py:602 build_memory_snapshot`）。
 * 漂移之所以长期没被发现：契约里该字段是 `Record<string, unknown>`，tsc 拦不住，
 * 且「记忆」tab 被角色开关隐藏。现在按真实形状收窄。
 */
export type MemorySnapshot = {
  short_term?: {
    session_id?: string;
    summary?: string;
    facts?: Record<string, unknown>;
    recent_messages?: MemoryRecentMessage[];
  };
  long_term?: {
    /** 是否命中长期记忆（后端按 `bool(user_memory)` 给）。 */
    used?: boolean;
    /** 读到的用户画像字段。 */
    fields?: Record<string, unknown>;
    /** 本次请求新写入的字段。 */
    updated_fields?: Record<string, unknown>;
    priority_note?: string;
  };
};

/** `short_term.recent_messages[]` 的元素。 */
export type MemoryRecentMessage = {
  role?: string;
  content?: string;
  risk_level?: string;
  created_at?: string;
  intent?: IntentAnalysis;
};

export type ContextUsed = {
  session_id?: string;
  recent_message_count?: number;
  summary_chars?: number;
  fact_count?: number;
  redis_enabled?: boolean;
};

export type HandoffTicket = {
  id?: string;
  ticket_id?: string;
  reason?: string;
  context?: unknown;
  context_summary?: string;
};

export type ManualJudgment = {
  direct_answer?: string;
  grounded?: string;
  useful?: string;
  notes?: string;
};

export type EvaluationMetrics = {
  top1_intent_hit_rate?: number;
  evidence_keyword_coverage?: number;
  forbidden_hit_count?: number;
  judge_pass_rate?: number;
  suggested_layer_counts?: Record<string, number>;
};

/**
 * `/chat/prompt` 响应 ViewModel。
 * 基础字段全部来自生成契约 `Contract.ChatResponse`；
 * 只把契约中标为 `object` / `object[]` 的字段收窄成可访问的具体类型。
 */
export type ChatResponse = Omit<
  Contract.ChatResponse,
  | "citations"
  | "context_used"
  | "decision_trace"
  | "evaluation_metrics"
  | "evidence_citations"
  | "full_trace"
  | "handoff_ticket"
  | "intent_analysis"
  | "manual_judgment"
  | "memory_snapshot"
  | "prompt_context_items"
  | "retrieved_items"
  | "safety_status"
  | "token_usage"
  | "tool_results"
> & {
  citations?: EvidenceCitation[];
  context_used?: ContextUsed;
  decision_trace?: unknown;
  evaluation_metrics?: EvaluationMetrics;
  evidence_citations?: EvidenceCitation[];
  full_trace?: FullTraceStep[];
  handoff_ticket?: HandoffTicket | null;
  intent_analysis?: IntentAnalysis;
  manual_judgment?: ManualJudgment;
  memory_snapshot?: MemorySnapshot;
  prompt_context_items?: PromptContextItem[];
  retrieved_items?: RetrievedItem[];
  safety_status?: SafetyStatus;
  token_usage?: TokenUsage;
  tool_results?: ToolResult[];

  /** 前端本地字段，**不是后端返回**：审核动作的本地回执。 */
  review_action?: ChatReviewActionResponse;
};

/* ------------------------------------------------------------------ *
 * c) 纯前端 ViewModel（与后端契约无关）
 * ------------------------------------------------------------------ */

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  confidenceScore?: number;
  retrievedDocuments?: string[];
};

export type KnowledgeStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "archived"
  | "published"
  | "rollback"
  | string;
