import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Gift, Sparkles, Wallet, Users, TrendingUp } from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getHomeData, claimDailyLoginReward, spinLuckyWheel } from "@/lib/valoriza.functions";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "الرئيسية — Valoriza" },
      { name: "description", content: "محفظتك وأرباحك اليومية وعجلة الحظ في منصة Valoriza." },
      { property: "og:title", content: "الرئيسية — Valoriza" },
      { property: "og:description", content: "محفظتك وأرباحك اليومية وعجلة الحظ." },
    ],
  }),
  component: HomePage,
});

const money = (n: number) => `$${n.toFixed(2)}`;

function HomePage() {
  const qc = useQueryClient();
  const fetchHome = useServerFn(getHomeData);
  const claim = useServerFn(claimDailyLoginReward);
  const spin = useServerFn(spinLuckyWheel);

  const { data, isLoading } = useQuery({ queryKey: ["home"], queryFn: () => fetchHome() });

  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: (res) => {
      if (res.ok) toast.success(`تم استلام مكافأة الدخول اليومي ${money(res.amount)}`);
      else toast.error("لقد استلمت مكافأة اليوم بالفعل");
      qc.invalidateQueries({ queryKey: ["home"] });
    },
    onError: () => toast.error("تعذر استلام المكافأة"),
  });

  const spinMutation = useMutation({
    mutationFn: () => spin(),
    onSuccess: (res) => {
      if (res.ok) toast.success(`ربحت: ${res.label}`);
      else toast.error("لا توجد محاولات متبقية اليوم");
      qc.invalidateQueries({ queryKey: ["home"] });
    },
    onError: () => toast.error("تعذر تشغيل عجلة الحظ"),
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader />
      <main className="mx-auto w-full max-w-lg px-4 pt-4">
        {isLoading || !data ? (
          <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : (
          <>
            <section className="surface-card glow-border p-5">
              <p className="text-xs text-muted-foreground">مرحباً {data.profile.username}</p>
              <p className="mt-1 text-xs text-muted-foreground">الرصيد المتاح</p>
              <p className="mt-1 text-4xl font-extrabold text-gold-gradient">
                {money(data.wallet.balance)}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat icon={TrendingUp} label="الأرباح" value={money(data.wallet.totalEarned)} />
                <Stat icon={Wallet} label="المستثمر" value={money(data.wallet.investedBalance)} />
                <Stat icon={Users} label="دخل الفريق" value={money(data.wallet.teamIncome)} />
              </div>
            </section>

            <section className="mt-4 surface-card flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <Gift className="h-4 w-4 text-gold" /> مكافأة الدخول اليومي
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {money(data.dailyReward.amount)} يومياً عند تسجيل الدخول
                </p>
              </div>
              <button
                type="button"
                disabled={data.dailyReward.claimed || claimMutation.isPending}
                onClick={() => claimMutation.mutate()}
                className="shrink-0 rounded-xl gold-gradient px-3 py-2 text-xs font-extrabold text-navy-deep disabled:opacity-50"
              >
                {data.dailyReward.claimed ? "تم الاستلام" : "استلام"}
              </button>
            </section>

            <section className="mt-4 surface-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <Sparkles className="h-4 w-4 text-cyan-glow" /> عجلة الحظ
                </p>
                <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
                  محاولات متبقية: {data.wheel.spinsLeft}
                </span>
              </div>
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {data.wheel.prizes.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-xl border border-border bg-navy-deep/60 px-2 py-2 text-center text-[11px] font-semibold text-foreground"
                  >
                    {p.label}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={data.wheel.spinsLeft <= 0 || spinMutation.isPending}
                onClick={() => spinMutation.mutate()}
                className="mt-3 w-full rounded-2xl brand-gradient px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {spinMutation.isPending ? "جارٍ الدوران..." : "أدر العجلة"}
              </button>
            </section>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-navy-deep/60 px-2 py-2.5">
      <Icon className="mx-auto h-4 w-4 text-cyan-glow" />
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xs font-bold text-foreground">{value}</p>
    </div>
  );
}
