import { Link, useRouterState } from "@tanstack/react-router";
import { Gift, Home, TrendingUp, User, Users, Video } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BottomNav() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
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
      aria-label={t("public.bottomNav.aria")}
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-lg shadow-[0_-8px_20px_-6px_rgba(0,0,0,0.5)] transition-colors"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath === to;
          return (
            <li key={to} className="flex-1">
              <Link
                id={`bottom-nav-link-${to.replace("/", "")}`}
                to={to}
                className={`group relative flex flex-col items-center gap-1 py-2 text-[10px] sm:text-[11px] transition-all duration-200 ${
                  isActive
                    ? "text-cyan-glow font-black"
                    : "text-muted-foreground font-semibold hover:text-foreground"
                }`}
              >
                {/* Glowing Top Active Indicator */}
                {isActive && (
                  <span className="absolute top-0 inset-x-2.5 h-0.5 rounded-full bg-cyan-glow shadow-[0_0_8px_oklch(0.82_0.14_205)]" />
                )}

                <Icon
                  className={`h-4.5 w-4.5 sm:h-5 sm:w-5 transition-transform duration-200 group-active:scale-90 ${
                    isActive
                      ? "text-cyan-glow drop-shadow-[0_0_8px_oklch(0.82_0.14_205/0.8)] scale-110"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <span
                  className={`truncate leading-none ${
                    isActive ? "drop-shadow-[0_0_6px_oklch(0.82_0.14_205/0.5)]" : ""
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
