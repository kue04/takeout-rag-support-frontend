import { apiRequest } from "./client";
import type { ReleaseChecklistResponse } from "../types/api";

export async function getReleaseChecklist() {
  return apiRequest<ReleaseChecklistResponse>("/release/checklist", {
    role: "supervisor",
    operatorId: "supervisor_demo",
  });
}
