import { describe, expect, it } from "vitest";

import { buildChatRequest } from "./buildChatRequest";

describe("buildChatRequest", () => {
  it("只发送裁剪后的原始问题和订单标识", () => {
    expect(
      buildChatRequest({
        question: "  我的订单什么时候送到？  ",
        userId: "user_1",
        orderId: "order_1",
        sessionId: "session_1",
      }),
    ).toEqual({
      message: "我的订单什么时候送到？",
      user_id: "user_1",
      order_id: "order_1",
      session_id: "session_1",
      channel: "web",
    });
  });
});
