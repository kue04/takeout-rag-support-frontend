import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import KnowledgeBrowser from "../../components/KnowledgeBrowser";
import type { KnowledgeExample, KnowledgeOpsItem, KnowledgePayload, KnowledgePublishHistoryItem } from "../../types/api";

export function KnowledgeOpsView({
  items,
  total,
  statusText,
  publishHistory,
  categories,
  selectedCategory,
  examples,
  examplesStatus,
  onBack,
  onRefresh,
  onRefreshExamples,
  onCategoryChange,
  onSearchExamples,
  onCreate,
  onUpdate,
  onArchive,
  onReview,
  onExportApproved,
  onPublishApproved,
  onRollbackLatest,
  onRefreshPublishHistory,
}: {
  items: KnowledgeOpsItem[];
  total: number;
  statusText: string;
  publishHistory: KnowledgePublishHistoryItem[];
  categories: string[];
  selectedCategory: string;
  examples: KnowledgeExample[];
  examplesStatus: string;
  onBack: () => void;
  onRefresh: (filters?: { status?: string; keyword?: string }) => Promise<void>;
  onRefreshExamples: () => Promise<void>;
  onCategoryChange: (category: string) => Promise<void>;
  onSearchExamples: (keyword: string) => Promise<void>;
  onCreate: (payload: KnowledgePayload) => Promise<void>;
  onUpdate: (id: number, payload: KnowledgePayload) => Promise<void>;
  onArchive: (id: number) => Promise<void>;
  onReview: (id: number, status: "approved" | "rejected") => Promise<void>;
  onExportApproved: () => Promise<void>;
  onPublishApproved: () => Promise<void>;
  onRollbackLatest: () => Promise<void>;
  onRefreshPublishHistory: () => Promise<void>;
}) {
  const [form, setForm] = useState<KnowledgePayload>({
    question: "",
    answer: "",
    category: "",
    intent: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [activeList, setActiveList] = useState<"current" | "ops">("current");

  function fillForm(item: KnowledgeOpsItem) {
    setEditingId(item.id);
    setForm({
      question: item.question,
      answer: item.answer,
      category: item.category,
      intent: item.intent,
    });
  }

  function useExampleAsDraft(example: KnowledgeExample) {
    setEditingId(null);
    setForm({
      question: example.question,
      answer: example.answer,
      category: example.category ?? selectedCategory,
      intent: "",
    });
  }

  async function submitForm() {
    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: form.category.trim(),
      intent: form.intent.trim(),
    };
    if (!payload.question || !payload.answer || !payload.category || !payload.intent) {
      return;
    }
    if (editingId) {
      await onUpdate(editingId, payload);
    } else {
      await onCreate(payload);
    }
    setEditingId(null);
    setForm({ question: "", answer: "", category: "", intent: "" });
  }

  return (
    <section className="view-surface space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-muted" type="button" onClick={onBack}>
            <ArrowLeft size={17} />
            返回首页
          </button>
          <h1 className="text-2xl font-black">知识库运营</h1>
          <p className="mt-1 text-sm text-muted">草稿审核后手动发布，发布会写入正式 JSONL 并重建 FAISS。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-work bg-leaf px-4 py-2 text-sm font-black text-white" type="button" onClick={() => void onPublishApproved()}>
            发布 approved
          </button>
          <button className="rounded-work bg-amberline px-4 py-2 text-sm font-black text-white" type="button" onClick={() => void onRollbackLatest()}>
            回滚最近发布
          </button>
          <button className="rounded-work bg-ink px-4 py-2 text-sm font-black text-white" type="button" onClick={() => void onExportApproved()}>
            复制 approved JSONL
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-[16px] bg-white p-4">
            <h2 className="text-base font-black">{editingId ? "编辑为新版本" : "新增知识草稿"}</h2>
            <div className="mt-3 space-y-2">
              <input className="h-10 w-full rounded-work border border-line px-3 text-sm outline-none" placeholder="分类" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
              <input className="h-10 w-full rounded-work border border-line px-3 text-sm outline-none" placeholder="意图" value={form.intent} onChange={(event) => setForm({ ...form, intent: event.target.value })} />
              <textarea className="min-h-20 w-full rounded-work border border-line p-3 text-sm outline-none" placeholder="用户问题" value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} />
              <textarea className="min-h-28 w-full rounded-work border border-line p-3 text-sm outline-none" placeholder="标准回答" value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} />
              <div className="flex gap-2">
                <button className="rounded-work bg-leaf px-4 py-2 text-sm font-black text-white" type="button" onClick={() => void submitForm()}>
                  {editingId ? "生成新版本" : "保存草稿"}
                </button>
                {editingId ? (
                  <button className="rounded-work border border-line px-4 py-2 text-sm font-black" type="button" onClick={() => setEditingId(null)}>
                    取消编辑
                  </button>
                ) : null}
              </div>
            </div>
            {statusText ? <p className="mt-3 text-xs font-bold text-leaf">{statusText}</p> : null}
          </div>

          <div className="rounded-[16px] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-black">发布历史</h2>
              <button className="rounded-work border border-line px-3 py-1.5 text-xs font-black" type="button" onClick={() => void onRefreshPublishHistory()}>
                刷新
              </button>
            </div>
            <div className="space-y-2">
              {publishHistory.length ? (
                publishHistory.map((item) => (
                  <article key={item.id} className="rounded-work border border-line bg-subtle p-3 text-xs leading-5">
                    <div className="flex flex-wrap items-center gap-2 font-black">
                      <span>{item.action}</span>
                      <span>{item.status}</span>
                      <span>{item.merged_count} 条</span>
                    </div>
                    <p className="mt-1 break-all text-muted">{item.publish_id}</p>
                    {item.backup_path ? <p className="mt-1 break-all text-muted">backup: {item.backup_path}</p> : null}
                    <p className="mt-1 text-muted">{item.created_at}</p>
                  </article>
                ))
              ) : (
                <EmptyState title="暂无发布记录" text="发布 approved 知识后会显示版本记录。" compact />
              )}
            </div>
          </div>
        </aside>

        <div className="rounded-[16px] bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-black">{activeList === "current" ? "当前正式知识库" : "知识条目"}</h2>
              <p className="mt-1 text-xs text-muted">
                {activeList === "current" ? examplesStatus || "从正式知识库读取内容" : `共 ${total} 条运营草稿/审核记录`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="grid grid-cols-2 overflow-hidden rounded-work border border-line text-sm font-black">
                <button
                  className={`px-3 py-2 ${activeList === "current" ? "bg-ink text-white" : "bg-white text-muted"}`}
                  type="button"
                  onClick={() => setActiveList("current")}
                >
                  正式知识库
                </button>
                <button
                  className={`px-3 py-2 ${activeList === "ops" ? "bg-ink text-white" : "bg-white text-muted"}`}
                  type="button"
                  onClick={() => setActiveList("ops")}
                >
                  运营草稿
                </button>
              </div>
              {activeList === "current" ? (
                <button className="rounded-work border border-line px-3 text-sm font-black" type="button" onClick={() => void onRefreshExamples()}>
                  刷新正式库
                </button>
              ) : (
                <>
                  <select className="h-9 rounded-work border border-line px-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="">全部状态</option>
                    <option value="draft">draft</option>
                    <option value="approved">approved</option>
                    <option value="published">published</option>
                    <option value="rejected">rejected</option>
                    <option value="archived">archived</option>
                  </select>
                  <input className="h-9 rounded-work border border-line px-2 text-sm" placeholder="关键词" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
                  <button className="rounded-work border border-line px-3 text-sm font-black" type="button" onClick={() => void onRefresh({ status, keyword })}>
                    筛选
                  </button>
                </>
              )}
            </div>
          </div>

          {activeList === "current" ? (
            <KnowledgeBrowser
              categories={categories}
              selectedCategory={selectedCategory}
              examples={examples}
              onCategoryChange={onCategoryChange}
              onSearch={onSearchExamples}
              onUseExample={useExampleAsDraft}
            />
          ) : (
          <div className="space-y-3">
            {items.length ? (
              items.map((item) => (
                <article key={item.id} className="rounded-work border border-line bg-subtle p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-ink px-2 py-1 text-[11px] font-black text-white">v{item.version}</span>
                    <span className="rounded-full border border-line bg-white px-2 py-1 text-[11px] font-black">{item.status}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-leaf">{item.category}</span>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-muted">{item.intent}</span>
                  </div>
                  <h3 className="text-sm font-black">{item.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.answer}</p>
                  {item.review_note ? <p className="mt-2 text-xs text-muted">审核说明：{item.review_note}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-work border border-line bg-white px-3 py-1.5 text-xs font-black" type="button" onClick={() => fillForm(item)}>
                      编辑
                    </button>
                    <button className="rounded-work bg-leaf px-3 py-1.5 text-xs font-black text-white" type="button" onClick={() => void onReview(item.id, "approved")}>
                      通过
                    </button>
                    <button className="rounded-work bg-amberline px-3 py-1.5 text-xs font-black text-white" type="button" onClick={() => void onReview(item.id, "rejected")}>
                      拒绝
                    </button>
                    <button className="rounded-work bg-red-600 px-3 py-1.5 text-xs font-black text-white" type="button" onClick={() => void onArchive(item.id)}>
                      下架
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState title="暂无知识运营条目" text="先新增一条知识草稿，或调整筛选条件。" compact />
            )}
          </div>
          )}
        </div>
      </div>
    </section>
  );
}
