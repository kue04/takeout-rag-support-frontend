import { apiRequest } from "./client";
import type { OpsMetrics } from "../types/api";

const opsReadHeaders = {
  "X-Operator-Id": "supervisor_demo",
  "X-User-Role": "supervisor",
};

export async function getOpsMetrics() {
  return apiRequest<OpsMetrics>("/ops/metrics", {
    headers: opsReadHeaders,
  });
}
