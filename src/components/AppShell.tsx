import { Database, MessageSquareText, Radar } from "lucide-react";
import { useState, type ReactNode } from "react";

type AppShellProps = {
  topBar: ReactNode;
  chatPanel: ReactNode;
  retrievalPanel: ReactNode;
  knowledgePanel: ReactNode;
};

type PanelKey = "chat" | "retrieval" | "knowledge";

const panels: Array<{ key: PanelKey; title: string; icon: ReactNode; subtitle: string }> = [
  {
    key: "chat",
    title: "客服回复",
    subtitle: "用户问题、生成回复、参考资料与链路标记",
    icon: <MessageSquareText size={18} />,
  },
  {
    key: "retrieval",
    title: "RAG 解释",
    subtitle: "检索证据、分数拆解、prompt 与 trace",
    icon: <Radar size={18} />,
  },
  {
    key: "knowledge",
    title: "知识库样本",
    subtitle: "分类浏览、关键词搜索与样本回填",
    icon: <Database size={18} />,
  },
];

export default function AppShell({
  topBar,
  chatPanel,
  retrievalPanel,
  knowledgePanel,
}: AppShellProps) {
  const [activePanel, setActivePanel] = useState<PanelKey>("chat");
  const panelMap: Record<PanelKey, ReactNode> = {
    chat: chatPanel,
    retrieval: retrievalPanel,
    knowledge: knowledgePanel,
  };

  return (
    <main className="min-h-screen bg-workbench text-ink">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-3 p-3">
        {topBar}

        <nav className="hidden rounded-work border border-line bg-panel p-1 max-lg:grid max-lg:grid-cols-3">
          {panels.map((panel) => (
            <button
              key={panel.key}
              className={`rounded-md px-2 py-2 text-xs font-extrabold ${
                activePanel === panel.key ? "bg-ink text-white" : "text-muted"
              }`}
              type="button"
              onClick={() => setActivePanel(panel.key)}
            >
              {panel.title}
            </button>
          ))}
        </nav>

        <section className="grid min-h-0 flex-1 grid-cols-[minmax(360px,0.9fr)_minmax(460px,1.2fr)_minmax(340px,0.86fr)] gap-3 max-xl:grid-cols-[minmax(340px,0.95fr)_minmax(420px,1.05fr)] max-lg:block">
          <div className="panel-shell max-lg:hidden">
            <PanelTitle {...panels[0]} />
            {chatPanel}
          </div>

          <div className="panel-shell max-lg:hidden">
            <PanelTitle {...panels[1]} />
            {retrievalPanel}
          </div>

          <div className="panel-shell max-h-[calc(100vh-120px)] max-xl:col-span-2 max-lg:hidden">
            <PanelTitle {...panels[2]} />
            {knowledgePanel}
          </div>

          <div className="hidden max-lg:block">
            <div className="panel-shell">
              <PanelTitle {...panels.find((panel) => panel.key === activePanel)!} />
              {panelMap[activePanel]}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

type PanelTitleProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
};

function PanelTitle({ icon, title, subtitle }: PanelTitleProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-subtle px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-work bg-ink text-white">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-extrabold">{title}</h2>
          <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
