import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useI18n, type LanguageCode } from "@/lib/i18n";

export function LanguageSwitcher({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { lang, setLang, languages } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = languages.find((l) => l.code === lang) || languages[0]!;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        id="language-switcher-trigger"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Language: ${current.nativeName}`}
        className="flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/80 px-2.5 py-1 text-xs font-bold text-foreground hover:border-cyan-glow hover:text-cyan-glow transition-all active:scale-95 shadow-sm"
      >
        <Globe className="h-3.5 w-3.5 text-cyan-glow" />
        <span className="text-[13px] leading-none">{current.flag}</span>
        {!compact && <span className="hidden sm:inline font-semibold">{current.nativeName}</span>}
      </button>

      {open && (
        <div
          id="language-dropdown-menu"
          role="menu"
          aria-orientation="vertical"
          className="absolute end-0 mt-1.5 w-44 rounded-2xl border border-border bg-card/95 p-1.5 shadow-2xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40">
            Select Language / اختر اللغة
          </div>
          <div className="mt-1 space-y-1">
            {languages.map((item) => {
              const isSelected = item.code === lang;
              return (
                <button
                  key={item.code}
                  id={`lang-option-${item.code}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setLang(item.code as LanguageCode);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold transition-colors ${
                    isSelected ? "bg-primary/15 text-primary" : "text-foreground hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.flag}</span>
                    <div className="text-start">
                      <p className="leading-none">{item.nativeName}</p>
                      <p className="text-[10px] text-muted-foreground font-normal">{item.name}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
