export function Score({ label, value }: { label: string; value?: number }) {
  return (
    <span className="rounded-full bg-subtle px-2 py-1 text-[11px] font-black text-muted">
      {label}: {typeof value === "number" ? value.toFixed(3) : "-"}
    </span>
  );
}
