import { useCallback, useState } from "react";
import { ArrowLeft, Database, FlaskConical, Loader2, Play, RefreshCw, Wrench } from "lucide-react";
import RetrievalPanel from "../../components/RetrievalPanel";
import { EmptyState } from "../../components/EmptyState";
import { FieldValue } from "../../components/FieldValue";
import { Notice } from "../../components/Notice";
import { SkeletonRows } from "../../components/SkeletonRows";
import { StatusPill } from "../../components/StatusPill";
import {
  describeApiError,
  errorMessage,
  formatOrReason,
  type ErrorPresentation,
} from "../../lib/status";
import { previewRetrievalPrompt, rebuildChunkIndex, searchChunks, searchRetrievalDemo } from "../../api/retrieval";
import type {
  ChunkRetrievalResponse,
  IndexRebuildResponse,
  PromptPreviewResponse,
  RetrievalMode,
  RetrievalSearchResponse,
} from "../../types/api";
import { ChunkIndexSummary, ChunkResultList } from "./ChunkResultList";

type PathKey = "formal" | "demo";

const PATHS: Array<{
  key: PathKey;
  label: string;
  endpoint: string;
  hint: string;
  /** 该端点响应里 `retrieval_path` 的应有取值（契约枚举，不是实测值）。 */
  expectedPath: string;
}> = [
  {
    key: "formal",
    label: "正式路径 · chunk 级",
    endpoint: "POST /retrieval/search",
    hint: "先授权再检索；服务端用 ACL 预过滤（IDSelectorBatch），所以零命中里混着「没权限」。响应含 index 自描述。",
    expectedPath: "chunk-index",
  },
  {
    key: "demo",
    label: "演示路径 · 种子 FAQ",
    endpoint: "POST /retrieval/search-demo",
    hint: "读手工整理的 781 条种子 FAQ，没有任何权限过滤；只用来演示分数构成与兼容旧调试台。",
    expectedPath: "seed-faq-demo",
  },
];

const PATH_TONE: Record<PathKey, string> = {
  formal: "border-emerald-300 bg-emerald-50 text-emerald-900",
  demo: "border-amber-300 bg-amber-50 text-amber-900",
};

type RequestState<T> = {
  loading: boolean;
  data: T | null;
  error: ErrorPresentation | null;
  /** 真正产出这份结果的 query，避免面板显示当前草稿误导人。 */
  query: string;
  at: string | null;
};

function idleState<T>(): RequestState<T> {
  return { loading: false, data: null, error: null, query: "", at: null };
}

/**
 * 检索实验台。
 *
 * 为什么要有这个页面：B7 把检索拆成了两条路径，入口即见分野 ——
 * 前端必须让用户知道「我这次看的是正式路径还是演示路径」，否则拆了等于白拆。
 * 所以这里把两条路径做成显式切换，并且分别保留各自的结果（不互相覆盖）。
 *
 * `/retrieval/*` 只由本页面主动触发；正常聊天流程不碰检索接口。
 */
export function RetrievalLabView({ onBack }: { onBack: () => void }) {
  const [path, setPath] = useState<PathKey>("formal");
  const [query, setQuery] = useState("退款多久到账");
  const [mode, setMode] = useState<RetrievalMode>("hybrid");
  const [limit, setLimit] = useState(5);
  const [minScore, setMinScore] = useState(0.4);

  const [formal, setFormal] = useState<RequestState<ChunkRetrievalResponse>>(idleState);
  const [demo, setDemo] = useState<RequestState<RetrievalSearchResponse>>(idleState);
  const [preview, setPreview] = useState<RequestState<PromptPreviewResponse>>(idleState);
  const [rebuild, setRebuild] = useState<{
    loading: boolean;
    data: IndexRebuildResponse | null;
    error: ErrorPresentation | null;
    /** 后端已经明确 403 过 → 隐藏入口，而不是继续点（验收规范 §4.4）。 */
    forbidden: boolean;
  }>({ loading: false, data: null, error: null, forbidden: false });

  const runFormal = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    setFormal((current) => ({ ...current, loading: true, error: null }));
    try {
      // 正式路径没有 mode 字段，所以这里不传 mode。
      const data = await searchChunks({ query: trimmed, limit, min_score: minScore });
      setFormal({ loading: false, data, error: null, query: trimmed, at: new Date().toLocaleTimeString("zh-CN") });
    } catch (error) {
      setFormal({
        loading: false,
        data: null,
        error: describeApiError(error),
        query: trimmed,
        at: new Date().toLocaleTimeString("zh-CN"),
      });
    }
  }, [query, limit, minScore]);

  const runDemo = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    setDemo((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await searchRetrievalDemo({ query: trimmed, mode, limit, min_score: minScore });
      setDemo({ loading: false, data, error: null, query: trimmed, at: new Date().toLocaleTimeString("zh-CN") });
    } catch (error) {
      setDemo({
        loading: false,
        data: null,
        error: describeApiError(error),
        query: trimmed,
        at: new Date().toLocaleTimeString("zh-CN"),
      });
    }
  }, [query, mode, limit, minScore]);

  const runPreview = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    setPreview((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await previewRetrievalPrompt({ query: trimmed, mode, limit, min_score: minScore });
      setPreview({ loading: false, data, error: null, query: trimmed, at: new Date().toLocaleTimeString("zh-CN") });
    } catch (error) {
      setPreview({
        loading: false,
        data: null,
        error: describeApiError(error),
        query: trimmed,
        at: new Date().toLocaleTimeString("zh-CN"),
      });
    }
  }, [query, mode, limit, minScore]);

  const runRebuild = useCallback(async () => {
    setRebuild((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await rebuildChunkIndex();
      setRebuild({ loading: false, data, error: null, forbidden: false });
    } catch (error) {
      const presentation = describeApiError(error);
      setRebuild({
        loading: false,
        data: null,
        error: presentation,
        forbidden: presentation.status === 403,
      });
    }
  }, []);

  const currentPath = PATHS.find((item) => item.key === path)!;
  const indexUnavailable = formal.error?.code === "chunk_index_unavailable";

  return (
    <section className="view-surface space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button
            className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-muted"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft size={16} aria-hidden />
            返回首页
          </button>
          <h1 className="flex items-center gap-2 text-lg font-bold text-ink">
            <FlaskConical size={19} className="text-leaf" aria-hidden />
            检索实验台
          </h1>
          <p className="mt-1 text-sm text-muted">
            正式路径与演示路径在这里显式分开。两条路径的结果各自保留，不会互相覆盖。
          </p>
        </div>
        <div className={`rounded-work border px-3 py-2 text-xs font-bold ${PATH_TONE[path]}`}>
          <div>
            当前路径：{currentPath.label}
            <span className="ml-2 font-normal opacity-80">{currentPath.endpoint}</span>
          </div>
          <div className="mt-1 font-normal opacity-80">
            该端点返回的 <code>retrieval_path</code> 应为 <strong>{currentPath.expectedPath}</strong>
            {path === "formal" && formal.data?.retrieval_path
              ? ` · 后端实际返回：${formal.data.retrieval_path}`
              : null}
            {path === "demo" && demo.data?.retrieval_path
              ? ` · 后端实际返回：${demo.data.retrieval_path}`
              : null}
            {path === "formal" && !formal.data ? " · 尚未取得响应，所以还没有实际值" : null}
            {path === "demo" && !demo.data ? " · 尚未取得响应，所以还没有实际值" : null}
          </div>
        </div>
      </div>

      <Notice
        tone="neutral"
        title="这两条路径不是一件事，别混着看"
        detail={`正式路径：${PATHS[0].hint} 演示路径：${PATHS[1].hint}`}
      />

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          <div className="rounded-work border border-line bg-panel p-3">
            <p className="mb-2 text-xs font-bold text-muted">选择路径</p>
            <div className="grid gap-2">
              {PATHS.map((item) => {
                const active = item.key === path;
                return (
                  <button
                    key={item.key}
                    className={`rounded-work border px-3 py-2 text-left text-xs font-bold ${
                      active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-leaf"
                    }`}
                    type="button"
                    onClick={() => setPath(item.key)}
                    aria-pressed={active}
                  >
                    {item.label}
                    <span className="mt-1 block font-normal opacity-80">{item.endpoint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form
            className="space-y-3 rounded-work border border-line bg-panel p-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (path === "formal") {
                void runFormal();
              } else {
                void runDemo();
              }
            }}
          >
            <label className="block text-xs font-bold text-muted" htmlFor="lab-query">
              检索问题
            </label>
            <input
              id="lab-query"
              className="h-10 w-full rounded-work border border-line bg-white px-3 text-sm outline-none focus:border-leaf"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="例如：会员退款多久到账"
            />

            <div className="grid grid-cols-2 gap-2">
              <label className="mini-field">
                <span>limit（1-20）</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={limit}
                  onChange={(event) => setLimit(clamp(Number(event.target.value), 1, 20, limit))}
                />
              </label>
              <label className="mini-field">
                <span>min_score（0-1）</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={minScore}
                  onChange={(event) => setMinScore(clamp(Number(event.target.value), 0, 1, minScore))}
                />
              </label>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-bold text-muted">mode</p>
              {path === "demo" ? (
                <div className="segmented-control segmented-control-2">
                  {(["hybrid", "vector"] as RetrievalMode[]).map((item) => (
                    <button
                      key={item}
                      className={item === mode ? "active" : ""}
                      type="button"
                      onClick={() => setMode(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-work border border-line bg-subtle px-3 py-2 text-[11px] leading-5 text-muted">
                  正式路径没有 <code>mode</code> 字段（后端 <code>ChunkRetrievalRequest</code> 只有
                  <code>query / limit / min_score</code>）。这里不给你一个点了没用的开关。
                </p>
              )}
            </div>

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-work bg-leaf px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              type="submit"
              disabled={(path === "formal" ? formal.loading : demo.loading) || !query.trim()}
            >
              {path === "formal" ? (
                formal.loading ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                ) : (
                  <Play size={16} aria-hidden />
                )
              ) : demo.loading ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : (
                <Play size={16} aria-hidden />
              )}
              运行{path === "formal" ? "正式" : "演示"}路径检索
            </button>

            {path === "demo" ? (
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-work border border-line bg-white px-3 py-2 text-xs font-bold text-ink"
                type="button"
                onClick={() => void runPreview()}
                disabled={preview.loading || !query.trim()}
              >
                <Wrench size={14} aria-hidden />
                额外拼装 prompt 预览（看证据怎么进上下文）
              </button>
            ) : null}
          </form>

          <div className="rounded-work border border-line bg-panel p-3 text-xs leading-5 text-muted">
            <p className="font-bold text-ink">本页面不做的事</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>不做 Dense / BM25 / RRF 分数卡 —— 后端只有单路稠密检索，那些数字永远不存在。</li>
              <li>不做 A/B 配置对照 —— 正式路径连 <code>mode</code> 都没有，后端只接受一个 query。</li>
              <li>不做评测门禁 —— 后端没有评测执行接口。</li>
            </ul>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          {path === "formal" ? (
            <FormalPane
              state={formal}
              indexUnavailable={indexUnavailable}
              rebuild={rebuild}
              onRebuild={runRebuild}
            />
          ) : (
            <>
              <DemoPane state={demo} mode={mode} onRun={runDemo} />
              {preview.data || preview.error || preview.loading ? (
                <PreviewPane state={preview} />
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function FormalPane({
  state,
  indexUnavailable,
  rebuild,
  onRebuild,
}: {
  state: RequestState<ChunkRetrievalResponse>;
  indexUnavailable: boolean;
  rebuild: { loading: boolean; data: IndexRebuildResponse | null; error: ErrorPresentation | null; forbidden: boolean };
  onRebuild: () => Promise<void>;
}) {
  return (
    <>
      {state.error ? (
        <Notice
          tone={state.error.tone}
          title={state.error.title}
          detail={state.error.detail}
          action={state.error.action}
        >
          <p className="text-[11px] opacity-80">
            路径：{state.error.path} · HTTP {state.error.status}
            {state.error.code ? ` · error_code：${state.error.code}` : ""}
          </p>
          {indexUnavailable ? (
            <div className="mt-3 rounded-work border border-current/20 bg-white/60 p-3">
              <p className="text-[11px] font-bold">建索引入口</p>
              <p className="mt-1 text-[11px] leading-5">
                重建的是全局一份 chunk 索引（影响所有租户的检索结果），需要
                <code className="mx-1">index:rebuild</code>（仅 supervisor / admin）。
              </p>
              {rebuild.forbidden ? (
                <p className="mt-2 text-[11px] font-bold text-red-800">
                  当前令牌已被后端判为无权限（403）→ 入口已隐藏。换一个 supervisor / admin 令牌再来。
                </p>
              ) : (
                <button
                  className="mt-2 inline-flex items-center gap-2 rounded-work bg-ink px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"
                  type="button"
                  onClick={() => void onRebuild()}
                  disabled={rebuild.loading}
                >
                  {rebuild.loading ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw size={13} aria-hidden />
                  )}
                  重建 chunk 索引
                </button>
              )}
              {rebuild.error ? (
                <p className="mt-2 text-[11px] font-bold">{rebuild.error.title}：{rebuild.error.detail}</p>
              ) : null}
              {rebuild.data ? <RebuildResult data={rebuild.data} /> : null}
            </div>
          ) : null}
        </Notice>
      ) : null}

      {state.loading ? <SkeletonRows label="正在跑正式路径检索（服务端先授权再检索）…" rows={2} /> : null}

      {state.data ? (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-work border border-line bg-panel px-3 py-2 text-xs font-bold text-muted">
            <StatusPill value={state.data.retrieval_path} />
            <span>query：{state.data.query}</span>
            <span>· count：{state.data.count}</span>
            {state.at ? <span>· 查询时间：{state.at}</span> : null}
          </div>
          <ChunkIndexSummary index={state.data.index} />
          <ChunkResultList
            items={state.data.results}
            visibleChunkCount={state.data.index.visible_chunk_count}
          />
        </>
      ) : null}

      {!state.data && !state.loading && !state.error ? (
        <EmptyState
          title="还没有跑过正式路径"
          text="在左侧输入问题后点「运行正式路径检索」。这条路径按租户与 document ACL 过滤，是权限隔离的唯一验证入口。"
        />
      ) : null}
    </>
  );
}

function RebuildResult({ data }: { data: IndexRebuildResponse }) {
  const skipped = Boolean(data.skipped);
  return (
    <div className="mt-3 border-t border-current/20 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill
          value={skipped ? "skipped" : data.switched ? "succeeded" : "pending"}
          note={skipped ? data.skip_reason ?? "未返回 skip_reason" : undefined}
        />
        <span className="text-[11px] font-bold">
          {skipped
            ? `跳过原因：${formatOrReason(data.skip_reason, "NOT_RETURNED")}`
            : `已原子切换，index_version = ${data.index_version}`}
        </span>
      </div>
      {skipped && data.skip_reason === "no_chunks" ? (
        <p className="mt-1 text-[11px] leading-5">
          库里还没有可索引内容 —— 这是正常空态，不是失败。
          先上传文档并等接入流水线跑到 <code>published</code>，再回来重建。
        </p>
      ) : null}
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <FieldValue label="index_name" value={data.index_name} missingReason="NOT_RETURNED" />
        <FieldValue label="index_version" value={data.index_version} missingReason="NOT_RETURNED" />
        <FieldValue label="chunk_count" value={data.chunk_count} missingReason="NOT_RETURNED" />
        <FieldValue label="tenant_count" value={data.tenant_count} missingReason="NOT_RETURNED" />
        <FieldValue label="embedding_model" value={data.embedding_model} missingReason="NOT_RETURNED" />
        <FieldValue
          label="embedding_dimension"
          value={data.embedding_dimension}
          missingReason="NOT_RETURNED"
        />
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-5">
        <Database size={12} className="mt-0.5 shrink-0" aria-hidden />
        即使重建成功，检索仍可能因缺少 embedding 依赖（<code>sentence-transformers</code>）而失败 ——
        那属于部署问题，不是索引问题。
      </p>
    </div>
  );
}

function DemoPane({
  state,
  mode,
  onRun,
}: {
  state: RequestState<RetrievalSearchResponse>;
  mode: RetrievalMode;
  onRun: () => Promise<void>;
}) {
  return (
    <RetrievalPanel
      query={state.query || ""}
      mode={mode}
      results={state.data?.results ?? []}
      retrievalPath={state.data?.retrieval_path}
      isLoading={state.loading}
      error={state.error}
      onRunRetrieval={async (nextQuery) => {
        void nextQuery;
        await onRun();
      }}
    />
  );
}

function PreviewPane({ state }: { state: RequestState<PromptPreviewResponse> }) {
  return (
    <section className="rounded-work border border-line bg-panel p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-xs font-bold text-ink">prompt 预览（演示路径同链路）</p>
        <StatusPill value={state.data?.mode} />
        {state.loading ? <span className="text-[11px] font-bold text-muted">拼装中…</span> : null}
      </div>
      {state.error ? (
        <Notice tone={state.error.tone} title={state.error.title} detail={state.error.detail} action={state.error.action} />
      ) : null}
      {state.data ? (
        <>
          <p className="mb-2 text-[11px] leading-5 text-muted">
            count：{state.data.count} · 进上下文的条目：{state.data.prompt_context_items.length}
          </p>
          <pre className="mono-block max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-work bg-subtle p-3 text-[11px] leading-5">
            {state.data.prompt || "（后端未返回 prompt）"}
          </pre>
        </>
      ) : null}
    </section>
  );
}

function clamp(value: number, min: number, max: number, fallback: number) {
  if (Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

/** 供别的视图复用的错误文案（避免各处自己拼字符串）。 */
export { errorMessage };
