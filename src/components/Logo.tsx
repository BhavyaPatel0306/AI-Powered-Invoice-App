import Link from "next/link";

export function Logo({ subtle = false }: { subtle?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 group">
      <span className="relative grid place-items-center w-9 h-9 rounded-xl bg-ink text-bg overflow-hidden">
        <span className="absolute inset-1 rounded-lg border border-bg/40" />
        <span className="w-1.5 h-1.5 rounded-full bg-clay" />
      </span>
      <span className="leading-none">
        <span className="font-display text-xl tracking-tight">FlintFramePro</span>
        {!subtle && (
          <span className="block text-[0.62rem] uppercase tracking-[0.2em] text-muted mt-0.5">
            Get paid faster
          </span>
        )}
      </span>
    </Link>
  );
}
