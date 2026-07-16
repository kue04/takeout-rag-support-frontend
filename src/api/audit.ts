import { apiRequest } from "./client";
import type { AuditLogListResponse } from "../types/api";

export async function getAuditLogs(limit = 8) {
  return apiRequest<AuditLogListResponse>(`/audit/logs?limit=${limit}`, {
    role: "qa",
    operatorId: "qa_demo",
  });
}
