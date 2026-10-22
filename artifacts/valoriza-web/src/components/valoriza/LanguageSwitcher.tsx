import { Globe } from "lucide-react";
import { useI18n, type LanguageCode } from "@/lib/i18n";

export function LanguageSwitcher({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { lang, setLang, languages, t } = useI18n();

  return (
    <div className={`relative inline-block text-right ${className}`}>
      <label
        id="language-switcher"
        title={t("common.language")}
        className="flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/80 px-2.5 py-1 text-xs font-bold text-foreground shadow-sm select-none"
      >
        <Globe className="h-3.5 w-3.5 text-cyan-glow" />
        <select aria-label={t("common.language")} value={lang}
          onChange={(event) => setLang(event.target.value as LanguageCode)}
          className={`bg-transparent text-foreground outline-none cursor-pointer ${compact ? "max-w-20" : ""}`}>
          {languages.map((language) => <option className="bg-background text-foreground" key={language.code} value={language.code}>{language.nativeName}</option>)}
        </select>
      </label>
    </div>
  );
}
