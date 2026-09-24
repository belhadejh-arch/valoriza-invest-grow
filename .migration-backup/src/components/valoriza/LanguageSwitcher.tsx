import { Globe, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function LanguageSwitcher({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { currentLanguage } = useI18n();

  return (
    <div className={`relative inline-block text-right ${className}`}>
      <div
        id="language-switcher-indicator"
        title="اللغة الرسمية الموحدة: العربية"
        aria-label="اللغة الموحدة: العربية"
        className="flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/80 px-2.5 py-1 text-xs font-bold text-foreground shadow-sm select-none"
      >
        <Globe className="h-3.5 w-3.5 text-cyan-glow" />
        <span className="text-[13px] leading-none">{currentLanguage.flag}</span>
        {!compact && <span className="font-bold text-foreground">{currentLanguage.nativeName}</span>}
        <span className="hidden sm:inline-flex items-center gap-0.5 rounded-full bg-cyan-glow/15 px-1.5 py-0.2 text-[9px] font-bold text-cyan-glow">
          <Check className="h-2.5 w-2.5" />
          <span>موحدة</span>
        </span>
      </div>
    </div>
  );
}

