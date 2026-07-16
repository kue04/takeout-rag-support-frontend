import { apiRequest } from "./client";
import type { AuditLogListResponse } from "../types/api";

const auditReadHeaders = {
  "X-Operator-Id": "qa_demo",
  "X-User-Role": "qa",
};

export async function getAuditLogs(limit = 8) {
  return apiRequest<AuditLogListResponse>(`/audit/logs?limit=${limit}`, {
    headers: auditReadHeaders,
  });
}
