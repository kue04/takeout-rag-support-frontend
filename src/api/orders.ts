import { apiRequest } from "./client";
import type { OrderStatePayload } from "../types/api";

const orderWriteHeaders = {
  "X-Operator-Id": "agent_demo",
  "X-User-Role": "agent",
};

export async function saveOrderState(payload: OrderStatePayload) {
  return apiRequest<OrderStatePayload, OrderStatePayload>(`/orders/${payload.order_id}/state`, {
    method: "PUT",
    body: payload,
    headers: orderWriteHeaders,
  });
}
