import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RerankerStatus } from "./RerankerStatus";
import type { RetrievalResult } from "../types/api";

const degradedResult = {
  rank: 1,
  score: 0.8,
  rerank_score: 0.8,
  model_rerank_score: 0,
  vector_score: 0.8,
  keyword_bonus: 0,
  direction_penalty: 0,
  category: "退款",
  intent: "退款进度",
  question: "多久到账",
  answer: "查看订单",
  role: "primary",
  evidence_strength: "normal",
  display_title: "退款进度",
  evidence_summary: "查看订单",
  prompt_instruction: "",
  source_question: "多久到账",
  source_answer: "查看订单",
  reranker_degraded: true,
  reranker_error: "model timeout",
} satisfies RetrievalResult;

describe("RerankerStatus", () => {
  it("普通客服只看到降级状态", () => {
    render(<RerankerStatus results={[degradedResult]} showInternalError={false} />);
    expect(screen.getByText(/Reranker 已降级/)).toBeInTheDocument();
    expect(screen.queryByText("model timeout")).not.toBeInTheDocument();
  });

  it("内部角色可以看到异常文本", () => {
    render(<RerankerStatus results={[degradedResult]} showInternalError />);
    expect(screen.getByText("model timeout")).toBeInTheDocument();
  });
});
