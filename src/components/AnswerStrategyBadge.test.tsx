import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnswerStrategyBadge } from "./AnswerStrategyBadge";

describe("AnswerStrategyBadge", () => {
  it.each([
    ["model_reply", "模型回答被保留"],
    ["composer_repair", "主证据规则修复"],
    ["safety_fallback", "安全兜底替换"],
  ] as const)("展示 %s 对应文案", (strategy, label) => {
    render(<AnswerStrategyBadge strategy={strategy} />);
    expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
  });
});
