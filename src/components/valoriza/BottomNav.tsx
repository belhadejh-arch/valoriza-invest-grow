import { Link, useRouterState } from "@tanstack/react-router";
import { Gift, Home, TrendingUp, User, Users, Video } from "lucide-react";

export function BottomNav() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const isTasksPage = currentPath.includes("/tasks");

  // Dynamic 4th tab depending on route context matching PDF requirements
  const items = [
    { to: "/home", label: "الرئيسية", icon: Home },
    { to: "/investment", label: "الاستثمار", icon: TrendingUp },
    { to: "/team", label: "فريقي", icon: Users },
    isTasksPage
      ? { to: "/tasks", label: "المهام", icon: Video }
      : { to: "/rewards", label: "المكافآت", icon: Gift },
    { to: "/account", label: "حسابي", icon: User },
  ] as const;

  return (
    <nav
      id="app-bottom-nav"
      aria-label="شريط التنقل السفلي"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-navy-deep/95 backdrop-blur-lg shadow-[0_-8px_20px_-6px_rgba(0,0,0,0.6)]"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath === to;
          return (
            <li key={to} className="flex-1">
              <Link
                id={`bottom-nav-link-${to.replace("/", "")}`}
                to={to}
                className={`group relative flex flex-col items-center gap-1 py-2 text-[11px] transition-all duration-200 ${
                  isActive
                    ? "text-cyan-glow font-black"
                    : "text-foreground/70 font-semibold hover:text-foreground"
                }`}
              >
                {/* Glowing Top Active Indicator */}
                {isActive && (
                  <span className="absolute top-0 inset-x-3 h-0.5 rounded-full bg-cyan-glow shadow-[0_0_8px_oklch(0.82_0.14_205)]" />
                )}

                <Icon
                  className={`h-5 w-5 transition-transform duration-200 group-active:scale-90 ${
                    isActive
                      ? "text-cyan-glow drop-shadow-[0_0_8px_oklch(0.82_0.14_205/0.8)] scale-110"
                      : "text-foreground/70 group-hover:text-foreground"
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
