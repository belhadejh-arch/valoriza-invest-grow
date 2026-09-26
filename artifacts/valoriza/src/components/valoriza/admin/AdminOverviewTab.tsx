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
import { getAdminOverview, getAdminUsers } from "@/lib/valoriza-admin.functions";
import { useI18n } from "@/lib/i18n";

interface AdminOverviewTabProps {
  onSelectTab: (tab: string) => void;
}

export function AdminOverviewTab({ onSelectTab }: AdminOverviewTabProps) {
  const { t, isRTL } = useI18n();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => getAdminOverview(),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  const {
    data: registeredUsers,
    isLoading: isLoadingUsers,
    isError: usersError,
  } = useQuery({
    queryKey: ["admin-users", 1, ""],
    queryFn: () => getAdminUsers({ page: 1, search: "" }),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-muted-foreground">
        <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
        {t("admin.loadingOverview")}
      </div>
    );
  }

  const statCards = [
    {
      title: t("admin.totalUsers"),
      value: data?.totalUsers ?? 0,
      sub: t("admin.registeredInvestor"),
      icon: Users,
      color: "text-cyan-glow",
      border: "border-cyan-glow/40",
      tab: "users",
    },
    {
      title: t("admin.totalWalletBalances"),
      value: `$${(data?.totalBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      sub: t("admin.activeBalance"),
      icon: Wallet,
      color: "text-gold",
      border: "border-gold/40",
      tab: "users",
    },
    {
      title: t("admin.totalConfirmedDeposits"),
      value: `$${(data?.totalDeposited ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      sub: t("admin.incomingLiquidity"),
      icon: ArrowDownLeft,
      color: "text-emerald-400",
      border: "border-emerald-500/40",
      tab: "deposits",
    },
    {
      title: t("admin.totalWithdrawalsPaid"),
      value: `$${(data?.totalWithdrawn ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      sub: t("admin.outgoingLiquidity"),
      icon: ArrowUpRight,
      color: "text-amber-400",
      border: "border-amber-500/40",
      tab: "withdrawals",
    },
    {
      title: t("admin.pendingDepositsReview"),
      value: `${data?.pendingDepositsCount ?? 0} ${t("admin.requests")}`,
      sub: `$${(data?.pendingDepositsAmount ?? 0).toFixed(2)} ${t("admin.awaitingConfirmation")}`,
      icon: Clock,
      color: (data?.pendingDepositsCount ?? 0) > 0 ? "text-danger" : "text-muted-foreground",
      border:
        (data?.pendingDepositsCount ?? 0) > 0 ? "border-danger/60 bg-danger/5" : "border-border",
      tab: "deposits",
    },
    {
      title: t("admin.pendingWithdrawalsApproval"),
      value: `${data?.pendingWithdrawalsCount ?? 0} ${t("admin.requests")}`,
      sub: `$${(data?.pendingWithdrawalsAmount ?? 0).toFixed(2)} ${t("admin.awaitingTransfer")}`,
      icon: Clock,
      color: (data?.pendingWithdrawalsCount ?? 0) > 0 ? "text-amber-400" : "text-muted-foreground",
      border:
        (data?.pendingWithdrawalsCount ?? 0) > 0
          ? "border-amber-400/60 bg-amber-400/5"
          : "border-border",
      tab: "withdrawals",
    },
    {
      title: t("admin.activeFundInvestments"),
      value: `$${(data?.activeInvestmentsVolume ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      sub: `${data?.activeInvestmentsCount ?? 0} ${t("admin.activeDeposits")}`,
      icon: TrendingUp,
      color: "text-cyan-glow",
      border: "border-cyan-glow/30",
      tab: "investments",
    },
    {
      title: t("admin.dailyTasksCompleted"),
      value: (data?.totalTasksCompleted ?? 0).toLocaleString("en-US"),
      sub: t("admin.videosWatched"),
      icon: Video,
      color: "text-purple-400",
      border: "border-purple-500/30",
      tab: "tasks",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Alert if pending transactions */}
      {((data?.pendingDepositsCount ?? 0) > 0 || (data?.pendingWithdrawalsCount ?? 0) > 0) && (
        <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-amber-200 flex items-start gap-3 shadow-lg">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-extrabold text-amber-300">
              {t("admin.pendingTransactionsNotice")}
            </p>
            <p className="mt-1">
              • {data?.pendingDepositsCount} {t("admin.pendingDepositRequests")} ${data?.pendingDepositsAmount.toFixed(2)}.
              <br />• {data?.pendingWithdrawalsCount} {t("admin.pendingWithdrawalRequests")} ${data?.pendingWithdrawalsAmount.toFixed(2)}.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectTab("deposits")}
                className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/30"
              >
                {t("admin.reviewDeposits")}
              </button>
              <button
                type="button"
                onClick={() => onSelectTab("withdrawals")}
                className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/30"
              >
                {t("admin.reviewWithdrawals")}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-cyan-glow/30 bg-surface/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <Users className="h-4 w-4 text-cyan-glow" />
            {t("admin.recentRegistrations")}
          </h2>
          <button
            type="button"
            onClick={() => onSelectTab("users")}
            className="rounded-lg border border-cyan-glow/40 px-3 py-1.5 text-xs font-bold text-cyan-glow hover:bg-cyan-glow/10"
          >
            {t("admin.viewAllUsers")}
          </button>
        </div>
        {isLoadingUsers ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{t("admin.loadingUsers")}</p>
        ) : usersError ? (
          <p role="alert" className="py-4 text-center text-xs text-danger">{t("common.error")}</p>
        ) : !registeredUsers?.items.length ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{t("admin.noRegisteredUsers")}</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {registeredUsers.items.slice(0, 5).map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">{user.username || user.email}</p>
                  <p className="truncate text-muted-foreground">{user.email}</p>
                </div>
                <time className="shrink-0 text-[11px] text-muted-foreground" dateTime={user.createdAt}>
                  {new Date(user.createdAt).toLocaleDateString(isRTL ? "ar" : "en-US")}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

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
          <span>{t("admin.quickAdminActions")}</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onSelectTab("deposits")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
          >
            <ArrowDownLeft className="h-4 w-4" />
            {t("admin.confirmDeposits")}
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("withdrawals")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20"
          >
            <ArrowUpRight className="h-4 w-4" />
            {t("admin.payWithdrawals")}
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("users")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-glow/30 bg-cyan-glow/10 py-2 text-xs font-bold text-cyan-glow hover:bg-cyan-glow/20"
          >
            <Users className="h-4 w-4" />
            {t("admin.manageUsers")}
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("broadcast")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 py-2 text-xs font-bold text-purple-400 hover:bg-purple-500/20"
          >
            <ShieldCheck className="h-4 w-4" />
            {t("admin.sendBroadcast")}
          </button>
        </div>
      </div>
    </div>
  );
}
