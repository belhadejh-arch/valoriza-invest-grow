import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  Clock,
  Crown,
  Lock,
  Sparkles,
  Timer,
  TrendingUp,
  Vault,
  Wallet,
  X,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import {
  getInvestmentData,
  activateTrial,
  purchaseVip,
  investInSavingsFund,
} from "@/lib/valoriza-pages.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/investment")({
  head: () => ({
    meta: [
      { title: "الاستثمار و VIP — Valoriza" },
      {
        name: "description",
        content: "صناديق التوفير الاستثمارية وترقيات باقات VIP بعوائد يومية مضمونة.",
      },
      { property: "og:title", content: "الاستثمار و VIP — Valoriza" },
      { property: "og:description", content: "صناديق التوفير وباقات VIP في منصة Valoriza." },
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
  } | null;
  funds?: any[];
  packages?: any[];
  vipPackages?: any[];
  userInvestments?: any[];
  investments?: any[];
};

function InvestmentPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"funds" | "vip">("vip");
  const [selectedFund, setSelectedFund] = useState<any | null>(null);
  const [investAmount, setInvestAmount] = useState<string>("5");

  const fetchData = useServerFn(getInvestmentData);
  const trial = useServerFn(activateTrial);
  const buy = useServerFn(purchaseVip);
  const invest = useServerFn(investInSavingsFund);

  const { data, isLoading, isError, refetch } = useQuery<InvestmentPageData>({
    queryKey: ["investment"],
    queryFn: async () => (await fetchData()) as InvestmentPageData,
    staleTime: 30_000,
    refetchOnMount: "always",
  });

  const balance = data?.wallet?.balance ?? (data as any)?.walletBalance ?? 0;
  const userVipLevel = data?.profile?.vipLevel ?? (data as any)?.profile?.vip_level ?? 0;
  const isTrialActive = !!(data?.profile?.trialActive ?? (data as any)?.profile?.trial_active);

  const fundsList = (data?.funds || []).map((fund: any) => ({
    ...fund,
    id: fund.id,
    code: fund.code,
    nameAr: fund.nameAr || fund.name_ar || fund.code,
    nameEn: fund.nameEn || fund.name_en || fund.code,
    taglineAr: fund.taglineAr || fund.tagline_ar || "",
    durationDays: Number(fund.durationDays || fund.duration_days || 0),
    profitPercent: Number(fund.profitPercent || fund.profit_percent || 0),
    minAmount: Number(fund.minAmount || fund.min_amount || 5),
  }));

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

  const userInvestmentsList = (data?.userInvestments || (data as any)?.investments || []).map(
    (inv: any) => ({
      ...inv,
      id: inv.id,
      fundName: inv.fundName || inv.name_ar || inv.code || "صندوق استثماري",
      amount: Number(inv.amount),
      expectedProfit: Number(inv.expectedProfit ?? inv.expected_profit ?? 0),
      maturesAt: inv.maturesAt || inv.matures_at || new Date().toISOString(),
    }),
  );

  const trialMutation = useMutation({
    mutationFn: () => trial(),
    onSuccess: (res: any) => {
      if (res?.ok) {
        toast.success("تم تفعيل الفترة التجريبية المجانية بنجاح!");
        qc.invalidateQueries({ queryKey: ["investment"] });
        qc.invalidateQueries({ queryKey: ["home"] });
      } else {
        toast.error(
          res?.reason === "HAS_VIP"
            ? "لديك باقة VIP نشطة بالفعل"
            : "تم استخدام الفترة التجريبية مسبقاً لهذا الحساب",
        );
      }
    },
    onError: () => toast.error("تعذر تفعيل التجربة"),
  });

  const buyMutation = useMutation({
    mutationFn: (pkg: { id: string; level: number }) =>
      buy({ data: { packageId: pkg.id, level: pkg.level } }),
    onSuccess: (res: any) => {
      if (res?.ok) {
        toast.success(`تم ترقية حسابك إلى VIP ${res.level ?? res.vipLevel} بنجاح!`);
        qc.invalidateQueries({ queryKey: ["investment"] });
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

  const investMutation = useMutation({
    mutationFn: (vals: { fundId: string; amount: number }) => invest({ data: vals }),
    onSuccess: (res: any) => {
      if (res?.ok) {
        toast.success(
          `تم الاستثمار بنجاح في ${res.fundName || "الصندوق"}! الأرباح المتوقعة: +${money(res.expectedProfit ?? 0)}`,
        );
        setSelectedFund(null);
        setInvestAmount("5");
        qc.invalidateQueries({ queryKey: ["investment"] });
        qc.invalidateQueries({ queryKey: ["account"] });
        qc.invalidateQueries({ queryKey: ["financial-records"] });
      } else {
        if (res?.reason === "INSUFFICIENT_BALANCE") {
          toast.error("رصيدك المتاح غير كافٍ لإتمام الاستثمار");
        } else if (res?.reason === "BELOW_MIN_AMOUNT") {
          toast.error(`الحد الأدنى للاستثمار في هذا الصندوق هو ${res.minAmount}$`);
        } else {
          toast.error("تعذر إتمام الاستثمار");
        }
      }
    },
    onError: () => toast.error("حدث خطأ أثناء معالجة الاستثمار"),
  });

  const handleOpenInvest = (fund: any) => {
    setSelectedFund(fund);
    setInvestAmount(Math.max(5, fund.minAmount || 5).toString());
  };

  const handleConfirmInvest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund) return;
    const num = parseFloat(investAmount);
    if (isNaN(num) || num < selectedFund.minAmount) {
      toast.error(`الحد الأدنى للاستثمار هو ${selectedFund.minAmount}$`);
      return;
    }
    if (num > balance) {
      toast.error("رصيدك المتاح أقل من المبلغ المطلوب");
      return;
    }
    investMutation.mutate({
      fundId: selectedFund.id,
      amount: num,
    });
  };

  const parsedAmount = parseFloat(investAmount) || 0;
  const calculatedProfit =
    selectedFund && parsedAmount > 0
      ? Math.round(((parsedAmount * selectedFund.profitPercent) / 100) * 100) / 100
      : 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
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
              <span>{isLoading || isError ? "—" : `VIP ${userVipLevel}`}</span>
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

        {/* Trial Banner if VIP 0 */}
        {!!data && !isTrialActive && userVipLevel === 0 && (
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

            <button
              type="button"
              disabled={trialMutation.isPending}
              onClick={() => trialMutation.mutate()}
              className="shrink-0 rounded-xl brand-gradient px-4 py-2 text-xs font-black text-primary-foreground shadow-glow active:scale-95 transition-all"
            >
              {t("investment.activateTrial")}
            </button>
          </div>
        )}

        {/* View Switcher (Tabs) */}
        <div className="max-w-md mx-auto grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface/80 p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("funds")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-black transition-all ${
              activeTab === "funds"
                ? "brand-gradient text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Vault className="h-4 w-4" />
            <span>{t("investment.fundsTab")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vip")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-black transition-all ${
              activeTab === "vip"
                ? "brand-gradient text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Crown className="h-4 w-4" />
            <span>{t("investment.vipTab")}</span>
          </button>
        </div>

        {/* TAB 1: SAVINGS FUNDS */}
        {activeTab === "funds" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Hero Header */}
            <div className="surface-card glow-border p-5 text-center relative overflow-hidden">
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gold/10 blur-2xl pointer-events-none" />
              <h2 className="text-xl font-black text-foreground">{t("investment.fundsTab")}</h2>
              <p className="mt-1 text-sm font-bold text-gold-gradient">
                {t("investment.fundsSubtitle")}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-lg mx-auto">
                {t("investment.fundsDesc")}
              </p>
            </div>

            {/* 4 Savings Funds Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fundsList.map((fund: any) => (
                <div
                  key={fund.id}
                  className="surface-card glow-border p-4 flex flex-col justify-between gap-3 hover:border-cyan-glow/50 transition-all shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 text-start">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface border border-primary/40 text-cyan-glow font-black text-xs shadow-glow">
                        {fund.code}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-foreground">{fund.nameAr}</h3>
                        <p className="text-xs text-muted-foreground">
                          {fund.taglineAr || fund.nameEn}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-black text-emerald-400">
                      +{fund.profitPercent}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/40 text-start">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-cyan-glow" />
                      <span>
                        {fund.durationDays} {t("investment.durationDays")}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-end">
                      {t("investment.minAmount")}:{" "}
                      <b className="text-foreground">${fund.minAmount || 5}</b>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenInvest(fund)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl gold-gradient py-2.5 text-xs font-black text-navy-deep shadow-gold-glow hover:brightness-110 active:scale-95 transition-all"
                  >
                    <span>{t("investment.investNow")}</span>
                    <span>›</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Minimum Note */}
            <div className="rounded-2xl border border-gold/40 bg-gold/10 p-3 text-center text-xs font-bold text-gold flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>{t("investment.minNote")}</span>
            </div>

            {/* My Active Investments List */}
            {userInvestmentsList && userInvestmentsList.length > 0 && (
              <section className="mt-6">
                <h3 className="text-sm font-black text-foreground mb-3 flex items-center gap-2 text-start">
                  <Clock className="h-4 w-4 text-cyan-glow" />
                  <span>
                    {t("investment.activeInvestments")} ({userInvestmentsList.length})
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {userInvestmentsList.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="surface-card p-3.5 flex flex-col justify-between gap-2 text-xs text-start"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-black text-foreground text-sm">{inv.fundName}</p>
                        <span className="text-xs font-bold text-success">
                          +{money(inv.expectedProfit)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {t("investment.maturesAt")}:{" "}
                        {new Date(inv.maturesAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <div className="pt-2 border-t border-border/40 flex justify-between text-muted-foreground">
                        <span>{t("investment.investedAmount")}:</span>
                        <span className="font-black text-foreground">{money(inv.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* TAB 2: VIP PACKAGES */}
        {activeTab === "vip" && (
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
              <div className="grid grid-cols-2 gap-3 min-[430px]:grid-cols-4">
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
                  ? "تعذّر جلب باقات VIP من الخادم."
                  : "لا توجد باقات VIP متاحة حالياً."}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 min-[430px]:grid-cols-4 sm:gap-4">
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
                      className={`surface-card relative flex min-h-52 flex-col gap-2 overflow-hidden rounded-2xl border p-2.5 text-center transition-all sm:min-h-60 sm:p-3 ${
                        isCurrent
                          ? "border-cyan-glow shadow-[0_0_15px_oklch(0.82_0.14_205/0.25)] ring-1 ring-cyan-glow/50"
                          : isLocked
                            ? "opacity-65"
                            : "hover:-translate-y-0.5 hover:border-gold/60"
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute right-1 top-1 rounded-full bg-cyan-glow px-1.5 py-0.5 text-[8px] font-black text-navy-deep shadow sm:right-2 sm:top-2 sm:px-2 sm:text-[10px]">
                          {t("investment.currentTier")}
                        </span>
                      )}

                      <div
                        className={`mt-1 inline-flex min-h-8 items-center justify-center gap-1 self-center rounded-full border px-2 py-1 sm:mt-2 ${colorClass}`}
                      >
                        <Crown className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                        <h3 className="text-xs font-black sm:text-sm">{pkg.name}</h3>
                      </div>

                      {isLocked && (
                        <span className="flex items-center justify-center gap-1 text-[9px] font-bold text-muted-foreground sm:text-[10px]">
                          <Lock className="h-3 w-3" /> {t("investment.locked")}
                        </span>
                      )}

                      <div className="rounded-xl border border-gold/25 bg-gold/5 px-1.5 py-1.5">
                        <span className="block text-[9px] font-bold text-muted-foreground sm:text-[10px]">
                          {t("investment.price")}
                        </span>
                        <span className="block text-base font-black text-gold-gradient sm:text-xl">
                          {vipMoney(pkg.price)}
                        </span>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-surface/70 px-1 py-1.5">
                        <span className="block text-[9px] font-bold text-muted-foreground sm:text-[10px]">
                          {t("investment.dailyProfit")}
                        </span>
                        <span className="block text-sm font-black text-gold sm:text-lg">
                          {vipMoney(pkg.dailyProfit)}
                        </span>
                      </div>

                      <div className="mt-auto text-[9px] font-bold text-muted-foreground sm:text-[11px]">
                        {pkg.dailyTasks} {t("investment.tasksCount")}
                      </div>

                      {isLocked ? (
                        <button
                          type="button"
                          disabled
                          className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-border/60 bg-surface/50 px-1.5 py-2 text-[9px] font-bold text-muted-foreground cursor-not-allowed sm:text-xs"
                        >
                          <Lock className="h-3 w-3" /> {t("investment.unavailable")}
                        </button>
                      ) : isCurrent ? (
                        <span className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-success/40 bg-success/20 px-1.5 py-2 text-[9px] font-bold text-success sm:text-xs">
                          <Check className="h-3.5 w-3.5" /> {t("investment.activePackage")}
                        </span>
                      ) : isOwned ? (
                        <span className="mt-1 inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface px-1.5 py-2 text-[9px] font-bold text-muted-foreground sm:text-xs">
                          {t("investment.previouslyOwned")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={buyMutation.isPending}
                          onClick={() => buyMutation.mutate({ id: pkg.id, level: pkg.level })}
                          className="mt-1 inline-flex w-full items-center justify-center rounded-xl brand-gradient px-1.5 py-2 text-[9px] font-black text-primary-foreground shadow-glow active:scale-95 transition-all sm:text-xs"
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
        )}
      </main>

      {/* Real Investment Modal Flow for Savings Fund */}
      {selectedFund && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setSelectedFund(null)}
        >
          <div
            className="w-full max-w-md surface-card glow-border p-5 rounded-3xl relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5 text-start">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface border border-cyan-glow/40 text-cyan-glow">
                  <Vault className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">
                    {t("investment.investIn")} {selectedFund.nameAr}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedFund.durationDays} {t("investment.durationDays")} •{" "}
                    {selectedFund.profitPercent}%
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFund(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-surface transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmInvest} className="mt-4 space-y-4 text-start">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-foreground">
                    {t("investment.amountLabel")}
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {t("investment.availableBalance")}:{" "}
                    <b className="text-gold">{money(balance)}</b>
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min={selectedFund.minAmount}
                    max={balance}
                    step="0.01"
                    placeholder={`Min: $${selectedFund.minAmount}`}
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm font-extrabold text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
                  />
                  <span className="absolute right-4 rtl:right-auto rtl:left-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-gold">
                    USDT
                  </span>
                </div>

                {/* Quick amount presets */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {[5, 20, 50, 100, 250].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setInvestAmount(preset.toString())}
                      className="rounded-xl border border-border/70 bg-surface/60 px-2.5 py-1 text-xs font-bold text-muted-foreground hover:text-cyan-glow hover:border-cyan-glow/50 transition-colors"
                    >
                      ${preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setInvestAmount(balance > 0 ? balance.toString() : "5")}
                    className="rounded-xl border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold hover:bg-gold/20 transition-colors"
                  >
                    {t("investment.allAmount")}
                  </button>
                </div>
              </div>

              {/* Live Calculation Preview */}
              <div className="rounded-2xl border border-border/80 bg-surface/80 p-3.5 text-xs space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("investment.fixedProfitRate")}:</span>
                  <span className="font-bold text-success">+{selectedFund.profitPercent}%</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("investment.lockDuration")}:</span>
                  <span className="font-bold text-foreground">
                    {selectedFund.durationDays} {t("investment.durationDays")}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("investment.expectedNetProfit")}:</span>
                  <span className="font-extrabold text-success">+{money(calculatedProfit)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-foreground border-t border-border/50 pt-2 text-sm">
                  <span>{t("investment.totalAtMaturity")}:</span>
                  <span className="text-gold-gradient font-black">
                    {money(parsedAmount + calculatedProfit)} USDT
                  </span>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={investMutation.isPending || parsedAmount <= 0}
                className="w-full rounded-2xl brand-gradient py-3.5 text-sm font-black text-primary-foreground shadow-glow active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {investMutation.isPending ? t("common.loading") : t("investment.confirmInvestBtn")}
              </button>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
