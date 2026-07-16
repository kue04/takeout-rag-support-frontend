import { apiRequest } from "./client";
import type {
  KnowledgeExportResponse,
  KnowledgeListResponse,
  KnowledgeOpsItem,
  KnowledgePayload,
  KnowledgePublishHistoryResponse,
  KnowledgePublishResponse,
} from "../types/api";

const knowledgeWriteHeaders = {
  "X-Operator-Id": "knowledge_ops_demo",
  "X-User-Role": "knowledge_ops",
};

const knowledgeReadHeaders = {
  "X-Operator-Id": "knowledge_ops_demo",
  "X-User-Role": "knowledge_ops",
};

const knowledgeRollbackHeaders = {
  "X-Operator-Id": "admin_demo",
  "X-User-Role": "admin",
};

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
  return apiRequest<KnowledgeListResponse>(`/knowledge/items?${query}`, {
    headers: knowledgeReadHeaders,
  });
}

export async function createKnowledgeItem(body: KnowledgePayload) {
  return apiRequest<KnowledgeOpsItem, KnowledgePayload>("/knowledge/items", {
    method: "POST",
    body,
    headers: knowledgeWriteHeaders,
  });
}

export async function updateKnowledgeItem(id: number, body: KnowledgePayload) {
  return apiRequest<KnowledgeOpsItem, KnowledgePayload>(`/knowledge/items/${id}`, {
    method: "PUT",
    body,
    headers: knowledgeWriteHeaders,
  });
}

export async function archiveKnowledgeItem(id: number) {
  return apiRequest<KnowledgeOpsItem>(`/knowledge/items/${id}/archive`, {
    method: "POST",
    headers: knowledgeWriteHeaders,
  });
}

export async function reviewKnowledgeItem(id: number, status: "pending_review" | "approved" | "rejected", review_note = "") {
  return apiRequest<KnowledgeOpsItem, { status: "pending_review" | "approved" | "rejected"; review_note: string }>(
    `/knowledge/items/${id}/review`,
    {
      method: "POST",
      body: { status, review_note },
      headers: knowledgeWriteHeaders,
    },
  );
}

export async function exportApprovedKnowledge() {
  return apiRequest<KnowledgeExportResponse>("/knowledge/export-approved", {
    headers: knowledgeReadHeaders,
  });
}

export async function publishApprovedKnowledge() {
  return apiRequest<KnowledgePublishResponse>("/knowledge/publish-approved", {
    method: "POST",
    headers: knowledgeWriteHeaders,
  });
}

export async function getKnowledgePublishHistory(limit = 20) {
  return apiRequest<KnowledgePublishHistoryResponse>(`/knowledge/publish-history?limit=${limit}`, {
    headers: knowledgeReadHeaders,
  });
}

export async function rollbackLatestKnowledgePublish() {
  return apiRequest<KnowledgePublishResponse>("/knowledge/rollback-latest", {
    method: "POST",
    headers: knowledgeRollbackHeaders,
  });
}
