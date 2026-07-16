import { describe, expect, it } from "vitest";

import { getKnowledgeRuntimeStatus } from "./knowledgeRuntimeStatus";
import type { KnowledgeOpsItem } from "../../types/api";

const now = new Date("2026-07-16T12:00:00Z");
const baseItem: KnowledgeOpsItem = {
  id: 1,
  base_id: "kb_1",
  version: 2,
  title: "退款",
  question: "多久到账",
  answer: "查看订单",
  category: "退款",
  intent: "退款进度",
  status: "published",
  owner: "knowledge_ops",
  source: "knowledge_ops",
  effective_at: "",
  expired_at: "",
  review_note: "",
  created_at: "",
  updated_at: "",
  reviewed_at: "",
};

describe("getKnowledgeRuntimeStatus", () => {
  it("区分未生效、当前有效、已过期和已归档", () => {
    expect(getKnowledgeRuntimeStatus({ ...baseItem, effective_at: "2026-07-16T12:01:00Z" }, now).label).toBe("未生效");
    expect(getKnowledgeRuntimeStatus(baseItem, now).label).toBe("当前有效");
    expect(getKnowledgeRuntimeStatus({ ...baseItem, expired_at: "2026-07-16T12:00:00Z" }, now).label).toBe("已过期");
    expect(getKnowledgeRuntimeStatus({ ...baseItem, status: "archived" }, now).label).toBe("已归档");
  });

  it("历史版本不能显示为当前有效", () => {
    expect(getKnowledgeRuntimeStatus({ ...baseItem, version: 1 }, now, 2).label).toBe("已归档");
  });
});
