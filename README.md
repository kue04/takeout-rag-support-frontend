# 外卖客服 RAG 调试台

这是一个面向外卖客服 RAG 系统学习和联调的前端工作台，技术栈为 Vite + React + TypeScript + Tailwind CSS + lucide-react。

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
- `GET /model/info`
- `GET /retrieval/config`
- `POST /retrieval/search`
- `POST /retrieval/prompt-preview`
- `GET /examples/categories`
- `GET /examples/by-category?category=退款售后&limit=5`
- `POST /examples/search`
