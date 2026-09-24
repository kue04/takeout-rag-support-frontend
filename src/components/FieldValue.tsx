import { formatOrReason, type MissingReasonCode } from "../lib/status";

/**
 * 字段值展示。
 *
 * 纪律（验收规范 §4.2）：「未测 / 无样本 / 后端没这个字段」不等于 0。
 * 所以这里缺值时永远渲染「未返回（原因）」，不允许** `??? "--"` 或 `|| 0`。
 * 用 `missingReason` 显式说明为什么缺。
 */
export function FieldValue({
  label,
  value,
  missingReason,
  mono = false,
  className = "",
}: {
  label: string;
  value: unknown;
  missingReason: MissingReasonCode | string;
  mono?: boolean;
  className?: string;
}) {
  const missing = value === undefined || value === null || value === "";
  const text = formatOrReason(value, missingReason);

  return (
    <div className={`min-w-0 ${className}`}>
      <div className="text-[11px] font-bold text-muted">{label}</div>
      <div
        className={`mt-0.5 break-words text-sm leading-5 ${
          missing ? "font-medium text-muted" : `font-bold text-ink ${mono ? "mono-block text-xs" : ""}`
        }`}
        title={missing ? text : undefined}
      >
        {text}
      </div>
    </div>
  );
}
