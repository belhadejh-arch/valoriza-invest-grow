import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle-btn"
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "تفعيل الوضع النهاري (Light Mode)" : "تفعيل الوضع الليلي (Dark Mode)"}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
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
