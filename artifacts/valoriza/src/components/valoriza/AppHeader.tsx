import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Crown,
  Gift,
  Headphones,
  Home,
  Info,
  LogOut,
  Menu,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "./Logo";
import { NotificationsDrawer } from "./NotificationsDrawer";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";
import { getUserNotifications } from "@/lib/valoriza-tasks.functions";
import { supabase } from "@/integrations/supabase/client";

interface AppHeaderProps {
  onMenu?: () => void;
  showAbout?: boolean;
  vipLevel?: number;
  username?: string;
  balance?: number;
  onOpenDeposit?: () => void;
  onOpenWithdraw?: () => void;
  onOpenSupport?: () => void;
}

export function AppHeader({
  onMenu,
  showAbout = true,
  vipLevel,
  username,
  balance,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenSupport,
}: AppHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const { t, isRTL } = useI18n();
  const content = useLocalizedContent();

  // Query unread notifications count
  const { data: notifData } = useQuery({
    queryKey: ["user-notifications-count"],
    queryFn: () => getUserNotifications(),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const unreadCount = notifData?.unreadCount ?? 0;

  const handleToggleMenu = () => {
    if (onMenu) {
      onMenu();
    } else {
      setDrawerOpen((prev) => !prev);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success(t("common.success"));
      navigate({ to: "/", replace: true });
    } catch {
      navigate({ to: "/", replace: true });
    }
  };

  return (
    <>
      <header
        id="app-main-header"
        className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md transition-colors"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 sm:px-6 py-2 sm:py-2.5">
          {/* Left section: Hamburger (mobile) + Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Hamburger Menu Button (Mobile only) */}
            <button
              id="header-hamburger-btn"
              type="button"
              onClick={handleToggleMenu}
              aria-label={t("nav.home")}
              className="flex md:hidden h-8 w-8 items-center justify-center rounded-xl bg-surface/80 border border-border text-foreground hover:border-cyan-glow transition-all active:scale-95"
            >
              <Menu className="h-4 w-4 text-cyan-glow" />
            </button>

            {/* Valoriza Brand Logo */}
            <Link to="/home" className="flex items-center">
              <Logo size="sm" />
            </Link>
          </div>

          {/* Center section: Desktop Navigation Bar (Visible on md+ screens) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              to="/home"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-foreground/80 hover:text-foreground hover:bg-surface transition-all"
              activeProps={{
                className: "bg-surface text-cyan-glow font-black border-b-2 border-cyan-glow",
              }}
            >
              <Home className="h-3.5 w-3.5 text-cyan-glow" />
              <span>{t("nav.home")}</span>
            </Link>

            <Link
              to="/investment"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-foreground/80 hover:text-foreground hover:bg-surface transition-all"
              activeProps={{
                className: "bg-surface text-gold font-black border-b-2 border-gold",
              }}
            >
              <TrendingUp className="h-3.5 w-3.5 text-gold" />
              <span>{t("nav.investment")}</span>
            </Link>

            <Link
              to="/team"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-foreground/80 hover:text-foreground hover:bg-surface transition-all"
              activeProps={{
                className: "bg-surface text-primary font-black border-b-2 border-primary",
              }}
            >
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>{t("nav.team")}</span>
            </Link>

            <Link
              to="/tasks"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-foreground/80 hover:text-foreground hover:bg-surface transition-all"
              activeProps={{
                className: "bg-surface text-purple-400 font-black border-b-2 border-purple-400",
              }}
            >
              <Video className="h-3.5 w-3.5 text-purple-400" />
              <span>{t("nav.tasks")}</span>
            </Link>

            <Link
              to="/rewards"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-foreground/80 hover:text-foreground hover:bg-surface transition-all"
              activeProps={{
                className: "bg-surface text-pink-400 font-black border-b-2 border-pink-400",
              }}
            >
              <Gift className="h-3.5 w-3.5 text-pink-400" />
              <span>{t("nav.rewards")}</span>
            </Link>

            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-300 hover:bg-surface transition-all border border-amber-500/25 bg-amber-500/5"
              activeProps={{
                className: "bg-surface text-amber-300 font-black border-b-2 border-amber-400",
              }}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>{t("nav.admin")}</span>
            </Link>
          </nav>

          {/* Right Side Controls: Balance snapshot (desktop), VIP, Theme, Language, Notifications */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Desktop Balance Snapshot */}
            {balance !== undefined && (
              <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/60 px-3 py-1 text-xs">
                <span className="text-muted-foreground text-[11px]">{t("common.balance")}:</span>
                <span className="font-extrabold text-gold-gradient">${balance.toFixed(2)}</span>
              </div>
            )}

            {vipLevel !== undefined && vipLevel > 0 && (
              <span
                id="header-vip-badge"
                className="flex items-center gap-1 rounded-full border border-vip/50 bg-vip/15 px-2 py-0.5 text-[10px] font-extrabold text-vip-soft shadow-[0_0_10px_oklch(0.72_0.17_310/0.3)]"
              >
                <Crown className="h-3 w-3 text-gold" />
                {t("public.header.vipLevel").replace("{level}", String(vipLevel))}
              </span>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher compact={true} />

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Notification Bell with Badge */}
            <button
              id="header-notifications-btn"
              type="button"
              onClick={() => setNotificationsOpen(true)}
              aria-label={t("rewards.title")}
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-surface border border-border/80 text-foreground hover:border-cyan-glow hover:text-cyan-glow transition-all active:scale-95"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-extrabold text-white shadow-[0_0_8px_oklch(0.63_0.24_25/0.8)] animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Desktop Account / Logout button */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/account"
                className="flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/80 px-2.5 py-1 text-xs font-bold text-foreground hover:border-primary transition-all"
              >
                <User className="h-3.5 w-3.5 text-gold" />
                <span className="max-w-[80px] truncate">
                  {username ? content(username, { allowUserIdentifier: true }) : t("nav.account")}
                </span>
              </Link>
            </div>

            {showAbout && (
              <Link
                id="header-about-btn"
                to="/about"
                className="hidden sm:flex shrink-0 items-center gap-1 rounded-full border border-cyan-glow/60 bg-surface/60 px-2.5 py-1 text-[11px] font-bold text-cyan-glow hover:border-cyan-glow hover:bg-surface transition-all shadow-[0_0_12px_oklch(0.82_0.14_205/0.25)]"
              >
                <Info className="h-3.5 w-3.5" />
                <span>{t("nav.about")}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Notifications Drawer */}
      <NotificationsDrawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />

      {/* Slide-over Sidebar Drawer */}
      {drawerOpen && (
        <div
          id="header-drawer-overlay"
          className="fixed inset-0 z-50 flex justify-start bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            id="header-drawer-panel"
            className="h-full w-4/5 max-w-xs overflow-y-auto border-s border-cyan-glow/40 bg-card p-4 shadow-2xl flex flex-col justify-between animate-in slide-in-from-start duration-300"
            onClick={(e) => e.stopPropagation()}
            dir={isRTL ? "rtl" : "ltr"}
          >
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <Logo size="sm" />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Theme & Language bar */}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-surface/60 p-2 border border-border/60">
                <span className="text-xs font-bold text-muted-foreground">
                  {t("public.header.languageTheme")}
                </span>
                <div className="flex items-center gap-2">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </div>

              {/* User Snapshot Card */}
              {username && (
                <div className="mt-3 surface-card glow-border p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface border border-primary/40 text-cyan-glow font-bold">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 text-start">
                      <p className="text-xs font-bold text-foreground truncate">
                        {content(username, { allowUserIdentifier: true })}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Crown className="h-3 w-3 text-gold" />
                        {vipLevel
                          ? t("public.header.vipLevel").replace("{level}", String(vipLevel))
                          : t("home.vipStatus")}
                      </p>
                    </div>
                  </div>

                  {balance !== undefined && (
                    <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2">
                      <span className="text-[11px] text-muted-foreground">
                        {t("common.balance")}:
                      </span>
                      <span className="text-sm font-extrabold text-gold-gradient">
                        ${balance.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Quick Deposit / Withdraw Buttons */}
                  <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerOpen(false);
                        onOpenDeposit?.();
                      }}
                      className="flex items-center justify-center gap-1 rounded-xl brand-gradient py-1.5 text-[10px] font-bold text-primary-foreground shadow-glow"
                    >
                      <ArrowDownLeft className="h-3 w-3" />
                      {t("home.deposit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerOpen(false);
                        onOpenWithdraw?.();
                      }}
                      className="flex items-center justify-center gap-1 rounded-xl border border-cyan-glow/40 bg-surface py-1.5 text-[10px] font-bold text-cyan-glow hover:bg-surface/80"
                    >
                      <ArrowUpRight className="h-3 w-3" />
                      {t("home.withdraw")}
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Items */}
              <nav className="mt-4 space-y-1 text-start">
                <Link
                  to="/home"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
                  activeProps={{
                    className: "bg-surface text-cyan-glow border-s-2 border-cyan-glow",
                  }}
                >
                  <Home className="h-4 w-4 text-cyan-glow" />
                  {t("nav.home")}
                </Link>

                <Link
                  to="/investment"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
                  activeProps={{
                    className: "bg-surface text-cyan-glow border-s-2 border-cyan-glow",
                  }}
                >
                  <TrendingUp className="h-4 w-4 text-gold" />
                  {t("nav.investment")}
                </Link>

                <Link
                  to="/team"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
                  activeProps={{
                    className: "bg-surface text-cyan-glow border-s-2 border-cyan-glow",
                  }}
                >
                  <Users className="h-4 w-4 text-primary" />
                  {t("nav.team")}
                </Link>

                <Link
                  to="/rewards"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
                  activeProps={{
                    className: "bg-surface text-cyan-glow border-s-2 border-cyan-glow",
                  }}
                >
                  <Gift className="h-4 w-4 text-pink-400" />
                  {t("nav.rewards")}
                </Link>

                <Link
                  to="/tasks"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
                  activeProps={{
                    className: "bg-surface text-cyan-glow border-s-2 border-cyan-glow",
                  }}
                >
                  <Video className="h-4 w-4 text-purple-400" />
                  {t("nav.tasks")}
                </Link>

                <Link
                  to="/admin"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-amber-300 hover:bg-surface transition-colors border border-amber-500/20 bg-amber-500/5"
                  activeProps={{
                    className: "bg-surface text-amber-300 border-s-2 border-amber-400",
                  }}
                >
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  {t("nav.admin")}
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenSupport?.();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors text-start"
                >
                  <Headphones className="h-4 w-4 text-cyan-glow" />
                  {t("nav.support")}
                </button>

                <Link
                  to="/about"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
                  activeProps={{
                    className: "bg-surface text-cyan-glow border-s-2 border-cyan-glow",
                  }}
                >
                  <Info className="h-4 w-4 text-cyan-glow" />
                  {t("nav.about")}
                </Link>

                <Link
                  to="/account"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
                  activeProps={{
                    className: "bg-surface text-cyan-glow border-s-2 border-cyan-glow",
                  }}
                >
                  <User className="h-4 w-4 text-gold" />
                  {t("nav.account")}
                </Link>
              </nav>
            </div>

            {/* Logout and Footer */}
            <div className="pt-4 border-t border-border/50">
              <button
                id="drawer-logout-btn"
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl bg-danger/15 border border-danger/30 px-3 py-2 text-xs font-bold text-danger hover:bg-danger/25 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {t("nav.logout")}
              </button>

              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                {t("public.header.footer")}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
