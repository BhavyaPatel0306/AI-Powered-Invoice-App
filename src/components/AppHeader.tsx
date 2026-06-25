import Link from "next/link";
import { Logo } from "./Logo";

export function AppHeader({ showNew = true }: { showNew?: boolean }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/80 border-b border-line">
      <div className="mx-auto max-w-3xl px-5 h-16 flex items-center justify-between">
        <Logo />
        {showNew && (
          <div className="flex items-center gap-2">
            <Link href="/clients/new" className="btn btn-ghost !px-3 sm:!px-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M19 8v6M22 11h-6" />
              </svg>
              <span className="hidden sm:inline">New client</span>
            </Link>
            <Link href="/new" className="btn btn-primary !px-3 sm:!px-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:inline">New invoice</span>
              <span className="sm:hidden">Invoice</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
