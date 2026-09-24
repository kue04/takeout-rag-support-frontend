import { Play, Route } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { EmptyState } from "./EmptyState";
import { FieldValue } from "./FieldValue";
import { Notice } from "./Notice";
import { SkeletonRows } from "./SkeletonRows";
import { StatusPill } from "./StatusPill";
import { formatScore, type ErrorPresentation } from "../lib/status";
import type { RetrievalMode, RetrievalResultItem } from "../types/api";

/**
 * 演示路径结果面板（A 轨 · 种子 FAQ · `/retrieval/search-demo`）。
 *
 * ⚠️ 这个面板只能接 `search-demo` 的响应。
 * B7 之后 `/retrieval/search` 换成了 chunk 级响应，字段名完全不同
 * （`chunk_id` / `text` / `heading_path`…）。
 * 旧实现把两种响应混在一个面板里，于是 `result.intent ?? "未标注意图"` 这类兜底
 * 会把「字段不存在」伪装成正常文案 —— 标题写「未标注意图」、正文一片空白。
 * 现在路径在入口就分开，`intent` / `category` 只在演示路径下出现，不再兜底伪造。
 *
 * 本面板是受控组件：请求由 `RetrievalLabView` 发起（`/retrieval/*` 只由检索实验台主动触发）。
 */
export type RetrievalPanelProps = {
  query: string;
  mode: RetrievalMode;
  results: RetrievalResultItem[];
  /** 后端返回的 `retrieval_path`，原值展示。 */
  retrievalPath?: string;
  isLoading: boolean;
  error?: ErrorPresentation | null;
  onRunRetrieval: (query: string) => Promise<void>;
};

export default function RetrievalPanel({
  query,
  mode,
  results,
  retrievalPath,
  isLoading,
  error,
  onRunRetrieval,
}: RetrievalPanelProps) {
  const [draftQuery, setDraftQuery] = useState(query);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = draftQuery.trim();
    if (!next) {
      return;
    }
    await onRunRetrieval(next);
  }

  return (
    <div className="flex flex-col">
      <form className="border-b border-line bg-panel p-4" onSubmit={handleSubmit}>
        <label className="mb-2 flex items-center gap-2 text-xs font-bold text-muted" htmlFor="demo-query">
          <Play size={14} aria-hidden />
          按演示路径检索（种子 FAQ 语料，<span className="font-bold text-amberline">无权限过滤</span>）
        </label>
        <div className="grid grid-cols-[1fr_48px] gap-2">
          <input
            id="demo-query"
            className="h-11 rounded-work border border-line bg-panel px-3 text-sm outline-none focus:border-leaf"
            placeholder="例如：会员退款多久到账"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
          <button
            className="grid place-items-center rounded-work bg-ink text-white disabled:opacity-50"
            disabled={isLoading}
            title="运行演示路径检索"
            type="submit"
            aria-label="运行演示路径检索"
          >
            <Play size={17} aria-hidden />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusPill value={retrievalPath} />
          <span className="rounded-full border border-line bg-subtle px-2.5 py-1 text-[11px] font-bold text-muted">
            mode：{mode}
          </span>
          <span className="max-w-full truncate rounded-full border border-line bg-subtle px-2.5 py-1 text-[11px] font-bold text-muted">
            query：{query || "尚未检索"}
          </span>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-muted">
          <Route size={13} className="mt-0.5 shrink-0" aria-hidden />
          这条路径读的是手工整理的种子 FAQ，语料本身是单租户的，不能用来验证权限隔离 ——
          要验证权限请切到「正式路径（chunk 级）」。
        </p>
      </form>

      <div className="p-4">
        {error ? (
          <Notice
            tone={error.tone}
            title={error.title}
            detail={error.detail}
            action={error.action}
            className="mb-4"
          >
            <p className="text-[11px] opacity-80">
              {error.path ? `路径：${error.path}` : null}
              {error.code ? ` · error_code：${error.code}` : null}
              {error.status ? ` · HTTP ${error.status}` : null}
            </p>
          </Notice>
        ) : null}

        {isLoading ? <SkeletonRows label="正在跑演示路径检索…" rows={2} /> : null}

        {!isLoading && !error && results.length === 0 ? (
          <EmptyState
            title={query ? "演示路径零命中" : "还没有检索结果"}
            text={
              query
                ? "种子语料里没有匹配内容。可以降低 min_score，或换一个问法。零命中是正常结果，不是错误。"
                : "输入一个问题后点右侧按钮，按演示路径（种子 FAQ）检索。"
            }
            compact
          />
        ) : null}

        <div className="space-y-3">
          {!isLoading &&
            results.map((result, index) => (
              <DemoResultCard key={`${result.rank}-${result.question}-${index}`} result={result} />
            ))}
        </div>
      </div>
    </div>
  );
}

function DemoResultCard({ result }: { result: RetrievalResultItem }) {
  return (
    <article className="rounded-work border border-line bg-panel p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-work bg-ink text-xs font-bold text-white">
          {result.rank}
        </span>
        {/* intent / category 是演示路径的真实字段（种子 FAQ 自带），这里不做兜底伪造 */}
        <StatusPill value={result.intent} note="演示路径 · 种子 FAQ 自带的意图标签" />
        <span className="rounded-full border border-line bg-subtle px-2.5 py-1 text-[11px] font-bold text-muted">
          {result.category}
        </span>
        {result.role ? (
          <span className="rounded-full border border-line bg-subtle px-2.5 py-1 text-[11px] font-bold text-muted">
            role：{result.role}
          </span>
        ) : null}
      </div>

      <h3 className="text-sm font-bold leading-5 text-ink">
        {result.display_title ?? result.question}
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-slate-700">
        {result.evidence_summary ?? result.answer}
      </p>

      {result.direction_penalty > 0 ? (
        <div className="mt-3 rounded-work border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
          业务方向降权：direction_penalty = {formatScore(result.direction_penalty)}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-3">
        <FieldValue label="score" value={result.score} missingReason="NOT_RETURNED" />
        <FieldValue label="rerank_score" value={result.rerank_score} missingReason="NOT_RETURNED" />
        <FieldValue label="model_rerank_score" value={result.model_rerank_score} missingReason="NOT_RETURNED" />
        <FieldValue label="vector_score" value={result.vector_score} missingReason="NOT_RETURNED" />
        <FieldValue label="keyword_bonus" value={result.keyword_bonus} missingReason="NOT_RETURNED" />
        <FieldValue label="direction_penalty" value={result.direction_penalty} missingReason="NOT_RETURNED" />
      </div>
    </article>
  );
}
