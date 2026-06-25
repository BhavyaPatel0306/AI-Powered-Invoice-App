import type { InvoiceStatus } from "@/lib/types";

const map: Record<InvoiceStatus, { cls: string; label: string; dot: string }> = {
  paid: { cls: "pill-paid", label: "Paid", dot: "bg-sage" },
  sent: { cls: "pill-sent", label: "Awaiting payment", dot: "bg-[#6c4a86]" },
  draft: { cls: "pill-draft", label: "Draft", dot: "bg-muted" },
};

export function StatusPill({ status }: { status: InvoiceStatus }) {
  const m = map[status];
  return (
    <span className={`pill ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
