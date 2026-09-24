import { apiRequest } from "./client";
import type {
  ExportEvalCaseResponse,
  FeedbackRequest,
  FeedbackResponse,
  RecentFeedbackResponse,
} from "../types/api";

export async function submitFeedback(body: FeedbackRequest): Promise<FeedbackResponse> {
  return apiRequest<FeedbackResponse, FeedbackRequest>("/feedback", { method: "POST", body });
}

/** 需要 `read:feedback_read` —— **agent 角色没有这个 scope**。 */
export async function getRecentFeedback(limit = 5): Promise<RecentFeedbackResponse> {
  return apiRequest<RecentFeedbackResponse>("/feedback/recent", {
    query: { helpful: false, limit },
  });
}

export async function exportEvalCase(feedbackId: number): Promise<ExportEvalCaseResponse> {
  return apiRequest<ExportEvalCaseResponse, { feedback_id: number }>(
    "/feedback/export-eval-case",
    { method: "POST", body: { feedback_id: feedbackId } },
  );
}
