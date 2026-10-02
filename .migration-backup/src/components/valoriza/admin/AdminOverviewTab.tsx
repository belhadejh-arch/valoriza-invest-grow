import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Video,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { getAdminOverview } from "@/lib/valoriza-admin.functions";

interface AdminOverviewTabProps {
  onSelectTab: (tab: string) => void;
}

export function AdminOverviewTab({ onSelectTab }: AdminOverviewTabProps) {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => getAdminOverview(),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-muted-foreground">
        <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
        جارٍ جلب إحصائيات المنصة...
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="surface-card rounded-2xl border border-danger/40 p-6 text-center">
        <p className="text-sm font-bold text-danger">
          تعذر جلب إحصائيات لوحة التحكم من الخادم وقاعدة البيانات.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "تحقق من اتصال الخادم بقاعدة البيانات."}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: "إجمالي المستخدمين",
      value: data?.totalUsers ?? data?.usersCount ?? 0,
      sub: "مستثمر مسجل",
      icon: Users,
      color: "text-cyan-glow",
      border: "border-cyan-glow/40",
      tab: "users",
    },
    {
      title: "إجمالي أرصدة المحافظ",
      value: `$${(data?.totalBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      sub: "رصيد نشط",
      icon: Wallet,
      color: "text-gold",
      border: "border-gold/40",
      tab: "users",
    },
    {
      title: "إجمالي الإيداعات المؤكدة",
      value: `$${(data?.totalDeposited ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      sub: "سيولة داخلة (مقبولة)",
      icon: ArrowDownLeft,
      color: "text-emerald-400",
      border: "border-emerald-500/40",
      tab: "deposits",
    },
    {
      title: "إجمالي الرصيد المسحوب",
      value: `$${(data?.totalWithdrawn ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      sub: "سحوبات مقبولة ومكتملة فقط",
      icon: ArrowUpRight,
      color: "text-amber-400",
      border: "border-amber-500/40",
      tab: "withdrawals",
    },
    {
      title: "إيداعات معلقة تتطلب مراجعة",
      value: `${data?.pendingDepositsCount ?? 0} طلبات`,
      sub: `$${(data?.pendingDepositsAmount ?? 0).toFixed(2)} بانتظار التأكيد`,
      icon: Clock,
      color: (data?.pendingDepositsCount ?? 0) > 0 ? "text-danger" : "text-muted-foreground",
      border:
        (data?.pendingDepositsCount ?? 0) > 0 ? "border-danger/60 bg-danger/5" : "border-border",
      tab: "deposits",
    },
    {
      title: "سحوبات معلقة تتطلب موافقة",
      value: `${data?.pendingWithdrawalsCount ?? 0} طلبات`,
      sub: `$${(data?.pendingWithdrawalsAmount ?? 0).toFixed(2)} بانتظار التحويل`,
      icon: Clock,
      color: (data?.pendingWithdrawalsCount ?? 0) > 0 ? "text-amber-400" : "text-muted-foreground",
      border:
        (data?.pendingWithdrawalsCount ?? 0) > 0
          ? "border-amber-400/60 bg-amber-400/5"
          : "border-border",
      tab: "withdrawals",
    },
    {
      title: "استثمارات الصناديق النشطة",
      value: `$${(data?.activeInvestmentsVolume ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      sub: `${data?.activeInvestmentsCount ?? 0} ودائع جارية`,
      icon: TrendingUp,
      color: "text-cyan-glow",
      border: "border-cyan-glow/30",
      tab: "investments",
    },
    {
      title: "المهام اليومية المنجزة",
      value: (data?.totalTasksCompleted ?? 0).toLocaleString("en-US"),
      sub: "فيديو تمت مشاهدته",
      icon: Video,
      color: "text-purple-400",
      border: "border-purple-500/30",
      tab: "tasks",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Auto-refresh status bar & Manual refresh button */}
      <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-surface/60 px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {!isError && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isError ? "bg-danger" : "bg-emerald-500"
              }`}
            />
          </span>
          <span className={`text-xs font-bold ${isError ? "text-danger" : "text-foreground"}`}>
            {isError
              ? "تعذر التحديث من الخادم؛ ستتم إعادة المحاولة تلقائياً"
              : isFetching
                ? "جارٍ جلب أحدث البيانات من الخادم وقاعدة PostgreSQL..."
                : "تحديث تلقائي مستمر من PostgreSQL (كل 5 ثوانٍ)"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-cyan-glow" : ""}`} />
          <span>تحديث يدوي الآن</span>
        </button>
      </div>
      {/* Alert if pending transactions */}
      {((data?.pendingDepositsCount ?? 0) > 0 || (data?.pendingWithdrawalsCount ?? 0) > 0) && (
        <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-amber-200 flex items-start gap-3 shadow-lg">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-extrabold text-amber-300">
              يوجد عمليات معلقة تتطلب مراجعة المشرف فوراً:
            </p>
            <p className="mt-1">
              • {data?.pendingDepositsCount} طلبات إيداع معلقة بمبلغ إجمالي $
              {data?.pendingDepositsAmount.toFixed(2)}.
              <br />• {data?.pendingWithdrawalsCount} طلبات سحب معلقة بمبلغ إجمالي $
              {data?.pendingWithdrawalsAmount.toFixed(2)}.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectTab("deposits")}
                className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/30"
              >
                مراجعة الإيداعات
              </button>
              <button
                type="button"
                onClick={() => onSelectTab("withdrawals")}
                className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/30"
              >
                مراجعة السحوبات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              onClick={() => onSelectTab(stat.tab)}
              className={`surface-card cursor-pointer rounded-2xl border ${stat.border} p-4 transition-all hover:scale-[1.02] active:scale-[0.99] shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground truncate">
                  {stat.title}
                </span>
                <Icon className={`h-4 w-4 shrink-0 ${stat.color}`} />
              </div>
              <p className={`mt-2 text-lg font-black ${stat.color} tracking-tight`}>{stat.value}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Fast Platform Actions */}
      <div className="rounded-2xl border border-border bg-surface/60 p-4">
        <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5 mb-3">
          <ShieldCheck className="h-4 w-4 text-cyan-glow" />
          <span>إجراءات المشرف السريعة</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onSelectTab("deposits")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
          >
            <ArrowDownLeft className="h-4 w-4" />
            تأكيد الإيداعات
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("withdrawals")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20"
          >
            <ArrowUpRight className="h-4 w-4" />
            صرف السحوبات
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("users")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-glow/30 bg-cyan-glow/10 py-2 text-xs font-bold text-cyan-glow hover:bg-cyan-glow/20"
          >
            <Users className="h-4 w-4" />
            إدارة المستخدمين
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("broadcast")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 py-2 text-xs font-bold text-purple-400 hover:bg-purple-500/20"
          >
            <ShieldCheck className="h-4 w-4" />
            إرسال إشعار عام
          </button>
        </div>
      </div>
    </div>
  );
}
