# RAG Full-stack V2 前端同步计划

## 1. 文档关系

完整主计划：

~~~text
D:\llm\llm-customer-service\docs\FULLSTACK_RAG_IMPROVEMENT_PLAN.md
~~~

本文件只记录 D:\llm\front 必须与后端同步完成的交付项。任何后端 Schema 变化都必须先重新导出 OpenAPI，再生成 TypeScript 类型。

## 2. 契约同步命令

后端：

~~~powershell
cd D:\llm\llm-customer-service
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
.\venv\Scripts\python.exe scripts\export_openapi.py --output docs\openapi.json
~~~

前端：

~~~powershell
cd D:\llm\front
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
npm run types:api
npm run test
npm run build
~~~

只有三条命令全部成功，契约同步才算完成。

## 3. 前端文件级改造清单

### src/api/client.ts

- [ ] 集中构造 X-User-Role 和 X-Operator-Id。
- [ ] apiRequest 支持 AbortSignal。
- [ ] ApiError 增加 code、retryable 和 requestId。
- [ ] 不再让每个 API 文件复制身份 Header。

### src/api/chat.ts

- [ ] sendChatPrompt 保留非流式 fallback。
- [ ] 删除模块内硬编码 chatAgentHeaders。
- [ ] 新增 streamChatPrompt 到独立 chatStream.ts。

### src/api/chatStream.ts

- [ ] 解析 trace、delta、final、error 四种 SSE。
- [ ] 支持跨 chunk event。
- [ ] 支持 AbortController。
- [ ] final 只处理一次。
- [ ] high-risk 响应没有 delta 时保持等待态。

### src/api/retrieval.ts

- [ ] mode 改为 dense | hybrid。
- [ ] 旧 vector 仅在本地状态迁移时转换为 dense。
- [ ] search 和 preview 只供检索实验室主动调用。
- [ ] 正常聊天流程不得调用这两个接口。

### src/types/api.ts

- [ ] 改为引用 openapi.generated.ts。
- [ ] 删除手写复制的后端响应字段。
- [ ] 页面内部 ViewModel 可以保留。

新增或同步字段：

~~~text
answer_strategy
original_query
rewritten_query
query_rewrite_applied
query_rewrite_reason
dense_rank
lexical_rank
dense_score
lexical_score
rrf_score
retrieval_origin
reranker_degraded
reranker_error
answer_plan_applied
answer_claims
citation_validation
agent_enabled
agent_retry_count
agent_nodes
tool_plan
evidence_assessment
~~~

### src/App.tsx

- [ ] sendSupportMessage 不再调用 buildOrderContextMessage 生成 message。
- [ ] message 只发送用户原问题。
- [ ] 先保存 order state，再发 chat。
- [ ] 删除 chat/search/preview 的 Promise.allSettled。
- [ ] 正常聊天只调用一次 chat。
- [ ] 用 ChatResponse.retrieved_items 更新结果。
- [ ] 用 ChatResponse.final_prompt 更新诊断。
- [ ] 流式状态迁入 useSupportChat。

### src/features/support/buildChatRequest.ts

- [ ] 创建纯函数构造 ChatRequest。
- [ ] 测试 message 不包含订单号、金额、店铺和商品。
- [ ] 测试 session_id、user_id、order_id 原样传递。

### src/features/support/useSupportChat.ts

- [ ] 管理用户消息。
- [ ] 管理 assistant 流式草稿。
- [ ] 管理 AbortController。
- [ ] 增量接收 trace。
- [ ] final 到达后替换草稿。
- [ ] 更新 session_id。
- [ ] 未收到 delta 的网络失败回退非流式接口。
- [ ] 已收到 delta 后失败不自动重试。

### src/features/support/SupportView.tsx

- [ ] 增加停止生成按钮。
- [ ] high risk 显示“正在执行安全校验”。
- [ ] Timeline 显示 query_rewritten。
- [ ] Timeline 区分 Agent Node 与普通 Trace。
- [ ] Tools Tab 区分 Planned、Executed、Skipped、Policy removed。
- [ ] Evidence Tab 增加 Claim-Evidence 双向高亮。
- [ ] Raw JSON 只对有权限角色显示。

### src/components/RetrievalPanel.tsx

- [ ] 显示 Dense rank。
- [ ] 显示 BM25 rank。
- [ ] 显示 RRF score。
- [ ] 显示 CrossEncoder score。
- [ ] 显示 retrieval_origin。
- [ ] Reranker 降级时显示醒目标识。
- [ ] mode 文案改为 dense/hybrid。

### src/components/DiagnosticsPanel.tsx

- [ ] 显示 answer_strategy。
- [ ] 显示 original/rewritten query。
- [ ] 显示索引 manifest 状态。
- [ ] 显示 Claim support status。
- [ ] 显示 Agent retry count。
- [ ] 不从 prompt-preview 混用另一条请求的证据。

### src/components/ModelInfoBar.tsx

- [ ] 显示 embedding 和 reranker。
- [ ] 显示索引文档数、维度、预处理版本、构建时间。
- [ ] 显示前端 commit 和后端 commit。
- [ ] manifest 不兼容时显示 fail。

### src/features/knowledge/KnowledgeOpsView.tsx

- [ ] 表单增加 effective_at。
- [ ] 表单增加 expired_at。
- [ ] 列表显示未生效、有效、已过期、归档。
- [ ] 支持查看同一 base_id 的版本历史。
- [ ] 增加评测候选 Tab。
- [ ] 支持 approve、reject、promote。
- [ ] promote 前二次确认。

### Release 页面

- [ ] 显示 Prompt version。
- [ ] 显示 Knowledge publish version。
- [ ] 显示 Vector manifest。
- [ ] 显示前后端 commit。
- [ ] 显示 Recall@3、MRR。
- [ ] 显示 Grounding strict pass。
- [ ] 显示 Evidence coverage。
- [ ] 显示 High-risk pass。
- [ ] 显示 Forbidden hits。
- [ ] ready=false 时列出全部阻断项。

## 4. 前端测试文件

必须新增：

~~~text
src/api/client.test.ts
src/api/chatStream.test.ts
src/features/support/buildChatRequest.test.ts
src/features/support/useSupportChat.test.tsx
src/components/RetrievalPanel.test.tsx
src/components/DiagnosticsPanel.test.tsx
src/features/knowledge/KnowledgeOpsView.test.tsx
~~~

关键测试：

1. ChatRequest.message 只包含原问题。
2. 一次聊天只触发一个 chat 请求。
3. SSE event 跨多个 chunk 仍能解析。
4. Abort 后不再追加 delta。
5. high risk 不调用 onDelta。
6. final 替换流式草稿。
7. Hybrid 卡片显示 Dense/BM25/RRF。
8. query rewrite 不改变聊天气泡中的用户原文。
9. Claim 点击后高亮对应 evidence。
10. Release fail 项正确显示。

## 5. 每个里程碑的前端验收命令

~~~powershell
cd D:\llm\front
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
npm run types:api
npm run test
npm run build
~~~

三条命令任一失败，不允许开始下一里程碑。

## 6. 浏览器联调验收

- [ ] Network 中一次发送只出现一个 chat 请求。
- [ ] 请求 message 是原始问题。
- [ ] order_id 单独存在。
- [ ] low risk 能流式展示。
- [ ] high risk 没有未经校验的 token。
- [ ] 停止生成生效。
- [ ] Retrieval 展示双路分数。
- [ ] Query Rewrite 可展开查看。
- [ ] Claim 可以定位 Evidence。
- [ ] Agent 二次检索显示 attempt=2。
- [ ] 写工具永远需要人工操作。
- [ ] Release 页面显示两仓 commit 和当前指纹。

## 7. 实施记录

### 2026-07-16：里程碑 1 前端契约与聊天链路

- 新增 `openapi/openapi.json` 契约快照、`scripts/sync-openapi.mjs` 和 `src/types/openapi.generated.ts`。
- `ChatRequest`、Retrieval 请求/响应及检索结果类型开始改为 OpenAPI generated aliases。
- `apiRequest` 集中处理操作人 Header，并支持 `AbortSignal` 透传；各 API 模块不再重复拼 Header。
- 新增 `buildChatRequest`，保证 `message` 等于裁剪后的原始问题，订单事实仅通过 `order_id` 传递。
- 普通客服聊天已删除并行 `/retrieval/search` 和 `/retrieval/prompt-preview` 调用，证据展示改用 `/chat/prompt` 返回的 `retrieved_items`。
- 新增 Vitest 基础设施及两个目标测试：请求构造、Header/AbortSignal。
- 验收命令：`npm run types:api`、`npm run test`、`npm run build`。
