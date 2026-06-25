export function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function shortDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function relTime(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86400000;
  const days = Math.round(diff / day);
  if (Math.abs(days) >= 1) return days === 0 ? "today" : days > 0 ? `${days}d ago` : `in ${-days}d`;
  const hours = Math.round(diff / 3600000);
  if (Math.abs(hours) >= 1) return `${hours}h ago`;
  const mins = Math.max(1, Math.round(diff / 60000));
  return `${mins}m ago`;
}
