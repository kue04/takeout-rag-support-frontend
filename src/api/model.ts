import { apiRequest } from "./client";
import type { ModelInfo } from "../types/api";

export async function getModelInfo(): Promise<ModelInfo> {
  return apiRequest<ModelInfo>("/model/info");
}
