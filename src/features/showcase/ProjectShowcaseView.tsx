import { ArrowLeft, BadgeCheck, Bot, Brain, ClipboardCheck, Database, Gauge, GitBranch, Layers3, Search, ShieldCheck, Sparkles } from "lucide-react";

const metrics = [
  { label: "核心链路", value: "Hybrid RAG", icon: Search },
  { label: "生成模型", value: "Qwen + LoRA", icon: Bot },
  { label: "评测闭环", value: "Grounding Eval", icon: ClipboardCheck },
  { label: "运营能力", value: "Knowledge Ops", icon: Database },
];

const pipeline = [
  "用户问题进入 FastAPI",
  "向量召回 + 关键词加权 + 方向惩罚",
  "Reranker 精排并标记 primary evidence",
  "Context Builder 组织证据与最终 Prompt",
  "本地/在线模型生成回复",
  "Reply Rules 做高风险场景兜底",
  "前端展示证据、Prompt、诊断和反馈",
];

const interviewAngles = [
  {
    title: "不是聊天壳",
    text: "项目把检索、证据组织、生成、兜底、反馈、评测串成闭环，可解释每一次回答为什么这样生成。",
  },
  {
    title: "可定位坏案例",
    text: "评测报告记录 retrieved_items、prompt_context_items、reply 和 judge 结果，能定位问题在 retrieval、context builder 还是 reply rules。",
  },
  {
    title: "可运营知识库",
    text: "前端提供草稿、审核、发布、回滚入口，模拟真实客服知识库从编辑到影响 RAG 的流程。",
  },
];

export function ProjectShowcaseView({ onBack }: { onBack: () => void }) {
  return (
    <section className="view-surface space-y-4">
      <button className="inline-flex items-center gap-2 text-sm font-bold text-muted" type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        返回系统
      </button>

      <div className="overflow-hidden rounded-work border border-line bg-[#101825] text-white shadow-workbench">
        <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="p-6 md:p-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black text-emerald-200">
              <BadgeCheck size={15} /> 面试项目展示
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              外卖客服 RAG 智能问答系统
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              一个面向外卖售后场景的 AI 应用工程项目：从知识库召回、证据组织、Prompt 构造、本地模型生成，
              到高风险兜底、反馈采集和自动化评测，完整展示 RAG 系统落地能力。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                className="inline-flex min-h-11 items-center gap-2 rounded-work bg-emerald-400 px-4 text-sm font-black text-[#102018]"
                href="https://github.com/kue04"
                target="_blank"
                rel="noreferrer"
              >
                GitHub 主页 <Sparkles size={16} />
              </a>
              <button
                className="inline-flex min-h-11 items-center gap-2 rounded-work border border-white/15 px-4 text-sm font-black text-white"
                type="button"
                onClick={onBack}
              >
                进入演示 <Gauge size={16} />
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/[0.04] p-5 md:p-8 lg:border-l lg:border-t-0">
            <div className="grid gap-3">
              {pipeline.map((item, index) => (
                <div key={item} className="grid grid-cols-[34px_1fr] items-center gap-3 rounded-work border border-white/10 bg-white/[0.06] p-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-300 text-sm font-black text-[#102018]">
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="rounded-work border border-line bg-white p-4 shadow-workbench">
              <Icon size={20} className="text-leaf" />
              <p className="mt-3 text-xs font-black text-muted">{item.label}</p>
              <b className="mt-1 block text-lg">{item.value}</b>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-work border border-line bg-white p-5 shadow-workbench">
          <span className="inline-flex items-center gap-2 text-sm font-black text-leaf">
            <GitBranch size={17} /> 系统架构
          </span>
          <div className="mt-5 grid gap-3">
            {[
              { icon: Brain, text: "FastAPI 后端组织 RAG、模型、知识库和运营接口" },
              { icon: Layers3, text: "React 前端把客服工作台、RAG 诊断、知识运营拆成可演示模块" },
              { icon: ShieldCheck, text: "隐私脱敏、reply rules 和 fallback 降低高风险回答" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.text} className="flex gap-3 rounded-work border border-line bg-subtle p-3">
                  <Icon size={19} className="mt-1 shrink-0 text-leaf" />
                  <p className="text-sm font-bold leading-6 text-ink">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {interviewAngles.map((item) => (
            <article key={item.title} className="rounded-work border border-line bg-white p-5 shadow-workbench">
              <h2 className="text-lg font-black">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
