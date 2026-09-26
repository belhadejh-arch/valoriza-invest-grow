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
  ChevronRight,
  Coins,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getAccountData, getRewardsData } from "@/lib/valoriza-pages.functions";
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
type Milestone = {
  threshold: number;
  amount: number | null;
  type: "cash" | "vip";
  awarded: boolean;
};

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
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
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
      case "task":
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
      case "referral_milestone":
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
          if (filter === "task_reward") return source === "task_reward" || source === "task";
          if (filter === "lucky_wheel") return source === "lucky_wheel";
          if (filter === "referral") return source.includes("referral");
          if (filter === "vip") return source.includes("vip");
          return true;
        });
  const milestones: Milestone[] = Array.isArray(data.milestones) ? data.milestones : [];
  const qualifiedMembers = Number(data.qualifiedMembers ?? 0);
  const arabic = lang.startsWith("ar");

  return (
    <div
      className="min-h-[100dvh] bg-[linear-gradient(90deg,#a8f0ff_0%,#d9faff_7%,#d9faff_93%,#a8f0ff_100%)] text-[#092c58] pb-28 md:pb-12"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AppHeader balance={data?.balance} showAbout={true} />

      <main className="mx-auto w-full max-w-[790px] px-2.5 sm:px-5 py-2 sm:py-5 space-y-3">
        <section dir="ltr" className="relative isolate flex min-h-[154px] items-center overflow-hidden rounded-[10px] border border-[#63baf9] bg-[radial-gradient(circle_at_48%_115%,#0868c9_0%,#063b8b_50%,#031d4c_100%)] px-2 py-3 text-white shadow-[inset_0_0_22px_#168cfc,0_3px_8px_#0b4d8a55] sm:min-h-[190px] sm:px-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#94e8ff]" />
          <div className="pointer-events-none absolute -bottom-16 right-1/3 h-28 w-52 rounded-full bg-[#1097ff]/30 blur-2xl" />
          <img src={`${import.meta.env.BASE_URL}rewards-gift.png`} alt="" className="relative z-10 h-[112px] w-[112px] shrink-0 object-contain drop-shadow-[0_6px_8px_#001940] sm:h-[154px] sm:w-[154px]" />
          <div dir={isRTL ? "rtl" : "ltr"} className="relative z-10 min-w-0 flex-1 text-center">
            <h1 className="text-[26px] font-black leading-tight tracking-tight text-white drop-shadow-[0_2px_2px_#001c48] sm:text-[38px]">{arabic ? "صفحة المكافآت" : "Rewards"}</h1>
            <p className="mt-1 text-[12px] font-extrabold text-[#dff8ff] sm:text-base">{arabic ? "دعوة الأعضاء .. مكافآت حقيقية" : "Invite members. Earn real rewards."}</p>
            <p className="mt-2 text-[10px] font-semibold leading-relaxed text-[#c0e4ff] sm:text-sm">{arabic ? "كلما زاد عدد الأعضاء المؤهلين الذين يقومون بتفعيل VIP، ارتفع رصيد مكافآتك!" : "Grow your rewards as your direct invites activate VIP."}</p>
          </div>
          <div className="relative z-10 flex h-[100px] w-[76px] shrink-0 flex-col items-center justify-center text-[#ffe18b] sm:h-[140px] sm:w-[120px]">
            <Crown className="h-10 w-10 fill-[#f4bf46]/40 drop-shadow-[0_3px_3px_#001435] sm:h-14 sm:w-14" strokeWidth={1.6} />
            <Users className="-mt-1 h-12 w-12 fill-[#dfaf48]/25 drop-shadow-[0_3px_3px_#001435] sm:h-16 sm:w-16" strokeWidth={1.5} />
          </div>
        </section>

        <section aria-labelledby="milestones-heading" className="rounded-[11px] border border-[#176ac4] bg-[linear-gradient(135deg,#052b67,#031c48_70%,#052e74)] p-[6px] shadow-[inset_0_0_12px_#217bdb,0_8px_20px_#003c8650] sm:p-2">
          <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-1 text-[#c5e7ff]">
            <h2 id="milestones-heading" className="text-[11px] font-bold sm:text-sm">{arabic ? "مكافآت المدعوين المباشرين الذين فعّلوا VIP" : "Direct referral VIP milestones"}</h2>
            <span className="text-[10px] font-bold text-[#ffd775]" data-testid="text-qualified-members">{arabic ? `المؤهلون: ${qualifiedMembers.toLocaleString(lang)}` : `Qualified: ${qualifiedMembers.toLocaleString(lang)}`}</span>
          </div>
          {milestones.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-[#caeaff]"><Users className="h-8 w-8 text-[#f0c565]" /><p className="text-sm font-bold">{arabic ? "لا توجد مراحل مكافآت متاحة الآن" : "No reward milestones available yet"}</p><Link to="/team" className="text-xs font-bold text-[#ffdb76] underline">{arabic ? "عرض الفريق" : "View your team"}</Link></div>
          ) : (
            <div className="space-y-[5px]">
              {milestones.map((milestone) => (
                <Link dir="ltr" key={`${milestone.type}-${milestone.threshold}`} to="/team" data-testid={`link-milestone-${milestone.threshold}`} aria-label={arabic ? `تفاصيل مكافأة ${milestone.threshold} عضو مؤهل` : `View referral details for ${milestone.threshold} qualified members`} className={`group relative flex min-h-[70px] items-center gap-1.5 overflow-hidden rounded-[9px] border px-1.5 py-1.5 text-white shadow-[inset_0_1px_8px_#238ef144,0_2px_5px_#000b2d] transition-transform hover:-translate-y-0.5 sm:min-h-[82px] sm:gap-3 sm:px-3 ${milestone.type === "vip" ? "border-[#f7d36d] bg-[linear-gradient(105deg,#0b2e62,#07204a_60%,#16417c)] shadow-[inset_0_0_10px_#efbf6d77,0_0_8px_#d5a63988]" : milestone.awarded ? "border-[#6ccaff] bg-[linear-gradient(105deg,#104b8b,#072b61_65%,#06417f)]" : "border-[#257bc8] bg-[linear-gradient(105deg,#073670,#051f4c_60%,#063571)]"}`}>
                  <div className="flex h-[55px] w-[70px] shrink-0 items-center justify-center sm:h-[69px] sm:w-[84px]">
                    <img src={`${import.meta.env.BASE_URL}${milestone.type === "vip" ? "rewards-vip.png" : "rewards-members.png"}`} alt="" className="h-full w-full object-contain drop-shadow-[0_3px_4px_#001133]" />
                  </div>
                  <div dir={isRTL ? "rtl" : "ltr"} className="min-w-0 flex-1 text-start">
                    <p className="text-[11px] font-extrabold leading-[1.45] text-[#f6fbff] sm:text-[15px]">{arabic ? <>عند وصول العدد التراكمي إلى <span className="text-[#ffe37d]">{milestone.threshold.toLocaleString(lang)}</span> عضو مؤهل</> : <>Reach <span className="text-[#ffe37d]">{milestone.threshold.toLocaleString(lang)}</span> qualified members</>}</p>
                    <p className="mt-0.5 text-[10px] font-bold leading-tight text-[#9adfff] sm:text-xs">{milestone.awarded ? (arabic ? "تم منح المكافأة" : "Reward granted") : (arabic ? milestone.type === "vip" ? "احصل على ترقية VIP" : "احصل على مكافأة" : milestone.type === "vip" ? "Earn a VIP upgrade" : "Earn a reward")}</p>
                  </div>
                  <div className={`flex h-[52px] w-[91px] shrink-0 flex-col items-center justify-center rounded-[10px] border text-center shadow-[inset_0_1px_7px_#6ac9ff66,0_2px_5px_#00163a] sm:h-[60px] sm:w-[116px] ${milestone.type === "vip" ? "border-[#ffdf81] bg-[linear-gradient(150deg,#8a6a2a,#1b3153_60%,#ac8432)]" : "border-[#348fea] bg-[linear-gradient(135deg,#126acc,#063d88)]"}`}>
                    {milestone.type === "vip" ? <><Crown className="h-5 w-5 fill-[#eebc4d]/40 text-[#ffdc79] sm:h-6 sm:w-6" /><strong className="text-[13px] leading-none text-[#fff1b0] sm:text-lg">{arabic ? "ترقية VIP" : "VIP upgrade"}</strong></> : <><span className="flex items-center gap-0.5 text-[#ffe488]"><Coins className="h-4 w-4 fill-[#eebf54]/40 sm:h-5 sm:w-5" /><strong dir="ltr" className="text-lg leading-none sm:text-2xl">{milestone.amount != null && Number.isFinite(milestone.amount) ? `$${milestone.amount.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(milestone.amount) ? 0 : 2, maximumFractionDigits: 2 })}` : "—"}</strong></span><span className="mt-0.5 text-[9px] font-semibold text-white sm:text-[10px]">{milestone.awarded ? (arabic ? "ممنوحة" : "Granted") : (arabic ? "مكافأة نقدية" : "Cash reward")}</span></>}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#dbf2ff] rtl:rotate-180" />
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
                            {r.source === "vip_upgrade" ? (arabic ? "ترقية VIP" : "VIP upgrade") : `+${money(r.amount)}`}
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
