import { apiRequest } from "./client";
import type { AuditLogListResponse } from "../types/api";

/** 需要 `read:audit_read`（仅 supervisor / qa / admin）。 */
export async function getAuditLogs(limit = 8): Promise<AuditLogListResponse> {
  return apiRequest<AuditLogListResponse>("/audit/logs", { query: { limit } });
}
