import { apiRequest } from "./client";
import type { OrderStatePayload, OrderStateResponse } from "../types/api";

/** 需要 `write:order_state_upsert`（agent / supervisor / admin）。 */
export async function saveOrderState(payload: OrderStatePayload): Promise<OrderStateResponse> {
  return apiRequest<OrderStateResponse, OrderStatePayload>(
    `/orders/${encodeURIComponent(payload.order_id)}/state`,
    { method: "PUT", body: payload },
  );
}
