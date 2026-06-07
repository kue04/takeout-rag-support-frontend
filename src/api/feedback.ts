import { apiRequest } from "./client";
import type { ExportEvalCaseResponse, FeedbackRequest, RecentFeedbackResponse } from "../types/api";

export async function submitFeedback(body: FeedbackRequest) {
  return apiRequest<{ feedback_id: number; saved: boolean }, FeedbackRequest>("/feedback", {
    method: "POST",
    body,
  });
}

export async function getRecentFeedback() {
  return apiRequest<RecentFeedbackResponse>("/feedback/recent?helpful=false&limit=5");
}

export async function exportEvalCase(feedbackId: number) {
  return apiRequest<ExportEvalCaseResponse, { feedback_id: number }>("/feedback/export-eval-case", {
    method: "POST",
    body: { feedback_id: feedbackId },
  });
}
