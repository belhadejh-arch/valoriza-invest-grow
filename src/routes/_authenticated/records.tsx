import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Clock,
  CreditCard,
  FileText,
  Gift,
  Search,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getUserFinancialRecords } from "@/lib/valoriza-pages.functions";
import { useI18n } from "@/lib/i18n";

type RecordsTab = "deposits" | "withdrawals" | "transactions" | "rewards";

export const Route = createFileRoute("/_authenticated/records")({
  validateSearch: (search: Record<string, unknown>): { tab?: RecordsTab } => ({
    tab: (search.tab as RecordsTab) || "transactions",
  }),
  head: () => ({
    meta: [
      { title: "سجل العمليات المالية — Valoriza" },
      { name: "description", content: "سجل الإيداعات والسحوبات والتحويلات والمكافآت." },
      { property: "og:title", content: "سجل العمليات المالية — Valoriza" },
      { property: "og:description", content: "كشف الحساب والعمليات المالية." },
    ],
  }),
  component: RecordsPage,
});

const money = (n: number) => `$${n.toFixed(2)}`;

function RecordsPage() {
  const { t, isRTL } = useI18n();
  const { tab: initialTab } = Route.useSearch();
  const [currentTab, setCurrentTab] = useState<RecordsTab>(initialTab || "transactions");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchRecords = useServerFn(getUserFinancialRecords);
  const { data, isLoading } = useQuery({
    queryKey: ["financial-records"],
    queryFn: () => fetchRecords(),
  });

  const deposits = data?.deposits ?? [];
  const withdrawals = data?.withdrawals ?? [];
  const transactions = data?.transactions ?? [];
  const rewards = data?.rewards ?? [];

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div
      className="min-h-screen bg-background pb-28 md:pb-12 text-foreground"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/account"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <BackArrow className="h-4 w-4" />
            <span>{t("support.backToAccount")}</span>
          </Link>
          <span className="text-xs font-black text-cyan-glow flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <span>{t("records.statement")}</span>
          </span>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-3xl surface-card p-1.5 shadow-sm border border-border">
          {(
            [
              { key: "transactions", label: t("records.tabTransactions"), icon: CreditCard },
              { key: "deposits", label: t("records.tabDeposits"), icon: ArrowDownLeft },
              { key: "withdrawals", label: t("records.tabWithdrawals"), icon: ArrowUpRight },
              { key: "rewards", label: t("records.tabRewards"), icon: Gift },
            ] as const
          ).map((item) => {
            const isActive = currentTab === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setCurrentTab(item.key)}
                className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-3 text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? "brand-gradient text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content list */}
        <div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-glow border-t-transparent" />
              <p className="text-sm font-medium text-muted-foreground">{t("common.loading")}</p>
            </div>
          ) : currentTab === "deposits" ? (
            <DepositsView items={deposits} t={t} isRTL={isRTL} />
          ) : currentTab === "withdrawals" ? (
            <WithdrawalsView items={withdrawals} t={t} isRTL={isRTL} />
          ) : currentTab === "rewards" ? (
            <RewardsView items={rewards} t={t} isRTL={isRTL} />
          ) : (
            <TransactionsView items={transactions} t={t} isRTL={isRTL} />
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function DepositsView({ items, t, isRTL }: { items: any[]; t: any; isRTL: boolean }) {
  if (items.length === 0) {
    return (
      <div className="surface-card p-12 text-center text-xs text-muted-foreground rounded-3xl">
        {t("records.emptyDeposits")}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="surface-card p-4 sm:p-5 glow-border rounded-3xl space-y-3 text-start"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black text-sm">
                ₮
              </div>
              <div>
                <p className="text-base font-black text-foreground">+{money(item.amount)}</p>
                <p className="text-xs text-muted-foreground font-semibold">{item.network}</p>
              </div>
            </div>

            <div>
              {item.status === "approved" ? (
                <span className="rounded-full bg-success/20 border border-success/40 px-3 py-1 text-xs font-black text-success">
                  {t("records.completed")}
                </span>
              ) : item.status === "rejected" ? (
                <span className="rounded-full bg-danger/20 border border-danger/40 px-3 py-1 text-xs font-black text-danger">
                  {t("records.rejected")}
                </span>
              ) : (
                <span className="rounded-full bg-gold/20 border border-gold/40 px-3 py-1 text-xs font-black text-gold">
                  {t("records.pending")}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-border/50 pt-2.5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate max-w-[180px] font-mono" dir="ltr">
              {item.address}
            </span>
            <span>
              {new Date(item.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {item.txHash && (
            <div
              className="rounded-xl bg-surface border border-border px-3 py-1.5 text-[11px] font-mono text-muted-foreground truncate"
              dir="ltr"
            >
              Tx: {item.txHash}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function WithdrawalsView({ items, t, isRTL }: { items: any[]; t: any; isRTL: boolean }) {
  if (items.length === 0) {
    return (
      <div className="surface-card p-12 text-center text-xs text-muted-foreground rounded-3xl">
        {t("records.emptyWithdrawals")}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="surface-card p-4 sm:p-5 glow-border rounded-3xl space-y-3 text-start"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface border border-cyan-glow/40 text-cyan-glow font-black text-sm">
                ↑
              </div>
              <div>
                <p className="text-base font-black text-foreground">-{money(item.amount)}</p>
                <p className="text-xs text-muted-foreground font-semibold">
                  {t("records.netReceived")}:{" "}
                  <span className="text-gold font-black">{money(item.netAmount)}</span> (
                  {t("records.fee")}: {money(item.fee)})
                </p>
              </div>
            </div>

            <div>
              {item.status === "approved" ? (
                <span className="rounded-full bg-success/20 border border-success/40 px-3 py-1 text-xs font-black text-success">
                  {t("records.transferred")}
                </span>
              ) : item.status === "rejected" ? (
                <span className="rounded-full bg-danger/20 border border-danger/40 px-3 py-1 text-xs font-black text-danger">
                  {t("records.rejected")}
                </span>
              ) : (
                <span className="rounded-full bg-gold/20 border border-gold/40 px-3 py-1 text-xs font-black text-gold">
                  {t("records.pending")}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-border/50 pt-2.5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate max-w-[180px] font-mono" dir="ltr">
              {item.network}: {item.address}
            </span>
            <span>
              {new Date(item.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {item.adminNote && (
            <p className="text-xs text-danger bg-danger/10 p-2.5 rounded-xl border border-danger/20">
              {t("records.adminNote")}: {item.adminNote}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function TransactionsView({ items, t, isRTL }: { items: any[]; t: any; isRTL: boolean }) {
  if (items.length === 0) {
    return (
      <div className="surface-card p-12 text-center text-xs text-muted-foreground rounded-3xl">
        {t("records.emptyTransactions")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      {items.map((tx) => {
        const isPositive = tx.amount > 0;
        return (
          <div
            key={tx.id}
            className="surface-card p-4 rounded-3xl flex items-center justify-between gap-3 text-xs text-start"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black text-sm ${
                  isPositive
                    ? "bg-success/20 border border-success/40 text-success"
                    : "bg-surface border border-border text-muted-foreground"
                }`}
              >
                {isPositive ? "+" : "−"}
              </div>
              <div className="min-w-0">
                <p className="font-black text-foreground truncate">{tx.description || tx.type}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(tx.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-end">
              <p
                className={`font-black text-sm sm:text-base ${isPositive ? "text-success" : "text-foreground"}`}
              >
                {isPositive ? `+${money(tx.amount)}` : money(tx.amount)}
              </p>
              <p className="text-[10px] text-muted-foreground font-semibold">
                {money(tx.balanceAfter)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RewardsView({ items, t, isRTL }: { items: any[]; t: any; isRTL: boolean }) {
  if (items.length === 0) {
    return (
      <div className="surface-card p-12 text-center text-xs text-muted-foreground rounded-3xl">
        {t("records.emptyRewards")}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      {items.map((r) => (
        <div
          key={r.id}
          className="surface-card p-4 rounded-3xl flex items-center justify-between gap-3 text-xs text-start"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/20 text-gold border border-gold/40">
              <Gift className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-foreground truncate">
                {r.description || t("rewards.title")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {new Date(r.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="shrink-0 font-black text-gold text-base">+{money(r.amount)}</div>
        </div>
      ))}
    </div>
  );
}
