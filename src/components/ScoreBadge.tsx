type ScoreBadgeProps = {
  label: string;
  value?: number;
  tone?: "green" | "amber" | "blue" | "red" | "neutral";
};

const toneClass = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  blue: "border-blue-200 bg-blue-50 text-blue-800",
  red: "border-red-200 bg-red-50 text-red-800",
  neutral: "border-line bg-white text-ink",
};

export default function ScoreBadge({
  label,
  value,
  tone = "neutral",
}: ScoreBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-black ${toneClass[tone]}`}>
      <span>{label}</span>
      <span>{typeof value === "number" ? value.toFixed(4) : "-"}</span>
    </span>
  );
}
