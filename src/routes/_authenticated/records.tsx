import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Coins,
  CreditCard,
  FileText,
  Gift,
  Search,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getUserFinancialRecords } from "@/lib/valoriza-pages.functions";

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

  return (
    <div className="min-h-screen bg-background pb-28" dir="rtl">
      <AppHeader />

      <main className="mx-auto w-full max-w-lg px-4 pt-4">
        {/* Navigation Breadcrumb */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/account"
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للحساب</span>
          </Link>
          <span className="text-xs font-extrabold text-cyan-glow flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> كشف الحساب والعمليات
          </span>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-surface/80 p-1.5 shadow-sm">
          {(
            [
              { key: "transactions", label: "المعاملات", icon: CreditCard },
              { key: "deposits", label: "الإيداعات", icon: ArrowDownLeft },
              { key: "withdrawals", label: "السحوبات", icon: ArrowUpRight },
              { key: "rewards", label: "المكافآت", icon: Gift },
            ] as const
          ).map((t) => {
            const isActive = currentTab === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setCurrentTab(t.key)}
                className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-xs font-bold transition-all ${
                  isActive
                    ? "brand-gradient text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-navy"
                }`}
              >
                <Icon className="h-3.5 w-3.5 mb-1" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content list */}
        <div className="mt-4">
          {isLoading ? (
            <p className="py-16 text-center text-xs text-muted-foreground">جارٍ تحميل السجلات...</p>
          ) : currentTab === "deposits" ? (
            <DepositsView items={deposits} />
          ) : currentTab === "withdrawals" ? (
            <WithdrawalsView items={withdrawals} />
          ) : currentTab === "rewards" ? (
            <RewardsView items={rewards} />
          ) : (
            <TransactionsView items={transactions} />
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function DepositsView({ items }: { items: any[] }) {
  if (items.length === 0) {
    return (
      <div className="surface-card p-8 text-center text-xs text-muted-foreground">
        لا توجد أي عمليات إيداع مسجلة.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="surface-card p-3.5 glow-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-xs">
                ₮
              </div>
              <div>
                <p className="text-sm font-extrabold text-foreground">+{money(item.amount)}</p>
                <p className="text-[11px] text-muted-foreground">شبكة {item.network}</p>
              </div>
            </div>

            <div>
              {item.status === "approved" ? (
                <span className="rounded-full bg-success/20 border border-success/40 px-2.5 py-0.5 text-[10px] font-bold text-success">
                  مكتمل ومؤكد
                </span>
              ) : item.status === "rejected" ? (
                <span className="rounded-full bg-danger/20 border border-danger/40 px-2.5 py-0.5 text-[10px] font-bold text-danger">
                  مرفوض
                </span>
              ) : (
                <span className="rounded-full bg-gold/20 border border-gold/40 px-2.5 py-0.5 text-[10px] font-bold text-gold">
                  قيد المراجعة
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-border/50 pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate max-w-[200px]" dir="ltr">
              {item.address}
            </span>
            <span>
              {new Date(item.createdAt).toLocaleString("ar-EG", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          </div>

          {item.txHash && (
            <div
              className="rounded-lg bg-navy px-2 py-1 text-[10px] font-mono text-muted-foreground truncate"
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

function WithdrawalsView({ items }: { items: any[] }) {
  if (items.length === 0) {
    return (
      <div className="surface-card p-8 text-center text-xs text-muted-foreground">
        لا توجد أي عمليات سحب مسجلة.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="surface-card p-3.5 glow-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-electric/40 text-cyan-glow font-bold text-xs">
                ↑
              </div>
              <div>
                <p className="text-sm font-extrabold text-foreground">-{money(item.amount)}</p>
                <p className="text-[11px] text-muted-foreground">
                  صافي المستلم: <span className="text-gold font-bold">{money(item.netAmount)}</span>{" "}
                  (رسوم: {money(item.fee)})
                </p>
              </div>
            </div>

            <div>
              {item.status === "approved" ? (
                <span className="rounded-full bg-success/20 border border-success/40 px-2.5 py-0.5 text-[10px] font-bold text-success">
                  تم التحويل
                </span>
              ) : item.status === "rejected" ? (
                <span className="rounded-full bg-danger/20 border border-danger/40 px-2.5 py-0.5 text-[10px] font-bold text-danger">
                  مرفوض
                </span>
              ) : (
                <span className="rounded-full bg-gold/20 border border-gold/40 px-2.5 py-0.5 text-[10px] font-bold text-gold">
                  قيد المراجعة
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-border/50 pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate max-w-[200px]" dir="ltr">
              {item.network}: {item.address}
            </span>
            <span>
              {new Date(item.createdAt).toLocaleString("ar-EG", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          </div>

          {item.adminNote && (
            <p className="text-[11px] text-danger bg-danger/10 p-2 rounded-lg">
              ملاحظة الإدارة: {item.adminNote}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function TransactionsView({ items }: { items: any[] }) {
  if (items.length === 0) {
    return (
      <div className="surface-card p-8 text-center text-xs text-muted-foreground">
        لا توجد أي معاملات مالية حتى الآن.
      </div>
    );
  }

  const getTypeArabic = (type: string) => {
    switch (type) {
      case "deposit":
        return "إيداع رصيد";
      case "withdrawal":
        return "سحب أرباح";
      case "investment":
        return "استثمار في صندوق";
      case "investment_return":
        return "عائد استثمار";
      case "vip_purchase":
        return "ترقية باقة VIP";
      case "daily_login_reward":
        return "مكافأة تسجيل الدخول";
      case "lucky_wheel_reward":
        return "ربح عجلة الحظ";
      case "referral_commission":
        return "عمولة إحالة فريق";
      case "task_reward":
        return "مكافأة مشاهدة مهمة";
      default:
        return "معاملة مالية";
    }
  };

  return (
    <div className="space-y-2.5">
      {items.map((tx) => {
        const isPositive = tx.amount > 0;
        return (
          <div
            key={tx.id}
            className="surface-card p-3 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold ${
                  isPositive
                    ? "bg-success/20 border border-success/40 text-success"
                    : "bg-surface border border-border text-muted-foreground"
                }`}
              >
                {isPositive ? "+" : "−"}
              </div>
              <div>
                <p className="font-extrabold text-foreground">{getTypeArabic(tx.type)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {tx.description ||
                    new Date(tx.createdAt).toLocaleString("ar-EG", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                </p>
              </div>
            </div>

            <div className="text-left">
              <p className={`font-extrabold ${isPositive ? "text-success" : "text-foreground"}`}>
                {isPositive ? `+${money(tx.amount)}` : money(tx.amount)}
              </p>
              <p className="text-[10px] text-muted-foreground">الرصيد: {money(tx.balanceAfter)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RewardsView({ items }: { items: any[] }) {
  if (items.length === 0) {
    return (
      <div className="surface-card p-8 text-center text-xs text-muted-foreground">
        لا توجد أي مكافآت مسجلة حتى الآن.
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {items.map((r) => (
        <div
          key={r.id}
          className="surface-card p-3 flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/20 text-gold border border-gold/40">
              <Gift className="h-4 w-4" />
            </div>
            <div>
              <p className="font-extrabold text-foreground">
                {r.description ||
                  (r.source === "daily_login" ? "مكافأة تسجيل الدخول" : "مكافأة المنصة")}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(r.createdAt).toLocaleString("ar-EG", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>

          <div className="font-extrabold text-gold text-sm">+{money(r.amount)}</div>
        </div>
      ))}
    </div>
  );
}
