import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest, buildOperatorHeaders } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("集中注入操作人 Header 并透传 AbortSignal", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/health", {
      role: "agent",
      operatorId: "agent_demo",
      signal,
    });

    expect(buildOperatorHeaders("agent", "agent_demo")).toEqual({
      "X-Operator-Id": "agent_demo",
      "X-User-Role": "agent",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/health",
      expect.objectContaining({
        signal,
        headers: expect.objectContaining({
          "X-Operator-Id": "agent_demo",
          "X-User-Role": "agent",
        }),
      }),
    );
  });
});
