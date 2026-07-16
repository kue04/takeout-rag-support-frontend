import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Edit3,
  FileJson,
  Flag,
  History,
  MessageCircle,
  ShieldAlert,
  Wrench,
  X,
} from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { AnswerStrategyBadge } from "../../components/AnswerStrategyBadge";
import { RerankerStatus } from "../../components/RerankerStatus";
import { Score } from "../../components/Score";
import { supportQuestions, type OrderStatus, type TakeoutOrder } from "../../data/marketplace";
import type {
  ChatMessage,
  ChatReviewAction,
  ChatResponse,
  FeedbackItem,
  IntentAnalysis,
  OpsMetrics,
  RetrievalPromptPreviewResponse,
  RetrievalResult,
  SafetyStatus,
  TokenUsage,
} from "../../types/api";

type SupportScenario = {
  id: string;
  label: string;
  status: OrderStatus;
  deliveryStatus: string;
};

type DiagnosticTabKey = "timeline" | "tools" | "evidence" | "memory" | "json";

const supportScenarios: SupportScenario[] = [
  { id: "DEMO-PAID", label: "未接单", status: "paid", deliveryStatus: "订单已支付，商家尚未接单" },
  { id: "DEMO-PREP", label: "商家制作", status: "preparing", deliveryStatus: "商家已接单并开始制作" },
  { id: "DEMO-RIDER", label: "骑手取餐", status: "delivering", deliveryStatus: "骑手已取餐，正在配送途中" },
  { id: "DEMO-DONE", label: "已送达", status: "delivered", deliveryStatus: "订单已送达，用户反馈未收到" },
];

export function SupportView({
  order,
  userId,
  sessionId,
  messages,
  retrievalResults,
  promptPreview,
  diagnostics,
  apiError,
  ragError,
  isLoading,
  isRagOpen,
  onBack,
  onSend,
  onToggleRag,
  onCloseRag,
  onCopyReport,
  onSubmitFeedback,
  feedbackStatus,
  onReviewAction,
  reviewStatus,
  recentFeedback,
  opsMetrics,
  onCopyEvalCase,
  onSelectScenario,
  canViewInternalDiagnostics,
}: {
  order: TakeoutOrder | null;
  userId: string;
  sessionId: string | null;
  messages: ChatMessage[];
  retrievalResults: RetrievalResult[];
  promptPreview: RetrievalPromptPreviewResponse | null;
  diagnostics: ChatResponse | null;
  apiError: string;
  ragError: string;
  isLoading: boolean;
  isRagOpen: boolean;
  onBack: () => void;
  onSend: (message: string) => Promise<void>;
  onToggleRag: () => void;
  onCloseRag: () => void;
  onCopyReport: () => void;
  onSubmitFeedback: (helpful: boolean, reason?: string, expectedReply?: string) => Promise<void>;
  feedbackStatus: string;
  onReviewAction: (action: ChatReviewAction, finalReply?: string, reason?: string) => Promise<void>;
  reviewStatus: string;
  recentFeedback: FeedbackItem[];
  opsMetrics: OpsMetrics | null;
  onCopyEvalCase: (feedbackId: number) => Promise<void>;
  onSelectScenario: (scenario: SupportScenario) => void;
  canViewInternalDiagnostics: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [feedbackReason, setFeedbackReason] = useState("");
  const [expectedReply, setExpectedReply] = useState("");
  const mobileRagRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!isRagOpen || !mobileRagRef.current || reduceMotion) {
        return;
      }

      gsap.fromTo(
        mobileRagRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.22, ease: "power2.out" },
      );
    },
    { dependencies: [isRagOpen] },
  );

  async function submitMessage(message: string) {
    const content = message.trim();
    if (!content) {
      return;
    }
    setDraft("");
    await onSend(content);
  }

  if (!order) {
    return (
      <section className="view-surface mx-auto max-w-3xl">
        <EmptyState title="没有可咨询的订单" text="请从订单详情进入客服。" />
      </section>
    );
  }

  return (
    <section className="view-surface grid min-h-[calc(100vh-128px)] gap-4 lg:grid-cols-[280px_minmax(420px,1fr)_420px]">
      <aside className="rounded-[16px] bg-white p-4">
        <button className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-muted" type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          返回订单
        </button>
        <h1 className="text-lg font-black">订单客服</h1>
        <p className="mt-2 text-sm leading-6 text-muted">问题会携带订单上下文发送给 RAG 客服。</p>
        <div className="mt-4 rounded-work bg-subtle p-3 text-sm">
          <p className="font-black">{order.storeName}</p>
          <p className="mt-1 text-xs text-muted">{order.id}</p>
          <p className="mt-3 text-xs leading-5 text-muted">
            {order.items.map((item) => `${item.name} x${item.quantity}`).join("，")}
          </p>
          <p className="mt-3 text-sm font-black text-amberline">实付 ¥{order.total.toFixed(1)}</p>
        </div>
        <div className="mt-3 rounded-work border border-line bg-white p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-black text-ink">会话状态</span>
            <span
              className={`rounded-full px-2 py-1 font-black ${
                sessionId ? "bg-emerald-50 text-leaf" : "bg-subtle text-muted"
              }`}
            >
              {sessionId ? "已接续" : "待创建"}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <SessionLine label="user" value={shortId(userId)} fullValue={userId} />
            <SessionLine label="order" value={order.id} />
            <SessionLine label="session" value={sessionId ? shortId(sessionId) : "-"} fullValue={sessionId ?? ""} />
            <SessionLine label="order status" value={order.status} />
            <SessionLine label="risk" value={getRiskLevel(diagnostics)} />
            <SessionLine label="long memory" value={getLongMemoryUsed(diagnostics)} />
          </div>
        </div>
        <div className="mt-3 rounded-work border border-line bg-white p-3 text-xs">
          <p className="font-black text-ink">模拟当前订单状态</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {supportScenarios.map((scenario) => (
              <button
                key={scenario.id}
                className={`rounded-work border px-2 py-2 text-left font-black ${
                  order.id === scenario.id ? "border-leaf bg-emerald-50 text-leaf" : "border-line bg-subtle text-ink"
                }`}
                type="button"
                onClick={() => onSelectScenario(scenario)}
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {supportQuestions.map((question) => (
            <button
              key={question}
              className="w-full rounded-work border border-line bg-white px-3 py-2 text-left text-sm font-bold text-ink hover:border-leaf"
              type="button"
              onClick={() => void submitMessage(question)}
            >
              {question}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-h-[620px] flex-col overflow-hidden rounded-[16px] bg-white">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="text-sm font-black">平台客服</p>
            <p className="mt-1 text-xs text-muted">结合订单信息回复</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-work border border-line bg-white px-3 py-2 text-sm font-bold text-ink lg:hidden"
            type="button"
            onClick={onToggleRag}
          >
            <Bot size={16} />
            查看解释
          </button>
        </header>
        <div className="flex-1 space-y-3 overflow-auto bg-subtle p-4">
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
          {isLoading ? <p className="text-sm font-bold text-muted">客服生成中...</p> : null}
          {apiError ? (
            <div className="rounded-work border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              {apiError}
            </div>
          ) : null}
          {diagnostics ? <AnswerBasisCard diagnostics={diagnostics} /> : null}
          {diagnostics ? (
            <div className="rounded-work border border-line bg-white p-3 text-xs">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <ReviewButton
                  icon={CheckCircle2}
                  label="采纳"
                  onClick={() => void onReviewAction("accepted", diagnostics.reply)}
                />
                <ReviewButton
                  icon={Edit3}
                  label="编辑发送"
                  onClick={() => void onReviewAction("edited_and_sent", expectedReply || diagnostics.reply, feedbackReason)}
                />
                <ReviewButton
                  icon={ShieldAlert}
                  label="转人工"
                  onClick={() => void onReviewAction("human_handoff", diagnostics.reply, feedbackReason || "客服选择转人工")}
                />
                <ReviewButton
                  icon={Flag}
                  label="bad case"
                  onClick={() => void onReviewAction("marked_bad_case", diagnostics.reply, feedbackReason || "客服标记 bad case")}
                />
                <span className="font-bold text-muted">{reviewStatus}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rounded-work bg-emerald-600 px-3 py-2 font-black text-white"
                  type="button"
                  onClick={() => void onSubmitFeedback(true)}
                >
                  有帮助
                </button>
                <button
                  className="rounded-work bg-amberline px-3 py-2 font-black text-white"
                  type="button"
                  onClick={() => void onSubmitFeedback(false, feedbackReason, expectedReply)}
                >
                  没帮助
                </button>
                <span className="font-bold text-muted">{feedbackStatus}</span>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <input
                  className="h-9 rounded-work border border-line px-2 outline-none"
                  placeholder="没帮助原因"
                  value={feedbackReason}
                  onChange={(event) => setFeedbackReason(event.target.value)}
                />
                <input
                  className="h-9 rounded-work border border-line px-2 outline-none"
                  placeholder="期望回答或人工修正"
                  value={expectedReply}
                  onChange={(event) => setExpectedReply(event.target.value)}
                />
              </div>
            </div>
          ) : null}
        </div>
        <form
          className="border-t border-line p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitMessage(draft);
          }}
        >
          <div className="grid grid-cols-[1fr_48px] gap-2">
            <input
              className="h-12 rounded-work border border-line bg-white px-3 text-sm outline-none focus:border-leaf"
              placeholder="输入订单问题，例如：会员退款多久到账"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              className="grid place-items-center rounded-work bg-leaf text-white disabled:opacity-50"
              type="submit"
              disabled={isLoading}
              title="发送问题"
            >
              <MessageCircle size={19} />
            </button>
          </div>
        </form>
      </div>

      <div className="hidden lg:block">
        <RagPanel
          orderId={order.id}
          userId={userId}
          sessionId={sessionId}
          results={retrievalResults}
          promptPreview={promptPreview}
          diagnostics={diagnostics}
          ragError={ragError}
          onCopyReport={onCopyReport}
          recentFeedback={recentFeedback}
          opsMetrics={opsMetrics}
          onCopyEvalCase={onCopyEvalCase}
          canViewInternalDiagnostics={canViewInternalDiagnostics}
        />
      </div>

      {isRagOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={onCloseRag}>
          <div
            ref={mobileRagRef}
            className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-auto rounded-t-[16px] bg-white p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="font-black">RAG 解释</p>
              <button className="grid h-9 w-9 place-items-center rounded-work bg-subtle" type="button" onClick={onCloseRag}>
                <X size={18} />
              </button>
            </div>
            <RagPanel
              orderId={order.id}
              userId={userId}
              sessionId={sessionId}
              results={retrievalResults}
              promptPreview={promptPreview}
              diagnostics={diagnostics}
              ragError={ragError}
              onCopyReport={onCopyReport}
              recentFeedback={recentFeedback}
              opsMetrics={opsMetrics}
              onCopyEvalCase={onCopyEvalCase}
              canViewInternalDiagnostics={canViewInternalDiagnostics}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReviewButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex items-center gap-1.5 rounded-work border border-line bg-white px-3 py-2 font-black text-ink hover:border-leaf"
      type="button"
      onClick={onClick}
      title={label}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function RagPanel({
  orderId,
  userId,
  sessionId,
  results,
  promptPreview,
  diagnostics,
  ragError,
  onCopyReport,
  recentFeedback,
  opsMetrics,
  onCopyEvalCase,
  canViewInternalDiagnostics,
}: {
  orderId: string;
  userId: string;
  sessionId: string | null;
  results: RetrievalResult[];
  promptPreview: RetrievalPromptPreviewResponse | null;
  diagnostics: ChatResponse | null;
  ragError: string;
  onCopyReport: () => void;
  recentFeedback: FeedbackItem[];
  opsMetrics: OpsMetrics | null;
  onCopyEvalCase: (feedbackId: number) => Promise<void>;
  canViewInternalDiagnostics: boolean;
}) {
  const contextUsed = diagnostics?.context_used;
  const intentAnalysis = diagnostics?.intent_analysis;
  const safetyStatus = diagnostics?.safety_status;
  const resolvedSessionId = diagnostics?.session_id ?? contextUsed?.session_id ?? sessionId;
  const resolvedUserId = diagnostics?.user_id ?? userId;
  const resolvedOrderId = diagnostics?.order_id ?? orderId;
  const panelRef = useRef<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<DiagnosticTabKey>("timeline");
  const visibleActiveTab = !canViewInternalDiagnostics && ["memory", "json"].includes(activeTab)
    ? "timeline"
    : activeTab;

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) {
        return;
      }

      gsap.fromTo(
        ".diagnostic-block",
        { opacity: 0.82, y: 8 },
        { opacity: 1, y: 0, duration: 0.2, stagger: 0.025, ease: "power2.out" },
      );
    },
    { scope: panelRef, dependencies: [diagnostics?.session_id, diagnostics?.trace?.request_id] },
  );

  return (
    <aside ref={panelRef} className="rounded-[16px] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-black">诊断面板</p>
          <p className="mt-1 text-xs text-muted">工具、证据、风险</p>
        </div>
        <button
          className="grid h-9 w-9 place-items-center rounded-work border border-line bg-white text-ink"
          type="button"
          title={canViewInternalDiagnostics ? "复制调试报告" : "复制处理摘要"}
          onClick={onCopyReport}
        >
          <Clipboard size={16} />
        </button>
      </div>
      {ragError ? (
        <div className="mb-3 rounded-work border border-red-200 bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">
          {ragError}
        </div>
      ) : null}
      <RerankerStatus results={results} showInternalError={canViewInternalDiagnostics} />
      {diagnostics?.answer_strategy ? (
        <div className="mb-3">
          <AnswerStrategyBadge strategy={diagnostics.answer_strategy} />
        </div>
      ) : null}
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <MetricMini label="user" value={shortId(resolvedUserId)} title={resolvedUserId} />
        <MetricMini label="session" value={resolvedSessionId ? shortId(resolvedSessionId) : "-"} title={resolvedSessionId ?? ""} />
        <MetricMini label="order" value={resolvedOrderId ?? "-"} />
        <MetricMini label="risk" value={getRiskLevel(diagnostics)} />
        {canViewInternalDiagnostics ? <MetricMini label="prompt" value={diagnostics?.prompt_version ?? "-"} /> : null}
        <MetricMini
          label="tokens"
          value={formatTokenCount(diagnostics?.token_usage?.total_tokens)}
          title={canViewInternalDiagnostics ? formatTokenUsageTitle(diagnostics?.token_usage) : undefined}
        />
      </div>
      <div className={`mb-3 grid gap-1 rounded-work bg-subtle p-1 ${canViewInternalDiagnostics ? "grid-cols-5" : "grid-cols-3"}`}>
        <DiagnosticTab tab="timeline" activeTab={visibleActiveTab} icon={History} label="流程" onSelect={setActiveTab} />
        <DiagnosticTab tab="tools" activeTab={visibleActiveTab} icon={Wrench} label="工具" onSelect={setActiveTab} />
        <DiagnosticTab tab="evidence" activeTab={visibleActiveTab} icon={BookOpen} label="证据" onSelect={setActiveTab} />
        {canViewInternalDiagnostics ? <DiagnosticTab tab="memory" activeTab={visibleActiveTab} icon={Brain} label="记忆" onSelect={setActiveTab} /> : null}
        {canViewInternalDiagnostics ? <DiagnosticTab tab="json" activeTab={visibleActiveTab} icon={FileJson} label="JSON" onSelect={setActiveTab} /> : null}
      </div>
      {visibleActiveTab === "timeline" ? (
        <TimelineTab
          diagnostics={diagnostics}
          intentAnalysis={intentAnalysis}
          safetyStatus={safetyStatus}
          canViewInternalDiagnostics={canViewInternalDiagnostics}
        />
      ) : null}
      {visibleActiveTab === "tools" ? <ToolsTab diagnostics={diagnostics} canViewInternalDiagnostics={canViewInternalDiagnostics} /> : null}
      {visibleActiveTab === "evidence" ? (
        <EvidenceTab
          diagnostics={diagnostics}
          results={results}
          promptPreview={promptPreview}
          canViewInternalDiagnostics={canViewInternalDiagnostics}
        />
      ) : null}
      {visibleActiveTab === "memory" && canViewInternalDiagnostics ? (
        <MemoryTab diagnostics={diagnostics} contextUsed={contextUsed} opsMetrics={opsMetrics} recentFeedback={recentFeedback} onCopyEvalCase={onCopyEvalCase} />
      ) : null}
      {visibleActiveTab === "json" && canViewInternalDiagnostics ? <RawJsonTab diagnostics={diagnostics} promptPreview={promptPreview} /> : null}
    </aside>
  );
}

function DiagnosticTab({
  tab,
  activeTab,
  icon: Icon,
  label,
  onSelect,
}: {
  tab: DiagnosticTabKey;
  activeTab: DiagnosticTabKey;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onSelect: (tab: DiagnosticTabKey) => void;
}) {
  const active = tab === activeTab;

  return (
    <button
      className={`grid min-h-12 place-items-center rounded-[6px] text-[11px] font-black ${
        active ? "bg-ink text-white" : "text-muted hover:bg-white"
      }`}
      type="button"
      onClick={() => onSelect(tab)}
      title={label}
    >
      <Icon size={15} />
      <span>{label}</span>
    </button>
  );
}

function TimelineTab({
  diagnostics,
  intentAnalysis,
  safetyStatus,
  canViewInternalDiagnostics,
}: {
  diagnostics: ChatResponse | null;
  intentAnalysis?: IntentAnalysis;
  safetyStatus?: SafetyStatus;
  canViewInternalDiagnostics: boolean;
}) {
  const steps = diagnostics?.full_trace ?? [];
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  function toggleStep(key: string) {
    setExpandedSteps((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <>
      <DiagnosticSection title="流程时间线">
        {steps.length ? (
          <div className="space-y-2">
            {steps.map((step, index) => {
              const key = `${step.step}-${index}`;
              return (
                <TimelineStepCard
                  key={key}
                  step={step}
                  index={index}
                  expanded={Boolean(expandedSteps[key])}
                  canViewInternalDiagnostics={canViewInternalDiagnostics}
                  onToggle={() => toggleStep(key)}
                />
              );
            })}
          </div>
        ) : canViewInternalDiagnostics ? (
          <TraceFallback diagnostics={diagnostics} />
        ) : (
          <EmptyState title="暂无流程" text="发送问题后展示处理状态。" compact />
        )}
      </DiagnosticSection>
      <DiagnosticSection title="意图与风险">
        <IntentSummary intentAnalysis={intentAnalysis} />
        <SafetySummary safetyStatus={safetyStatus} />
        {diagnostics?.handoff_ticket ? (
          <div className="mt-3 rounded-work border border-amber-200 bg-orange-50 p-2 text-xs leading-5 text-amberline">
            <div className="flex items-center gap-2 font-black">
              <ShieldAlert size={13} />
              人工接管：{diagnostics.handoff_ticket.reason || diagnostics.handoff_ticket.ticket_id || "-"}
            </div>
            {diagnostics.handoff_ticket.context_summary ? <p className="mt-1">{diagnostics.handoff_ticket.context_summary}</p> : null}
          </div>
        ) : null}
      </DiagnosticSection>
    </>
  );
}

function TimelineStepCard({
  step,
  index,
  expanded,
  canViewInternalDiagnostics,
  onToggle,
}: {
  step: NonNullable<ChatResponse["full_trace"]>[number];
  index: number;
  expanded: boolean;
  canViewInternalDiagnostics: boolean;
  onToggle: () => void;
}) {
  const status = step.status || "-";
  const toneClass = getTimelineStatusTone(status);
  const inputSummary = step.input_summary || "";
  const outputSummary = step.output_summary || "";
  const hasTokenUsage = step.step === "generation_completed" && Boolean(getStepTokenUsage(step.metadata));
  const metadataSummary = buildTimelineMetadataSummary(step.metadata, canViewInternalDiagnostics);
  const hasDetails = Boolean(inputSummary || outputSummary || hasTokenUsage || metadataSummary);

  return (
    <article className="rounded-work border border-line bg-white text-xs leading-5">
      <button
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-work bg-subtle font-black text-muted">
              {index + 1}
            </span>
            <span className="truncate font-black text-ink">{formatTraceStepName(step.step, index)}</span>
          </div>
          {!expanded && outputSummary ? (
            <p className="mt-1 line-clamp-1 pl-8 text-muted">{outputSummary}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2 py-1 font-black ${toneClass}`}>
            {formatTraceStatus(status)}
          </span>
          <span className="rounded-full bg-subtle px-2 py-1 font-black text-muted">
            {formatStepLatency(step.latency_ms)}
          </span>
          <ChevronDown
            size={15}
            className={`text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {expanded ? (
        <div className="border-t border-line px-3 pb-3 pt-2">
          {hasDetails ? (
            <div className="space-y-2">
              {inputSummary ? <TimelineDetailLine label="输入摘要" value={inputSummary} /> : null}
              {outputSummary ? <TimelineDetailLine label="处理结果" value={outputSummary} /> : null}
              {metadataSummary ? <TimelineDetailLine label="附加信息" value={metadataSummary} /> : null}
              {hasTokenUsage ? <TokenUsageInline usage={getStepTokenUsage(step.metadata)} /> : null}
            </div>
          ) : (
            <p className="text-muted">这个步骤只是状态标记，没有额外摘要。</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function TimelineDetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-work bg-subtle p-2">
      <div className="font-black text-muted">{label}</div>
      <div className="mt-1 whitespace-pre-wrap break-words text-ink">{value}</div>
    </div>
  );
}

function ToolsTab({
  diagnostics,
  canViewInternalDiagnostics,
}: {
  diagnostics: ChatResponse | null;
  canViewInternalDiagnostics: boolean;
}) {
  const toolResults = diagnostics?.tool_results ?? [];

  return (
    <DiagnosticSection title="工具调用">
      {toolResults.length ? (
        <div className="space-y-2">
          {toolResults.map((tool, index) => (
            <div key={`${tool.tool_name}-${index}`} className="rounded-work border border-line bg-white p-3 text-xs leading-5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-ink">{tool.tool_name || `tool_${index + 1}`}</span>
                <span className="rounded-full bg-subtle px-2 py-1 font-black text-muted">
                  {tool.status || "-"} · {tool.latency_ms ?? 0}ms
                </span>
              </div>
              {canViewInternalDiagnostics ? (
                <pre className="mono-block mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded-work bg-subtle p-2">
                  {JSON.stringify({ input: tool.input, output: tool.output, error_type: tool.error_type, retryable: tool.retryable }, null, 2)}
                </pre>
              ) : (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <BasisLine label="结果" value={summarizeToolResult(tool)} />
                  <BasisLine label="处理" value={tool.error_type ? `${tool.error_type}${tool.retryable ? "，可重试" : ""}` : "已返回"} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="暂无工具结果" text="后端返回 tool_results 后展示订单查询、退款查询和工单结果。" compact />
      )}
    </DiagnosticSection>
  );
}

function EvidenceTab({
  diagnostics,
  results,
  promptPreview,
  canViewInternalDiagnostics,
}: {
  diagnostics: ChatResponse | null;
  results: RetrievalResult[];
  promptPreview: RetrievalPromptPreviewResponse | null;
  canViewInternalDiagnostics: boolean;
}) {
  const citations = diagnostics?.evidence_citations ?? [];
  const promptContext = diagnostics?.prompt_context_items || promptPreview?.prompt_context_items || [];

  return (
    <>
      <DiagnosticSection title="证据溯源">
        {citations.length ? (
          <div className="space-y-2">
            {citations.map((item, index) => (
              <div key={`${item.evidence_id}-${index}`} className="rounded-work border border-line bg-white p-3 text-xs leading-5">
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-ink px-2 py-1 font-black text-white">
                    {item.evidence_role || "evidence"}
                  </span>
                  <span className="rounded-full bg-subtle px-2 py-1 font-black text-muted">
                    {item.intent || item.category || "-"}
                  </span>
                  <span className="rounded-full bg-subtle px-2 py-1 font-black text-muted">
                    {item.knowledge_id || item.evidence_id || `kb_${index + 1}`}
                  </span>
                  <span className="rounded-full bg-subtle px-2 py-1 font-black text-muted">
                    v{item.version ?? "-"}
                  </span>
                  {item.updated_at ? (
                    <span className="rounded-full bg-subtle px-2 py-1 font-black text-muted">
                      {item.updated_at}
                    </span>
                  ) : null}
                </div>
                <p className="font-black text-ink">{item.title || item.evidence_id || `evidence_${index + 1}`}</p>
                {item.source ? <p className="mt-1 font-bold text-muted">来源：{item.source}</p> : null}
                <p className="mt-1 text-muted">{item.quote || "-"}</p>
              </div>
            ))}
          </div>
        ) : results.length ? (
          results.map((item) => (
            <EvidenceCard
              key={`${item.rank}-${item.question}`}
              item={item}
              canViewInternalDiagnostics={canViewInternalDiagnostics}
            />
          ))
        ) : (
          <EmptyState title="暂无证据" text="发送问题后展示 primary/supporting evidence。" compact />
        )}
      </DiagnosticSection>
      {canViewInternalDiagnostics ? (
        <DiagnosticSection title="prompt context">
          <div className="space-y-2">
            {promptContext.length ? (
              promptContext.map((item) => (
                <div key={`${item.rank}-${item.role}-${item.question}`} className="rounded-work bg-white p-2 text-xs leading-5">
                  <span className="font-black">{item.role}</span> · {item.display_title ?? item.question}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted">暂无 prompt context。</p>
            )}
          </div>
        </DiagnosticSection>
      ) : null}
    </>
  );
}

function MemoryTab({
  diagnostics,
  contextUsed,
  opsMetrics,
  recentFeedback,
  onCopyEvalCase,
}: {
  diagnostics: ChatResponse | null;
  contextUsed?: ChatResponse["context_used"];
  opsMetrics: OpsMetrics | null;
  recentFeedback: FeedbackItem[];
  onCopyEvalCase: (feedbackId: number) => Promise<void>;
}) {
  const memory = diagnostics?.memory_snapshot;

  return (
    <>
      <DiagnosticSection title="上下文记忆">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <MetricMini label="recent msg" value={contextUsed?.recent_message_count} />
          <MetricMini label="summary chars" value={contextUsed?.summary_chars} />
          <MetricMini label="facts" value={contextUsed?.fact_count} />
          <MetricMini label="long memory" value={getLongMemoryUsed(diagnostics)} />
        </div>
        <div className="mt-3 space-y-2 text-xs leading-5">
          <MemoryLine label="短期摘要" value={memory?.short_term_summary || memory?.session_summary} />
          <MemoryLine label="订单状态" value={memory?.current_order_state} />
          <MemoryLine label="长期字段" value={memory?.used_fields?.join("，")} />
          <pre className="mono-block max-h-40 overflow-auto whitespace-pre-wrap rounded-work bg-white p-2">
            {JSON.stringify(memory?.long_term_memory ?? memory?.user_memory ?? {}, null, 2)}
          </pre>
        </div>
      </DiagnosticSection>
      <DiagnosticSection title="ops metrics">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <MetricMini label="source" value={opsMetrics?.source || "-"} />
          <MetricMini label="requests" value={opsMetrics?.request_count} />
          <MetricMini label="failures" value={opsMetrics?.failure_count} />
          <MetricMini label="avg ms" value={opsMetrics?.average_latency_ms} />
          <MetricMini label="p95 ms" value={opsMetrics?.p95_latency_ms} />
          <MetricMini label="empty retrieval" value={opsMetrics?.empty_retrieval_count} />
          <MetricMini label="reply rules" value={opsMetrics?.reply_rules_hit_count} />
          <MetricMini label="fallback" value={opsMetrics?.fallback_count} />
          <MetricMini label="accepted" value={opsMetrics?.accepted_count} />
          <MetricMini label="edited" value={opsMetrics?.edited_sent_count} />
          <MetricMini label="handoff" value={opsMetrics?.human_handoff_count} />
          <MetricMini label="bad case" value={opsMetrics?.bad_case_count} />
          <MetricMini label="accept rate" value={formatRate(opsMetrics?.accepted_rate)} />
          <MetricMini label="handoff rate" value={formatRate(opsMetrics?.human_handoff_rate)} />
          <MetricMini label="avg tokens" value={formatTokenCount(opsMetrics?.average_tokens_per_request)} />
          <MetricMini label="total tokens" value={formatTokenCount(opsMetrics?.total_tokens)} />
        </div>
      </DiagnosticSection>
      <DiagnosticSection title="recent bad cases">
        <div className="space-y-2">
          {recentFeedback.length ? (
            recentFeedback.map((item) => (
              <div key={item.id} className="rounded-work bg-white p-2 text-xs leading-5">
                <div className="font-black">{item.query}</div>
                <div className="mt-1 text-muted">
                  {item.top1_intent || "-"} · {item.latency_ms}ms · {item.answer_source || "-"}
                </div>
                {item.reason ? <div className="mt-1 text-amberline">原因：{item.reason}</div> : null}
                <button
                  className="mt-2 rounded-work border border-line px-2 py-1 font-black"
                  type="button"
                  onClick={() => void onCopyEvalCase(item.id)}
                >
                  复制 eval case
                </button>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted">暂无差评反馈。</p>
          )}
        </div>
      </DiagnosticSection>
    </>
  );
}

function RawJsonTab({
  diagnostics,
  promptPreview,
}: {
  diagnostics: ChatResponse | null;
  promptPreview: RetrievalPromptPreviewResponse | null;
}) {
  return (
    <DiagnosticSection title="原始 JSON">
      <pre className="mono-block max-h-[520px] overflow-auto whitespace-pre-wrap rounded-work bg-white p-3 text-xs leading-5">
        {JSON.stringify(diagnostics ?? promptPreview ?? {}, null, 2)}
      </pre>
    </DiagnosticSection>
  );
}

function AnswerBasisCard({ diagnostics }: { diagnostics: ChatResponse }) {
  const primaryCitation =
    diagnostics.evidence_citations?.find((item) => item.evidence_role === "primary") ?? diagnostics.evidence_citations?.[0];
  const primaryRetrieved =
    diagnostics.prompt_context_items?.find((item) => item.role === "primary") ?? diagnostics.retrieved_items?.[0];
  const toolSummary = diagnostics.tool_results
    ?.map((tool) => `${tool.tool_name || "tool"}:${tool.status || "-"}`)
    .join("，");
  const fallbackApplied = diagnostics.safety_status?.fallback_applied || diagnostics.trace?.reply_rules_applied;
  const handoffReason =
    diagnostics.handoff_ticket?.reason ||
    diagnostics.handoff_ticket?.context_summary ||
    diagnostics.handoff_recommendation?.reason;

  return (
    <div className="rounded-work border border-line bg-white p-3 text-xs leading-5">
      <div className="mb-2 flex items-center gap-2 font-black text-ink">
        <BookOpen size={14} />
        回答依据
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <BasisLine
          label="主证据"
          value={primaryCitation?.title || primaryCitation?.intent || primaryRetrieved?.display_title || primaryRetrieved?.intent || "-"}
        />
        <BasisLine label="引用片段" value={primaryCitation?.quote || primaryRetrieved?.evidence_summary || primaryRetrieved?.answer || "-"} />
        <BasisLine label="订单工具" value={toolSummary || "-"} />
        <BasisLine label="兜底/人工" value={handoffReason || (fallbackApplied ? "已触发规则兜底" : "未触发")} />
      </div>
    </div>
  );
}

function BasisLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-work bg-subtle p-2">
      <div className="font-black text-muted">{label}</div>
      <div className="mt-1 line-clamp-3 text-ink">{value}</div>
    </div>
  );
}

function summarizeToolResult(tool: NonNullable<ChatResponse["tool_results"]>[number]) {
  const output = tool.output;
  if (output && typeof output === "object") {
    const data = output as Record<string, unknown>;
    const summary = data.summary || data.status_label || data.refund_status || data.delivery_status;
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
  return tool.status || "-";
}

function TraceFallback({ diagnostics }: { diagnostics: ChatResponse | null }) {
  if (!diagnostics?.trace) {
    return <EmptyState title="暂无时间线" text="后端返回 full_trace 后展示完整流程。" compact />;
  }

  return (
    <pre className="mono-block max-h-48 overflow-auto whitespace-pre-wrap rounded-work bg-white p-3 text-xs leading-5">
      {JSON.stringify(diagnostics.trace, null, 2)}
    </pre>
  );
}

function MemoryLine({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-work bg-white p-2">
      <span className="font-black text-ink">{label}：</span>
      <span className="text-muted">{value || "-"}</span>
    </div>
  );
}

function DiagnosticSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="diagnostic-block mb-4 rounded-work bg-subtle p-3">
      <p className="text-xs font-black text-muted">{title}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function MetricMini({ label, value, title }: { label: string; value?: number | string; title?: string }) {
  return (
    <div className="min-w-0 rounded-work bg-white p-2" title={title}>
      <div className="truncate font-black text-ink">{value ?? 0}</div>
      <div className="mt-1 text-[10px] font-bold text-muted">{label}</div>
    </div>
  );
}

function TokenUsageInline({ usage }: { usage?: TokenUsage }) {
  if (!usage) {
    return null;
  }

  return (
    <div className="mt-2 grid grid-cols-3 gap-2 rounded-work bg-subtle p-2">
      <MetricMini label="prompt token" value={formatTokenCount(usage.prompt_tokens)} />
      <MetricMini label="reply token" value={formatTokenCount(usage.completion_tokens)} />
      <MetricMini label="total token" value={formatTokenCount(usage.total_tokens)} title={formatTokenUsageTitle(usage)} />
    </div>
  );
}

function SessionLine({ label, value, fullValue }: { label: string; value: string; fullValue?: string }) {
  async function copy() {
    if (!fullValue) {
      return;
    }
    await navigator.clipboard.writeText(fullValue);
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-bold text-muted">{label}</span>
      <button
        className="min-w-0 truncate rounded-work bg-subtle px-2 py-1 text-right font-black text-ink disabled:cursor-default"
        type="button"
        title={fullValue || value}
        disabled={!fullValue}
        onClick={copy}
      >
        {value}
      </button>
    </div>
  );
}

function IntentSummary({ intentAnalysis }: { intentAnalysis?: IntentAnalysis }) {
  if (!intentAnalysis) {
    return <p className="text-xs text-muted">暂无意图识别结果。</p>;
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <MetricMini label="primary" value={intentAnalysis.primary_intent ?? "-"} />
        <MetricMini label="risk" value={intentAnalysis.risk_level ?? "-"} />
        <MetricMini label="routing" value={intentAnalysis.routing ?? "-"} />
        <MetricMini label="secondary" value={intentAnalysis.secondary_intents?.join("，") || "-"} />
      </div>
      {intentAnalysis.intents?.length ? (
        <div className="space-y-2">
          {intentAnalysis.intents.map((intent) => (
            <div key={`${intent.name}-${intent.confidence}`} className="rounded-work bg-white p-2 leading-5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-ink">{intent.name}</span>
                <span className="font-black text-leaf">{formatConfidence(intent.confidence)}</span>
              </div>
              <div className="mt-1 text-muted">risk: {intent.risk_level || "-"}</div>
              {intent.evidence?.length ? <div className="mt-1 text-muted">{intent.evidence.join("，")}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SafetySummary({ safetyStatus }: { safetyStatus?: SafetyStatus }) {
  if (!safetyStatus) {
    return <p className="mt-2 text-xs text-muted">暂无安全校验结果。</p>;
  }

  const blocked = Boolean(safetyStatus.blocked);

  return (
    <div className="mt-3 rounded-work bg-white p-2 text-xs leading-5">
      <div className="flex flex-wrap gap-2">
        <StatusPill label="passed" active={Boolean(safetyStatus.passed)} tone="success" />
        <StatusPill label="blocked" active={blocked} tone={blocked ? "danger" : "muted"} />
        <StatusPill label="fallback" active={Boolean(safetyStatus.fallback_applied)} tone="warning" />
      </div>
      {safetyStatus.issues?.length ? (
        <div className="mt-2 text-danger">{safetyStatus.issues.join("，")}</div>
      ) : (
        <div className="mt-2 text-muted">暂无安全问题。</div>
      )}
    </div>
  );
}

function StatusPill({
  label,
  active,
  tone,
}: {
  label: string;
  active: boolean;
  tone: "success" | "warning" | "danger" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-leaf"
      : tone === "warning"
        ? "bg-orange-50 text-amberline"
        : tone === "danger"
          ? "bg-red-50 text-danger"
          : "bg-subtle text-muted";

  return <span className={`rounded-full px-2 py-1 font-black ${toneClass}`}>{`${label}: ${active ? "yes" : "no"}`}</span>;
}

function EvidenceCard({
  item,
  canViewInternalDiagnostics,
}: {
  item: RetrievalResult;
  canViewInternalDiagnostics: boolean;
}) {
  const penalty = item.direction_penalty ?? 0;

  return (
    <article className="rounded-work border border-line bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-work bg-ink text-xs font-black text-white">
          {item.rank}
        </span>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-leaf">
          {item.intent ?? "intent"}
        </span>
        {canViewInternalDiagnostics && penalty > 0 ? (
          <span className="rounded-full bg-orange-50 px-2 py-1 text-[11px] font-black text-amberline">
            方向降权 {penalty.toFixed(2)}
          </span>
        ) : null}
      </div>
      <p className="text-sm font-black">{item.question}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{item.answer}</p>
      {canViewInternalDiagnostics ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Score label="score" value={item.score} />
          <Score label="rerank" value={item.rerank_score} />
          <Score label="vector" value={item.vector_score} />
        </div>
      ) : null}
    </article>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";

  async function copy() {
    await navigator.clipboard.writeText(message.content);
  }

  return (
    <article className={`max-w-[86%] rounded-[14px] p-3 text-sm leading-6 ${isAssistant ? "bg-white" : "ml-auto bg-ink text-white"}`}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs font-black opacity-80">
        <span>{isAssistant ? "平台客服" : "用户"}</span>
        {isAssistant ? (
          <button className="text-muted" type="button" onClick={copy} title="复制回复">
            <Clipboard size={13} />
          </button>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap">{message.content}</p>
    </article>
  );
}

function shortId(value: string) {
  if (value.length <= 16) {
    return value;
  }
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function formatBoolean(value?: boolean) {
  if (value === undefined) {
    return "-";
  }
  return value ? "yes" : "no";
}

function formatConfidence(value: number) {
  return value <= 1 ? `${Math.round(value * 100)}%` : value.toFixed(2);
}

function formatTraceStepName(step?: string, index = 0) {
  const names: Record<string, string> = {
    request_received: "接收请求",
    memory_loaded: "读取上下文",
    intent_detected: "识别意图",
    risk_precheck: "风险预检",
    order_tool_called: "订单工具",
    retrieval_started: "开始检索",
    rerank_completed: "召回与重排",
    evidence_selected: "选择证据",
    prompt_built: "构建提示词",
    generation_completed: "生成回复",
    reply_rules_checked: "规则与安全",
    grounding_checked: "证据校验",
    handoff_recommended: "转人工建议",
    memory_updated: "更新记忆",
    response_returned: "返回结果",
  };
  if (!step) {
    return `步骤 ${index + 1}`;
  }
  return names[step] ? `${names[step]} · ${step}` : step;
}

function formatTraceStatus(status: string) {
  const names: Record<string, string> = {
    success: "成功",
    degraded: "降级",
    failed: "失败",
    high_risk: "高风险",
  };
  return names[status] || status || "-";
}

function getTimelineStatusTone(status: string) {
  if (status === "failed") {
    return "bg-red-50 text-danger";
  }
  if (status === "degraded" || status === "high_risk") {
    return "bg-orange-50 text-amberline";
  }
  if (status === "success") {
    return "bg-emerald-50 text-leaf";
  }
  return "bg-subtle text-muted";
}

function formatStepLatency(value?: number) {
  if (typeof value !== "number") {
    return "未记录";
  }
  if (value <= 0) {
    return "<1ms";
  }
  if (value < 1) {
    return "<1ms";
  }
  if (value < 1000) {
    return `${value.toFixed(value < 10 ? 2 : 1)}ms`;
  }
  return `${(value / 1000).toFixed(2)}s`;
}

function buildTimelineMetadataSummary(metadata?: Record<string, unknown>, includeInternal = false) {
  if (!metadata) {
    return "";
  }

  const parts: string[] = [];
  const publicKeys = ["risk_level", "tool_count", "primary_intent", "used_fallback_prompt", "prompt_version"];
  for (const key of publicKeys) {
    const value = metadata[key];
    if (value !== undefined && value !== null && value !== "") {
      parts.push(`${key}: ${String(value)}`);
    }
  }

  const tokenUsage = getStepTokenUsage(metadata);
  if (tokenUsage?.total_tokens) {
    parts.push(`tokens: ${formatTokenCount(tokenUsage.total_tokens)}`);
  }

  if (includeInternal) {
    const hiddenKeys = Object.keys(metadata).filter((key) => !publicKeys.includes(key) && key !== "token_usage");
    hiddenKeys.slice(0, 4).forEach((key) => {
      const value = metadata[key];
      if (value !== undefined && value !== null && value !== "") {
        parts.push(`${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`);
      }
    });
  }

  return parts.join("；");
}

function formatRate(value?: number) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "-";
}

function formatTokenCount(value?: number) {
  return typeof value === "number" ? value.toLocaleString("en-US") : "-";
}

function formatTokenUsageTitle(usage?: TokenUsage) {
  if (!usage) {
    return "暂无 token 统计";
  }
  return [
    `provider: ${usage.provider || "-"}`,
    `model: ${usage.model || "-"}`,
    `prompt: ${formatTokenCount(usage.prompt_tokens)}`,
    `reply: ${formatTokenCount(usage.completion_tokens)}`,
    `method: ${usage.counting_method || "-"}`,
  ].join("\n");
}

function getStepTokenUsage(metadata?: Record<string, unknown>): TokenUsage | undefined {
  const value = metadata?.token_usage;
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as TokenUsage;
}

function getRiskLevel(diagnostics: ChatResponse | null) {
  return diagnostics?.intent_analysis?.risk_level ?? diagnostics?.trace?.intent_analysis?.risk_level ?? "-";
}

function getLongMemoryUsed(diagnostics: ChatResponse | null) {
  const used = diagnostics?.memory_snapshot?.used_long_term_memory;
  if (typeof used === "boolean") {
    return used ? "yes" : "no";
  }
  return diagnostics?.memory_snapshot ? "yes" : "-";
}
