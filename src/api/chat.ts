import { apiRequest } from "./client";
import type {
  ChatHistoryResponse,
  ChatRequest,
  ChatResponse,
  ChatReviewActionRequest,
  ChatReviewActionResponse,
} from "../types/api";

const chatAgentHeaders = {
  "X-Operator-Id": "agent_demo",
  "X-User-Role": "agent",
};

export async function sendChatPrompt(payload: ChatRequest): Promise<ChatResponse> {
  return apiRequest<ChatResponse, ChatRequest>("/chat/prompt", {
    method: "POST",
    body: payload,
    headers: chatAgentHeaders,
  });
}

export async function getChatHistory(params: {
  user_id: string;
  order_id?: string | null;
  session_id?: string | null;
  limit?: number;
}): Promise<ChatHistoryResponse> {
  const query = new URLSearchParams({
    user_id: params.user_id,
    limit: String(params.limit ?? 50),
  });
  if (params.order_id) {
    query.set("order_id", params.order_id);
  }
  if (params.session_id) {
    query.set("session_id", params.session_id);
  }
  return apiRequest<ChatHistoryResponse>(`/chat/history?${query}`, {
    headers: chatAgentHeaders,
  });
}

export async function submitChatReviewAction(
  payload: ChatReviewActionRequest,
): Promise<ChatReviewActionResponse> {
  return apiRequest<ChatReviewActionResponse, ChatReviewActionRequest>("/chat/review-action", {
    method: "POST",
    body: payload,
    headers: {
      "X-Operator-Id": payload.operator_id ?? "demo_agent",
      "X-User-Role": payload.operator_role ?? "agent",
    },
  });
}
