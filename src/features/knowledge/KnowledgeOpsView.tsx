import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import KnowledgeBrowser from "../../components/KnowledgeBrowser";
import { getKnowledgeRuntimeStatus } from "./knowledgeRuntimeStatus";
import type {
  AuditLogItem,
  KnowledgeExample,
  KnowledgeOpsItem,
  KnowledgePayload,
  KnowledgePublishHistoryItem,
  PromptVersionItem,
  PromptVersionPayload,
  ReleaseChecklistResponse,
} from "../../types/api";

export function KnowledgeOpsView({
  items,
  total,
  statusText,
  publishHistory,
  categories,
  selectedCategory,
  examples,
  examplesStatus,
  promptVersions,
  activePromptVersion,
  promptOpsStatus,
  auditLogs,
  releaseChecklist,
  releaseStatus,
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
  onCreatePrompt,
  onApproveActivatePrompt,
  onRollbackPrompt,
  onRefreshPromptVersions,
  onRefreshGovernanceData,
}: {
  items: KnowledgeOpsItem[];
  total: number;
  statusText: string;
  publishHistory: KnowledgePublishHistoryItem[];
  categories: string[];
  selectedCategory: string;
  examples: KnowledgeExample[];
  examplesStatus: string;
  promptVersions: PromptVersionItem[];
  activePromptVersion: PromptVersionItem | null;
  promptOpsStatus: string;
  auditLogs: AuditLogItem[];
  releaseChecklist: ReleaseChecklistResponse | null;
  releaseStatus: string;
  onBack: () => void;
  onRefresh: (filters?: { status?: string; keyword?: string }) => Promise<void>;
  onRefreshExamples: () => Promise<void>;
  onCategoryChange: (category: string) => Promise<void>;
  onSearchExamples: (keyword: string) => Promise<void>;
  onCreate: (payload: KnowledgePayload) => Promise<void>;
  onUpdate: (id: number, payload: KnowledgePayload) => Promise<void>;
  onArchive: (id: number) => Promise<void>;
  onReview: (id: number, status: "pending_review" | "approved" | "rejected") => Promise<void>;
  onExportApproved: () => Promise<void>;
  onPublishApproved: () => Promise<void>;
  onRollbackLatest: () => Promise<void>;
  onRefreshPublishHistory: () => Promise<void>;
  onCreatePrompt: (payload: PromptVersionPayload) => Promise<void>;
  onApproveActivatePrompt: (id: number) => Promise<void>;
  onRollbackPrompt: () => Promise<void>;
  onRefreshPromptVersions: () => Promise<void>;
  onRefreshGovernanceData: () => Promise<void>;
}) {
  const [form, setForm] = useState<KnowledgePayload>({
    title: "",
    question: "",
    answer: "",
    category: "",
    intent: "",
    owner: "knowledge_ops",
    source: "knowledge_ops",
    effective_at: "",
    expired_at: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [activeList, setActiveList] = useState<"current" | "ops">("current");
  const [expandedBaseIds, setExpandedBaseIds] = useState<Set<string>>(() => new Set());
  const [promptForm, setPromptForm] = useState<PromptVersionPayload>({
    system_prompt: "",
    developer_prompt: "",
    change_reason: "",
    evaluation_result: "",
  });

  function fillForm(item: KnowledgeOpsItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      question: item.question,
      answer: item.answer,
      category: item.category,
      intent: item.intent,
      owner: item.owner,
      source: item.source,
      effective_at: toDatetimeLocal(item.effective_at),
      expired_at: toDatetimeLocal(item.expired_at),
    });
  }

  function useExampleAsDraft(example: KnowledgeExample) {
    setEditingId(null);
    setForm({
      title: example.question,
      question: example.question,
      answer: example.answer,
      category: example.category ?? selectedCategory,
      intent: "",
      owner: "knowledge_ops",
      source: "curated_seed",
      effective_at: "",
      expired_at: "",
    });
  }

  async function submitForm() {
    const payload = {
      title: form.title?.trim() || form.question.trim(),
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: form.category.trim(),
      intent: form.intent.trim(),
      owner: form.owner?.trim() || "knowledge_ops",
      source: form.source?.trim() || "knowledge_ops",
      effective_at: toUtcIso(form.effective_at),
      expired_at: toUtcIso(form.expired_at),
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
    setForm({ title: "", question: "", answer: "", category: "", intent: "", owner: "knowledge_ops", source: "knowledge_ops", effective_at: "", expired_at: "" });
  }

  async function submitPromptVersion() {
    const payload = {
      system_prompt: promptForm.system_prompt.trim(),
      developer_prompt: promptForm.developer_prompt?.trim() || "",
      change_reason: promptForm.change_reason?.trim() || "",
      evaluation_result: promptForm.evaluation_result?.trim() || "",
    };
    if (!payload.system_prompt || !payload.change_reason) {
      return;
    }
    await onCreatePrompt(payload);
    setPromptForm({ system_prompt: "", developer_prompt: "", change_reason: "", evaluation_result: "" });
  }

  const latestVersionByBaseId = new Map<string, number>();
  const versionCountByBaseId = new Map<string, number>();
  for (const item of items) {
    const key = knowledgeGroupKey(item);
    latestVersionByBaseId.set(key, Math.max(latestVersionByBaseId.get(key) ?? 0, item.version));
    versionCountByBaseId.set(key, (versionCountByBaseId.get(key) ?? 0) + 1);
  }
  const visibleItems = items.filter((item) => {
    const key = knowledgeGroupKey(item);
    return item.version === latestVersionByBaseId.get(key) || expandedBaseIds.has(key);
  });

  function toggleVersionHistory(baseId: string) {
    setExpandedBaseIds((current) => {
      const next = new Set(current);
      if (next.has(baseId)) {
        next.delete(baseId);
      } else {
        next.add(baseId);
      }
      return next;
    });
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
              <input className="h-10 w-full rounded-work border border-line px-3 text-sm outline-none" placeholder="标题" value={form.title ?? ""} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              <div className="grid gap-2 md:grid-cols-2">
                <input className="h-10 w-full rounded-work border border-line px-3 text-sm outline-none" placeholder="owner" value={form.owner ?? ""} onChange={(event) => setForm({ ...form, owner: event.target.value })} />
                <input className="h-10 w-full rounded-work border border-line px-3 text-sm outline-none" placeholder="source" value={form.source ?? ""} onChange={(event) => setForm({ ...form, source: event.target.value })} />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-xs font-bold text-muted">
                  生效时间（本地时间）
                  <input type="datetime-local" className="mt-1 h-10 w-full rounded-work border border-line px-3 text-sm font-normal text-ink outline-none" value={form.effective_at ?? ""} onChange={(event) => setForm({ ...form, effective_at: event.target.value })} />
                </label>
                <label className="text-xs font-bold text-muted">
                  过期时间（本地时间）
                  <input type="datetime-local" className="mt-1 h-10 w-full rounded-work border border-line px-3 text-sm font-normal text-ink outline-none" value={form.expired_at ?? ""} onChange={(event) => setForm({ ...form, expired_at: event.target.value })} />
                </label>
              </div>
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

          <div className="rounded-[16px] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black">Prompt 版本</h2>
                <p className="mt-1 text-xs text-muted">
                  当前：{activePromptVersion?.version ?? "-"} · {activePromptVersion?.status ?? "-"}
                </p>
              </div>
              <button className="rounded-work border border-line px-3 py-1.5 text-xs font-black" type="button" onClick={() => void onRefreshPromptVersions()}>
                刷新
              </button>
            </div>
            <div className="space-y-2">
              <textarea
                className="min-h-24 w-full rounded-work border border-line p-3 text-sm outline-none"
                placeholder="system prompt"
                value={promptForm.system_prompt}
                onChange={(event) => setPromptForm({ ...promptForm, system_prompt: event.target.value })}
              />
              <textarea
                className="min-h-16 w-full rounded-work border border-line p-3 text-sm outline-none"
                placeholder="developer prompt"
                value={promptForm.developer_prompt ?? ""}
                onChange={(event) => setPromptForm({ ...promptForm, developer_prompt: event.target.value })}
              />
              <input
                className="h-10 w-full rounded-work border border-line px-3 text-sm outline-none"
                placeholder="修改原因"
                value={promptForm.change_reason ?? ""}
                onChange={(event) => setPromptForm({ ...promptForm, change_reason: event.target.value })}
              />
              <input
                className="h-10 w-full rounded-work border border-line px-3 text-sm outline-none"
                placeholder="评测结果"
                value={promptForm.evaluation_result ?? ""}
                onChange={(event) => setPromptForm({ ...promptForm, evaluation_result: event.target.value })}
              />
              <div className="flex flex-wrap gap-2">
                <button className="rounded-work bg-ink px-3 py-2 text-xs font-black text-white" type="button" onClick={() => void submitPromptVersion()}>
                  保存 Prompt 草稿
                </button>
                <button className="rounded-work border border-line px-3 py-2 text-xs font-black" type="button" onClick={() => void onRollbackPrompt()}>
                  回滚 Prompt
                </button>
              </div>
              {promptOpsStatus ? <p className="text-xs font-bold text-leaf">{promptOpsStatus}</p> : null}
            </div>
            <div className="mt-3 space-y-2">
              {promptVersions.slice(0, 4).map((item) => (
                <article key={item.id} className="rounded-work border border-line bg-subtle p-2 text-xs leading-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-black">{item.version} · {item.status}</span>
                    {item.status !== "production" && item.status !== "rollback" ? (
                      <button className="rounded-work bg-leaf px-2 py-1 font-black text-white" type="button" onClick={() => void onApproveActivatePrompt(item.id)}>
                        审批启用
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1 text-muted">{item.change_reason || item.evaluation_result || item.created_at}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[16px] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black">上线检查</h2>
                <p className="mt-1 text-xs text-muted">{releaseStatus || "等待检查结果"}</p>
              </div>
              <button className="rounded-work border border-line px-3 py-1.5 text-xs font-black" type="button" onClick={() => void onRefreshGovernanceData()}>
                刷新
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <MetricTile label="ready" value={releaseChecklist?.ready ? "yes" : "no"} />
              <MetricTile label="fail" value={releaseChecklist?.failed_count ?? 0} />
              <MetricTile label="warn" value={releaseChecklist?.warning_count ?? 0} />
            </div>
            <div className="mt-3 max-h-60 space-y-2 overflow-auto">
              {releaseChecklist?.items.length ? (
                releaseChecklist.items.map((item) => (
                  <article key={item.name} className="rounded-work border border-line bg-subtle p-3 text-xs leading-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 font-black ${statusClass(item.status)}`}>{item.status}</span>
                      <span className="font-black text-ink">{item.name}</span>
                    </div>
                    <p className="mt-1 break-all text-muted">{item.evidence || "-"}</p>
                    {item.next_step ? <p className="mt-1 font-bold text-amberline">{item.next_step}</p> : null}
                  </article>
                ))
              ) : (
                <EmptyState title="暂无检查结果" text="刷新后展示发布门槛检查项。" compact />
              )}
            </div>
          </div>

          <div className="rounded-[16px] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-black">审计日志</h2>
              <button className="rounded-work border border-line px-3 py-1.5 text-xs font-black" type="button" onClick={() => void onRefreshGovernanceData()}>
                刷新
              </button>
            </div>
            <div className="max-h-64 space-y-2 overflow-auto">
              {auditLogs.length ? (
                auditLogs.map((item) => (
                  <article key={item.id} className="rounded-work border border-line bg-subtle p-3 text-xs leading-5">
                    <div className="flex flex-wrap items-center gap-2 font-black">
                      <span>{item.action_type}</span>
                      <span className="rounded-full bg-white px-2 py-1 text-muted">{item.operator_role}</span>
                    </div>
                    <p className="mt-1 break-all text-muted">
                      {item.object_type}:{item.object_id}
                    </p>
                    {item.request_id ? <p className="mt-1 break-all text-muted">request_id: {item.request_id}</p> : null}
                    <p className="mt-1 text-muted">{item.created_at}</p>
                  </article>
                ))
              ) : (
                <EmptyState title="暂无审计记录" text="写操作完成后会显示最近操作。" compact />
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
                    <option value="pending_review">pending_review</option>
                    <option value="approved">approved</option>
                    <option value="published">published</option>
                    <option value="rollback">rollback</option>
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
            {visibleItems.length ? (
              visibleItems.map((item) => {
                const groupKey = knowledgeGroupKey(item);
                const latestVersion = latestVersionByBaseId.get(groupKey) ?? item.version;
                const runtimeStatus = getKnowledgeRuntimeStatus(item, new Date(), latestVersion);
                const hasHistory = (versionCountByBaseId.get(groupKey) ?? 0) > 1;
                const isLatest = item.version === latestVersion;
                return (
                <article key={item.id} className="rounded-work border border-line bg-subtle p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-ink px-2 py-1 text-[11px] font-black text-white">v{item.version}</span>
                    <span className="rounded-full border border-line bg-white px-2 py-1 text-[11px] font-black">{item.status}</span>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-black ${runtimeStatus.className}`}>{runtimeStatus.label}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-leaf">{item.category}</span>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-muted">{item.intent}</span>
                    {isLatest && hasHistory ? (
                      <button className="rounded-full border border-line bg-white px-2 py-1 text-[11px] font-black text-muted" type="button" onClick={() => toggleVersionHistory(groupKey)}>
                        {expandedBaseIds.has(groupKey) ? "收起历史版本" : "展开历史版本"}
                      </button>
                    ) : null}
                  </div>
                  <h3 className="text-sm font-black">{item.title || item.question}</h3>
                  <p className="mt-1 text-xs font-bold text-muted">{item.owner} · {item.source}</p>
                  <p className="mt-1 text-xs text-muted">{item.question}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.answer}</p>
                  {item.effective_at || item.expired_at ? (
                    <p className="mt-2 text-xs text-muted">
                      生效：{item.effective_at || "-"} / 过期：{item.expired_at || "-"}
                    </p>
                  ) : null}
                  {item.review_note ? <p className="mt-2 text-xs text-muted">审核说明：{item.review_note}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-work border border-line bg-white px-3 py-1.5 text-xs font-black" type="button" onClick={() => fillForm(item)}>
                      编辑
                    </button>
                    <button className="rounded-work border border-line bg-white px-3 py-1.5 text-xs font-black" type="button" onClick={() => void onReview(item.id, "pending_review")}>
                      提审
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
                );
              })
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

function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-work bg-subtle p-2">
      <div className="truncate font-black text-ink">{value}</div>
      <div className="mt-1 text-[10px] font-bold text-muted">{label}</div>
    </div>
  );
}

function knowledgeGroupKey(item: KnowledgeOpsItem) {
  return item.base_id || String(item.id);
}

function toDatetimeLocal(value?: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toUtcIso(value?: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function statusClass(status: string) {
  if (status === "pass") {
    return "bg-emerald-50 text-leaf";
  }
  if (status === "fail") {
    return "bg-red-50 text-red-700";
  }
  return "bg-orange-50 text-amberline";
}
