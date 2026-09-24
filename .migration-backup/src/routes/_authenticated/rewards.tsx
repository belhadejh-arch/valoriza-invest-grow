import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  ArrowRight,
  TrendingUp,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getRewardsData } from "@/lib/valoriza-pages.functions";
import { claimDailyLoginReward } from "@/lib/valoriza.functions";
import { getMockRewardsData } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";

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

function RewardsPage() {
  const { t, isRTL } = useI18n();
  const qc = useQueryClient();
  const fetchData = useServerFn(getRewardsData);
  const claim = useServerFn(claimDailyLoginReward);
  const [filter, setFilter] = useState<RewardSource>("all");

  const { data = getMockRewardsData() } = useQuery({
    queryKey: ["rewards"],
    queryFn: () => fetchData(),
    initialData: getMockRewardsData,
  });

  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: (res) => {
      toast[res.ok ? "success" : "error"](
        res.ok ? t("rewards.claimSuccess") : t("rewards.alreadyClaimed"),
      );
      qc.invalidateQueries({ queryKey: ["rewards"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["user-notifications"] });
      qc.invalidateQueries({ queryKey: ["account-data"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  function getSourceInfo(source: string) {
    switch (source) {
      case "daily_login":
        return {
          label: t("rewards.filterDaily"),
          icon: <CalendarCheck className="h-4 w-4 text-cyan-glow" />,
          badgeColor: "border-cyan-glow/40 bg-cyan-glow/10 text-cyan-glow",
        };
      case "task_reward":
        return {
          label: t("rewards.filterTasks"),
          icon: <Video className="h-4 w-4 text-purple-400" />,
          badgeColor: "border-purple-400/40 bg-purple-400/10 text-purple-300",
        };
      case "lucky_wheel":
        return {
          label: t("rewards.filterWheel"),
          icon: <Sparkles className="h-4 w-4 text-pink-400" />,
          badgeColor: "border-pink-400/40 bg-pink-400/10 text-pink-300",
        };
      case "referral":
      case "referral_commission":
        return {
          label: t("rewards.filterReferral"),
          icon: <Users className="h-4 w-4 text-emerald-400" />,
          badgeColor: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
        };
      case "vip":
      case "vip_upgrade":
        return {
          label: t("rewards.filterVip"),
          icon: <Crown className="h-4 w-4 text-gold" />,
          badgeColor: "border-gold/40 bg-gold/10 text-gold",
        };
      default:
        return {
          label: t("common.details"),
          icon: <Gift className="h-4 w-4 text-cyan-glow" />,
          badgeColor: "border-border bg-surface text-foreground",
        };
    }
  }

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
    <div
      className="min-h-screen bg-background pb-28 md:pb-12 text-foreground"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AppHeader balance={data?.balance} showAbout={true} />

      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Bento Section (2 Columns on desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
              {/* Total Rewards Hero Card */}
              <section className="md:col-span-7 surface-card glow-border relative overflow-hidden p-6 rounded-3xl flex flex-col justify-between text-start shadow-xl">
                <div className="absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-cyan-glow/15 blur-2xl pointer-events-none" />
                <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-pink-500/15 blur-2xl pointer-events-none" />

                <div className="relative z-10 space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-bold text-cyan-glow border border-border">
                    <Gift className="h-4 w-4 text-pink-400" />
                    <span>{t("rewards.totalEarned")}</span>
                  </div>

                  <p className="text-3xl sm:text-4xl font-black text-gold-gradient tracking-tight">
                    {money(data.totalRewards)}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {t("rewards.totalWalletBalance")}:{" "}
                    <span className="font-extrabold text-foreground">{money(data.balance)}</span>
                  </p>
                </div>

                <div className="relative z-10 pt-4 mt-4 border-t border-border/50">
                  <button
                    type="button"
                    id="claim-daily-reward-btn"
                    disabled={data.dailyRewardClaimed || claimMutation.isPending}
                    onClick={() => claimMutation.mutate()}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient py-3.5 px-4 text-sm font-black text-primary-foreground shadow-glow hover:opacity-95 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {data.dailyRewardClaimed ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                        <span>{t("rewards.claimedToday")}</span>
                      </>
                    ) : (
                      <>
                        <Gift className="h-4 w-4 text-gold" />
                        <span>
                          {t("rewards.claimToday")} ({money(data.dailyRewardAmount)})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </section>

              {/* Lucky Wheel Quick Action Bento Card */}
              <section className="md:col-span-5 surface-card glow-border p-6 rounded-3xl flex flex-col justify-between text-start relative overflow-hidden">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-pink-500/10 border border-pink-500/30 px-3 py-1 text-xs font-bold text-pink-400">
                    <Sparkles className="h-4 w-4" />
                    <span>{t("rewards.wheelTitle")}</span>
                  </div>

                  <h3 className="text-xl font-black text-foreground">{t("home.luckyWheel")}</h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("rewards.wheelSubtitle")}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-border/50">
                  <Link
                    to="/home"
                    className="flex items-center justify-between w-full rounded-2xl border border-pink-500/40 bg-pink-500/10 px-4 py-3 text-xs font-black text-pink-400 hover:bg-pink-500/20 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      {t("rewards.spin")}
                    </span>
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Link>
                </div>
              </section>
            </div>

            {/* Filter Chips Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
              {(
                [
                  { id: "all", label: t("rewards.filterAll") },
                  { id: "daily_login", label: t("rewards.filterDaily") },
                  { id: "task_reward", label: t("rewards.filterTasks") },
                  { id: "lucky_wheel", label: t("rewards.filterWheel") },
                  { id: "referral", label: t("rewards.filterReferral") },
                  { id: "vip", label: t("rewards.filterVip") },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    filter === tab.id
                      ? "brand-gradient text-primary-foreground shadow-glow"
                      : "surface-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* History Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                  <Filter className="h-4 w-4 text-cyan-glow" />
                  <span>{t("rewards.historyTitle")}</span>
                </h2>
                <span className="text-xs text-muted-foreground font-semibold">
                  {filteredRewards.length} {t("common.details")}
                </span>
              </div>

              {filteredRewards.length === 0 ? (
                <div className="surface-card p-10 sm:p-14 text-center rounded-2xl">
                  <Gift className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-bold text-foreground">{t("rewards.noHistory")}</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    {t("rewards.noHistoryDesc")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredRewards.map((r) => {
                    const info = getSourceInfo(r.source);
                    return (
                      <div
                        key={r.id}
                        className="surface-card flex items-center justify-between gap-3 rounded-2xl p-3.5 hover:border-cyan-glow/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface border border-border">
                            {info.icon}
                          </div>
                          <div className="min-w-0 flex-1 text-start">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${info.badgeColor}`}
                              >
                                {info.label}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs font-black text-foreground">
                              {r.description || info.label}
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

                        <div className="shrink-0 text-end">
                          <span className="text-sm sm:text-base font-black text-emerald-400">
                            +{money(r.amount)}
                          </span>
                        </div>
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
