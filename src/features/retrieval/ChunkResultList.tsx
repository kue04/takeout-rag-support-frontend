import { useState } from "react";
import { ChevronDown, FileText, ShieldCheck } from "lucide-react";
import { FieldValue } from "../../components/FieldValue";
import { Notice } from "../../components/Notice";
import { StatusPill } from "../../components/StatusPill";
import { formatOrReason, formatScore } from "../../lib/status";
import type { ChunkIndexInfo, ChunkRetrievalItem } from "../../types/api";

/**
 * 正式路径结果列表（chunk 级 · `/retrieval/search`）。
 *
 * 这是 B7 之后 `/retrieval/search` 的真实响应形状：
 * 只有 `score` 一个分数（单路稠密检索 + 服务端预过滤），
 * 没有 dense/lexical/rrf/rerank 拆解，也没有 `intent` / `category` / `question` / `answer`。
 * 所以这里不渲染分数拆解，也不渲染意图分类 —— 那些字段在这条路径上不存在。
 */
export function ChunkIndexSummary({ index }: { index: ChunkIndexInfo }) {
  return (
    <section className="rounded-work border border-line bg-subtle p-3">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck size={14} className="text-leaf" aria-hidden />
        <p className="text-xs font-bold text-ink">当前生效索引</p>
        <StatusPill value={index.index_name} />
      </div>
      <p className="mt-2 text-[11px] leading-5 text-muted">
        <code>visible_chunk_count</code> 是当前身份可见的 chunk 数（不是全库）。
        「为什么我零命中」最该先看这个数字。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <FieldValue label="index_version" value={index.index_version} missingReason="NOT_RETURNED" />
        <FieldValue label="chunk_count（全库）" value={index.chunk_count} missingReason="NOT_RETURNED" />
        <FieldValue
          label="visible_chunk_count（本身份可见）"
          value={index.visible_chunk_count}
          missingReason="NOT_RETURNED"
        />
        <FieldValue label="embedding_model" value={index.embedding_model} missingReason="NOT_RETURNED" />
        <FieldValue
          label="embedding_dimension"
          value={index.embedding_dimension}
          missingReason="NOT_RETURNED"
        />
        <FieldValue label="tokenizer_id" value={index.tokenizer_id} missingReason="NOT_RETURNED" />
        <FieldValue label="built_at" value={index.built_at} missingReason="NOT_RETURNED" className="col-span-2" />
      </div>
    </section>
  );
}

export function ChunkResultList({
  items,
  visibleChunkCount,
}: {
  items: ChunkRetrievalItem[];
  visibleChunkCount?: number;
}) {
  if (items.length === 0) {
    return (
      <Notice
        tone="neutral"
        title="零命中：当前授权范围内没有匹配内容"
        detail={
          typeof visibleChunkCount === "number"
            ? `本次身份可见 chunk 数：${visibleChunkCount}。零命中不是错误 —— 无权限也是零命中（后端不返回 403，避免泄漏「这条文档存在但你没权限」）。`
            : "零命中不是错误：无权限与真的没有内容在后端都表现为空数组。"
        }
        action="如果可见数是 0，先确认文档已上传且索引已重建；如果可见数大于 0，说明是这次 query 没有匹配。"
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <ChunkCard key={item.chunk_id || index} item={item} />
      ))}
    </div>
  );
}

function ChunkCard({ item }: { item: ChunkRetrievalItem }) {
  const [expanded, setExpanded] = useState(false);
  const heading = item.heading_path?.length ? item.heading_path.join(" › ") : null;
  const pageRange = formatPageRange(item.page_start, item.page_end);
  const aclCount = Array.isArray(item.acl) ? item.acl.length : undefined;

  return (
    <article className="rounded-work border border-line bg-panel p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-work bg-ink text-xs font-bold text-white">
          {item.rank}
        </span>
        <StatusPill value={item.retrieval_origin} note="本次命中的来源标记，正式路径应为 chunk-index" />
        {item.chunk_type ? (
          <span className="rounded-full border border-line bg-subtle px-2.5 py-1 text-[11px] font-bold text-muted">
            {item.chunk_type}
          </span>
        ) : null}
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900">
          score {formatScore(item.score)}
        </span>
      </div>

      <h3 className="text-sm font-bold leading-5 text-ink">
        {item.title ?? item.document_title ?? "（后端未返回标题）"}
      </h3>

      {heading ? (
        <p className="mt-1 text-xs font-bold text-muted">章节路径：{heading}</p>
      ) : (
        <p className="mt-1 text-xs text-muted">
          {formatOrReason(undefined, "NOT_RETURNED")} 章节路径（<code>heading_path</code>）
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted">
        <FileText size={13} aria-hidden />
        <span>{item.filename ?? formatOrReason(undefined, "NOT_RETURNED")}</span>
        {pageRange ? <span>· 第 {pageRange} 页</span> : null}
        {item.source_type ? <span>· {item.source_type}</span> : null}
        <span>· {item.token_count ?? "未返回"} tokens</span>
        {typeof aclCount === "number" ? (
          <span>· ACL {aclCount ? `${aclCount} 条规则` : "无规则（继承租户范围）"}</span>
        ) : null}
      </div>

      <div className="mt-3 rounded-work bg-subtle p-3">
        <p className={`text-sm leading-6 text-ink ${expanded ? "" : "line-clamp-4"}`}>
          {item.text ?? formatOrReason(undefined, "NOT_RETURNED")}
        </p>
        {item.text ? (
          <button
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-leaf"
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
          >
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              aria-hidden
            />
            {expanded ? "收起片段" : "展开完整 chunk 文本"}
          </button>
        ) : null}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] font-bold text-muted">查看 chunk 元数据</summary>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FieldValue label="chunk_id" value={item.chunk_id} missingReason="NOT_RETURNED" mono />
          <FieldValue label="document_id" value={item.document_id} missingReason="NOT_RETURNED" mono />
          <FieldValue label="document_version" value={item.document_version} missingReason="NOT_RETURNED" />
          <FieldValue
            label="document_version_id"
            value={item.document_version_id}
            missingReason="NOT_RETURNED"
            mono
          />
          <FieldValue label="tenant_id" value={item.tenant_id} missingReason="NOT_RETURNED" />
          <FieldValue label="content_hash" value={item.content_hash} missingReason="NOT_RETURNED" mono />
          <FieldValue
            label="source_uri"
            value={item.source_uri}
            missingReason="NOT_RETURNED"
            mono
            className="col-span-2"
          />
        </div>
      </details>
    </article>
  );
}

function formatPageRange(start?: number | null, end?: number | null) {
  if (typeof start !== "number" && typeof end !== "number") {
    return null;
  }
  if (typeof start === "number" && typeof end === "number" && start !== end) {
    return `${start}-${end}`;
  }
  return String(start ?? end ?? "");
}
