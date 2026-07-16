import { apiRequest } from "./client";
import type { ExportEvalCaseResponse, FeedbackRequest, RecentFeedbackResponse } from "../types/api";

const feedbackWriteHeaders = {
  "X-Operator-Id": "agent_demo",
  "X-User-Role": "agent",
};

const feedbackReadHeaders = {
  "X-Operator-Id": "qa_demo",
  "X-User-Role": "qa",
};

export async function submitFeedback(body: FeedbackRequest) {
  return apiRequest<{ feedback_id: number; saved: boolean }, FeedbackRequest>("/feedback", {
    method: "POST",
    body,
    headers: feedbackWriteHeaders,
  });
}

export async function getRecentFeedback() {
  return apiRequest<RecentFeedbackResponse>("/feedback/recent?helpful=false&limit=5", {
    headers: feedbackReadHeaders,
  });
}

export async function exportEvalCase(feedbackId: number) {
  return apiRequest<ExportEvalCaseResponse, { feedback_id: number }>("/feedback/export-eval-case", {
    method: "POST",
    body: { feedback_id: feedbackId },
    headers: feedbackWriteHeaders,
  });
}
