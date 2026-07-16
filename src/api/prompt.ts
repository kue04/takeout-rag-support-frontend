import { apiRequest } from "./client";
import type { PromptVersionItem, PromptVersionListResponse, PromptVersionPayload } from "../types/api";

const promptReadHeaders = {
  "X-Operator-Id": "supervisor_demo",
  "X-User-Role": "supervisor",
};

const promptWriteHeaders = {
  "X-Operator-Id": "admin_demo",
  "X-User-Role": "admin",
};

export async function getActivePromptVersion() {
  return apiRequest<PromptVersionItem>("/prompt/active", {
    headers: promptReadHeaders,
  });
}

export async function listPromptVersions(limit = 10) {
  return apiRequest<PromptVersionListResponse>(`/prompt/versions?limit=${limit}`, {
    headers: promptReadHeaders,
  });
}

export async function createPromptVersion(body: PromptVersionPayload) {
  return apiRequest<PromptVersionItem, PromptVersionPayload>("/prompt/versions", {
    method: "POST",
    body,
    headers: promptWriteHeaders,
  });
}

export async function approvePromptVersion(id: number, evaluationResult = "") {
  return apiRequest<PromptVersionItem, { status: "approved"; evaluation_result: string }>(
    `/prompt/versions/${id}/status`,
    {
      method: "POST",
      body: { status: "approved", evaluation_result: evaluationResult },
      headers: promptWriteHeaders,
    },
  );
}

export async function activatePromptVersion(id: number) {
  return apiRequest<PromptVersionItem>(`/prompt/versions/${id}/activate`, {
    method: "POST",
    headers: promptWriteHeaders,
  });
}

export async function rollbackLatestPromptVersion() {
  return apiRequest<PromptVersionItem>("/prompt/rollback-latest", {
    method: "POST",
    headers: promptWriteHeaders,
  });
}
