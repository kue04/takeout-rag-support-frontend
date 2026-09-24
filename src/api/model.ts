import { apiRequest } from "./client";
import type { ModelInfo } from "../types/api";

/** 需要 `read:model_info_read`（仅 supervisor / qa / admin）。 */
export async function getModelInfo(): Promise<ModelInfo> {
  return apiRequest<ModelInfo>("/model/info");
}
