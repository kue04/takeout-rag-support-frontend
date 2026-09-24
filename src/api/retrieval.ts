import { apiRequest } from "./client";
import type {
  ChunkRetrievalRequest,
  ChunkRetrievalResponse,
  IndexRebuildResponse,
  PromptPreviewResponse,
  RetrievalConfig,
  RetrievalSearchRequest,
  RetrievalSearchResponse,
} from "../types/api";

/** 正式路径（chunk 级 · 服务端权限过滤）。**请求体没有 `mode`。** */
export async function searchChunks(
  payload: ChunkRetrievalRequest,
): Promise<ChunkRetrievalResponse> {
  return apiRequest<ChunkRetrievalResponse, ChunkRetrievalRequest>("/retrieval/search", {
    method: "POST",
    body: payload,
  });
}

/**
 * 演示路径（A 轨 · 种子 FAQ，**无权限过滤**）。
 * 这是 B7 之前 `/retrieval/search` 的行为，现在搬到了 `-demo` 后缀上。
 */
export async function searchRetrievalDemo(
  payload: RetrievalSearchRequest,
): Promise<RetrievalSearchResponse> {
  return apiRequest<RetrievalSearchResponse, RetrievalSearchRequest>("/retrieval/search-demo", {
    method: "POST",
    body: payload,
  });
}

export async function previewRetrievalPrompt(
  payload: RetrievalSearchRequest,
): Promise<PromptPreviewResponse> {
  return apiRequest<PromptPreviewResponse, RetrievalSearchRequest>("/retrieval/prompt-preview", {
    method: "POST",
    body: payload,
  });
}

/** 返回的是 A 轨（种子 FAQ）配置，不是 chunk 索引配置。 */
export async function getRetrievalConfig(): Promise<RetrievalConfig> {
  return apiRequest<RetrievalConfig>("/retrieval/config");
}

/** 重建全局 chunk 索引。需要 `index:rebuild`（仅 supervisor / admin）。 */
export async function rebuildChunkIndex(): Promise<IndexRebuildResponse> {
  return apiRequest<IndexRebuildResponse>("/ingestion/indexes/rebuild", { method: "POST" });
}
