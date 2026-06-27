# 外卖客服 RAG 调试台

这是一个面向外卖客服 RAG 系统学习和联调的前端工作台，技术栈为 Vite + React + TypeScript + Tailwind CSS + lucide-react。

## 当前能力

- 外卖业务模拟：门店、购物车、订单、订单详情和订单售后入口。
- 订单客服：从订单详情进入客服，对话请求会携带 `user_id`、`session_id`、`order_id` 和订单上下文。
- 持久化客服：订单状态会写入后端 `/orders/{order_id}/state`，客服页重新打开会通过 `/chat/history` 恢复历史消息和最近诊断。
- 诊断面板：客服页右侧提供 `流程时间线`、`工具调用`、`证据溯源`、`上下文记忆`、`原始 JSON` 5 个 tab。
- 回复依据：客服回复下方展示主证据、引用片段、订单工具结果、规则兜底或人工接管状态。
- 演示场景：客服页侧边栏支持切换未接单、商家制作、骑手取餐、已送达等预置订单状态。
- 反馈闭环：支持有帮助/无帮助反馈、bad case 和 eval case 导出。

## 启动

```bash
npm install
npm run dev
```

默认访问：

```text
http://127.0.0.1:5173/
```

## API 对接

默认后端地址：

```text
http://127.0.0.1:8000
```

可通过 `.env` 覆盖：

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

当前前端使用的接口：

- `POST /chat/prompt`
- `GET /chat/history`
- `PUT /orders/{order_id}/state`
- `GET /model/info`
- `GET /retrieval/config`
- `POST /retrieval/search`
- `POST /retrieval/prompt-preview`
- `GET /examples/categories`
- `GET /examples/by-category?category=退款售后&limit=5`
- `POST /examples/search`

`POST /chat/prompt` 请求体会发送：

```json
{
  "message": "带订单上下文的用户问题",
  "user_id": "demo_user_xxx",
  "session_id": "可选，会话接续时传入",
  "order_id": "订单号"
}
```

前端会兼容旧字段，并优先展示以下增强字段：

- `answer_basis`
- `evidence_citations`
- `tool_results`
- `memory_snapshot`
- `decision_trace`
- `full_trace`
- `handoff_ticket`

客服历史和订单状态持久化：

- `GET /chat/history?user_id=demo_user&order_id=WMxxxx&limit=50`：重新打开客服页时恢复历史消息、`session_id` 和最近一次诊断响应。
- `PUT /orders/{order_id}/state`：保存当前订单状态，后端订单工具会优先读取该持久化状态。
