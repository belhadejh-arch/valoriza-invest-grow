import { Check, ChevronDown, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n, type LanguageCode } from "@/lib/i18n";

export function LanguageSwitcher({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { lang, setLang, languages, t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLanguage = languages.find((language) => language.code === lang) ?? languages[0];

  useEffect(() => {
    if (!open) return;
    const closeIfOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-block text-right ${className}`}>
      <button
        id="language-switcher"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title={t("common.language")}
        className="flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/80 px-2.5 py-1 text-xs font-bold text-foreground shadow-sm select-none"
      >
        <Globe className="h-3.5 w-3.5 text-cyan-glow" />
        <span className="text-[13px] leading-none">{currentLanguage.flag}</span>
        {!compact && <span className="font-bold text-foreground">{currentLanguage.nativeName}</span>}
        <span className="hidden sm:inline-flex items-center gap-0.5 rounded-full bg-cyan-glow/15 px-1.5 py-0.5 text-[9px] font-bold text-cyan-glow">
          {currentLanguage.code.toUpperCase()}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={t("common.language")}
          className="absolute right-0 top-full z-50 mt-2 min-w-36 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl"
        >
          {languages.map((language) => (
            <button
              key={language.code}
              type="button"
              role="option"
              aria-selected={lang === language.code}
              onClick={() => {
                setLang(language.code as LanguageCode);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-xs font-bold text-foreground hover:bg-surface"
            >
              <span className="text-sm">{language.flag}</span>
              <span className="flex-1">{language.nativeName}</span>
              {lang === language.code && <Check className="h-3.5 w-3.5 text-cyan-glow" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
