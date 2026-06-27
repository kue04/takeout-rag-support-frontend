import { FormEvent, useState } from "react";
import { PlayCircle, Search } from "lucide-react";
import type { KnowledgeExample } from "../types/api";

type KnowledgeBrowserProps = {
  categories: string[];
  selectedCategory: string;
  examples: KnowledgeExample[];
  onCategoryChange: (category: string) => void;
  onSearch: (keyword: string) => Promise<void>;
  onUseExample: (example: KnowledgeExample) => void;
};

export default function KnowledgeBrowser({
  categories,
  selectedCategory,
  examples,
  onCategoryChange,
  onSearch,
  onUseExample,
}: KnowledgeBrowserProps) {
  const [keyword, setKeyword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSearch(keyword);
  }

  return (
    <div className="flex h-[calc(100vh-174px)] min-h-0 flex-col">
      <div className="border-b border-line bg-panel p-3">
        <form className="grid grid-cols-[1fr_42px] gap-2" onSubmit={handleSubmit}>
          <input
            className="h-10 rounded-work border border-line bg-panel px-3 text-sm outline-none focus:border-leaf"
            placeholder="搜索样本关键词，例如：退款"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <button
            className="grid place-items-center rounded-work bg-ink text-white"
            title="搜索样本"
            type="submit"
          >
            <Search size={17} />
          </button>
        </form>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[132px_1fr] overflow-hidden max-sm:grid-cols-1">
        <aside className="space-y-2 overflow-auto border-r border-line bg-subtle p-3 max-sm:max-h-40 max-sm:border-r-0 max-sm:border-b">
          {categories.map((category) => (
            <button
              key={category}
              className={`w-full rounded-work border px-3 py-2 text-left text-xs font-extrabold ${
                category === selectedCategory
                  ? "border-leaf bg-emerald-50 text-leaf"
                  : "border-line bg-panel text-ink"
              }`}
              type="button"
              onClick={() => onCategoryChange(category)}
            >
              {category}
            </button>
          ))}
          {categories.length === 0 ? <p className="text-xs text-muted">暂无分类</p> : null}
        </aside>

        <div className="min-h-0 space-y-3 overflow-y-auto p-4">
          {examples.length === 0 ? (
            <div className="rounded-work border border-line bg-panel p-4 text-sm text-muted">
              没有匹配样本。可以换一个关键词，或确认后端 examples 接口是否返回数据。
            </div>
          ) : null}
          {examples.map((example) => (
            <article
              key={`${example.category ?? selectedCategory}-${example.question}`}
              className="rounded-work border border-line bg-panel p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="rounded-full border border-line bg-subtle px-2 py-1 text-[11px] font-extrabold text-muted">
                  {example.category ?? selectedCategory}
                </span>
                <button
                  className="inline-flex items-center gap-1 rounded-work border border-line bg-panel px-2 py-1 text-[11px] font-extrabold text-ink hover:border-leaf"
                  type="button"
                  onClick={() => onUseExample(example)}
                >
                  <PlayCircle size={13} />
                  作为草稿
                </button>
              </div>
              <h3 className="text-sm font-extrabold">{example.question}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{example.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
