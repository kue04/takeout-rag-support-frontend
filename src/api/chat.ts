import { apiRequest } from "./client";
import type { ChatResponse } from "../types/api";

export async function sendChatPrompt(message: string): Promise<ChatResponse> {
  return apiRequest<ChatResponse, { message: string }>("/chat/prompt", {
    method: "POST",
    body: { message },
  });
}
