import type { RetrievalResult } from "../types/api";

export function RerankerStatus({
  results,
  showInternalError,
}: {
  results: RetrievalResult[];
  showInternalError: boolean;
}) {
  const degradedResult = results.find((item) => item.reranker_degraded);
  if (!degradedResult) {
    return null;
  }

  return (
    <div className="mb-3 rounded-work border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
      <p>Reranker 已降级，当前保留基础检索排序。</p>
      {showInternalError && degradedResult.reranker_error ? (
        <p className="mt-1 break-all font-normal">{degradedResult.reranker_error}</p>
      ) : null}
    </div>
  );
}
