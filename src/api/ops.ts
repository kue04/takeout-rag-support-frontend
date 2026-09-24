import { apiRequest } from "./client";
import type { OpsMetrics } from "../types/api";

/**
 * 需要 `read:ops_metrics_read`（仅 supervisor / qa / admin）。
 *
 * ⚠️ 口径提醒：这是 **A 轨 chat 会话维度**的 23 个计数，**不是**规范 §10.4
 * 「5 分钟 / 滚动 24 小时、按阶段与配置切片」的 D01–D24。
 * 展示时必须标注来源与样本量，不能当 D 指标的实现。
 */
export async function getOpsMetrics(): Promise<OpsMetrics> {
  return apiRequest<OpsMetrics>("/ops/metrics");
}
