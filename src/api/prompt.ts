import { apiRequest } from "./client";
import type {
  PromptVersionItem,
  PromptVersionListResponse,
  PromptVersionPayload,
} from "../types/api";

/** 读需要 `read:prompt_read`（supervisor / qa / admin）。 */
export async function getActivePromptVersion(): Promise<PromptVersionItem> {
  return apiRequest<PromptVersionItem>("/prompt/active");
}

export async function listPromptVersions(limit = 10): Promise<PromptVersionListResponse> {
  return apiRequest<PromptVersionListResponse>("/prompt/versions", { query: { limit } });
}

/** 写需要 `write:prompt_write`（**仅 admin**）。 */
export async function createPromptVersion(body: PromptVersionPayload): Promise<PromptVersionItem> {
  return apiRequest<PromptVersionItem, PromptVersionPayload>("/prompt/versions", {
    method: "POST",
    body,
  });
}

export async function approvePromptVersion(
  id: number,
  evaluationResult = "",
): Promise<PromptVersionItem> {
  return apiRequest<PromptVersionItem, { status: "approved"; evaluation_result: string }>(
    `/prompt/versions/${id}/status`,
    { method: "POST", body: { status: "approved", evaluation_result: evaluationResult } },
  );
}

export async function activatePromptVersion(id: number): Promise<PromptVersionItem> {
  return apiRequest<PromptVersionItem>(`/prompt/versions/${id}/activate`, { method: "POST" });
}

export async function rollbackLatestPromptVersion(): Promise<PromptVersionItem> {
  return apiRequest<PromptVersionItem>("/prompt/rollback-latest", { method: "POST" });
}
