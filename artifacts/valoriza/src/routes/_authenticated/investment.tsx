import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Crown, Lock, Timer, Wallet } from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { activateTrial, getInvestmentData, purchaseVip } from "@/lib/valoriza-pages.functions";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";

export const Route = createFileRoute("/_authenticated/investment")({
  component: InvestmentPage,
});

const money = (amount: number | null | undefined) => {
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `$${value.toFixed(2)}`;
};

function localizedField(item: any, field: string) {
  const value = item?.[field];
  if (value && typeof value === "object") return value;
  return {
    ar: item?.[`${field}Ar`] ?? item?.[`${field}_ar`] ?? value,
    en: item?.[`${field}En`] ?? item?.[`${field}_en`],
    fr: item?.[`${field}Fr`] ?? item?.[`${field}_fr`],
    es: item?.[`${field}Es`] ?? item?.[`${field}_es`],
  };
}

function InvestmentPage() {
  const queryClient = useQueryClient();
  const { t, isRTL } = useI18n();
  const content = useLocalizedContent();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["investment"],
    queryFn: getInvestmentData,
  });

  const trialMutation = useMutation({
    mutationFn: activateTrial,
    onSuccess: (result: any) => {
      if (!result?.ok) {
        toast.error(
          result?.reason === "HAS_VIP" || result?.reason === "ALREADY_VIP"
            ? t("investment.alreadyVip")
            : t("investment.trialUsed"),
        );
        return;
      }

      toast.success(t("investment.trialSuccess"));
      void queryClient.invalidateQueries({ queryKey: ["investment"] });
      void queryClient.invalidateQueries({ queryKey: ["home"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks-data"] });
    },
    onError: () => toast.error(t("investment.trialError")),
  });

  const purchaseMutation = useMutation({
    mutationFn: (pkg: { id: string; level: number }) =>
      purchaseVip({ packageId: pkg.id, level: pkg.level }),
    onSuccess: (result: any) => {
      if (!result?.ok) {
        toast.error(
          result?.reason === "INSUFFICIENT_BALANCE"
            ? t("investment.insufficientUpgrade")
            : t("investment.packageUnavailable"),
        );
        return;
      }

      toast.success(
        t("investment.upgraded").replace(
          "{level}",
          String(result.level ?? result.vipLevel),
        ),
      );
      void queryClient.invalidateQueries({ queryKey: ["investment"] });
      void queryClient.invalidateQueries({ queryKey: ["home"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks-data"] });
    },
    onError: () => toast.error(t("investment.purchaseError")),
  });

  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-background pb-28 md:pb-12 text-foreground"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <AppHeader />
        <div className="flex h-64 items-center justify-center">
          <p>{t("common.loading")}</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        className="min-h-screen bg-background pb-28 md:pb-12 text-foreground"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <AppHeader />
        <div className="flex h-64 items-center justify-center">
          <p className="text-danger">{t("common.error")}</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const balance = data?.wallet?.balance ?? (data as any)?.walletBalance ?? 0;
  const userVipLevel = Number(
    data?.profile?.vipLevel ?? (data as any)?.profile?.vip_level ?? 0,
  );
  const isTrialActive = Boolean(
    data?.profile?.trialActive ?? (data as any)?.profile?.trial_active,
  );
  const packages = (data?.packages || (data as any)?.vipPackages || []).map((pkg: any) => ({
    ...pkg,
    id: pkg.id,
    level: Number(pkg.level),
    nameVariants: localizedField(pkg, "name"),
    price: Number(pkg.price),
    dailyProfit: Number(pkg.dailyProfit ?? pkg.daily_profit ?? 0),
    dailyTasks: Number(pkg.dailyTasks ?? pkg.daily_tasks ?? 0),
    taskReward: Number(pkg.taskReward ?? pkg.task_reward ?? 0),
    isActive: pkg.isActive !== false && pkg.is_active !== false,
  }));

  const vipColors: Record<number, string> = {
    1: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    2: "border-sky-500/40 text-sky-400 bg-sky-500/10",
    3: "border-purple-500/40 text-purple-400 bg-purple-500/10",
    4: "border-gold/50 text-gold bg-gold/10",
    5: "border-pink-500/40 text-pink-400 bg-pink-500/10",
    6: "border-teal-500/40 text-teal-400 bg-teal-500/10",
    7: "border-zinc-500/40 text-zinc-400 bg-zinc-500/10",
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground pb-28"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AppHeader />

      <main className="mx-auto w-full max-w-7xl space-y-4 px-3 pt-4 sm:px-6">
        <section className="surface-card glow-border flex flex-col justify-between gap-3 p-4 shadow-md sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/30 bg-gold/15 text-gold shadow-gold-glow">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="text-start">
              <p className="text-xs font-bold text-muted-foreground">
                {t("investment.availableBalance")}
              </p>
              <p className="text-2xl font-black text-gold-gradient">{money(balance)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-2 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
            <p className="text-xs text-muted-foreground">{t("investment.activeVip")}</p>
            <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full border border-gold bg-surface px-3 py-1 text-xs font-black text-gold shadow-sm">
              <Crown className="h-3.5 w-3.5 fill-gold text-gold" />
              <span>VIP {userVipLevel}</span>
            </span>
          </div>
        </section>

        {!isTrialActive && userVipLevel === 0 && (
          <section className="flex flex-col justify-between gap-3 rounded-2xl border border-cyan-glow/40 bg-surface/80 p-3.5 shadow-md sm:flex-row sm:items-center sm:p-4">
            <div className="flex items-center gap-3 text-start">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-glow/20 text-cyan-glow">
                <Timer className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-foreground">
                  {t("investment.trialBanner")}
                </h2>
                <p className="text-xs text-muted-foreground">{t("investment.trialDesc")}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={trialMutation.isPending}
              onClick={() => trialMutation.mutate()}
              className="shrink-0 rounded-xl brand-gradient px-4 py-2 text-xs font-black text-primary-foreground shadow-glow transition-all active:scale-95 disabled:opacity-50"
            >
              {trialMutation.isPending ? t("common.loading") : t("investment.activateTrial")}
            </button>
          </section>
        )}

        <section className="surface-card glow-border p-4 text-center">
          <h1 className="flex items-center justify-center gap-2 text-base font-black text-foreground sm:text-lg">
            <Crown className="h-5 w-5 text-gold" />
            <span>{t("investment.vipPackages")}</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("investment.vipPackagesDesc")}
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg: any) => {
            const isCurrent = userVipLevel === pkg.level;
            const isOwned = userVipLevel >= pkg.level;
            const isLocked = !pkg.isActive || pkg.level === 7;
            const colorClass = vipColors[pkg.level] || "border-border text-foreground";

            return (
              <article
                key={pkg.id}
                className={`surface-card relative flex flex-col justify-between gap-3 overflow-hidden p-4 transition-all ${
                  isCurrent
                    ? "border-cyan-glow shadow-[0_0_15px_oklch(0.82_0.14_205/0.25)] ring-1 ring-cyan-glow/50"
                    : isLocked
                      ? "opacity-60"
                      : "hover:border-border"
                }`}
              >
                {isCurrent && (
                  <span className="absolute left-2 top-2 rounded-full bg-cyan-glow px-2.5 py-0.5 text-[10px] font-black text-navy-deep shadow rtl:left-auto rtl:right-2">
                    {t("investment.currentTier")}
                  </span>
                )}

                <div className="flex items-start justify-between gap-3 text-start">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-glow ${colorClass}`}
                    >
                      <Crown className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-foreground">
                          {content(pkg.nameVariants)}
                        </h2>
                        {isLocked && (
                          <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            <Lock className="h-2.5 w-2.5" />
                            {t("investment.locked")}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("investment.dailyProfit")}:{" "}
                        <span className="font-black text-gold">{money(pkg.dailyProfit)}</span> •{" "}
                        {pkg.dailyTasks} {t("investment.tasksCount")}
                      </p>
                      <p className="mt-0.5 text-[11px] text-cyan-glow">
                        {t("investment.taskReward")}: {money(pkg.taskReward)}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-end">
                    <span className="block text-xs text-muted-foreground">
                      {t("investment.price")}
                    </span>
                    <span className="text-xl font-black text-gold-gradient">
                      {money(pkg.price)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                  <span className="text-[11px] text-muted-foreground">
                    {t("investment.validityYear")}
                  </span>
                  {isLocked ? (
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-xl border border-border/60 bg-surface/50 px-4 py-2 text-xs font-bold text-muted-foreground"
                    >
                      {t("investment.unavailable")}
                    </button>
                  ) : isCurrent ? (
                    <span className="flex items-center gap-1 rounded-xl border border-success/40 bg-success/20 px-4 py-1.5 text-xs font-bold text-success">
                      <Check className="h-3.5 w-3.5" />
                      {t("investment.activePackage")}
                    </span>
                  ) : isOwned ? (
                    <span className="rounded-xl border border-border bg-surface px-4 py-1.5 text-xs font-bold text-muted-foreground">
                      {t("investment.previouslyOwned")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={purchaseMutation.isPending}
                      onClick={() => purchaseMutation.mutate({ id: pkg.id, level: pkg.level })}
                      className="rounded-xl brand-gradient px-4 py-2 text-xs font-black text-primary-foreground shadow-glow transition-all active:scale-95 disabled:opacity-50 sm:px-5"
                    >
                      {purchaseMutation.isPending
                        ? t("common.loading")
                        : `${t("investment.upgradeTo")} ${content(pkg.nameVariants)}`}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}