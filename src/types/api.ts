export type RetrievalMode = "vector" | "hybrid";

export type RetrievalConfig = {
  embedding_model?: string;
  reranker_model?: string;
  rerank_weight?: number;
  default_min_score?: number;
  reply_rules_enabled?: boolean;
  reply_rules_status?: string;
};

export type RetrievalResult = {
  rank: number;
  score: number;
  rerank_score?: number;
  model_rerank_score?: number;
  vector_score?: number;
  keyword_bonus?: number;
  direction_penalty?: number;
  category?: string;
  intent?: string;
  question: string;
  answer: string;
  role?: "primary" | "supporting" | string;
  evidence_strength?: string;
  display_title?: string;
  evidence_summary?: string;
};

export type PromptContextItem = RetrievalResult & {
  role: "primary" | "supporting" | string;
  used_primary_evidence?: boolean;
  mixed_supporting_intent?: boolean;
};

export type ChatRequest = {
  message: string;
  user_id?: string;
  session_id?: string | null;
  order_id?: string | null;
};

export type IntentAnalysis = {
  primary_intent?: string;
  secondary_intents?: string[];
  risk_level?: "low" | "medium" | "high" | "critical" | string;
  routing?: string;
  intents?: Array<{
    name: string;
    confidence: number;
    risk_level: string;
    evidence?: string[];
  }>;
};

export type ContextUsed = {
  session_id?: string;
  recent_message_count?: number;
  summary_chars?: number;
  fact_count?: number;
  redis_enabled?: boolean;
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
  evidence_role?: "primary" | "supporting" | string;
  quote?: string;
  title?: string;
};

export type PrdCitation = {
  knowledge_id?: string;
  title?: string;
  category?: string;
  version?: string | number;
  snippet?: string;
  score?: number;
  updated_at?: string;
  source?: string;
};

export type FullTraceStep = {
  step?: string;
  status?: string;
  input_summary?: string;
  output_summary?: string;
  latency_ms?: number;
  metadata?: Record<string, unknown>;
};

export type TokenUsage = {
  provider?: string;
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  counting_method?: string;
};

export type MemorySnapshot = {
  short_term_summary?: string;
  session_summary?: string;
  current_order_state?: string;
  last_primary_evidence?: unknown;
  long_term_memory?: Record<string, unknown>;
  user_memory?: Record<string, unknown>;
  used_long_term_memory?: boolean;
  used_fields?: string[];
};

export type HandoffTicket = {
  id?: string;
  ticket_id?: string;
  reason?: string;
  context?: unknown;
  context_summary?: string;
};

export type ChatTrace = {
  retrieval_count?: number;
  request_id?: string;
  latency_ms?: number;
  top1_intent?: string;
  answer_source?: string;
  reply_rules_applied?: boolean;
  degraded?: boolean;
  failure_stage?: string;
  used_fallback_prompt?: boolean;
  fallback_reason?: string;
  user_id?: string;
  session_id?: string;
  order_id?: string | null;
  intent_analysis?: IntentAnalysis;
  safety_status?: SafetyStatus;
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

export type ChatResponse = {
  request_id?: string;
  reply: string;
  risk_level?: "low" | "medium" | "high" | "blocked" | string;
  confidence_level?: "high" | "medium" | "low" | string;
  need_human_review?: boolean;
  human_review_reason?: string;
  citations?: PrdCitation[];
  conversation_status?: string;
  answer_basis?: string | Record<string, unknown>;
  evidence_citations?: EvidenceCitation[];
  tool_results?: ToolResult[];
  memory_snapshot?: MemorySnapshot;
  decision_trace?: unknown;
  full_trace?: FullTraceStep[];
  handoff_ticket?: HandoffTicket | null;
  token_usage?: TokenUsage;
  session_id?: string;
  user_id?: string;
  order_id?: string | null;
  intent_analysis?: IntentAnalysis;
  context_used?: ContextUsed;
  safety_status?: SafetyStatus;
  confidence_score?: number;
  final_prompt?: string;
  prompt_version?: string;
  retrieved_documents?: string[];
  retrieved_items?: RetrievalResult[];
  prompt_context_items?: PromptContextItem[];
  trace?: ChatTrace;
  expected_intent?: string;
  expected_evidence_keywords?: string[];
  matched_evidence_keywords?: string[];
  missing_evidence_keywords?: string[];
  forbidden_keywords?: string[];
  forbidden_keyword_hits?: string[];
  issue_type?: string;
  suggested_layer?: string;
  manual_judgment?: ManualJudgment;
  evaluation_metrics?: EvaluationMetrics;
  suggested_layer_counts?: Record<string, number>;
  used_primary_evidence?: boolean;
  mixed_supporting_intent?: boolean;
  risky_promises?: string[];
  needs_manual_review?: boolean;
  review_action?: ChatReviewActionResponse;
  handoff_recommendation?: {
    recommended?: boolean;
    reason?: string;
    priority?: string;
  };
};

export type ChatReviewAction = "accepted" | "edited_and_sent" | "human_handoff" | "marked_bad_case";

export type ChatReviewActionRequest = {
  request_id: string;
  action: ChatReviewAction;
  operator_id?: string;
  operator_role?: string;
  final_reply?: string;
  reason?: string;
};

export type ChatReviewActionResponse = {
  request_id: string;
  session_id: string;
  user_id: string;
  order_id?: string | null;
  action: ChatReviewAction;
  status: string;
  final_reply: string;
  reason?: string;
  handoff_ticket?: HandoffTicket | null;
  audit_id?: number | null;
  saved: boolean;
  created_at: string;
};

export type ChatHistoryResponse = {
  user_id: string;
  session_id: string;
  order_id?: string | null;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    intent?: Record<string, unknown>;
    risk_level?: string;
    created_at?: string;
  }>;
  latest_response?: ChatResponse;
};

export type OrderStatePayload = {
  user_id: string;
  order_id: string;
  status: string;
  status_label?: string;
  delivery_status?: string;
  summary?: string;
  refund_status?: string;
  store_name?: string;
  items?: Array<Record<string, unknown>>;
  total?: number;
};

export type FeedbackRequest = {
  request_id: string;
  query: string;
  reply: string;
  helpful: boolean;
  reason?: string;
  expected_reply?: string;
  trace?: ChatTrace;
};

export type FeedbackItem = {
  id: number;
  request_id: string;
  query: string;
  reply: string;
  helpful: boolean;
  reason: string;
  expected_reply: string;
  top1_intent: string;
  latency_ms: number;
  answer_source: string;
  failure_stage: string;
  exported: boolean;
  created_at: string;
};

export type RecentFeedbackResponse = {
  count: number;
  items: FeedbackItem[];
};

export type ExportEvalCaseResponse = {
  feedback_id: number;
  eval_case: Record<string, unknown>;
};

export type OpsMetrics = {
  source?: string;
  request_count: number;
  failure_count: number;
  average_latency_ms: number;
  p95_latency_ms: number;
  empty_retrieval_count: number;
  reply_rules_hit_count: number;
  fallback_count: number;
  accepted_count: number;
  edited_sent_count: number;
  human_handoff_count: number;
  bad_case_count: number;
  reviewed_count: number;
  accepted_rate: number;
  edited_sent_rate: number;
  human_handoff_rate: number;
  bad_case_rate: number;
  token_recorded_count: number;
  token_record_rate: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  average_tokens_per_request: number;
};

export type KnowledgeStatus = "draft" | "pending_review" | "approved" | "rejected" | "archived" | "published" | "rollback";

export type KnowledgeOpsItem = {
  id: number;
  base_id: string;
  version: number;
  title: string;
  question: string;
  answer: string;
  category: string;
  intent: string;
  status: KnowledgeStatus;
  owner: string;
  source: string;
  effective_at: string;
  expired_at: string;
  review_note: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string;
};

export type KnowledgePayload = {
  title?: string;
  question: string;
  answer: string;
  category: string;
  intent: string;
  owner?: string;
  source?: string;
  effective_at?: string;
  expired_at?: string;
};

export type KnowledgeListResponse = {
  total: number;
  limit: number;
  offset: number;
  items: KnowledgeOpsItem[];
};

export type KnowledgeExportResponse = {
  count: number;
  jsonl: string;
};

export type KnowledgePublishHistoryItem = {
  id: number;
  publish_id: string;
  action: "publish" | "rollback" | string;
  status: string;
  merged_count: number;
  item_ids: number[];
  backup_path: string;
  knowledge_path: string;
  faiss_index_path: string;
  note: string;
  created_at: string;
};

export type KnowledgePublishResponse = KnowledgePublishHistoryItem;

export type KnowledgePublishHistoryResponse = {
  count: number;
  items: KnowledgePublishHistoryItem[];
};

export type PromptVersionItem = {
  id: number;
  version: string;
  status: "draft" | "evaluation" | "approved" | "canary" | "production" | "rollback" | string;
  system_prompt: string;
  developer_prompt: string;
  change_reason: string;
  author: string;
  evaluation_result: string;
  effective_at: string;
  created_at: string;
  activated_at: string;
  rolled_back_from: string;
};

export type PromptVersionPayload = {
  version?: string;
  system_prompt: string;
  developer_prompt?: string;
  change_reason?: string;
  evaluation_result?: string;
  effective_at?: string;
};

export type PromptVersionListResponse = {
  count: number;
  items: PromptVersionItem[];
};

export type AuditLogItem = {
  id: number;
  operator_id: string;
  operator_role: string;
  action_type: string;
  object_type: string;
  object_id: string;
  request_id: string;
  before_summary: string;
  after_summary: string;
  ip: string;
  device_info: string;
  created_at: string;
};

export type AuditLogListResponse = {
  count: number;
  items: AuditLogItem[];
};

export type ReleaseChecklistItem = {
  name: string;
  status: "pass" | "warn" | "fail" | string;
  evidence: string;
  next_step: string;
};

export type ReleaseChecklistResponse = {
  ready: boolean;
  failed_count: number;
  warning_count: number;
  items: ReleaseChecklistItem[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  confidenceScore?: number;
  retrievedDocuments?: string[];
};

export type RetrievalSearchRequest = {
  query: string;
  mode: RetrievalMode;
  limit: number;
  min_score: number;
};

export type RetrievalSearchResponse = {
  query: string;
  mode: RetrievalMode;
  count: number;
  results: RetrievalResult[];
};

export type RetrievalPromptPreviewResponse = RetrievalSearchResponse & {
  prompt?: string;
  final_prompt?: string;
  prompt_context_items?: PromptContextItem[];
};

export type ModelInfo = {
  base_model: string;
  adapter_enabled: boolean;
  adapter_name: string | null;
};

export type CategoriesResponse = {
  categories: string[];
  count: number;
};

export type KnowledgeExample = {
  category?: string;
  question: string;
  answer: string;
};

export type ExamplesByCategoryResponse = {
  category: string;
  count: number;
  examples: KnowledgeExample[];
};

export type ExampleSearchResponse = {
  keyword: string;
  count: number;
  results: KnowledgeExample[];
};
