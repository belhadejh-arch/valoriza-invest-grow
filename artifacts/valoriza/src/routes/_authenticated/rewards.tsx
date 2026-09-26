import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  Coins,
  ShieldCheck,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getAccountData, getRewardsData, getTeamData } from "@/lib/valoriza-pages.functions";
import { claimDailyLoginReward } from "@/lib/valoriza.functions";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";

export const Route = createFileRoute("/_authenticated/rewards")({
  component: RewardsPage,
});

const money = (n: number | null | undefined) => {
  const value = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `$${value.toFixed(2)}`;
};

type RewardSource = "all" | "daily_login" | "task_reward" | "lucky_wheel" | "referral" | "vip";

function RewardsPage() {
  const { t, isRTL, lang } = useI18n();
  const content = useLocalizedContent();
  const qc = useQueryClient();
  const fetchData = getRewardsData;
  const claim = claimDailyLoginReward;
  const [filter, setFilter] = useState<RewardSource>("all");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["rewards"],
    queryFn: () => fetchData(),
  });
  const { data: team, isLoading: teamLoading, isError: teamError, refetch: refetchTeam } = useQuery({
    queryKey: ["team"],
    queryFn: getTeamData,
  });
  const { data: account, isLoading: accountLoading, isError: accountError, refetch: refetchAccount } = useQuery({
    queryKey: ["account-data"],
    queryFn: getAccountData,
    // Keep the server's current-day claim status fresh when this page stays open overnight.
    refetchInterval: 60_000,
  });

  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: (res: any) => {
      toast[res.ok ? "success" : "error"](
        res.ok ? t("common.success") : t("rewards.alreadyClaimed"),
      );
      qc.invalidateQueries({ queryKey: ["rewards"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["user-notifications"] });
      qc.invalidateQueries({ queryKey: ["account-data"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#e9f5fa] text-[#092c58] dark:bg-[#041b3d] dark:text-[#f4faff] pb-28" dir={isRTL ? "rtl" : "ltr"}>
        <AppHeader />
        <div className="mx-auto max-w-4xl px-4 py-7 space-y-3" role="status" aria-label={t("common.loading")}>
          <div className="h-40 rounded-3xl bg-[#0b3a73]/20 animate-pulse" />
          {[0, 1, 2].map((item) => <div key={item} className="h-24 rounded-2xl bg-[#0b3a73]/15 animate-pulse" />)}
        </div>
        <BottomNav />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-[100dvh] bg-[#e9f5fa] text-[#092c58] dark:bg-[#041b3d] dark:text-[#f4faff] pb-28" dir={isRTL ? "rtl" : "ltr"}>
        <AppHeader />
        <div className="mx-auto flex min-h-72 max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <Gift className="h-12 w-12 text-[#d9a934]" />
          <p className="font-bold">{t("common.error")}</p>
          <button type="button" data-testid="button-retry-rewards" onClick={() => refetch()} className="rounded-xl bg-[#1055ab] px-6 py-2.5 font-bold text-white">{t("common.retry")}</button>
        </div>
        <BottomNav />
      </div>
    );
  }

  function getSourceInfo(source: string) {
    switch (source) {
      case "daily_login":
        return {
          label: t("rewards.filterDaily"),
          icon: <CalendarCheck className="h-4 w-4 text-[#1670bd] dark:text-[#80d4ff]" />,
          badgeColor: "border-[#85bce1] bg-[#d8effc] text-[#17598e] dark:border-[#357ebb] dark:bg-[#104278] dark:text-[#b0e6ff]",
        };
      case "task_reward":
        return {
          label: t("rewards.filterTasks"),
          icon: <Video className="h-4 w-4 text-[#1670bd] dark:text-[#80d4ff]" />,
          badgeColor: "border-[#85bce1] bg-[#d8effc] text-[#17598e] dark:border-[#357ebb] dark:bg-[#104278] dark:text-[#b0e6ff]",
        };
      case "lucky_wheel":
        return {
          label: t("rewards.filterWheel"),
          icon: <Sparkles className="h-4 w-4 text-[#b5852c] dark:text-[#ffd471]" />,
          badgeColor: "border-[#dec386] bg-[#fff3d8] text-[#8d6321] dark:border-[#93742e] dark:bg-[#5c4518] dark:text-[#ffe29a]",
        };
      case "referral":
      case "referral_commission":
        return {
          label: t("rewards.filterReferral"),
          icon: <Users className="h-4 w-4 text-[#1670bd] dark:text-[#80d4ff]" />,
          badgeColor: "border-[#85bce1] bg-[#d8effc] text-[#17598e] dark:border-[#357ebb] dark:bg-[#104278] dark:text-[#b0e6ff]",
        };
      case "vip":
      case "vip_upgrade":
        return {
          label: t("rewards.filterVip"),
          icon: <Crown className="h-4 w-4 text-[#b5852c] dark:text-[#ffd471]" />,
          badgeColor: "border-[#dec386] bg-[#fff3d8] text-[#8d6321] dark:border-[#93742e] dark:bg-[#5c4518] dark:text-[#ffe29a]",
        };
      default:
        return {
          label: t("common.details"),
          icon: <Gift className="h-4 w-4 text-[#1670bd] dark:text-[#80d4ff]" />,
          badgeColor: "border-[#85bce1] bg-[#d8effc] text-[#17598e] dark:border-[#357ebb] dark:bg-[#104278] dark:text-[#b0e6ff]",
        };
    }
  }

  const rewardsList = data?.rewards ?? [];
  const filteredRewards =
    filter === "all"
      ? rewardsList
      : rewardsList.filter((r: any) => {
          const source = String(r?.source ?? "");
          if (filter === "daily_login") return source === "daily_login";
          if (filter === "task_reward") return source === "task_reward";
          if (filter === "lucky_wheel") return source === "lucky_wheel";
          if (filter === "referral") return source.includes("referral");
          if (filter === "vip") return source.includes("vip");
          return true;
        });
  const levels = Array.isArray(team?.levels) ? team.levels : [];

  return (
    <div
      className="min-h-[100dvh] bg-[radial-gradient(ellipse_at_top,#c9edf7_0%,#edf7fa_44%,#dceef5_100%)] text-[#092c58] dark:bg-[radial-gradient(ellipse_at_top,#074d87_0%,#052753_37%,#031631_100%)] dark:text-[#f4faff] pb-28 md:pb-12"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AppHeader balance={data?.balance} showAbout={true} />

      <main className="mx-auto w-full max-w-4xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5">
        {/* The reward masthead follows the reference's gift / message / team rhythm. */}
        <section className="relative isolate overflow-hidden rounded-[22px] border border-[#63c3f3]/60 bg-[linear-gradient(115deg,#041f4e_0%,#06448e_52%,#063175_100%)] p-5 sm:p-8 shadow-[0_15px_32px_rgba(4,35,80,.23)] text-white">
          <div className="pointer-events-none absolute -top-20 -end-10 h-48 w-48 rounded-full bg-[#1789e8]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -start-10 h-40 w-40 rounded-full bg-[#f0b82d]/20 blur-3xl" />
          <div className="relative flex items-center gap-4 sm:gap-8">
            <div className="flex h-20 w-20 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-3xl border border-[#f3c75b]/60 bg-[radial-gradient(circle_at_30%_20%,#287bd0,#082a65_70%)] shadow-[inset_0_2px_12px_rgba(255,255,255,.18),0_9px_23px_rgba(0,0,0,.23)]">
              <Gift className="h-11 w-11 sm:h-16 sm:w-16 text-[#ffd66b] drop-shadow-[0_3px_4px_rgba(0,0,0,.35)]" strokeWidth={1.7} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[10px] sm:text-xs font-bold uppercase tracking-[.18em] text-[#99e2ff]">{t("team.inviteRewards")}</p>
              <h1 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight">{t("nav.rewards")}</h1>
              <p className="mt-1 text-xs sm:text-base font-semibold text-[#d7efff]">{t("team.growIncome")}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs">
                <span className="inline-flex items-center gap-1.5 text-[#ffe18e]"><Users className="h-3.5 w-3.5" />{t("team.totalMembers")}: <b data-testid="text-total-members">{teamLoading ? "—" : teamError ? "—" : Number(team?.totalMembers ?? 0).toLocaleString()}</b></span>
                <span className="inline-flex items-center gap-1.5 text-[#b5eaff]"><ShieldCheck className="h-3.5 w-3.5" />{t("team.teamRewards")}: <b data-testid="text-team-rewards">{teamLoading || teamError ? "—" : money(team?.teamRewards)}</b></span>
              </div>
            </div>
            <div className="hidden sm:flex h-24 w-24 items-center justify-center rounded-full border border-[#54baff]/30 bg-[#1379cf]/20">
              <TrendingUp className="h-14 w-14 text-[#ffd56a]" strokeWidth={1.5} />
            </div>
          </div>
        </section>

        {/* Only server-provided levels, earnings, members and settings-backed rates are shown. */}
        <section aria-labelledby="levels-heading" className="rounded-[22px] border border-[#397dc1] bg-[linear-gradient(145deg,#062453,#041b3e)] p-2.5 sm:p-4 shadow-[0_15px_30px_rgba(3,32,75,.23)]">
          <div className="flex items-center justify-between gap-3 px-2 pb-3 pt-1">
            <h2 id="levels-heading" className="flex items-center gap-2 text-sm sm:text-base font-black text-[#ffda77]"><Crown className="h-5 w-5" />{t("team.referralLevels")}</h2>
            <Link to="/team" data-testid="link-view-team" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9dddff] hover:text-white">{t("team.viewAllLevels")}<ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" /></Link>
          </div>
          {teamLoading ? (
            <div className="space-y-2" role="status" aria-label={t("common.loading")}>{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-[#155399]/40 animate-pulse" />)}</div>
          ) : teamError ? (
            <div className="rounded-xl border border-[#3b86bd] bg-[#0b3668] px-5 py-7 text-center text-sm text-white">
              <p>{t("team.fetchError")}</p>
              <button type="button" data-testid="button-retry-team" onClick={() => refetchTeam()} className="mt-3 rounded-lg bg-[#d8ad46] px-5 py-2 font-bold text-[#092852]">{t("common.retry")}</button>
            </div>
          ) : levels.length === 0 ? (
            <div className="rounded-xl border border-[#3b86bd] bg-[#0b3668] px-5 py-8 text-center text-sm text-[#caeaff]"><Users className="mx-auto mb-2 h-8 w-8 text-[#f0c565]" />{t("team.noMembers")}</div>
          ) : (
            <div className="space-y-2">
              {levels.map((level: any) => (
                <Link key={level.level} to="/team" data-testid={`link-team-level-${level.level}`} className="group relative flex min-h-[90px] items-center gap-3 sm:gap-5 overflow-hidden rounded-[15px] border border-[#2e83cd] bg-[linear-gradient(105deg,#073673,#062953_65%,#073b80)] px-3 sm:px-5 py-3 text-white shadow-[inset_0_1px_8px_rgba(57,151,248,.25),0_3px_9px_rgba(0,0,0,.25)] transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#7bd1ff]">
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full border border-[#5bbdff]/60 bg-[radial-gradient(circle_at_35%_25%,#2585d7,#092e65_75%)] shadow-[inset_0_1px_5px_rgba(255,255,255,.25)]">
                    <Users className="h-7 w-7 sm:h-8 sm:w-8 text-[#b9eaff]" strokeWidth={1.7} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-base font-black leading-snug">
                      {level.level === 1 ? t("team.levelOne") : level.level === 2 ? t("team.levelTwo") : level.level === 3 ? t("team.levelThree") : t("team.levelNumber").replace("{level}", String(level.level))}
                      {Number.isFinite(Number(level.rewardRate)) && <span className="ms-2 text-[#ffdc71]" data-testid={`text-level-rate-${level.level}`} dir="ltr">{Number(level.rewardRate)}%</span>}
                    </p>
                    <p className="mt-1 text-[11px] sm:text-sm font-semibold text-[#9ddaff]"><span data-testid={`text-level-members-${level.level}`}>{Number(level.members ?? 0).toLocaleString()}</span> {t("team.levelMembers")}</p>
                  </div>
                  <div className="flex min-w-[90px] sm:min-w-[140px] flex-col items-center justify-center rounded-xl border border-[#3da9ff] bg-[linear-gradient(145deg,#075cb4,#063775)] px-2 py-2 shadow-[inset_0_1px_8px_rgba(97,191,255,.36)]">
                    <span className="flex items-center gap-1 text-base sm:text-xl font-black text-[#ffdc73]" data-testid={`text-level-earnings-${level.level}`}><Coins className="h-4 w-4 sm:h-5 sm:w-5" />{money(level.earnings)}</span>
                    <span className="text-[10px] sm:text-xs text-[#c8ebff]">{t("team.earnings")}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#c5ebff] rtl:rotate-180" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-3 sm:grid-cols-[1.25fr_.75fr]">
          <section className="rounded-[20px] border border-[#317ccc] bg-[linear-gradient(115deg,#063b81,#075cb2)] p-4 sm:p-5 text-white shadow-[0_10px_25px_rgba(3,38,91,.16)]">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#ffffff]/10 p-2.5"><Gift className="h-6 w-6 text-[#ffdb76]" /></div>
              <div className="min-w-0"><p className="text-xs font-semibold text-[#bce7ff]">{t("rewards.totalEarned")}</p><p className="text-2xl font-black text-[#ffdb76]" data-testid="text-total-earned">{money(data.totalEarned)}</p></div>
            </div>
            <p className="mt-2 text-[11px] text-[#c5e7ff]">{t("rewards.totalWalletBalance")}: <strong data-testid="text-wallet-balance" className="text-white">{money(data.balance)}</strong></p>
            {accountError ? (
              <button type="button" data-testid="button-retry-daily" onClick={() => refetchAccount()} className="mt-4 w-full rounded-xl border border-[#69b9ef] px-4 py-3 text-sm font-bold">{t("common.retry")}</button>
            ) : (
              <button type="button" id="claim-daily-reward-btn" data-testid="button-claim-daily-reward" disabled={accountLoading || account?.dailyReward?.claimed || claimMutation.isPending} onClick={() => claimMutation.mutate()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(100deg,#f7d878,#c99432)] px-4 py-3 text-sm font-black text-[#082b59] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                {account?.dailyReward?.claimed ? <CheckCircle2 className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
                {accountLoading ? t("common.loading") : account?.dailyReward?.claimed ? t("rewards.claimedToday") : <span>{t("rewards.claimToday")} ({money(account?.dailyReward?.amount)})</span>}
              </button>
            )}
          </section>
          <section className="flex flex-col justify-between rounded-[20px] border border-[#2d7ac5] bg-[linear-gradient(125deg,#052d67,#064487)] p-4 sm:p-5 text-white shadow-[0_10px_25px_rgba(3,38,91,.16)]">
            <div className="flex items-center gap-3"><div className="rounded-xl bg-[#ffffff]/10 p-2.5"><Sparkles className="h-6 w-6 text-[#ffdb76]" /></div><div><h2 className="font-black">{t("rewards.wheelTitle")}</h2><p className="mt-0.5 text-[11px] text-[#bfe3fa]">{t("rewards.wheelSubtitle")}</p></div></div>
            <Link to="/home" data-testid="link-spin-wheel" className="mt-4 flex items-center justify-between rounded-xl border border-[#62b6ed] bg-[#0c5ca6] px-4 py-3 text-xs font-black text-white transition-colors hover:bg-[#1472c5]"><span>{t("rewards.spin")}</span><ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>
          </section>
        </div>

            {/* Filter Chips Bar */}
             <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none" aria-label={t("common.filter")}>
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
                   data-testid={`button-filter-${tab.id}`}
                   aria-pressed={filter === tab.id}
                  onClick={() => setFilter(tab.id)}
                   className={`shrink-0 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                    filter === tab.id
                       ? "border-[#b98c32] bg-[#d7ac4f] text-[#072c5e]"
                       : "border-[#a9cbe3] bg-[#f0f8fc] text-[#28557e] hover:border-[#377ec3] dark:border-[#28619a] dark:bg-[#0a376b] dark:text-[#c7eaff]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* History Section */}
            <div className="space-y-3">
               <div className="flex items-center justify-between gap-3">
                 <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                   <Filter className="h-4 w-4 text-[#bc8c30] dark:text-[#f1c55c]" />
                  <span>{t("rewards.historyTitle")}</span>
                </h2>
                 <span data-testid="text-reward-count" className="text-xs text-[#477196] dark:text-[#a5cce9] font-semibold">
                   {filteredRewards.length} {t("rewards.entries")}
                </span>
              </div>

              {filteredRewards.length === 0 ? (
                 <div className="rounded-2xl border border-[#9ac7e8] bg-[#f3faff] p-10 sm:p-14 text-center dark:border-[#28619a] dark:bg-[#082d5b]">
                   <Gift className="mx-auto h-10 w-10 text-[#b99245] mb-2" />
                   <p className="text-sm font-bold">{t("rewards.noHistory")}</p>
                   <p className="text-xs text-[#517697] dark:text-[#b1d4ed] mt-1 max-w-md mx-auto">
                    {t("rewards.noHistoryDesc")}
                  </p>
                </div>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredRewards.map((r: any) => {
                    const info = getSourceInfo(r.source);
                    return (
                      <div
                        key={r.id}
                         data-testid={`card-reward-${r.id}`}
                         className="flex items-center justify-between gap-3 rounded-2xl border border-[#96c5e7] bg-[#f2faff] p-3.5 shadow-[0_3px_10px_rgba(13,73,119,.07)] dark:border-[#2866a2] dark:bg-[#092f60]"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                           <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#a7d6ee] bg-[#dbeffa] dark:border-[#337aba] dark:bg-[#0e4582]">
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
                             <p className="mt-1 truncate text-xs font-black">
                              {r.description ? content(r.description) : info.label}
                            </p>
                             <p className="text-[11px] text-[#5d7f9a] dark:text-[#a9cbe6] mt-0.5">
                               {new Date(r.createdAt).toLocaleDateString(lang, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-end">
                           <span data-testid={`text-reward-amount-${r.id}`} className="text-sm sm:text-base font-black text-[#ad7922] dark:text-[#ffd471]">
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
