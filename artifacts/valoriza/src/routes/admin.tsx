import { lazy, Suspense, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
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
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getAdminSession, logoutAdmin } from "@/lib/admin-auth.functions";

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

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { admin } = await getAdminSession();
      if (admin) return;
    } catch {
      // A failed session check must fail closed.
    }
    throw redirect({ to: "/admin-login", replace: true });
  },
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutAdmin().catch(() => undefined);
    await navigate({ to: "/admin-login", replace: true });
  };

  const tabs = [
    { id: "overview", label: t("admin.overview"), icon: LayoutDashboard },
    { id: "deposits", label: t("admin.depositsTab"), icon: ArrowDownLeft },
    { id: "withdrawals", label: t("admin.withdrawalsTab"), icon: ArrowUpRight },
    { id: "users", label: t("admin.users"), icon: Users },
    { id: "investments", label: t("admin.funds"), icon: TrendingUp },
    { id: "vip", label: t("admin.vipPackages"), icon: Crown },
    { id: "tasks", label: t("admin.tasks"), icon: Video },
    { id: "wheel", label: t("admin.wheel"), icon: Sparkles },
    { id: "broadcast", label: t("admin.broadcast"), icon: Bell },
    { id: "settings", label: t("admin.settings"), icon: Settings },
    { id: "audit", label: t("admin.audit"), icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-navy-night pb-16 text-foreground" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-navy-deep/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border-r border-border/60 pr-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/20 text-amber-400">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <h1 className="text-xs font-black text-foreground">{t("admin.dashboard")}</h1>
                <p className="text-[10px] font-bold text-amber-400">{t("admin.controlPanel")}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {t("admin.systemActive")}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{t("admin.logout")}</span>
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-6xl overflow-x-auto px-4 pb-2 pt-1 scrollbar-none">
          <div className="flex min-w-max items-center gap-1">
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
                      : "border border-border/70 bg-surface/60 text-muted-foreground hover:bg-surface hover:text-foreground"
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

      <main className="mx-auto max-w-6xl px-4 pt-5">
        <Suspense
          fallback={
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              {t("common.loading")}
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