import { useState } from "react";
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
import { AdminOverviewTab } from "@/components/valoriza/admin/AdminOverviewTab";
import { AdminUsersTab } from "@/components/valoriza/admin/AdminUsersTab";
import { AdminDepositsTab } from "@/components/valoriza/admin/AdminDepositsTab";
import { AdminWithdrawalsTab } from "@/components/valoriza/admin/AdminWithdrawalsTab";
import { AdminInvestmentsTab } from "@/components/valoriza/admin/AdminInvestmentsTab";
import { AdminVipPackagesTab } from "@/components/valoriza/admin/AdminVipPackagesTab";
import { AdminTasksTab } from "@/components/valoriza/admin/AdminTasksTab";
import { AdminWheelTab } from "@/components/valoriza/admin/AdminWheelTab";
import { AdminSettingsTab } from "@/components/valoriza/admin/AdminSettingsTab";
import { AdminBroadcastTab } from "@/components/valoriza/admin/AdminBroadcastTab";
import { AdminAuditLogsTab } from "@/components/valoriza/admin/AdminAuditLogsTab";

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
  const [activeTab, setActiveTab] = useState<string>("overview");
  const queryClient = useQueryClient();
  const [isRefreshingGlobal, setIsRefreshingGlobal] = useState(false);

  const handleGlobalRefresh = async () => {
    setIsRefreshingGlobal(true);
    await queryClient.invalidateQueries();
    toast.success("تم تحديث جميع بيانات لوحة التحكم من PostgreSQL بنجاح");
    setTimeout(() => setIsRefreshingGlobal(false), 500);
  };

  const tabs = [
    { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
    { id: "deposits", label: "الإيداعات", icon: ArrowDownLeft },
    { id: "withdrawals", label: "السحوبات", icon: ArrowUpRight },
    { id: "users", label: "المستخدمين", icon: Users },
    { id: "investments", label: "الصناديق", icon: TrendingUp },
    { id: "vip", label: "باقات VIP", icon: Crown },
    { id: "tasks", label: "المهام", icon: Video },
    { id: "wheel", label: "عجلة الحظ", icon: Sparkles },
    { id: "broadcast", label: "التعاميم", icon: Bell },
    { id: "settings", label: "الإعدادات", icon: Settings },
    { id: "audit", label: "سجل التدقيق", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-navy-night pb-16 text-foreground" dir="rtl">
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
              تحديث تلقائي نشط (5ث)
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
      </main>
    </div>
  );
}
