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

  // Query unread notifications count
  const { data: notifData } = useQuery({
    queryKey: ["user-notifications-count"],
    queryFn: () => getUserNotifications(),
    refetchInterval: 20000,
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
      toast.success("تم تسجيل الخروج بنجاح");
      navigate({ to: "/", replace: true });
    } catch {
      navigate({ to: "/", replace: true });
    }
  };

  return (
    <>
      <header
        id="app-main-header"
        className="sticky top-0 z-40 border-b border-border/80 bg-navy-deep/95 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-3 py-2.5">
          {/* Hamburger Menu Button */}
          <button
            id="header-hamburger-btn"
            type="button"
            onClick={handleToggleMenu}
            aria-label="القائمة الجانبية"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface/80 border border-border text-foreground hover:border-cyan-glow transition-all active:scale-95"
          >
            <Menu className="h-5 w-5 text-cyan-glow" />
          </button>

          {/* Valoriza Brand Logo */}
          <Link to="/home" className="flex items-center">
            <Logo size="sm" />
          </Link>

          {/* Right Side Controls */}
          <div className="flex items-center gap-1.5">
            {vipLevel !== undefined && vipLevel > 0 && (
              <span
                id="header-vip-badge"
                className="flex items-center gap-1 rounded-full border border-vip/50 bg-vip/15 px-2 py-0.5 text-[10px] font-extrabold text-vip-soft shadow-[0_0_10px_oklch(0.72_0.17_310/0.3)]"
              >
                <Crown className="h-3 w-3 text-gold" />
                VIP {vipLevel}
              </span>
            )}

            {/* Notification Bell with Badge */}
            <button
              id="header-notifications-btn"
              type="button"
              onClick={() => setNotificationsOpen(true)}
              aria-label="الإشعارات"
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-surface border border-border/80 text-foreground hover:border-cyan-glow hover:text-cyan-glow transition-all active:scale-95"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-extrabold text-white shadow-[0_0_8px_oklch(0.63_0.24_25/0.8)] animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showAbout && (
              <Link
                id="header-about-btn"
                to="/about"
                className="flex shrink-0 items-center gap-1 rounded-full border border-cyan-glow/60 bg-surface/60 px-2.5 py-1 text-[11px] font-bold text-cyan-glow hover:border-cyan-glow hover:bg-surface transition-all shadow-[0_0_12px_oklch(0.82_0.14_205/0.25)]"
              >
                <Info className="h-3.5 w-3.5" />
                <span>حول المنصة</span>
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
            className="h-full w-4/5 max-w-xs overflow-y-auto border-l border-cyan-glow/40 bg-navy-deep p-4 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
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

              {/* User Snapshot Card */}
              {username && (
                <div className="mt-3 surface-card glow-border p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface border border-primary/40 text-cyan-glow font-bold">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{username}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Crown className="h-3 w-3 text-gold" />
                        {vipLevel ? `عضو VIP ${vipLevel}` : "عضو عادي"}
                      </p>
                    </div>
                  </div>

                  {balance !== undefined && (
                    <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2">
                      <span className="text-[11px] text-muted-foreground">الرصيد:</span>
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
                      إيداع
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
                      سحب
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Items */}
              <nav className="mt-4 space-y-1">
                <Link
                  to="/home"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
                  activeProps={{
                    className: "bg-surface text-cyan-glow border-r-2 border-cyan-glow",
                  }}
                >
                  <Home className="h-4 w-4 text-cyan-glow" />
                  الرئيسية
                </Link>

                <Link
                  to="/investment"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
                  activeProps={{
                    className: "bg-surface text-cyan-glow border-r-2 border-cyan-glow",
                  }}
                >
                  <TrendingUp className="h-4 w-4 text-gold" />
                  الاستثمار وباقات VIP
                </Link>

                <Link
                  to="/team"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
                  activeProps={{
                    className: "bg-surface text-cyan-glow border-r-2 border-cyan-glow",
                  }}
                >
                  <Users className="h-4 w-4 text-primary" />
                  فريقي ومستويات الإحالة
                </Link>

                <Link
                  to="/rewards"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
                  activeProps={{
                    className: "bg-surface text-cyan-glow border-r-2 border-cyan-glow",
                  }}
                >
                  <Gift className="h-4 w-4 text-pink-400" />
                  سجل المكافآت وعجلة الحظ
                </Link>

                <Link
                  to="/tasks"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
                  activeProps={{
                    className: "bg-surface text-cyan-glow border-r-2 border-cyan-glow",
                  }}
                >
                  <Video className="h-4 w-4 text-purple-400" />
                  المهام اليومية وعمولة الفيديو
                </Link>

                <Link
                  to="/admin"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-amber-300 hover:bg-surface transition-colors border border-amber-500/20 bg-amber-500/5"
                  activeProps={{
                    className: "bg-surface text-amber-300 border-r-2 border-amber-400",
                  }}
                >
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  لوحة الإدارة (Admin Panel)
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenSupport?.();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors text-right"
                >
                  <Headphones className="h-4 w-4 text-cyan-glow" />
                  خدمة العملاء والدعم
                </button>

                <Link
                  to="/about"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
                  activeProps={{
                    className: "bg-surface text-cyan-glow border-r-2 border-cyan-glow",
                  }}
                >
                  <Info className="h-4 w-4 text-cyan-glow" />
                  حول المنصة ونبذة عن الشركة
                </Link>

                <Link
                  to="/account"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-surface transition-colors"
                  activeProps={{
                    className: "bg-surface text-cyan-glow border-r-2 border-cyan-glow",
                  }}
                >
                  <User className="h-4 w-4 text-gold" />
                  حسابي وإعدادات الأمان
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
                تسجيل الخروج
              </button>

              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                Valoriza Investment · مدريد، إسبانيا
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
