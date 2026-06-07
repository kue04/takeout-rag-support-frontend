import { Clipboard, ShieldAlert, Stethoscope } from "lucide-react";
import ScoreBadge from "./ScoreBadge";
import type {
  ChatResponse,
  EvaluationMetrics,
  ManualJudgment,
  PromptContextItem,
  RetrievalPromptPreviewResponse,
  RetrievalResult,
} from "../types/api";

type DiagnosticsPanelProps = {
  response: ChatResponse | null;
  promptPreview: RetrievalPromptPreviewResponse | null;
};

const layerLabels: Record<string, string> = {
  retrieval: "建议先排查 retrieval：召回是否缺证据、意图是否错配、阈值是否过高。",
  context_builder: "建议排查 context builder：证据是否被截断、primary/supporting 是否选错。",
  generation: "建议排查 generation：模型是否没有按证据回答，或 prompt 约束不够明确。",
  reply_rules: "建议排查 reply rules：规则是否覆盖、改写或屏蔽了模型回复。",
  judge: "建议排查 judge：评测期望、关键词或禁止词规则是否设置不合理。",
  pass: "当前诊断未指向明显故障层。",
};

export default function DiagnosticsPanel({ response, promptPreview }: DiagnosticsPanelProps) {
  const promptContext = response?.prompt_context_items || promptPreview?.prompt_context_items || [];
  const finalPrompt = response?.final_prompt || promptPreview?.final_prompt || promptPreview?.prompt || "";

  if (!response && !promptPreview) {
    return (
      <section className="mt-4 rounded-work border border-line bg-panel p-4 text-sm text-muted">
        发送问题后展示 prompt、trace 和诊断信息。
      </section>
    );
  }

  const suggestedLayer = response?.suggested_layer || "pass";
  const hasEvaluation = response ? hasGroundingEvaluationDetails(response) : false;
  const metrics = response ? buildMetrics(response) : {};

  return (
    <section className="mt-4 rounded-work border border-line bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-subtle px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-extrabold text-ink">
          <Stethoscope size={14} />
          诊断与 prompt
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-[11px] font-extrabold ${
            suggestedLayer === "pass"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {suggestedLayer}
        </span>
      </div>

      <div className="space-y-4 p-3">
        <InfoCallout text={layerLabels[suggestedLayer] ?? `建议排查 ${suggestedLayer}。`} />
        {response ? <RiskBlock response={response} /> : null}
        {hasEvaluation ? (
          <>
            <MetricCards metrics={metrics} />
            <div className="grid gap-3 xl:grid-cols-2">
              {response?.expected_intent ? (
                <InfoBlock title="expected_intent" value={response.expected_intent} />
              ) : null}
              {response ? <TraceBlock response={response} /> : null}
            </div>
            {response ? <KeywordBlock response={response} /> : null}
            {response ? <ManualJudgmentBlock judgment={response.manual_judgment} /> : null}
          </>
        ) : response ? (
          <TraceBlock response={response} />
        ) : null}

        <PromptContextBlock items={promptContext} />
        {response?.retrieved_items?.length ? <RetrievedItemsBlock items={response.retrieved_items} /> : null}

        <CopyBlock title="final_prompt" content={finalPrompt} />
      </div>
    </section>
  );
}

function RiskBlock({ response }: { response: ChatResponse }) {
  const risks = response.risky_promises || [];
  const forbiddenHits = response.forbidden_keyword_hits || [];

  if (!response.needs_manual_review && risks.length === 0 && forbiddenHits.length === 0) {
    return null;
  }

  return (
    <div className="rounded-work border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
      <div className="mb-2 flex items-center gap-2 font-extrabold">
        <ShieldAlert size={14} />
        风险提示
      </div>
      <div className="space-y-1">
        {response.needs_manual_review ? <p>needs_manual_review: true，需要人工复核。</p> : null}
        {risks.length ? <p>risky_promises: {risks.join("、")}</p> : null}
        {forbiddenHits.length ? <p>forbidden_keyword_hits: {forbiddenHits.join("、")}</p> : null}
      </div>
    </div>
  );
}

function MetricCards({ metrics }: { metrics: EvaluationMetrics }) {
  return (
    <div className="grid gap-2 md:grid-cols-5">
      <MetricCard label="top1 intent" value={formatPercent(metrics.top1_intent_hit_rate)} />
      <MetricCard label="evidence" value={formatPercent(metrics.evidence_keyword_coverage)} />
      <MetricCard label="forbidden" value={String(metrics.forbidden_hit_count ?? 0)} tone="red" />
      <MetricCard label="judge pass" value={formatPercent(metrics.judge_pass_rate)} />
      <MetricCard label="layers" value={formatLayerCounts(metrics.suggested_layer_counts)} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "red";
}) {
  const toneClass =
    tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-line bg-subtle text-ink";

  return (
    <div className={`rounded-work border p-2 ${toneClass}`}>
      <div className="text-[10px] font-extrabold text-muted">{label}</div>
      <div className="mt-1 truncate text-sm font-extrabold">{value}</div>
    </div>
  );
}

function InfoCallout({ text }: { text: string }) {
  return <div className="rounded-work border border-line bg-subtle p-3 text-xs leading-5 text-slate-700">{text}</div>;
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-work border border-line bg-subtle p-3">
      <div className="mb-1 text-[11px] font-extrabold text-muted">{title}</div>
      <div className="text-sm font-extrabold text-ink">{value}</div>
    </div>
  );
}

function TraceBlock({ response }: { response: ChatResponse }) {
  const trace = response.trace;

  return (
    <div className="rounded-work border border-line bg-subtle p-3">
      <div className="mb-2 text-[11px] font-extrabold text-muted">trace</div>
      <div className="flex flex-wrap gap-2">
        <Pill label="request_id" value={trace?.request_id || "-"} />
        <Pill label="top1_intent" value={trace?.top1_intent || "-"} />
        <Pill label="latency_ms" value={trace?.latency_ms} />
        <Pill label="retrieval_count" value={trace?.retrieval_count} />
        <Pill label="answer_source" value={trace?.answer_source} />
        <Pill label="reply_rules_applied" value={trace?.reply_rules_applied} />
        <Pill label="degraded" value={trace?.degraded} tone={trace?.degraded ? "red" : "neutral"} />
        <Pill label="used_fallback_prompt" value={trace?.used_fallback_prompt} />
        <Pill label="failure_stage" value={trace?.failure_stage} />
      </div>
      {trace?.fallback_reason ? (
        <p className="mt-2 text-xs leading-5 text-muted">fallback_reason: {trace.fallback_reason}</p>
      ) : null}
    </div>
  );
}

function KeywordBlock({ response }: { response: ChatResponse }) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <TagList title="expected_evidence_keywords" items={response.expected_evidence_keywords} />
      <TagList title="matched_evidence_keywords" items={response.matched_evidence_keywords} tone="green" />
      <TagList title="missing_evidence_keywords" items={response.missing_evidence_keywords} tone="yellow" />
      <TagList title="forbidden_keyword_hits" items={response.forbidden_keyword_hits} tone="red" />
      <TagList title="forbidden_keywords" items={response.forbidden_keywords} />
      <InfoBlock title="issue_type" value={response.issue_type || "-"} />
    </div>
  );
}

function ManualJudgmentBlock({ judgment }: { judgment?: ManualJudgment }) {
  return (
    <div className="rounded-work border border-line bg-subtle p-3">
      <div className="mb-2 text-[11px] font-extrabold text-muted">manual_judgment</div>
      <div className="flex flex-wrap gap-2">
        <Pill label="direct_answer" value={judgment?.direct_answer || "-"} />
        <Pill label="grounded" value={judgment?.grounded || "-"} />
        <Pill label="useful" value={judgment?.useful || "-"} />
        <Pill label="notes" value={judgment?.notes || "-"} />
      </div>
    </div>
  );
}

function PromptContextBlock({ items }: { items: PromptContextItem[] }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-xs font-extrabold text-muted">prompt_context_items</div>
        <p className="mt-1 text-xs leading-5 text-muted">
          检索结果会先去重、截断并标记 primary/supporting evidence，再进入 prompt。不是 TopK 全部直接塞入模型，因为低分或意图混杂证据会稀释回答约束。
        </p>
      </div>
      {items.length ? (
        items.map((item) => (
          <article
            key={`${item.rank}-${item.role}-${item.question}`}
            className={`rounded-work border p-3 ${
              item.role === "primary" ? "border-emerald-300 bg-emerald-50" : "border-line bg-subtle"
            }`}
          >
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-ink px-2 py-1 text-[11px] font-extrabold text-white">
                {item.role}
              </span>
              <span className="rounded-full border border-line bg-panel px-2 py-1 text-[11px] font-extrabold text-muted">
                intent: {item.intent ?? "-"}
              </span>
              {item.evidence_strength ? (
                <span className="rounded-full border border-line bg-panel px-2 py-1 text-[11px] font-extrabold text-muted">
                  strength: {item.evidence_strength}
                </span>
              ) : null}
            </div>
            <div className="text-sm font-extrabold">{item.display_title ?? item.question}</div>
            <p className="mt-1 text-sm leading-6 text-slate-700">{item.evidence_summary ?? item.answer}</p>
          </article>
        ))
      ) : (
        <EmptyBlock text="没有 prompt context。" />
      )}
    </div>
  );
}

function RetrievedItemsBlock({ items }: { items: RetrievalResult[] }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-xs font-extrabold text-muted">retrieved_items</div>
        <p className="mt-1 text-xs text-muted">/chat/prompt 返回的原始检索与重排结果，保留完整分数拆解。</p>
      </div>
      {items.map((item) => (
        <article key={`${item.rank}-${item.question}`} className="rounded-work border border-line bg-panel p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-work bg-ink text-xs font-extrabold text-white">
              {item.rank}
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-extrabold text-emerald-800">
              {item.intent ?? "-"}
            </span>
            <span className="rounded-full border border-line bg-subtle px-2 py-1 text-[11px] font-extrabold text-muted">
              {item.category ?? "-"}
            </span>
          </div>
          <div className="text-sm font-extrabold">{item.question}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <ScoreBadge label="rerank_score" value={item.rerank_score} tone="green" />
            <ScoreBadge label="score" value={item.score} tone="neutral" />
            <ScoreBadge label="model" value={item.model_rerank_score} tone="amber" />
            <ScoreBadge label="vector" value={item.vector_score} tone="blue" />
            <ScoreBadge label="keyword_bonus" value={item.keyword_bonus} tone="amber" />
            <ScoreBadge
              label="direction_penalty"
              value={item.direction_penalty}
              tone={(item.direction_penalty ?? 0) > 0 ? "red" : "neutral"}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function CopyBlock({ title, content }: { title: string; content: string }) {
  async function copy() {
    await navigator.clipboard.writeText(content || "");
  }

  return (
    <div className="rounded-work border border-line bg-subtle">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="text-[11px] font-extrabold text-muted">{title}</div>
        <button
          className="grid h-8 w-8 place-items-center rounded-work border border-line bg-panel text-ink"
          title={`复制 ${title}`}
          type="button"
          onClick={copy}
        >
          <Clipboard size={14} />
        </button>
      </div>
      <pre className="mono-block max-h-64 overflow-auto whitespace-pre-wrap break-words p-3 text-xs leading-5">
        {content || "-"}
      </pre>
    </div>
  );
}

function TagList({
  title,
  items,
  tone = "neutral",
}: {
  title: string;
  items?: string[];
  tone?: "neutral" | "green" | "yellow" | "red";
}) {
  const toneClass = {
    neutral: "border-line bg-panel text-ink",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    yellow: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-700",
  }[tone];

  return (
    <div className="rounded-work border border-line bg-subtle p-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold text-muted">
        {tone === "red" ? <ShieldAlert size={13} /> : null}
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {items?.length ? (
          items.map((item) => (
            <span key={item} className={`rounded-full border px-2 py-1 text-[11px] font-extrabold ${toneClass}`}>
              {item}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted">-</span>
        )}
      </div>
    </div>
  );
}

function Pill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: unknown;
  tone?: "neutral" | "red";
}) {
  const toneClass =
    tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-line bg-panel text-ink";

  return (
    <span className={`rounded-full border px-2 py-1 text-[11px] font-extrabold ${toneClass}`}>
      {label}: {String(value ?? "-")}
    </span>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return <div className="rounded-work border border-line bg-subtle p-3 text-xs text-muted">{text}</div>;
}

function hasGroundingEvaluationDetails(response: ChatResponse) {
  return Boolean(
    response.expected_intent ||
      response.expected_evidence_keywords?.length ||
      response.matched_evidence_keywords?.length ||
      response.missing_evidence_keywords?.length ||
      response.forbidden_keywords?.length ||
      response.forbidden_keyword_hits?.length ||
      response.issue_type ||
      response.suggested_layer ||
      response.manual_judgment ||
      response.evaluation_metrics,
  );
}

function buildMetrics(response: ChatResponse): EvaluationMetrics {
  const provided = response.evaluation_metrics || {};
  const expectedKeywords = response.expected_evidence_keywords || [];
  const matchedKeywords = response.matched_evidence_keywords || [];
  const judgment = response.manual_judgment || {};

  return {
    top1_intent_hit_rate:
      provided.top1_intent_hit_rate ?? getTop1IntentHitRate(response.expected_intent, response.retrieved_items),
    evidence_keyword_coverage:
      provided.evidence_keyword_coverage ??
      (expectedKeywords.length ? matchedKeywords.length / expectedKeywords.length : undefined),
    forbidden_hit_count: provided.forbidden_hit_count ?? (response.forbidden_keyword_hits || []).length,
    judge_pass_rate: provided.judge_pass_rate ?? getJudgePassRate(judgment),
    suggested_layer_counts:
      provided.suggested_layer_counts ||
      response.suggested_layer_counts ||
      (response.suggested_layer ? { [response.suggested_layer]: 1 } : {}),
  };
}

function getTop1IntentHitRate(expectedIntent?: string, items?: RetrievalResult[]) {
  if (!expectedIntent) {
    return undefined;
  }

  return items?.[0]?.intent === expectedIntent ? 1 : 0;
}

function getJudgePassRate(judgment: ManualJudgment) {
  if (!judgment.direct_answer && !judgment.grounded && !judgment.useful) {
    return undefined;
  }

  return judgment.direct_answer === "yes" && judgment.grounded === "yes" && judgment.useful === "yes" ? 1 : 0;
}

function formatPercent(value?: number) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "-";
}

function formatLayerCounts(counts?: Record<string, number>) {
  const entries = Object.entries(counts || {});
  return entries.length ? entries.map(([key, value]) => `${key}:${value}`).join(" ") : "-";
}
