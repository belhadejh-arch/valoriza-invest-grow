import { Link, useRouterState } from "@tanstack/react-router";
import { Gift, Home, TrendingUp, User, Users, Video } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BottomNav() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();

  const items = [
    { to: "/home", label: t("nav.home"), icon: Home },
    { to: "/investment", label: t("nav.investment"), icon: TrendingUp },
    { to: "/team", label: t("nav.team"), icon: Users },
    { to: "/tasks", label: t("nav.tasks"), icon: Video },
    { to: "/rewards", label: t("nav.rewards"), icon: Gift },
    { to: "/account", label: t("nav.account"), icon: User },
  ] as const;

  return (
    <nav
      id="app-bottom-nav"
      aria-label="شريط التنقل السفلي"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 w-full max-w-full border-t border-border/80 bg-background/95"
    >
      <ul className="mx-auto grid w-full max-w-lg grid-cols-6 px-0.5 pb-[env(safe-area-inset-bottom)] ps-[env(safe-area-inset-left)] pe-[env(safe-area-inset-right)]">
        {items.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath === to;
          return (
            <li key={to} className="min-w-0">
              <Link
                id={`bottom-nav-link-${to.replace("/", "")}`}
                to={to}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-1.5 text-[9px] min-[380px]:text-[10px] sm:text-[11px] transition-colors duration-150 ${
                  isActive
                    ? "text-cyan-glow font-black"
                    : "text-muted-foreground font-semibold hover:text-foreground"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 inset-x-2 h-0.5 rounded-full bg-cyan-glow" />
                )}
                <Icon
                  className={`h-5 w-5 shrink-0 transition-transform duration-150 group-active:scale-90 ${
                    isActive ? "text-cyan-glow" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <span className="flex min-h-[2.5em] w-full items-center justify-center text-center leading-tight tracking-tight [overflow-wrap:anywhere]">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
