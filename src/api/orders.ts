import { apiRequest } from "./client";
import type { OrderStatePayload } from "../types/api";

export async function saveOrderState(payload: OrderStatePayload) {
  return apiRequest<OrderStatePayload, OrderStatePayload>(`/orders/${payload.order_id}/state`, {
    method: "PUT",
    body: payload,
  });
}
