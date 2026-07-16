import type { KnowledgeOpsItem } from "../../types/api";

export type KnowledgeRuntimeStatus = {
  label: "未生效" | "当前有效" | "已过期" | "已归档";
  className: string;
};

export function getKnowledgeRuntimeStatus(
  item: KnowledgeOpsItem,
  now = new Date(),
  latestVersion = item.version,
): KnowledgeRuntimeStatus {
  if (["archived", "rollback", "rejected"].includes(item.status) || item.version < latestVersion) {
    return { label: "已归档", className: "bg-slate-100 text-slate-600" };
  }

  const effectiveAt = parseDate(item.effective_at);
  if (["draft", "pending_review"].includes(item.status) || (effectiveAt && effectiveAt > now)) {
    return { label: "未生效", className: "bg-amber-50 text-amber-800" };
  }

  const expiredAt = parseDate(item.expired_at);
  if (expiredAt && expiredAt <= now) {
    return { label: "已过期", className: "bg-red-50 text-red-700" };
  }

  return { label: "当前有效", className: "bg-emerald-50 text-emerald-700" };
}

function parseDate(value: string) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
