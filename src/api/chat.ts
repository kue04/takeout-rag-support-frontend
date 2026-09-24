import { apiRequest } from "./client";
import type {
  ApiChatRequest,
  ChatHistoryResponse,
  ChatResponse,
  ChatReviewActionRequest,
  ChatReviewActionResponse,
} from "../types/api";

/**
 * 身份只来自 `Authorization: Bearer <JWT>`（client.ts 统一注入）。
 * 这里**不再**发 `X-Operator-Id` / `X-User-Role` —— 后端已彻底忽略它们。
 */
export async function sendChatPrompt(payload: ApiChatRequest): Promise<ChatResponse> {
  return apiRequest<ChatResponse, ApiChatRequest>("/chat/prompt", {
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
  return apiRequest<ChatHistoryResponse>("/chat/history", {
    query: {
      user_id: params.user_id,
      order_id: params.order_id,
      session_id: params.session_id,
      limit: params.limit ?? 50,
    },
  });
}

/**
 * 注意：`operator_id` / `operator_role` 不再由前端指定。
 * 后端从令牌 `sub` / `roles` 取身份，前端传什么都不会被采信（防自报提权）。
 */
export async function submitChatReviewAction(
  payload: ChatReviewActionRequest,
): Promise<ChatReviewActionResponse> {
  const { operator_id: _operatorId, operator_role: _operatorRole, ...rest } = payload;
  return apiRequest<ChatReviewActionResponse, ChatReviewActionRequest>("/chat/review-action", {
    method: "POST",
    body: rest,
  });
}
