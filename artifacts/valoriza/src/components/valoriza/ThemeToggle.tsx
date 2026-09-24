import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useI18n();

  return (
    <button
      id="theme-toggle-btn"
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t("public.theme.light") : t("public.theme.dark")}
      title={isDark ? t("public.theme.light") : t("public.theme.dark")}
      className={`relative flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-surface/80 text-foreground hover:border-gold hover:text-gold transition-all active:scale-90 shadow-sm ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-gold transition-transform hover:rotate-45 duration-300" />
      ) : (
        <Moon className="h-4 w-4 text-royal transition-transform hover:-rotate-12 duration-300" />
      )}
    </button>
  );
}
