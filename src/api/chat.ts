import { apiRequest } from "./client";
import type { ChatHistoryResponse, ChatRequest, ChatResponse } from "../types/api";

export async function sendChatPrompt(payload: ChatRequest): Promise<ChatResponse> {
  return apiRequest<ChatResponse, ChatRequest>("/chat/prompt", {
    method: "POST",
    body: payload,
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
  return apiRequest<ChatHistoryResponse>(`/chat/history?${query}`);
}
