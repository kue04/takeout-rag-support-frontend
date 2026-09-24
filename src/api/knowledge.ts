import { apiRequest } from "./client";
import type {
  KnowledgeExportResponse,
  KnowledgeItem,
  KnowledgeListResponse,
  KnowledgePayload,
  KnowledgePublishHistoryResponse,
  KnowledgePublishResponse,
  KnowledgeReviewRequest,
} from "../types/api";

/**
 * 知识库**运营**这条线（`knowledge_ops.db` 里的知识条目）。
 *
 * 注意区分 B7 拆开的三条「发布」：
 * - 本文件里的 `publish-approved` / `rollback-latest` 是**知识条目发布**（A 轨，种子 FAQ）；
 * - **文档版本发布没有接口**，由接入流水线在 `published` 阶段自动完成；
 * - **chunk 索引重建**是 `POST /ingestion/indexes/rebuild`（见 api/retrieval.ts）。
 */
export async function listKnowledgeItems(
  params: {
    status?: string;
    category?: string;
    intent?: string;
    keyword?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<KnowledgeListResponse> {
  return apiRequest<KnowledgeListResponse>("/knowledge/items", {
    query: {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      status: params.status,
      category: params.category,
      intent: params.intent,
      keyword: params.keyword,
    },
  });
}

export async function createKnowledgeItem(body: KnowledgePayload): Promise<KnowledgeItem> {
  return apiRequest<KnowledgeItem, KnowledgePayload>("/knowledge/items", {
    method: "POST",
    body,
  });
}

export async function updateKnowledgeItem(id: number, body: KnowledgePayload): Promise<KnowledgeItem> {
  return apiRequest<KnowledgeItem, KnowledgePayload>(`/knowledge/items/${id}`, {
    method: "PUT",
    body,
  });
}

export async function archiveKnowledgeItem(id: number): Promise<KnowledgeItem> {
  return apiRequest<KnowledgeItem>(`/knowledge/items/${id}/archive`, { method: "POST" });
}

export async function reviewKnowledgeItem(
  id: number,
  status: string,
  review_note = "",
): Promise<KnowledgeItem> {
  return apiRequest<KnowledgeItem, KnowledgeReviewRequest>(`/knowledge/items/${id}/review`, {
    method: "POST",
    body: { status, review_note },
  });
}

export async function exportApprovedKnowledge(): Promise<KnowledgeExportResponse> {
  return apiRequest<KnowledgeExportResponse>("/knowledge/export-approved");
}

export async function publishApprovedKnowledge(): Promise<KnowledgePublishResponse> {
  return apiRequest<KnowledgePublishResponse>("/knowledge/publish-approved", { method: "POST" });
}

export async function getKnowledgePublishHistory(
  limit = 20,
): Promise<KnowledgePublishHistoryResponse> {
  return apiRequest<KnowledgePublishHistoryResponse>("/knowledge/publish-history", {
    query: { limit },
  });
}

/** 需要 `write:knowledge_rollback`（supervisor / admin）。 */
export async function rollbackLatestKnowledgePublish(): Promise<KnowledgePublishResponse> {
  return apiRequest<KnowledgePublishResponse>("/knowledge/rollback-latest", { method: "POST" });
}
