import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Crown,
  Video,
  Sparkles,
  Settings,
  Bell,
  Shield,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
const AdminOverviewTab = lazy(() =>
  import("@/components/valoriza/admin/AdminOverviewTab").then((module) => ({
    default: module.AdminOverviewTab,
  })),
);
const AdminUsersTab = lazy(() =>
  import("@/components/valoriza/admin/AdminUsersTab").then((module) => ({
    default: module.AdminUsersTab,
  })),
);
const AdminDepositsTab = lazy(() =>
  import("@/components/valoriza/admin/AdminDepositsTab").then((module) => ({
    default: module.AdminDepositsTab,
  })),
);
const AdminWithdrawalsTab = lazy(() =>
  import("@/components/valoriza/admin/AdminWithdrawalsTab").then((module) => ({
    default: module.AdminWithdrawalsTab,
  })),
);
const AdminInvestmentsTab = lazy(() =>
  import("@/components/valoriza/admin/AdminInvestmentsTab").then((module) => ({
    default: module.AdminInvestmentsTab,
  })),
);
const AdminVipPackagesTab = lazy(() =>
  import("@/components/valoriza/admin/AdminVipPackagesTab").then((module) => ({
    default: module.AdminVipPackagesTab,
  })),
);
const AdminTasksTab = lazy(() =>
  import("@/components/valoriza/admin/AdminTasksTab").then((module) => ({
    default: module.AdminTasksTab,
  })),
);
const AdminWheelTab = lazy(() =>
  import("@/components/valoriza/admin/AdminWheelTab").then((module) => ({
    default: module.AdminWheelTab,
  })),
);
const AdminSettingsTab = lazy(() =>
  import("@/components/valoriza/admin/AdminSettingsTab").then((module) => ({
    default: module.AdminSettingsTab,
  })),
);
const AdminBroadcastTab = lazy(() =>
  import("@/components/valoriza/admin/AdminBroadcastTab").then((module) => ({
    default: module.AdminBroadcastTab,
  })),
);
const AdminAuditLogsTab = lazy(() =>
  import("@/components/valoriza/admin/AdminAuditLogsTab").then((module) => ({
    default: module.AdminAuditLogsTab,
  })),
);
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة تحكم الإدارة — فالوريزا" },
      { name: "description", content: "لوحة التحكم الإدارية لمنصة فالوريزا." },
    ],
  }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { dir } = useI18n();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const queryClient = useQueryClient();
  const [isRefreshingGlobal, setIsRefreshingGlobal] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void queryClient.invalidateQueries({
          predicate: (query) => String(query.queryKey[0]).startsWith("admin-"),
          refetchType: "active",
        });
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [queryClient]);

  const handleGlobalRefresh = async () => {
    setIsRefreshingGlobal(true);
    try {
      await queryClient.invalidateQueries(
        { refetchType: "all" },
        { throwOnError: true },
      );
      toast.success("تم تحديث البيانات المحمّلة من الخادم وقاعدة PostgreSQL");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `تعذر تحديث بيانات لوحة التحكم: ${error.message}`
          : "تعذر تحديث بيانات لوحة التحكم من الخادم.",
      );
    } finally {
      setIsRefreshingGlobal(false);
    }
  };

  const tabs = [
    { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
    { id: "deposits", label: "الإيداعات", icon: ArrowDownLeft },
    { id: "withdrawals", label: "السحوبات", icon: ArrowUpRight },
    { id: "users", label: "المستخدمين", icon: Users },
    { id: "investments", label: "الصناديق", icon: TrendingUp },
    { id: "vip", label: "باقات العضوية المميزة", icon: Crown },
    { id: "tasks", label: "المهام", icon: Video },
    { id: "wheel", label: "عجلة الحظ", icon: Sparkles },
    { id: "broadcast", label: "التعاميم", icon: Bell },
    { id: "settings", label: "الإعدادات", icon: Settings },
    { id: "audit", label: "سجل التدقيق", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-navy-night pb-16 text-foreground" dir={dir}>
      {/* Admin Top Bar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-navy-deep/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="flex items-center gap-1 rounded-xl bg-surface border border-border px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              <span>العودة للتطبيق</span>
            </Link>

            <div className="flex items-center gap-2 border-r border-border/60 pr-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <h1 className="text-xs font-black text-foreground">لوحة إدارة فالوريزا</h1>
                <p className="text-[10px] text-amber-400 font-bold">وحدة تحكم الإدارة</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
              <span className="hidden sm:flex rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-400 items-center gap-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                تحديث تلقائي حسب الاتصال
            </span>
            <button
              type="button"
              onClick={handleGlobalRefresh}
              disabled={isRefreshingGlobal}
              title="تحديث فوري لجميع أقسام لوحة التحكم"
              className="flex items-center gap-1.5 rounded-xl border border-cyan-glow/40 bg-cyan-glow/10 px-3 py-1.5 text-xs font-bold text-cyan-glow hover:bg-cyan-glow/20 active:scale-95 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingGlobal ? "animate-spin" : ""}`} />
              <span>تحديث شامل</span>
            </button>
          </div>
        </div>

        {/* Tab switcher navigation bar */}
        <div className="mx-auto max-w-6xl overflow-x-auto px-4 pb-2 pt-1 scrollbar-none">
          <div className="flex items-center gap-1 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`admin-tab-${tab.id}`}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? "brand-gradient text-primary-foreground shadow-glow"
                      : "bg-surface/60 border border-border/70 text-muted-foreground hover:text-foreground hover:bg-surface"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="mx-auto max-w-6xl px-4 pt-5">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">
              جاري تحميل القسم...
            </div>
          }
        >
          {activeTab === "overview" && <AdminOverviewTab onSelectTab={setActiveTab} />}
          {activeTab === "deposits" && <AdminDepositsTab />}
          {activeTab === "withdrawals" && <AdminWithdrawalsTab />}
          {activeTab === "users" && <AdminUsersTab />}
          {activeTab === "investments" && <AdminInvestmentsTab />}
          {activeTab === "vip" && <AdminVipPackagesTab />}
          {activeTab === "tasks" && <AdminTasksTab />}
          {activeTab === "wheel" && <AdminWheelTab />}
          {activeTab === "broadcast" && <AdminBroadcastTab />}
          {activeTab === "settings" && <AdminSettingsTab />}
          {activeTab === "audit" && <AdminAuditLogsTab />}
        </Suspense>
      </main>
    </div>
  );
}
