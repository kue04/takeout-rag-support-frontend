import { Menu } from "lucide-react";

export function EmptyState({ title, text, compact = false }: { title: string; text: string; compact?: boolean }) {
  return (
    <div className={`rounded-[16px] bg-white text-center ${compact ? "p-4" : "p-8"}`}>
      <Menu className="mx-auto text-muted" size={compact ? 22 : 32} />
      <p className="mt-3 font-black">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}
