import { useState } from "react";
import { ArrowLeft, Bot, Clipboard, MessageCircle, X } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { Score } from "../../components/Score";
import { supportQuestions, type TakeoutOrder } from "../../data/marketplace";
import type {
  ChatMessage,
  ChatResponse,
  FeedbackItem,
  OpsMetrics,
  RetrievalPromptPreviewResponse,
  RetrievalResult,
} from "../../types/api";

export function SupportView({
  order,
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
  recentFeedback,
  opsMetrics,
  onCopyEvalCase,
}: {
  order: TakeoutOrder | null;
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
  recentFeedback: FeedbackItem[];
  opsMetrics: OpsMetrics | null;
  onCopyEvalCase: (feedbackId: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [feedbackReason, setFeedbackReason] = useState("");
  const [expectedReply, setExpectedReply] = useState("");

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
          {diagnostics ? (
            <div className="rounded-work border border-line bg-white p-3 text-xs">
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
          results={retrievalResults}
          promptPreview={promptPreview}
          diagnostics={diagnostics}
          ragError={ragError}
          onCopyReport={onCopyReport}
          recentFeedback={recentFeedback}
          opsMetrics={opsMetrics}
          onCopyEvalCase={onCopyEvalCase}
        />
      </div>

      {isRagOpen ? (
        <div className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={onCloseRag}>
          <div
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
              results={retrievalResults}
              promptPreview={promptPreview}
              diagnostics={diagnostics}
              ragError={ragError}
              onCopyReport={onCopyReport}
              recentFeedback={recentFeedback}
              opsMetrics={opsMetrics}
              onCopyEvalCase={onCopyEvalCase}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function RagPanel({
  results,
  promptPreview,
  diagnostics,
  ragError,
  onCopyReport,
  recentFeedback,
  opsMetrics,
  onCopyEvalCase,
}: {
  results: RetrievalResult[];
  promptPreview: RetrievalPromptPreviewResponse | null;
  diagnostics: ChatResponse | null;
  ragError: string;
  onCopyReport: () => void;
  recentFeedback: FeedbackItem[];
  opsMetrics: OpsMetrics | null;
  onCopyEvalCase: (feedbackId: number) => Promise<void>;
}) {
  return (
    <aside className="rounded-[16px] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-black">RAG 解释</p>
          <p className="mt-1 text-xs text-muted">证据、prompt context、trace</p>
        </div>
        <button
          className="grid h-9 w-9 place-items-center rounded-work border border-line bg-white text-ink"
          type="button"
          title="复制调试报告"
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
      <div className="mb-4 rounded-work bg-subtle p-3">
        <p className="text-xs font-black text-muted">ops metrics</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <MetricMini label="requests" value={opsMetrics?.request_count} />
          <MetricMini label="failures" value={opsMetrics?.failure_count} />
          <MetricMini label="avg ms" value={opsMetrics?.average_latency_ms} />
          <MetricMini label="p95 ms" value={opsMetrics?.p95_latency_ms} />
          <MetricMini label="empty retrieval" value={opsMetrics?.empty_retrieval_count} />
          <MetricMini label="reply rules" value={opsMetrics?.reply_rules_hit_count} />
          <MetricMini label="fallback" value={opsMetrics?.fallback_count} />
        </div>
      </div>
      <div className="space-y-3">
        {results.length ? (
          results.map((item) => <EvidenceCard key={`${item.rank}-${item.question}`} item={item} />)
        ) : (
          <EmptyState title="暂无检索证据" text="发送客服问题后展示检索结果。" compact />
        )}
      </div>
      <div className="mt-4 rounded-work bg-subtle p-3">
        <p className="text-xs font-black text-muted">prompt_context_items</p>
        <div className="mt-2 space-y-2">
          {promptPreview?.prompt_context_items?.length ? (
            promptPreview.prompt_context_items.map((item) => (
              <div key={`${item.rank}-${item.question}`} className="rounded-work bg-white p-2 text-xs leading-5">
                <span className="font-black">{item.role}</span> · {item.question}
              </div>
            ))
          ) : (
            <p className="text-xs text-muted">暂无 prompt context。</p>
          )}
        </div>
      </div>
      <div className="mt-4 rounded-work bg-subtle p-3">
        <p className="text-xs font-black text-muted">trace</p>
        <pre className="mono-block mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-5">
          {JSON.stringify(diagnostics?.trace ?? {}, null, 2)}
        </pre>
      </div>
      <div className="mt-4 rounded-work bg-subtle p-3">
        <p className="text-xs font-black text-muted">recent bad cases</p>
        <div className="mt-2 space-y-2">
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
      </div>
    </aside>
  );
}

function MetricMini({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-work bg-white p-2">
      <div className="font-black text-ink">{value ?? 0}</div>
      <div className="mt-1 text-[10px] font-bold text-muted">{label}</div>
    </div>
  );
}

function EvidenceCard({ item }: { item: RetrievalResult }) {
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
        {penalty > 0 ? (
          <span className="rounded-full bg-orange-50 px-2 py-1 text-[11px] font-black text-amberline">
            方向降权 {penalty.toFixed(2)}
          </span>
        ) : null}
      </div>
      <p className="text-sm font-black">{item.question}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{item.answer}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Score label="score" value={item.score} />
        <Score label="rerank" value={item.rerank_score} />
        <Score label="vector" value={item.vector_score} />
      </div>
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
