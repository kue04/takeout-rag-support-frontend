import type { AnswerStrategy } from "../types/api";

const strategyMeta: Record<AnswerStrategy, { label: string; className: string }> = {
  model_reply: {
    label: "模型回答被保留",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  composer_repair: {
    label: "主证据规则修复",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  safety_fallback: {
    label: "安全兜底替换",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

export function AnswerStrategyBadge({ strategy }: { strategy?: AnswerStrategy }) {
  if (!strategy) {
    return null;
  }

  const meta = strategyMeta[strategy];
  return (
    <div className={`rounded-work border px-3 py-2 text-xs font-extrabold ${meta.className}`}>
      回答策略：{meta.label}
    </div>
  );
}
