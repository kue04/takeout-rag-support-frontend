const originMeta: Record<string, { label: string; className: string }> = {
  "dense+lexical": { label: "双路命中", className: "bg-emerald-50 text-emerald-700" },
  lexical: { label: "BM25 补召回", className: "bg-blue-50 text-blue-700" },
  dense: { label: "Dense only", className: "bg-slate-100 text-slate-600" },
  intent_hint_supplement: { label: "规则补召回", className: "bg-amber-50 text-amber-800" },
};

export function RetrievalOriginBadge({ origin }: { origin?: string }) {
  const meta = originMeta[origin || "dense"] ?? {
    label: origin || "Dense only",
    className: "bg-slate-100 text-slate-600",
  };
  return <span className={`rounded-full px-2 py-1 text-[11px] font-black ${meta.className}`}>{meta.label}</span>;
}
