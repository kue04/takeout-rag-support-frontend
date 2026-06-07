import { apiRequest } from "./client";
import type {
  RetrievalConfig,
  RetrievalPromptPreviewResponse,
  RetrievalSearchRequest,
  RetrievalSearchResponse,
} from "../types/api";

export async function getRetrievalConfig(): Promise<RetrievalConfig> {
  const response = await apiRequest<
    RetrievalConfig & {
      embedding_model_name?: string;
      reranker_model_name?: string;
      model_rerank_weight?: number;
      min_vector_score?: number;
    }
  >("/retrieval/config");

  return {
    ...response,
    embedding_model: response.embedding_model ?? response.embedding_model_name,
    reranker_model: response.reranker_model ?? response.reranker_model_name,
    rerank_weight: response.rerank_weight ?? response.model_rerank_weight,
    default_min_score: response.default_min_score ?? response.min_vector_score,
  };
}

export async function searchRetrieval(
  payload: RetrievalSearchRequest,
): Promise<RetrievalSearchResponse> {
  return apiRequest<RetrievalSearchResponse, RetrievalSearchRequest>("/retrieval/search", {
    method: "POST",
    body: payload,
  });
}

export async function previewRetrievalPrompt(
  payload: RetrievalSearchRequest,
): Promise<RetrievalPromptPreviewResponse> {
  return apiRequest<RetrievalPromptPreviewResponse, RetrievalSearchRequest>(
    "/retrieval/prompt-preview",
    {
      method: "POST",
      body: payload,
    },
  );
}
