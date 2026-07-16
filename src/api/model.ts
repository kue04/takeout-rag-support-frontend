import { apiRequest } from "./client";
import type { ModelInfo } from "../types/api";

const modelReadHeaders = {
  "X-Operator-Id": "supervisor_demo",
  "X-User-Role": "supervisor",
};

export async function getModelInfo(): Promise<ModelInfo> {
  return apiRequest<ModelInfo>("/model/info", {
    headers: modelReadHeaders,
  });
}
