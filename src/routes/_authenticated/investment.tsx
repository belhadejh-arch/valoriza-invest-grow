import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Crown, Timer } from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getInvestmentData, activateTrial, purchaseVip } from "@/lib/valoriza-pages.functions";

export const Route = createFileRoute("/_authenticated/investment")({
  head: () => ({
    meta: [
      { title: "الاستثمار — Valoriza" },
      { name: "description", content: "باقات VIP وصناديق التوفير في منصة Valoriza." },
      { property: "og:title", content: "الاستثمار — Valoriza" },
      { property: "og:description", content: "باقات VIP وصناديق التوفير بأرباح يومية." },
    ],
  }),
  component: InvestmentPage,
});

const money = (n: number) => `$${n.toFixed(2)}`;

function InvestmentPage() {
  const qc = useQueryClient();
  const fetchData = useServerFn(getInvestmentData);
  const trial = useServerFn(activateTrial);
  const buy = useServerFn(purchaseVip);

  const { data, isLoading } = useQuery({ queryKey: ["investment"], queryFn: () => fetchData() });

  const trialMutation = useMutation({
    mutationFn: () => trial(),
    onSuccess: (res) => {
      toast[res.ok ? "success" : "error"](
        res.ok ? "تم تفعيل الفترة التجريبية" : res.reason === "HAS_VIP" ? "لديك باقة نشطة" : "تم استخدام التجربة مسبقاً",
      );
      qc.invalidateQueries({ queryKey: ["investment"] });
    },
    onError: () => toast.error("تعذر تفعيل التجربة"),
  });

  const buyMutation = useMutation({
    mutationFn: (packageId: string) => buy({ data: { packageId } }),
    onSuccess: (res) => {
      toast[res.ok ? "success" : "error"](
        res.ok ? `تم تفعيل الباقة VIP ${res.level}` : res.reason === "INSUFFICIENT_BALANCE" ? "رصيدك غير كافٍ" : "الباقة غير متاحة",
      );
      qc.invalidateQueries({ queryKey: ["investment"] });
      qc.invalidateQueries({ queryKey: ["home"] });
    },
    onError: () => toast.error("تعذر شراء الباقة"),
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader />
      <main className="mx-auto w-full max-w-lg px-4 pt-4">
        {isLoading || !data ? (
          <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : (
          <>
            <section className="surface-card p-4">
              <p className="text-xs text-muted-foreground">الرصيد المتاح</p>
              <p className="text-2xl font-extrabold text-gold-gradient">{money(data.wallet.balance)}</p>
              {!data.profile.trialActive && data.profile.vipLevel === 0 && (
                <button
                  type="button"
                  disabled={trialMutation.isPending}
                  onClick={() => trialMutation.mutate()}
                  className="mt-3 w-full rounded-2xl border border-cyan-glow/60 px-4 py-2.5 text-sm font-bold text-cyan-glow disabled:opacity-50"
                >
                  <Timer className="ml-1 inline h-4 w-4" /> تفعيل الفترة التجريبية المجانية
                </button>
              )}
            </section>

            <h2 className="mt-5 text-base font-extrabold text-foreground">باقات VIP</h2>
            <ul className="mt-3 space-y-3">
              {data.packages.map((p) => (
                <li key={p.id} className="surface-card glow-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                        <Crown className="h-4 w-4 text-gold" /> {p.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ربح يومي {money(p.dailyProfit)} • {p.dailyTasks} مهام • {money(p.taskReward)} للمهمة
                      </p>
                    </div>
                    <span className="shrink-0 text-lg font-extrabold text-gold">{money(p.price)}</span>
                  </div>
                  <button
                    type="button"
                    disabled={buyMutation.isPending || data.profile.vipLevel >= p.level}
                    onClick={() => buyMutation.mutate(p.id)}
                    className="mt-3 w-full rounded-xl brand-gradient px-4 py-2.5 text-sm font-extrabold text-primary-foreground disabled:opacity-50"
                  >
                    {data.profile.vipLevel >= p.level ? "مفعّلة" : "شراء الباقة"}
                  </button>
                </li>
              ))}
            </ul>

            <h2 className="mt-6 text-base font-extrabold text-foreground">صناديق التوفير</h2>
            <ul className="mt-3 space-y-3">
              {data.funds.map((f) => (
                <li key={f.id} className="surface-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-foreground">{f.nameAr}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {f.taglineAr ?? f.nameEn}
                      </p>
                    </div>
                    <div className="shrink-0 text-left">
                      <p className="text-sm font-extrabold text-success">{f.profitPercent}%</p>
                      <p className="text-[11px] text-muted-foreground">{f.durationDays} يوم</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    الحد الأدنى للاشتراك {money(f.minAmount)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
