/**
 * 加载骨架屏。
 * 设计规范：**skeleton 优于 spinner**；并且要说明「在做什么」而不是干等。
 */
export function SkeletonRows({
  rows = 3,
  label,
  className = "",
}: {
  rows?: number;
  label: string;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-live="polite">
      <p className="text-xs font-bold text-muted">{label}</p>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-work border border-line bg-panel p-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-subtle" />
            <div className="h-3 w-24 rounded bg-subtle" />
            <div className="h-3 w-16 rounded bg-subtle" />
          </div>
          <div className="mt-3 h-3 w-3/4 rounded bg-subtle" />
          <div className="mt-2 h-3 w-full rounded bg-subtle" />
          <div className="mt-2 h-3 w-5/6 rounded bg-subtle" />
        </div>
      ))}
    </div>
  );
}
