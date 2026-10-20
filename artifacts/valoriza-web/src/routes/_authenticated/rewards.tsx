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
  ChevronRight,
  CircleCheck,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getRewardsData, getTeamData } from "@/lib/valoriza-pages.functions";
import { claimDailyLoginReward } from "@/lib/valoriza.functions";
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
type RewardsData = {
  rewards: Array<{
    id: string;
    source: string;
    amount: number;
    description?: string | null;
    createdAt: string;
  }>;
  balance: number;
  totalEarned: number;
  dailyRewardClaimed: boolean;
  dailyRewardAmount: number;
};

const TEAM_REWARD_TIERS = [
  { members: 3, reward: "$1", kind: "cash" },
  { members: 6, reward: "$1.5", kind: "cash" },
  { members: 10, reward: "$2", kind: "cash" },
  { members: 25, reward: "$5", kind: "cash" },
  { members: 50, reward: "$12", kind: "cash" },
  { members: 100, reward: "$25", kind: "cash" },
  { members: 250, reward: "VIP", kind: "vip" },
] as const;

function RewardsPage() {
  const { t, isRTL } = useI18n();
  const qc = useQueryClient();
  const fetchData = useServerFn(getRewardsData);
  const claim = useServerFn(claimDailyLoginReward);
  const fetchTeam = useServerFn(getTeamData);
  const [filter, setFilter] = useState<RewardSource>("all");

  const {
    data,
    isLoading: isRewardsLoading,
    isError: isRewardsError,
    refetch: refetchRewards,
  } = useQuery<RewardsData>({
    queryKey: ["rewards"],
    queryFn: async () => (await fetchData()) as RewardsData,
  });
  const {
    data: teamData,
    isLoading: isTeamLoading,
    isError: isTeamError,
    refetch: refetchTeam,
  } = useQuery<{ members?: Array<{ vipLevel?: number | string | null }> }>({
    queryKey: ["team-reward-progress"],
    queryFn: async () =>
      (await fetchTeam()) as { members?: Array<{ vipLevel?: number | string | null }> },
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const qualifiedMembers =
    teamData?.members?.filter((member) => Number(member.vipLevel ?? 0) > 0).length ?? 0;

  const claimMutation = useMutation({
    mutationFn: async () => (await claim()) as { ok: boolean; amount?: number },
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
                {isRewardsLoading ? "…" : money(data?.totalEarned ?? 0)}
              </p>

              <p className="text-xs text-muted-foreground">
                {t("rewards.totalWalletBalance")}:{" "}
                <span className="font-extrabold text-foreground">
                  {isRewardsLoading ? "…" : money(data?.balance ?? 0)}
                </span>
              </p>
            </div>

            <div className="relative z-10 pt-4 mt-4 border-t border-border/50">
              <button
                type="button"
                id="claim-daily-reward-btn"
                disabled={!data || data.dailyRewardClaimed || claimMutation.isPending}
                onClick={() => claimMutation.mutate()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient py-3.5 px-4 text-sm font-black text-primary-foreground shadow-glow hover:opacity-95 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {data?.dailyRewardClaimed ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                    <span>{t("rewards.claimedToday")}</span>
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4 text-gold" />
                    <span>
                      {isRewardsLoading
                        ? t("common.loading")
                        : `${t("rewards.claimToday")} (${money(data?.dailyRewardAmount ?? 0)})`}
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

        <section className="space-y-3" aria-labelledby="team-rewards-title">
          <div className="flex items-center justify-between gap-3">
            <div className="text-start">
              <h2
                id="team-rewards-title"
                className="flex items-center gap-2 text-base sm:text-lg font-black text-foreground"
              >
                <Users className="h-5 w-5 text-cyan-glow" />
                {isRTL ? "مكافآت الفريق" : "Team rewards"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {isRTL
                  ? "زد أعضاء VIP المؤهلين في فريقك لفتح المكافآت التالية."
                  : "Grow your team of qualified VIP members to unlock rewards."}
              </p>
            </div>
            <Link
              to="/team"
              className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-cyan-glow/40 bg-cyan-glow/10 px-3 py-2 text-xs font-bold text-cyan-glow hover:bg-cyan-glow/15"
            >
              {isRTL ? "فريقي" : "My team"}
              <ChevronRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
            </Link>
          </div>

          <div className="surface-card glow-border rounded-3xl p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-border/70 bg-surface/70 px-3 py-2.5 text-xs">
              <span className="text-muted-foreground">
                {isRTL ? "الأعضاء المؤهلون حاليًا" : "Qualified members"}
              </span>
              <span className="font-black text-cyan-glow">
                {isTeamLoading ? "…" : isTeamError ? "—" : qualifiedMembers}
              </span>
            </div>
            {isTeamError && (
              <button
                type="button"
                onClick={() => void refetchTeam()}
                className="mb-3 w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                {isRTL ? "تعذر تحميل عدد الفريق — أعد المحاولة" : "Could not load team count — retry"}
              </button>
            )}

            <div className="space-y-2">
              {TEAM_REWARD_TIERS.map((tier) => {
                const unlocked =
                  !isTeamError && Boolean(teamData) && qualifiedMembers >= tier.members;
                const progress = isTeamError
                  ? 0
                  : Math.min((qualifiedMembers / tier.members) * 100, 100);
                const isVipReward = tier.kind === "vip";
                const remaining = Math.max(tier.members - qualifiedMembers, 0);

                return (
                  <article
                    key={tier.members}
                    className={`relative overflow-hidden rounded-2xl border p-3 transition-colors sm:px-4 ${
                      isVipReward
                        ? "border-gold/70 bg-gradient-to-r from-gold/15 via-surface to-surface shadow-[0_0_14px_rgba(245,190,70,0.12)]"
                        : unlocked
                          ? "border-cyan-glow/50 bg-cyan-glow/[0.07]"
                          : "border-border/80 bg-surface/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                          isVipReward
                            ? "border-gold/40 bg-gold/15 text-gold"
                            : "border-cyan-glow/30 bg-cyan-glow/10 text-cyan-glow"
                        }`}
                      >
                        {isVipReward ? <Crown className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                      </div>

                      <div className="min-w-0 flex-1 text-start">
                        <p className="text-xs sm:text-sm font-bold text-foreground">
                          {isRTL
                            ? `عند وصول العدد التراكمي إلى ${tier.members} أعضاء مؤهلين`
                            : `When your team reaches ${tier.members} qualified members`}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          {unlocked ? (
                            <CircleCheck className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <TrendingUp className="h-3.5 w-3.5 text-cyan-glow" />
                          )}
                          <span>
                            {isTeamError
                              ? isRTL
                                ? "تعذر التحقق من التقدم"
                                : "Progress unavailable"
                              : unlocked
                              ? isRTL
                                ? "تم بلوغ هذا المستوى"
                                : "Milestone reached"
                              : isRTL
                                ? `المتبقي ${remaining} عضو`
                                : `${remaining} members to go`}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`shrink-0 rounded-xl border px-3 py-2 text-center ${
                          isVipReward
                            ? "border-gold/60 bg-gold/15 text-gold"
                            : "border-cyan-glow/40 bg-cyan-glow/10 text-foreground"
                        }`}
                      >
                        <p className="text-lg leading-none font-black">{tier.reward}</p>
                        <p className="mt-1 text-[9px] font-semibold text-muted-foreground">
                          {isVipReward
                            ? isRTL
                              ? "ترقية VIP"
                              : "VIP upgrade"
                            : isRTL
                              ? "مكافأة"
                              : "Reward"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-background/80">
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ${
                          isVipReward ? "bg-gold" : "bg-cyan-glow"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

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

          {isRewardsLoading ? (
            <div className="surface-card rounded-2xl p-10 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : isRewardsError ? (
            <div className="surface-card rounded-2xl p-10 text-center">
              <p className="mb-3 text-sm font-bold text-foreground">{t("common.error")}</p>
              <button
                type="button"
                onClick={() => void refetchRewards()}
                className="rounded-xl brand-gradient px-4 py-2 text-xs font-bold text-primary-foreground"
              >
                {t("common.retry")}
              </button>
            </div>
          ) : filteredRewards.length === 0 ? (
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
