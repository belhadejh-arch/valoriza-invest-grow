import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  Crown,
  Lock,
  Sparkles,
  Timer,
  Wallet,
  XCircle,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import {
  getInvestmentData,
  activateTrial,
  purchaseVip,
} from "@/lib/valoriza-pages.functions";
import { useI18n } from "@/lib/i18n";
import { isSessionExpiredError } from "@/lib/request-errors";
import { arabicVipLabel } from "@/lib/arabic-labels";

export const Route = createFileRoute("/_authenticated/investment")({
  head: () => ({
    meta: [
      { title: "الاستثمار والعضوية المميزة — Valoriza" },
      {
        name: "description",
        content: "باقات العضوية المميزة وأسعارها وأرباحها اليومية وعدد المهام المتاحة لكل مستوى.",
      },
      { property: "og:title", content: "الاستثمار والعضوية المميزة — Valoriza" },
      { property: "og:description", content: "باقات العضوية المميزة في منصة Valoriza." },
    ],
  }),
  component: InvestmentPage,
});

const money = (n: number) => `$${n.toFixed(2)}`;
const vipMoney = (n: number) =>
  `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)}`;

type InvestmentPageData = {
  wallet?: { balance?: number } | null;
  walletBalance?: number;
  profile?: {
    vipLevel?: number;
    vip_level?: number;
    trialActive?: boolean;
    trial_active?: boolean;
    trial_status?: "not_started" | "active" | "expired";
    trial_started_at?: string | null;
  } | null;
  packages?: any[];
  vipPackages?: any[];
};

function InvestmentPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const fetchData = useServerFn(getInvestmentData);
  const trial = useServerFn(activateTrial);
  const buy = useServerFn(purchaseVip);

  const { data, isLoading, isError, refetch } = useQuery<InvestmentPageData>({
    queryKey: ["investment"],
    queryFn: async () => (await fetchData()) as InvestmentPageData,
    staleTime: 30_000,
    refetchOnMount: "always",
  });

  const balance = data?.wallet?.balance ?? (data as any)?.walletBalance ?? 0;
  const userVipLevel = data?.profile?.vipLevel ?? (data as any)?.profile?.vip_level ?? 0;
  const trialStatus =
    data?.profile?.trial_status ??
    ((data?.profile?.trialActive ?? (data as any)?.profile?.trial_active)
      ? "active"
      : data?.profile?.trial_started_at
        ? "expired"
        : "not_started");
  const isTrialActive = trialStatus === "active";

  const packagesList = (data?.packages || (data as any)?.vipPackages || []).map((pkg: any) => ({
    ...pkg,
    id: pkg.id,
    level: Number(pkg.level),
    name: pkg.name,
    price: Number(pkg.price),
    dailyProfit: Number(pkg.dailyProfit ?? pkg.daily_profit ?? 0),
    dailyTasks: Number(pkg.dailyTasks ?? pkg.daily_tasks ?? 0),
    taskReward: Number(pkg.taskReward ?? pkg.task_reward ?? 0),
    durationDays: Number(pkg.durationDays ?? pkg.duration_days ?? 365),
    isActive: pkg.isActive !== false && pkg.is_active !== false,
  }));

  const trialMutation = useMutation({
    mutationFn: () => trial(),
    onSuccess: (res: any) => {
      if (res?.ok) {
        qc.invalidateQueries({ queryKey: ["investment"] });
        qc.invalidateQueries({ queryKey: ["home"] });
        qc.invalidateQueries({ queryKey: ["tasks-data"] });
        qc.invalidateQueries({ queryKey: ["account"] });
      } else {
        toast.error(
          res?.reason === "HAS_VIP"
            ? "لديك باقة عضوية مميزة نشطة بالفعل"
            : "تم استخدام الفترة التجريبية مسبقاً لهذا الحساب",
        );
      }
    },
    onError: (error) => {
      if (!isSessionExpiredError(error)) toast.error(error.message || t("common.error"));
    },
  });

  const buyMutation = useMutation({
    mutationFn: (pkg: { id: string; level: number }) =>
      buy({ data: { packageId: pkg.id, level: pkg.level } }),
    onSuccess: (res: any) => {
      if (res?.ok) {
        toast.success(`تمت ترقية حسابك إلى المستوى المميز ${res.level ?? res.vipLevel} بنجاح!`);
        qc.invalidateQueries({ queryKey: ["investment"] });
        qc.invalidateQueries({ queryKey: ["tasks-data"] });
        qc.invalidateQueries({ queryKey: ["home"] });
        qc.invalidateQueries({ queryKey: ["account"] });
      } else {
        toast.error(
          res?.reason === "INSUFFICIENT_BALANCE"
            ? "رصيدك غير كافٍ لإتمام ترقية هذه الباقة. يرجى شحن الرصيد أولاً."
            : "الباقة غير متاحة حالياً",
        );
      }
    },
    onError: () => toast.error("تعذر شراء الباقة حالياً"),
  });

  return (
    <div className="min-h-screen bg-background text-foreground pb-28 md:pb-12">
      <AppHeader />

        <main className="mx-auto w-full max-w-7xl px-3 sm:px-6 pt-4 space-y-4">
        {/* Wallet Snapshot Banner */}
        <section className="surface-card glow-border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30 shadow-gold-glow">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="text-start">
              <p className="text-xs text-muted-foreground font-bold">
                {t("investment.availableBalance")}
              </p>
                <p className="text-2xl font-black text-gold-gradient">
                  {isLoading || isError ? "—" : money(balance)}
                </p>
            </div>
          </div>

          <div className="flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-t-0 border-border/50 pt-2 sm:pt-0">
            <p className="text-xs text-muted-foreground">{t("investment.activeVip")}</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-gold px-3 py-1 text-xs font-black text-gold shadow-sm mt-0.5">
              <Crown className="h-3.5 w-3.5 fill-gold text-gold" />
              <span>{isLoading || isError ? "—" : `المستوى المميز ${userVipLevel}`}</span>
            </span>
          </div>
        </section>

        {isError && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-center sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm font-bold text-foreground">
              تعذّر تحميل بيانات الاستثمار الحقيقية. أعد المحاولة بعد التأكد من اتصال الخادم.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="shrink-0 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-black text-foreground"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Trial status is derived from the server-side activation and task limit. */}
        {!!data && userVipLevel === 0 && (
          <div className="rounded-2xl border border-cyan-glow/40 bg-surface/80 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3 text-start">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-glow/20 text-cyan-glow">
                <Timer className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-foreground">
                  {t("investment.trialBanner")}
                </h4>
                <p className="text-xs text-muted-foreground">{t("investment.trialDesc")}</p>
              </div>
            </div>

            {trialStatus === "active" ? (
              <div
                role="status"
                aria-live="polite"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-400"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>لقد تم تفعيل الفترة التجريبية</span>
              </div>
            ) : trialStatus === "expired" ? (
              <div
                role="status"
                aria-live="polite"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-400/35 bg-red-400/10 px-3 py-2 text-xs font-black text-red-400"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                <span>انتهت صلاحية الفترة التجريبية</span>
              </div>
            ) : (
              <button
                type="button"
                disabled={trialMutation.isPending}
                onClick={() => trialMutation.mutate()}
                className="shrink-0 rounded-xl brand-gradient px-4 py-2 text-xs font-black text-primary-foreground shadow-glow active:scale-95 transition-all"
              >
                {t("investment.activateTrial")}
              </button>
            )}
          </div>
        )}

        {/* VIP packages stay on this page; savings funds live in the homepage savings icon. */}
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="surface-card p-4 text-center glow-border">
              <h2 className="text-base sm:text-lg font-black text-foreground flex items-center justify-center gap-2">
                <Crown className="h-5 w-5 text-gold" />
                <span>{t("investment.vipPackages")}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {t("investment.vipPackagesDesc")}
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 7 }, (_, index) => (
                  <div
                    key={index}
                    className="surface-card h-48 animate-pulse rounded-2xl border border-border/60"
                  />
                ))}
              </div>
            ) : packagesList.length === 0 ? (
              <div className="surface-card rounded-2xl p-6 text-center text-sm font-bold text-muted-foreground">
                {isError
                  ? "تعذّر جلب باقات العضوية المميزة من الخادم."
                  : "لا توجد باقات عضوية مميزة متاحة حالياً."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packagesList.map((pkg: any) => {
                  const isCurrent = userVipLevel === pkg.level;
                  const isOwned = userVipLevel >= pkg.level;
                  const isLocked = !pkg.isActive && !isOwned;

                  const vipColors: Record<number, string> = {
                    1: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
                    2: "border-sky-500/40 text-sky-400 bg-sky-500/10",
                    3: "border-purple-500/40 text-purple-400 bg-purple-500/10",
                    4: "border-gold/50 text-gold bg-gold/10",
                    5: "border-pink-500/40 text-pink-400 bg-pink-500/10",
                    6: "border-teal-500/40 text-teal-400 bg-teal-500/10",
                    7: "border-zinc-500/40 text-zinc-400 bg-zinc-500/10",
                  };

                  const colorClass = vipColors[pkg.level] || "border-border text-foreground";

                  return (
                    <div
                      key={pkg.id}
                      className={`surface-card relative flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border p-4 text-start shadow-md transition-all ${
                        isCurrent
                          ? "border-cyan-glow shadow-[0_0_15px_oklch(0.82_0.14_205/0.25)] ring-1 ring-cyan-glow/50"
                          : isLocked
                            ? "opacity-60"
                            : "hover:border-cyan-glow/50"
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute top-2 left-2 rtl:left-auto rtl:right-2 rounded-full bg-cyan-glow text-navy-deep px-2.5 py-0.5 text-[10px] font-black shadow">
                          {t("investment.currentTier")}
                        </span>
                      )}

                      <div
                        className={`mt-1 inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-2xl border px-3 py-2 ${colorClass} shadow-glow`}
                      >
                        <Crown className="h-5 w-5 shrink-0" />
                        <h3 className="text-sm font-black">{arabicVipLabel(pkg.name)}</h3>
                      </div>

                      {isLocked && (
                        <span className="flex items-center justify-center gap-1 text-[9px] font-bold text-muted-foreground sm:text-[10px]">
                          <Lock className="h-3 w-3" /> {t("investment.locked")}
                        </span>
                      )}

                      <div className="rounded-xl border border-gold/25 bg-gold/5 px-3 py-2">
                        <span className="block text-[10px] font-bold text-muted-foreground">
                          {t("investment.price")}
                        </span>
                        <span className="block text-xl font-black text-gold-gradient">
                          {vipMoney(pkg.price)}
                        </span>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-surface/70 px-3 py-2">
                        <span className="block text-[10px] font-bold text-muted-foreground">
                          {t("investment.dailyProfit")}
                        </span>
                        <span className="block text-lg font-black text-gold">
                          {vipMoney(pkg.dailyProfit)}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-muted-foreground">
                        {pkg.dailyTasks} {t("investment.tasksCount")}
                      </div>

                      {isLocked ? (
                        <button
                          type="button"
                          disabled
                          className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-border/60 bg-surface/50 px-4 py-2 text-xs font-bold text-muted-foreground cursor-not-allowed"
                        >
                          <Lock className="h-3 w-3" /> {t("investment.unavailable")}
                        </button>
                      ) : isCurrent ? (
                        <span className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-success/40 bg-success/20 px-4 py-2 text-xs font-bold text-success">
                          <Check className="h-3.5 w-3.5" /> {t("investment.activePackage")}
                        </span>
                      ) : isOwned ? (
                        <span className="mt-1 inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-muted-foreground">
                          {t("investment.previouslyOwned")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={buyMutation.isPending}
                          onClick={() => buyMutation.mutate({ id: pkg.id, level: pkg.level })}
                          className="mt-1 inline-flex w-full items-center justify-center rounded-xl brand-gradient px-4 py-2 text-xs font-black text-primary-foreground shadow-glow active:scale-95 transition-all"
                        >
                          {buyMutation.isPending
                            ? t("common.loading")
                            : t("investment.investNow")}
                        </button>
                      )}
                  </div>
                );
                })}
              </div>
            )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
