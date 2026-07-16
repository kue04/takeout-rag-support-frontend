import { apiRequest } from "./client";
import type { OpsMetrics } from "../types/api";

export async function getOpsMetrics() {
  return apiRequest<OpsMetrics>("/ops/metrics", {
    role: "supervisor",
    operatorId: "supervisor_demo",
  });
}
