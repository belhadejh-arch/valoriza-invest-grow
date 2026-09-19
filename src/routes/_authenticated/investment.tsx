import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Crown,
  Lock,
  ShieldCheck,
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

function InvestmentPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"funds" | "vip">("funds");
  const [selectedFund, setSelectedFund] = useState<any | null>(null);
  const [investAmount, setInvestAmount] = useState<string>("5");

  const fetchData = useServerFn(getInvestmentData);
  const trial = useServerFn(activateTrial);
  const buy = useServerFn(purchaseVip);
  const invest = useServerFn(investInSavingsFund);

  const { data, isLoading } = useQuery({
    queryKey: ["investment"],
    queryFn: () => fetchData(),
  });

  const balance = data?.wallet?.balance ?? 0;

  const trialMutation = useMutation({
    mutationFn: () => trial(),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("تم تفعيل الفترة التجريبية المجانية بنجاح!");
        qc.invalidateQueries({ queryKey: ["investment"] });
        qc.invalidateQueries({ queryKey: ["home"] });
      } else {
        toast.error(
          res.reason === "HAS_VIP"
            ? "لديك باقة VIP نشطة بالفعل"
            : "تم استخدام الفترة التجريبية مسبقاً لهذا الحساب",
        );
      }
    },
    onError: () => toast.error("تعذر تفعيل التجربة"),
  });

  const buyMutation = useMutation({
    mutationFn: (packageId: string) => buy({ data: { packageId } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(`تم ترقية حسابك إلى VIP ${res.level} بنجاح!`);
        qc.invalidateQueries({ queryKey: ["investment"] });
        qc.invalidateQueries({ queryKey: ["home"] });
        qc.invalidateQueries({ queryKey: ["account"] });
      } else {
        toast.error(
          res.reason === "INSUFFICIENT_BALANCE"
            ? "رصيدك غير كافٍ لإتمام ترقية هذه الباقة. يرجى شحن الرصيد أولاً."
            : "الباقة غير متاحة حالياً",
        );
      }
    },
    onError: () => toast.error("تعذر شراء الباقة حالياً"),
  });

  const investMutation = useMutation({
    mutationFn: (vals: { fundId: string; amount: number }) => invest({ data: vals }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(
          `تم الاستثمار بنجاح في ${res.fundName}! الأرباح المتوقعة: +${money(res.expectedProfit)}`,
        );
        setSelectedFund(null);
        setInvestAmount("5");
        qc.invalidateQueries({ queryKey: ["investment"] });
        qc.invalidateQueries({ queryKey: ["account"] });
        qc.invalidateQueries({ queryKey: ["financial-records"] });
      } else {
        if (res.reason === "INSUFFICIENT_BALANCE") {
          toast.error("رصيدك المتاح غير كافٍ لإتمام الاستثمار");
        } else if (res.reason === "BELOW_MIN_AMOUNT") {
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
    <div className="min-h-screen bg-background pb-28" dir="rtl">
      <AppHeader />

      <main className="mx-auto w-full max-w-lg px-4 pt-4">
        {isLoading || !data ? (
          <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : (
          <>
            {/* Wallet Snapshot Banner */}
            <section className="surface-card glow-border p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold border border-gold/30">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-bold">
                    الرصيد المتاح للاستثمار
                  </p>
                  <p className="text-xl font-extrabold text-gold-gradient">{money(balance)}</p>
                </div>
              </div>

              <div className="text-left">
                <p className="text-[11px] text-muted-foreground">عضويتك الحالية</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-navy-deep border border-gold px-2.5 py-0.5 text-xs font-extrabold text-gold">
                  <Crown className="h-3.5 w-3.5 fill-gold text-gold" />
                  <span>VIP {data.profile.vipLevel}</span>
                </span>
              </div>
            </section>

            {/* Trial Banner if VIP 0 */}
            {!data.profile.trialActive && data.profile.vipLevel === 0 && (
              <div className="mt-3 rounded-2xl border border-cyan-glow/40 bg-surface/80 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-glow/20 text-cyan-glow">
                    <Timer className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">الفترة التجريبية المجانية</h4>
                    <p className="text-[10px] text-muted-foreground">
                      جرب مهام VIP مجاناً لمدة يومين واكسب أرباحاً حقيقية
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={trialMutation.isPending}
                  onClick={() => trialMutation.mutate()}
                  className="shrink-0 rounded-xl brand-gradient px-3 py-1.5 text-xs font-extrabold text-primary-foreground shadow-glow active:scale-95 transition-all"
                >
                  تفعيل مجاني
                </button>
              </div>
            )}

            {/* View Switcher (Tabs) */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface/80 p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab("funds")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition-all ${
                  activeTab === "funds"
                    ? "brand-gradient text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Vault className="h-4 w-4" />
                <span>صندوق التوفير</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("vip")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition-all ${
                  activeTab === "vip"
                    ? "brand-gradient text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Crown className="h-4 w-4" />
                <span>ترقيات VIP</span>
              </button>
            </div>

            {/* TAB 1: SAVINGS FUNDS matching PDF Page 3 */}
            {activeTab === "funds" && (
              <div className="mt-4 space-y-4 animate-in fade-in duration-200">
                {/* Hero Header matching PDF Page 3 */}
                <div className="surface-card glow-border p-4 text-center relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gold/10 blur-2xl pointer-events-none" />
                  <h2 className="text-lg font-extrabold text-foreground">صندوق التوفير</h2>
                  <p className="mt-1 text-sm font-bold text-gold-gradient">
                    استثمر اليوم .. لمستقبل أفضل
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                    فرص استثمارية آمنة مع عوائد مميزة تمنحك الاستقرار المالي والنمو المستدام
                  </p>
                </div>

                {/* 4 Savings Funds List matching PDF Page 3 */}
                <div className="space-y-3">
                  {data.funds.map((fund) => (
                    <div
                      key={fund.id}
                      className="surface-card glow-border p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 hover:border-cyan-glow/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface border border-primary/40 text-cyan-glow font-extrabold text-xs shadow-glow">
                          {fund.code}
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-foreground">{fund.nameAr}</h3>
                          <p className="text-[11px] text-muted-foreground">
                            {fund.taglineAr || fund.nameEn}
                          </p>
                          <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                            <span className="flex items-center gap-1 text-cyan-glow">
                              <Clock className="h-3.5 w-3.5" />
                              <span>
                                المدة: <b>{fund.durationDays} أيام</b>
                              </span>
                            </span>
                            <span className="flex items-center gap-1 text-success font-bold">
                              <TrendingUp className="h-3.5 w-3.5" />
                              <span>نسبة الأرباح: {fund.profitPercent}%</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenInvest(fund)}
                        className="shrink-0 inline-flex items-center justify-center gap-1 rounded-xl gold-gradient px-4 py-2.5 text-xs font-extrabold text-navy-deep shadow-gold-glow hover:brightness-110 active:scale-95 transition-all"
                      >
                        <span>استثمر الآن</span>
                        <span>›</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Minimum Note matching PDF Page 3 */}
                <div className="rounded-2xl border border-gold/40 bg-gold/10 p-3 text-center text-xs font-bold text-gold flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>الحد الأدنى للاستثمار في الصناديق التوفيرية هو 5 دولارات</span>
                </div>

                {/* My Active Investments List */}
                {data.userInvestments && data.userInvestments.length > 0 && (
                  <section className="mt-6">
                    <h3 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-cyan-glow" />
                      <span>استثماراتي النشطة ({data.userInvestments.length})</span>
                    </h3>

                    <div className="space-y-2.5">
                      {data.userInvestments.map((inv) => (
                        <div
                          key={inv.id}
                          className="surface-card p-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <p className="font-extrabold text-foreground">{inv.fundName}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              تاريخ الاستحقاق:{" "}
                              {new Date(inv.maturesAt).toLocaleDateString("ar-EG", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>

                          <div className="text-left">
                            <p className="font-bold text-foreground">المبلغ: {money(inv.amount)}</p>
                            <p className="text-[11px] font-extrabold text-success">
                              الربح المتوقع: +{money(inv.expectedProfit)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* TAB 2: VIP PACKAGES (VIP 1 to 7) matching PDF Page 8, 9, 10 */}
            {activeTab === "vip" && (
              <div className="mt-4 space-y-3 animate-in fade-in duration-200">
                <div className="surface-card p-3.5 text-center glow-border mb-2">
                  <h2 className="text-base font-extrabold text-foreground flex items-center justify-center gap-1.5">
                    <Crown className="h-5 w-5 text-gold" />
                    <span>باقات العضوية الاستثمارية VIP</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    احصل على دخل يومي مستمر عبر إنجاز مهام مشاهدة الإعلانات اليومية
                  </p>
                </div>

                {data.packages.map((pkg) => {
                  const isCurrent = data.profile.vipLevel === pkg.level;
                  const isOwned = data.profile.vipLevel >= pkg.level;
                  const isLocked = !pkg.isActive || pkg.level === 7;

                  // VIP Styling colors
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
                      className={`surface-card p-4 transition-all relative overflow-hidden ${
                        isCurrent
                          ? "border-cyan-glow shadow-[0_0_15px_oklch(0.82_0.14_205/0.25)] ring-1 ring-cyan-glow/50"
                          : isLocked
                            ? "opacity-60"
                            : "hover:border-border"
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute top-2 left-2 rounded-full bg-cyan-glow text-navy-deep px-2 py-0.5 text-[10px] font-extrabold shadow">
                          باقتك النشطة حالياً
                        </span>
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${colorClass} shadow-glow`}
                          >
                            <Crown className="h-6 w-6" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-foreground">{pkg.name}</h3>
                              {isLocked && (
                                <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.2 text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                  <Lock className="h-2.5 w-2.5" /> مغلق حالياً
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              ربح يومي:{" "}
                              <span className="font-extrabold text-gold">
                                {money(pkg.dailyProfit)}
                              </span>{" "}
                              • مهام يومية:{" "}
                              <span className="font-bold text-foreground">
                                {pkg.dailyTasks} مهام
                              </span>
                            </p>
                            <p className="text-[11px] text-cyan-glow mt-0.5">
                              مكافأة المهمة الواحدة: {money(pkg.taskReward)}
                            </p>
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <span className="text-xs text-muted-foreground block">سعر الباقة</span>
                          <span className="text-xl font-extrabold text-gold-gradient">
                            {money(pkg.price)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                        <div className="text-[11px] text-muted-foreground">
                          صلاحية الباقة: 365 يوماً
                        </div>

                        {isLocked ? (
                          <button
                            type="button"
                            disabled
                            className="rounded-xl border border-border/60 bg-surface/50 px-4 py-2 text-xs font-bold text-muted-foreground cursor-not-allowed"
                          >
                            غير متاح حالياً
                          </button>
                        ) : isCurrent ? (
                          <span className="rounded-xl bg-success/20 border border-success/40 px-4 py-1.5 text-xs font-bold text-success flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> باقة مفعّلة
                          </span>
                        ) : isOwned ? (
                          <span className="rounded-xl bg-surface border border-border px-4 py-1.5 text-xs font-bold text-muted-foreground">
                            مملوكة سابقاً
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={buyMutation.isPending}
                            onClick={() => buyMutation.mutate(pkg.id)}
                            className="rounded-xl brand-gradient px-5 py-2 text-xs font-extrabold text-primary-foreground shadow-glow active:scale-95 transition-all"
                          >
                            {buyMutation.isPending ? "جاري الترقية..." : `ترقية إلى ${pkg.name}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Real Investment Modal Flow for Savings Fund */}
      {selectedFund && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in"
          onClick={() => setSelectedFund(null)}
          dir="rtl"
        >
          <div
            className="w-full max-w-md surface-card glow-border p-5 rounded-t-3xl sm:rounded-3xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface border border-cyan-glow/40 text-cyan-glow">
                  <Vault className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">
                    الاستثمار في {selectedFund.nameAr}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    المدة: {selectedFund.durationDays} أيام • الربح: {selectedFund.profitPercent}%
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFund(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmInvest} className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-foreground">مبلغ الاستثمار (USDT)</label>
                  <span className="text-xs text-muted-foreground">
                    الرصيد المتاح: <b className="text-gold">{money(balance)}</b>
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min={selectedFund.minAmount}
                    max={balance}
                    step="0.01"
                    placeholder={`الحد الأدنى ${selectedFund.minAmount}$`}
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-border bg-navy px-4 py-3.5 text-sm font-extrabold text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-gold">
                    USDT
                  </span>
                </div>

                {/* Quick amount presets */}
                <div className="mt-2 flex items-center gap-2">
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
                    الكل
                  </button>
                </div>
              </div>

              {/* Live Calculation Preview */}
              <div className="rounded-2xl border border-border/80 bg-surface/80 p-3.5 text-xs space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>نسبة الأرباح الثابتة:</span>
                  <span className="font-bold text-success">{selectedFund.profitPercent}%</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>مدة الحجز والاستثمار:</span>
                  <span className="font-bold text-foreground">{selectedFund.durationDays} يوم</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>الربح الصافي المتوقع:</span>
                  <span className="font-extrabold text-success">+{money(calculatedProfit)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-foreground border-t border-border/50 pt-2 text-sm">
                  <span>إجمالي المبلغ عند الاستحقاق:</span>
                  <span className="text-gold-gradient">
                    {money(parsedAmount + calculatedProfit)} USDT
                  </span>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={investMutation.isPending || parsedAmount <= 0}
                className="w-full rounded-2xl brand-gradient py-3.5 text-sm font-extrabold text-primary-foreground shadow-glow active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {investMutation.isPending ? "جاري فتح الاستثمار..." : "تأكيد واستثمار الآن ✈"}
              </button>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
