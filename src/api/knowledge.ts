import { apiRequest } from "./client";
import type {
  KnowledgeExportResponse,
  KnowledgeListResponse,
  KnowledgeOpsItem,
  KnowledgePayload,
  KnowledgePublishHistoryResponse,
  KnowledgePublishResponse,
} from "../types/api";

export async function listKnowledgeItems(params: {
  status?: string;
  category?: string;
  intent?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const query = new URLSearchParams({
    limit: String(params.limit ?? 20),
    offset: String(params.offset ?? 0),
  });
  for (const key of ["status", "category", "intent", "keyword"] as const) {
    if (params[key]) {
      query.set(key, params[key] ?? "");
    }
  }
  return apiRequest<KnowledgeListResponse>(`/knowledge/items?${query}`);
}

export async function createKnowledgeItem(body: KnowledgePayload) {
  return apiRequest<KnowledgeOpsItem, KnowledgePayload>("/knowledge/items", {
    method: "POST",
    body,
  });
}

export async function updateKnowledgeItem(id: number, body: KnowledgePayload) {
  return apiRequest<KnowledgeOpsItem, KnowledgePayload>(`/knowledge/items/${id}`, {
    method: "PUT",
    body,
  });
}

export async function archiveKnowledgeItem(id: number) {
  return apiRequest<KnowledgeOpsItem>(`/knowledge/items/${id}/archive`, { method: "POST" });
}

export async function reviewKnowledgeItem(id: number, status: "approved" | "rejected", review_note = "") {
  return apiRequest<KnowledgeOpsItem, { status: "approved" | "rejected"; review_note: string }>(
    `/knowledge/items/${id}/review`,
    {
      method: "POST",
      body: { status, review_note },
    },
  );
}

export async function exportApprovedKnowledge() {
  return apiRequest<KnowledgeExportResponse>("/knowledge/export-approved");
}

export async function publishApprovedKnowledge() {
  return apiRequest<KnowledgePublishResponse>("/knowledge/publish-approved", { method: "POST" });
}

export async function getKnowledgePublishHistory(limit = 20) {
  return apiRequest<KnowledgePublishHistoryResponse>(`/knowledge/publish-history?limit=${limit}`);
}

export async function rollbackLatestKnowledgePublish() {
  return apiRequest<KnowledgePublishResponse>("/knowledge/rollback-latest", { method: "POST" });
}
