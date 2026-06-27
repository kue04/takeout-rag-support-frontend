import { apiRequest } from "./client";
import type { ChatRequest, ChatResponse } from "../types/api";

export async function sendChatPrompt(payload: ChatRequest): Promise<ChatResponse> {
  return apiRequest<ChatResponse, ChatRequest>("/chat/prompt", {
    method: "POST",
    body: payload,
  });
}
