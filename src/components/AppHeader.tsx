import Link from "next/link";
import { Logo } from "./Logo";

export function AppHeader({ showNew = true }: { showNew?: boolean }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/80 border-b border-line">
      <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
        <Logo />
        {showNew && (
          <Link href="/new" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New invoice
          </Link>
        )}
      </div>
    </header>
  );
}
