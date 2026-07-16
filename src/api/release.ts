import { apiRequest } from "./client";
import type { ReleaseChecklistResponse } from "../types/api";

const releaseReadHeaders = {
  "X-Operator-Id": "supervisor_demo",
  "X-User-Role": "supervisor",
};

export async function getReleaseChecklist() {
  return apiRequest<ReleaseChecklistResponse>("/release/checklist", {
    headers: releaseReadHeaders,
  });
}
