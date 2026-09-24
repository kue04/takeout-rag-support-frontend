import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, Check, Info, ShieldAlert } from "lucide-react";
import type { StatusTone } from "../lib/status";

const TONE_STYLE: Record<StatusTone, { wrap: string; icon: string; Icon: typeof Info }> = {
  success: {
    wrap: "border-emerald-200 bg-emerald-50/70 text-emerald-950",
    icon: "text-emerald-700",
    Icon: Check,
  },
  progress: { wrap: "border-sky-200 bg-sky-50/70 text-sky-950", icon: "text-sky-700", Icon: Info },
  warning: {
    wrap: "border-amber-200 bg-amber-50/70 text-amber-950",
    icon: "text-amber-700",
    Icon: AlertTriangle,
  },
  danger: { wrap: "border-red-200 bg-red-50/70 text-red-900", icon: "text-red-700", Icon: ShieldAlert },
  neutral: { wrap: "border-line bg-subtle text-ink", icon: "text-muted", Icon: Info },
};

/**
 * 统一的提示块（错误 / 降级 / 空态 / 缺能力）。
 * 结构固定为 标题 + 详情 + 下一步动作** —— 错误提示必须可操作，
 * 不允许只显示一句「请求失败」。
 */
export function Notice({
  tone = "neutral",
  title,
  detail,
  action,
  children,
  className = "",
}: {
  tone?: StatusTone;
  title: string;
  detail?: ReactNode;
  action?: string;
  children?: ReactNode;
  className?: string;
}) {
  const style = TONE_STYLE[tone];
  const Icon = style.Icon;

  return (
    <section className={`rounded-work border p-3 text-xs leading-5 ${style.wrap} ${className}`} role="status">
      <div className="flex items-start gap-2">
        <Icon size={15} className={`mt-px shrink-0 ${style.icon}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{title}</p>
          {detail ? <div className="mt-1 break-words opacity-90">{detail}</div> : null}
          {action ? (
            <p className="mt-2 inline-flex items-start gap-1 font-bold opacity-90">
              <ArrowRight size={13} className="mt-0.5 shrink-0" aria-hidden />
              <span>{action}</span>
            </p>
          ) : null}
          {children ? <div className="mt-2">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
