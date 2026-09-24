import { AlertTriangle, Check, CircleSlash, Info, Loader2, X, Clock3 } from "lucide-react";
import { describeStatus, type StatusIconName, type StatusTone } from "../lib/status";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  progress: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-800",
  neutral: "border-line bg-subtle text-muted",
};

const ICONS: Record<StatusIconName, typeof Check> = {
  check: Check,
  spinner: Loader2,
  clock: Clock3,
  alert: AlertTriangle,
  x: X,
  slash: CircleSlash,
  info: Info,
};

/**
 * 状态徽章：**颜色 + 图标 + 文字三者同现**（验收规范 §4.2）。
 * `skipped` / `cancelled` / `duplicate` 这类必须传 `note` 说明原因。
 */
export function StatusPill({
  value,
  note,
  className = "",
}: {
  value?: string | null;
  note?: string;
  className?: string;
}) {
  const meta = describeStatus(value, note);
  const Icon = ICONS[meta.icon];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold leading-4 ${TONE_CLASS[meta.tone]} ${className}`}
      title={meta.raw ? `后端原值：${meta.raw}` : undefined}
    >
      <Icon size={12} className={meta.icon === "spinner" ? "animate-spin" : undefined} aria-hidden />
      <span>{meta.label}</span>
      {meta.raw && meta.label !== meta.raw ? <span className="opacity-60">({meta.raw})</span> : null}
    </span>
  );
}

/** 纯色点 + 文字，用于列表里的紧凑状态位。同样三者同现（点 + 文字）。 */
export function StatusDot({ value, note }: { value?: string | null; note?: string }) {
  const meta = describeStatus(value, note);
  const dot: Record<StatusTone, string> = {
    success: "bg-emerald-500",
    progress: "bg-sky-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    neutral: "bg-slate-400",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
      <span className={`h-1.5 w-1.5 rounded-full ${dot[meta.tone]}`} aria-hidden />
      {meta.label}
    </span>
  );
}
