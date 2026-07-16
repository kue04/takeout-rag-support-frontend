import type { ChatRequest } from "../../types/api";

type BuildChatRequestInput = {
  question: string;
  userId: string;
  orderId: string;
  sessionId: string | null;
};

export function buildChatRequest({
  question,
  userId,
  orderId,
  sessionId,
}: BuildChatRequestInput): ChatRequest {
  return {
    message: question.trim(),
    user_id: userId,
    order_id: orderId,
    session_id: sessionId,
    channel: "web",
  };
}
