import { Clipboard, SendHorizontal, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import ScoreBadge from "./ScoreBadge";
import type { ChatMessage, ChatResponse } from "../types/api";

type ChatPanelProps = {
  messages: ChatMessage[];
  latestConfidence?: number;
  diagnostics: ChatResponse | null;
  draftQuestion: string;
  draftRevision: number;
  isLoading: boolean;
  onSend: (message: string) => Promise<void>;
};

const suggestions = [
  "会员退款多久到账",
  "外卖超时怎么处理",
  "骑手联系不上怎么办",
  "优惠券不能用怎么办",
];

export default function ChatPanel({
  messages,
  latestConfidence,
  diagnostics,
  draftQuestion,
  draftRevision,
  isLoading,
  onSend,
}: ChatPanelProps) {
  const [draft, setDraft] = useState(draftQuestion);

  useEffect(() => {
    if (draftQuestion) {
      setDraft(draftQuestion);
    }
  }, [draftQuestion, draftRevision]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();

    if (!content) {
      return;
    }

    setDraft("");
    await onSend(content);
  }

  return (
    <div className="flex min-h-[calc(100vh-174px)] flex-col">
      <div className="border-b border-line bg-panel px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-muted">confidence_score</p>
            <p className="mt-1 text-2xl font-extrabold">
              {typeof latestConfidence === "number" ? latestConfidence.toFixed(2) : "--"}
            </p>
          </div>
          <ScoreBadge label="confidence" value={latestConfidence} tone="green" />
        </div>
        <TraceFlags response={diagnostics} />
      </div>

      <div className="flex-1 space-y-3 overflow-auto bg-subtle p-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading ? <div className="text-sm font-bold text-muted">模型生成中...</div> : null}
      </div>

      <form className="border-t border-line bg-panel p-3" onSubmit={handleSubmit}>
        <div className="mb-2 flex gap-2 overflow-x-auto">
          {suggestions.map((item) => (
            <button
              key={item}
              className="shrink-0 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-bold text-ink hover:border-leaf"
              type="button"
              onClick={() => setDraft(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_48px] gap-2">
          <textarea
            className="min-h-24 resize-none rounded-work border border-line bg-panel p-3 text-sm outline-none focus:border-leaf"
            placeholder="输入客服问题，例如：会员退款多久到账"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            className="grid place-items-center rounded-work bg-leaf text-white disabled:opacity-50"
            disabled={isLoading}
            title="发送问题"
            type="submit"
          >
            <SendHorizontal size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";

  async function copyReply() {
    await navigator.clipboard.writeText(message.content);
  }

  return (
    <article
      className={`max-w-[88%] rounded-work border p-3 text-sm leading-6 ${
        isAssistant ? "border-line bg-panel text-ink" : "ml-auto border-ink bg-ink text-white"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs font-extrabold opacity-80">
        <div className="flex items-center gap-2">
          {isAssistant ? <Sparkles size={14} /> : null}
          {isAssistant ? "客服模型回复" : "用户问题"}
        </div>
        {isAssistant ? (
          <button
            className="grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-ink"
            title="复制回复"
            type="button"
            onClick={copyReply}
          >
            <Clipboard size={13} />
          </button>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap">{message.content}</p>
      {typeof message.confidenceScore === "number" ? (
        <div className="mt-3">
          <ScoreBadge label="confidence" value={message.confidenceScore} tone="green" />
        </div>
      ) : null}
      {message.retrievedDocuments?.length ? (
        <div className="mt-3 rounded-work border border-line bg-subtle p-2">
          <div className="mb-1 text-[11px] font-extrabold text-muted">本次参考资料</div>
          <ul className="space-y-1 text-xs leading-5 text-slate-700">
            {message.retrievedDocuments.slice(0, 3).map((document, index) => (
              <li key={`${index}-${document}`} className="line-clamp-2">
                {index + 1}. {document}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function TraceFlags({ response }: { response: ChatResponse | null }) {
  if (!response?.trace) {
    return null;
  }

  const trace = response.trace;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Flag label="degraded" active={Boolean(trace.degraded)} />
      <Flag label="fallback" active={Boolean(trace.used_fallback_prompt)} />
      <Flag label="reply rules" active={Boolean(trace.reply_rules_applied)} />
      {response.needs_manual_review ? <Flag label="manual review" active tone="red" /> : null}
    </div>
  );
}

function Flag({
  label,
  active,
  tone = "neutral",
}: {
  label: string;
  active: boolean;
  tone?: "neutral" | "red";
}) {
  const activeClass =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <span
      className={`rounded-full border px-2 py-1 text-[11px] font-extrabold ${
        active ? activeClass : "border-line bg-panel text-muted"
      }`}
    >
      {label}: {active ? "yes" : "no"}
    </span>
  );
}
