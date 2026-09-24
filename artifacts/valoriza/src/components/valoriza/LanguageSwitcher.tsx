import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function LanguageSwitcher({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { languages, lang, setLang, t } = useI18n();

  return (
    <div className={`relative inline-block text-right ${className}`}>
      <label
        id="language-switcher-indicator"
        title={t("public.lang.aria")}
        aria-label={t("public.lang.aria")}
        className="flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/80 px-2.5 py-1 text-xs font-bold text-foreground shadow-sm"
      >
        <Globe className="h-3.5 w-3.5 text-cyan-glow" />
        <select
          aria-label={t("public.lang.aria")}
          value={lang}
          onChange={(event) => setLang(event.target.value as typeof lang)}
          className={`${compact ? "max-w-[88px]" : "max-w-[112px]"} cursor-pointer appearance-none bg-transparent text-[11px] font-bold text-foreground outline-none`}
        >
          {languages.map((language) => (
            <option key={language.code} value={language.code} className="bg-background">
              {language.flag} {t(`language.${language.code}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

