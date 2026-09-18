import { Link } from "@tanstack/react-router";
import { Info, Menu } from "lucide-react";
import { Logo } from "./Logo";

export function AppHeader({ onMenu }: { onMenu?: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-navy-deep/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={onMenu}
          aria-label="القائمة"
          className="rounded-xl p-2 text-foreground/80 transition-colors hover:bg-surface"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Logo size="sm" />
        <Link
          to="/about"
          className="flex shrink-0 items-center gap-1 rounded-full border border-primary/60 px-2.5 py-1.5 text-[11px] font-semibold text-primary"
        >
          <Info className="h-3.5 w-3.5" />
          حول المنصة
        </Link>
      </div>
    </header>
  );
}
