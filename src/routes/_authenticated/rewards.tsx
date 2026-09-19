import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Gift,
  CalendarCheck,
  Video,
  Sparkles,
  Users,
  Crown,
  Filter,
  CheckCircle2,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getRewardsData } from "@/lib/valoriza-pages.functions";
import { claimDailyLoginReward } from "@/lib/valoriza.functions";

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({
    meta: [
      { title: "المكافآت — Valoriza" },
      { name: "description", content: "سجل مكافآتك اليومية، وعمولات المهام، وجوائز عجلة الحظ." },
      { property: "og:title", content: "المكافآت — Valoriza" },
      { property: "og:description", content: "سجل مكافآتك اليومية وجوائزك." },
    ],
  }),
  component: RewardsPage,
});

const money = (n: number) => `$${n.toFixed(2)}`;

type RewardSource = "all" | "daily_login" | "task_reward" | "lucky_wheel" | "referral" | "vip";

function getSourceInfo(source: string) {
  switch (source) {
    case "daily_login":
      return {
        label: "تسجيل الدخول اليومي",
        icon: <CalendarCheck className="h-4 w-4 text-cyan-glow" />,
        badgeColor: "border-cyan-glow/40 bg-cyan-glow/10 text-cyan-glow",
      };
    case "task_reward":
      return {
        label: "مكافأة مهمة فيديو",
        icon: <Video className="h-4 w-4 text-purple-400" />,
        badgeColor: "border-purple-400/40 bg-purple-400/10 text-purple-300",
      };
    case "lucky_wheel":
      return {
        label: "عجلة الحظ",
        icon: <Sparkles className="h-4 w-4 text-pink-400" />,
        badgeColor: "border-pink-400/40 bg-pink-400/10 text-pink-300",
      };
    case "referral":
    case "referral_commission":
      return {
        label: "عمولة إحالة فريق",
        icon: <Users className="h-4 w-4 text-emerald-400" />,
        badgeColor: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
      };
    case "vip":
    case "vip_upgrade":
      return {
        label: "مكافأة باقة VIP",
        icon: <Crown className="h-4 w-4 text-gold" />,
        badgeColor: "border-gold/40 bg-gold/10 text-gold",
      };
    default:
      return {
        label: "مكافأة منصة",
        icon: <Gift className="h-4 w-4 text-cyan-glow" />,
        badgeColor: "border-border bg-surface text-foreground",
      };
  }
}

function RewardsPage() {
  const qc = useQueryClient();
  const fetchData = useServerFn(getRewardsData);
  const claim = useServerFn(claimDailyLoginReward);
  const [filter, setFilter] = useState<RewardSource>("all");

  const { data, isLoading } = useQuery({ queryKey: ["rewards"], queryFn: () => fetchData() });

  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: (res) => {
      toast[res.ok ? "success" : "error"](
        res.ok ? "تم استلام المكافأة اليومية بنجاح 🎉" : "تم الاستلام مسبقاً لهذا اليوم",
      );
      qc.invalidateQueries({ queryKey: ["rewards"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["user-notifications"] });
      qc.invalidateQueries({ queryKey: ["account-data"] });
    },
    onError: () => toast.error("تعذر استلام المكافأة"),
  });

  const rewardsList = data?.rewards ?? [];
  const filteredRewards =
    filter === "all"
      ? rewardsList
      : rewardsList.filter((r) => {
          if (filter === "daily_login") return r.source === "daily_login";
          if (filter === "task_reward") return r.source === "task_reward";
          if (filter === "lucky_wheel") return r.source === "lucky_wheel";
          if (filter === "referral") return r.source.includes("referral");
          if (filter === "vip") return r.source.includes("vip");
          return true;
        });

  return (
    <div className="min-h-screen bg-navy-night pb-24 text-foreground" dir="rtl">
      <AppHeader balance={data?.balance} showAbout={true} />
      <main className="mx-auto w-full max-w-lg px-4 pt-4">
        {isLoading || !data ? (
          <div className="py-20 text-center text-xs text-muted-foreground">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-cyan-glow border-t-transparent mb-2" />
            جارٍ تحميل سجل المكافآت...
          </div>
        ) : (
          <>
            {/* Total Rewards Hero Card */}
            <section className="surface-card glow-border relative overflow-hidden p-5 text-center shadow-xl">
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1 text-[11px] font-bold text-cyan-glow border border-border">
                  <Gift className="h-3.5 w-3.5 text-pink-400" />
                  إجمالي المكافآت المحققة
                </span>
                <p className="mt-2 text-3xl font-black text-gold-gradient tracking-tight">
                  {money(data.totalRewards)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  رصيد المحفظة الإجمالي:{" "}
                  <span className="font-extrabold text-foreground">{money(data.balance)}</span>
                </p>

                <button
                  type="button"
                  id="claim-daily-reward-btn"
                  disabled={data.dailyRewardClaimed || claimMutation.isPending}
                  onClick={() => claimMutation.mutate()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient py-3 text-sm font-black text-primary-foreground shadow-glow hover:opacity-95 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {data.dailyRewardClaimed ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>تم استلام مكافأة اليوم</span>
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4 text-gold" />
                      <span>احصل على مكافأة اليوم ({money(data.dailyRewardAmount)})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Decorative Blur circles */}
              <div className="absolute -left-8 -bottom-8 h-28 w-28 rounded-full bg-cyan-glow/15 blur-xl" />
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-pink-500/15 blur-xl" />
            </section>

            {/* Filter Chips Bar */}
            <div className="mt-5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              {(
                [
                  { id: "all", label: "الكل" },
                  { id: "daily_login", label: "اليومية" },
                  { id: "task_reward", label: "المهام" },
                  { id: "lucky_wheel", label: "عجلة الحظ" },
                  { id: "referral", label: "الإحالة" },
                  { id: "vip", label: "VIP" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all ${
                    filter === tab.id
                      ? "brand-gradient text-primary-foreground shadow-glow"
                      : "bg-surface/70 border border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* History Section */}
            <div className="mt-4 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-cyan-glow" />
                <span>سجل المكافآت المحققة</span>
              </h2>
              <span className="text-[10px] text-muted-foreground">
                {filteredRewards.length} معاملة
              </span>
            </div>

            {filteredRewards.length === 0 ? (
              <div className="mt-4 surface-card border border-border/60 p-8 text-center rounded-2xl">
                <Gift className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-xs font-bold text-foreground">لا توجد سجلات مكافآت لهذا القسم</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  قم بإكمال المهام اليومية وتسجيل الدخول للمطالبة بالمكافآت.
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {filteredRewards.map((r) => {
                  const info = getSourceInfo(r.source);
                  return (
                    <li
                      key={r.id}
                      className="surface-card flex items-center justify-between gap-3 rounded-2xl border border-border/60 p-3 hover:border-cyan-glow/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-deep border border-border">
                          {info.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded-full border px-1.5 py-0.2 text-[9px] font-extrabold ${info.badgeColor}`}
                            >
                              {info.label}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs font-bold text-foreground">
                            {r.description || info.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(r.createdAt).toLocaleString("ar-SA", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-left">
                        <span className="text-sm font-black text-emerald-400">
                          +{money(r.amount)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
