import { apiRequest } from "./client";
import type { PromptVersionItem, PromptVersionListResponse, PromptVersionPayload } from "../types/api";

export async function getActivePromptVersion() {
  return apiRequest<PromptVersionItem>("/prompt/active", {
    role: "supervisor",
    operatorId: "supervisor_demo",
  });
}

export async function listPromptVersions(limit = 10) {
  return apiRequest<PromptVersionListResponse>(`/prompt/versions?limit=${limit}`, {
    role: "supervisor",
    operatorId: "supervisor_demo",
  });
}

export async function createPromptVersion(body: PromptVersionPayload) {
  return apiRequest<PromptVersionItem, PromptVersionPayload>("/prompt/versions", {
    method: "POST",
    body,
    role: "admin",
    operatorId: "admin_demo",
  });
}

export async function approvePromptVersion(id: number, evaluationResult = "") {
  return apiRequest<PromptVersionItem, { status: "approved"; evaluation_result: string }>(
    `/prompt/versions/${id}/status`,
    {
      method: "POST",
      body: { status: "approved", evaluation_result: evaluationResult },
      role: "admin",
      operatorId: "admin_demo",
    },
  );
}

export async function activatePromptVersion(id: number) {
  return apiRequest<PromptVersionItem>(`/prompt/versions/${id}/activate`, {
    method: "POST",
    role: "admin",
    operatorId: "admin_demo",
  });
}

export async function rollbackLatestPromptVersion() {
  return apiRequest<PromptVersionItem>("/prompt/rollback-latest", {
    method: "POST",
    role: "admin",
    operatorId: "admin_demo",
  });
}
