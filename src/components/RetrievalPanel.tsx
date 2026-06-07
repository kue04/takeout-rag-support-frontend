import { FormEvent, useEffect, useState } from "react";
import { Play, TextSearch } from "lucide-react";
import DiagnosticsPanel from "./DiagnosticsPanel";
import ScoreBadge from "./ScoreBadge";
import type {
  ChatResponse,
  RetrievalMode,
  RetrievalPromptPreviewResponse,
  RetrievalResult,
} from "../types/api";

type RetrievalPanelProps = {
  query: string;
  mode: RetrievalMode;
  results: RetrievalResult[];
  diagnostics: ChatResponse | null;
  promptPreview: RetrievalPromptPreviewResponse | null;
  isLoading: boolean;
  onRunRetrieval: (query: string) => Promise<void>;
};

export default function RetrievalPanel({
  query,
  mode,
  results,
  diagnostics,
  promptPreview,
  isLoading,
  onRunRetrieval,
}: RetrievalPanelProps) {
  const [draftQuery, setDraftQuery] = useState(query);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onRunRetrieval(draftQuery);
  }

  return (
    <div className="flex min-h-[calc(100vh-174px)] flex-col">
      <form className="border-b border-line bg-panel p-3" onSubmit={handleSubmit}>
        <label className="mb-2 flex items-center gap-2 text-xs font-extrabold text-muted">
          <TextSearch size={15} />
          检索问题
        </label>
        <div className="grid grid-cols-[1fr_46px] gap-2">
          <input
            className="h-11 rounded-work border border-line bg-panel px-3 text-sm outline-none focus:border-leaf"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
          <button
            className="grid place-items-center rounded-work bg-ink text-white disabled:opacity-50"
            disabled={isLoading}
            title="运行检索"
            type="submit"
          >
            <Play size={18} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-extrabold text-blue-800">
            mode: {mode}
          </span>
          <span className="rounded-full border border-line bg-panel px-2 py-1 text-[11px] font-extrabold text-muted">
            query: {query}
          </span>
        </div>
      </form>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? <div className="text-sm font-bold text-muted">检索中...</div> : null}
        {!isLoading && results.length === 0 ? (
          <div className="rounded-work border border-line bg-panel p-4 text-sm text-muted">
            暂无检索结果。可以降低 min_score，或换一个问题再试。
          </div>
        ) : null}
        <div className="space-y-3">
          {results.map((result) => (
            <RetrievalCard key={`${result.rank}-${result.question}`} result={result} />
          ))}
        </div>
        <DiagnosticsPanel response={diagnostics} promptPreview={promptPreview} />
      </div>
    </div>
  );
}

type RetrievalCardProps = {
  result: RetrievalResult;
};

function RetrievalCard({ result }: RetrievalCardProps) {
  const penalty = result.direction_penalty ?? 0;

  return (
    <article className="rounded-work border border-line bg-panel p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-work bg-leaf text-xs font-extrabold text-white">
              {result.rank}
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-extrabold text-emerald-800">
              {result.intent ?? "未标注意图"}
            </span>
            <span className="rounded-full border border-line bg-subtle px-2.5 py-1 text-[11px] font-extrabold text-muted">
              {result.category ?? "未分类"}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-extrabold leading-5">
            {result.display_title ?? result.question}
          </h3>
        </div>
      </div>
      <p className="text-sm leading-6 text-slate-700">{result.evidence_summary ?? result.answer}</p>
      {penalty > 0 ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
          业务方向降权：direction_penalty = {penalty.toFixed(4)}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <ScoreBadge label="rerank_score" value={result.rerank_score} tone="green" />
        <ScoreBadge label="score" value={result.score} tone="neutral" />
        <ScoreBadge label="model" value={result.model_rerank_score} tone="amber" />
        <ScoreBadge label="vector" value={result.vector_score} tone="blue" />
        <ScoreBadge label="keyword_bonus" value={result.keyword_bonus} tone="amber" />
        <ScoreBadge
          label="direction_penalty"
          value={result.direction_penalty}
          tone={penalty > 0 ? "red" : "neutral"}
        />
      </div>
    </article>
  );
}
