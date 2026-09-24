import { apiRequest } from "./client";
import type { ReleaseChecklistResponse } from "../types/api";

/**
 * 只读发布检查。需要 `read:release_read`（supervisor / qa / admin）。
 *
 * ⚠️ 后端阶段 7（发布门禁）尚未完成 → **不要预设它已通过**，
 * 界面必须原样展示 `ready / failed_count / warning_count`。
 */
export async function getReleaseChecklist(): Promise<ReleaseChecklistResponse> {
  return apiRequest<ReleaseChecklistResponse>("/release/checklist");
}
