import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RetrievalOriginBadge } from "./RetrievalOriginBadge";

describe("RetrievalOriginBadge", () => {
  it.each([
    ["dense+lexical", "双路命中"],
    ["lexical", "BM25 补召回"],
    ["dense", "Dense only"],
    ["intent_hint_supplement", "规则补召回"],
  ])("将 %s 显示为 %s", (origin, label) => {
    render(<RetrievalOriginBadge origin={origin} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
