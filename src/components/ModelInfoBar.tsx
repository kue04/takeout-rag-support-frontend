import {
  Activity,
  AlertCircle,
  BrainCircuit,
  ClipboardList,
  GitBranch,
  SlidersHorizontal,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ModelInfo, RetrievalConfig, RetrievalMode } from "../types/api";

type ModelInfoBarProps = {
  modelInfo: ModelInfo | null;
  retrievalConfig: RetrievalConfig | null;
  mode: RetrievalMode;
  limit: number;
  minScore: number;
  errorMessage?: string;
  onModeChange: (mode: RetrievalMode) => void;
  onLimitChange: (limit: number) => void;
  onMinScoreChange: (score: number) => void;
  onCopyReport: () => void;
};

const modes: RetrievalMode[] = ["vector", "hybrid"];

export default function ModelInfoBar({
  modelInfo,
  retrievalConfig,
  mode,
  limit,
  minScore,
  errorMessage,
  onModeChange,
  onLimitChange,
  onMinScoreChange,
  onCopyReport,
}: ModelInfoBarProps) {
  return (
    <header className="rounded-work border border-line bg-panel">
      <div className="grid grid-cols-[1.15fr_1.1fr_1.15fr] gap-3 p-3 max-xl:grid-cols-1">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-work bg-leaf text-white">
            <BrainCircuit size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-normal">
              外卖客服 RAG 调试台
            </h1>
            <p className="mt-1 text-sm text-muted">
              输入问题后观察回复、检索证据、分数、prompt 和 trace。
            </p>
            {errorMessage ? (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-bold text-red-700">
                <AlertCircle size={14} />
                <span className="truncate">后端连接或接口异常：{errorMessage}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-2">
          <StatusCell
            icon={<Activity size={16} />}
            label="base_model"
            value={modelInfo?.base_model ?? "加载中"}
          />
          <StatusCell
            icon={<GitBranch size={16} />}
            label="adapter"
            value={modelInfo?.adapter_enabled ? modelInfo.adapter_name ?? "enabled" : "disabled"}
          />
          <StatusCell
            icon={<Activity size={16} />}
            label="embedding"
            value={retrievalConfig?.embedding_model ?? "未返回"}
          />
          <StatusCell
            icon={<GitBranch size={16} />}
            label="reranker"
            value={retrievalConfig?.reranker_model ?? "未返回"}
          />
        </div>

        <div className="rounded-work border border-line bg-subtle p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-muted">
              <SlidersHorizontal size={15} />
              检索参数
            </div>
            <button
              className="inline-flex h-8 items-center gap-1 rounded-work border border-line bg-panel px-2 text-xs font-bold text-ink"
              type="button"
              onClick={onCopyReport}
            >
              <ClipboardList size={14} />
              复制调试报告
            </button>
          </div>
          <div className="grid grid-cols-[1fr_76px_1.2fr] gap-2 max-sm:grid-cols-1">
            <div className="segmented-control segmented-control-2">
              {modes.map((item) => (
                <button
                  key={item}
                  className={item === mode ? "active" : ""}
                  type="button"
                  onClick={() => onModeChange(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="mini-field">
              <span>limit</span>
              <input
                min={1}
                max={20}
                type="number"
                value={limit}
                onChange={(event) => onLimitChange(clampNumber(event.target.value, 1, 20))}
              />
            </label>
            <label className="mini-field">
              <span>min_score {minScore.toFixed(2)}</span>
              <div className="grid grid-cols-[1fr_58px] gap-2">
                <input
                  max={1}
                  min={0}
                  step={0.01}
                  type="range"
                  value={minScore}
                  onChange={(event) => onMinScoreChange(clampNumber(event.target.value, 0, 1))}
                />
                <input
                  max={1}
                  min={0}
                  step={0.01}
                  type="number"
                  value={minScore}
                  onChange={(event) => onMinScoreChange(clampNumber(event.target.value, 0, 1))}
                />
              </div>
            </label>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-muted">
            <span>rerank_weight: {formatValue(retrievalConfig?.rerank_weight)}</span>
            <span>默认阈值: {formatValue(retrievalConfig?.default_min_score)}</span>
            <span>
              reply rules:{" "}
              {retrievalConfig?.reply_rules_enabled
                ? retrievalConfig.reply_rules_status ?? "enabled"
                : "disabled"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

type StatusCellProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function StatusCell({ icon, label, value }: StatusCellProps) {
  return (
    <div className="min-w-0 rounded-work border border-line bg-panel p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-muted">
        {icon}
        {label}
      </div>
      <div className="truncate text-sm font-extrabold" title={value}>
        {value}
      </div>
    </div>
  );
}

function clampNumber(value: string, min: number, max: number) {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return min;
  }

  return Math.min(max, Math.max(min, parsed));
}

function formatValue(value?: number) {
  return typeof value === "number" ? value.toFixed(2) : "未返回";
}
