import { useEffect, useState } from "react";
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
  Coins,
  ChevronRight,
  CircleCheck,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import {
  getRewardsData,
  getTeamData,
  settleTeamMilestones,
  type RewardsPageData,
  type TeamPageData,
} from "@/lib/valoriza-pages.functions";
import { claimDailyLoginReward } from "@/lib/valoriza.functions";
import { useI18n } from "@/lib/i18n";
import giftImg from "@/assets/rewards-gift.webp";
import teamImg from "@/assets/rewards-team.webp";
import "./rewards.css";

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

const COPY = {
  ar: {
    title: "صفحة المكافآت", tagline: "دعوة الأعضاء .. مكافآت حقيقية",
    intro: "كلما زاد عدد الأعضاء المؤهلين الذين يقومون بتفعيل VIP، ارتفع رصيد مكافآتك!",
    panelTitle: "مكافآت المدعوين المباشرين الذين فعّلوا VIP", qualified: "المؤهلون",
    teamError: "تعذر تحميل عدد الأعضاء المؤهلين — أعد المحاولة",
    settleError: "تعذر تحديث مكافآت الفريق. أعد المحاولة لاحقًا.",
    when: (n: number) => `عند وصول العدد التراكمي إلى ${n} عضو مؤهل`,
    getReward: "احصل على مكافأة", remaining: (n: number) => `المتبقي ${n}`,
    unverified: "تعذر التحقق من التقدم", credited: "أُضيفت المكافأة إلى المحفظة",
    upgradedTo: "تمت الترقية إلى VIP", vipMax: "أنت في أعلى مستوى VIP", reached: "تم بلوغ هذا المستوى",
    upgrade: "ترقية", vipLabel: "ترقية VIP", cash: "مكافأة نقدية", myTeam: "فريقي", vipUpgradeRow: "ترقية VIP",
  },
  en: {
    title: "Rewards Page", tagline: "Invite members .. real rewards",
    intro: "The more qualified members who activate VIP, the higher your reward balance!",
    panelTitle: "Rewards for direct invitees who activated VIP", qualified: "Qualified",
    teamError: "Couldn't load qualified members — tap to retry",
    settleError: "Couldn't refresh team rewards. Please try again later.",
    when: (n: number) => `When your total reaches ${n} qualified members`,
    getReward: "Get reward", remaining: (n: number) => `${n} to go`,
    unverified: "Couldn't verify progress", credited: "Reward added to wallet",
    upgradedTo: "Upgraded to VIP", vipMax: "You're at the top VIP level", reached: "Level reached",
    upgrade: "Upgrade", vipLabel: "VIP upgrade", cash: "Cash reward", myTeam: "My team", vipUpgradeRow: "VIP upgrade",
  },
  es: {
    title: "Recompensas", tagline: "Invita a miembros y gana recompensas reales",
    intro: "¡Cuantos más miembros aptos activen VIP, mayor será tu saldo de recompensas!",
    panelTitle: "Recompensas por invitados directos que activaron VIP", qualified: "Miembros aptos",
    teamError: "No se pudieron cargar los miembros aptos. Vuelve a intentarlo.",
    settleError: "No se pudieron actualizar las recompensas del equipo. Inténtalo más tarde.",
    when: (n: number) => `Cuando tu total alcance ${n} miembros aptos`,
    getReward: "Obtener recompensa", remaining: (n: number) => `Faltan ${n}`,
    unverified: "No se pudo verificar el progreso", credited: "Recompensa añadida a la cartera",
    upgradedTo: "Ascenso a VIP", vipMax: "Ya tienes el nivel VIP más alto", reached: "Nivel alcanzado",
    upgrade: "Ascender", vipLabel: "Ascenso VIP", cash: "Recompensa en efectivo", myTeam: "Mi equipo", vipUpgradeRow: "Ascenso VIP",
  },
};

type RewardSource = "all" | "daily_login" | "task_reward" | "lucky_wheel" | "referral" | "vip";

const TEAM_REWARD_TIERS = [
  { members: 3, reward: 1, kind: "cash" },
  { members: 6, reward: 1.5, kind: "cash" },
  { members: 10, reward: 2, kind: "cash" },
  { members: 25, reward: 5, kind: "cash" },
  { members: 50, reward: 12, kind: "cash" },
  { members: 100, reward: 25, kind: "cash" },
  { members: 250, reward: null, kind: "vip" },
] as const;

function RewardsPage() {
  const { t, isRTL, lang } = useI18n();
  const isAr = lang === "ar";
  const c = COPY[lang];
  const nf = (n: number, min: number) =>
    new Intl.NumberFormat(isAr ? "ar" : lang === "es" ? "es-ES" : "en-US", { minimumFractionDigits: min, maximumFractionDigits: 2 }).format(n);
  const money = (n: number) => (isAr ? `${nf(n, 2)} دولار` : `$${nf(n, 2)}`);
  const usd = (n: number) => `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n)}`;
  const qc = useQueryClient();
  const fetchData = useServerFn(getRewardsData);
  const claim = useServerFn(claimDailyLoginReward);
  const fetchTeam = useServerFn(getTeamData);
  const settleTeam = useServerFn(settleTeamMilestones);
  const [filter, setFilter] = useState<RewardSource>("all");

  const settlementQuery = useQuery({
    queryKey: ["team-milestone-settlement"],
    queryFn: async () => {
      const result = await settleTeam();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["rewards"] }),
        qc.invalidateQueries({ queryKey: ["team-reward-progress"] }),
        qc.invalidateQueries({ queryKey: ["team"] }),
      ]);
      return result;
    },
    retry: 1,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (settlementQuery.isError) {
      toast.error(c.settleError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settlementQuery.isError]);

  const {
    data,
    isLoading: isRewardsLoading,
    isError: isRewardsError,
    refetch: refetchRewards,
  } = useQuery<RewardsPageData>({
    queryKey: ["rewards"],
    queryFn: () => fetchData(),
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
    refetchInterval: 30_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
  const {
    data: teamData,
    isLoading: isTeamLoading,
    isError: isTeamError,
    refetch: refetchTeam,
  } = useQuery<TeamPageData>({
    queryKey: ["team-reward-progress"],
    queryFn: () => fetchTeam(),
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
  const qualifiedMembers =
    teamData?.members?.filter((member) => {
      const v = Number(member.vipLevel ?? 0);
      return member.level === 1 && v >= 1 && v <= 7 &&
        (!member.vipExpiresAt || new Date(member.vipExpiresAt).getTime() > Date.now());
    }).length ?? 0;

  const claimMutation = useMutation({
    mutationFn: async () => (await claim()) as { ok: boolean; amount?: number },
    onSuccess: (res) => {
      toast[res.ok ? "success" : "info"](
        res.ok ? t("rewards.claimSuccess") : t("rewards.alreadyClaimed"),
      );
      qc.invalidateQueries({ queryKey: ["rewards"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["user-notifications"] });
      qc.invalidateQueries({ queryKey: ["account"] });
      qc.invalidateQueries({ queryKey: ["financial-records"] });
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
      case "team_milestone":
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
          if (filter === "referral")
            return r.source.includes("referral") || r.source === "team_milestone";
          if (filter === "vip") return r.source.includes("vip");
          return true;
        });

  return (
    <div
      className="rw-page min-h-screen bg-background pb-28 md:pb-12 text-foreground"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AppHeader balance={data?.balance} showAbout={true} />

      <main className="rw-main mx-auto w-full max-w-5xl px-3 sm:px-6 lg:px-8 py-3">
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

        <section className="rw-surround space-y-3" aria-labelledby="team-rewards-title">
          <div className="rw-banner">
            <img src={giftImg} alt="" className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 object-contain drop-shadow-xl" />
            <div className="min-w-0 flex-1 text-center">
              <h1 id="team-rewards-title" className="text-2xl sm:text-3xl font-black text-white">{c.title}</h1>
              <p className="mt-1 text-sm font-bold text-[#ffe08a]">{c.tagline}</p>
              <p className="mt-2 text-[11px] sm:text-xs leading-relaxed text-white/85">{c.intro}</p>
            </div>
            <svg viewBox="0 0 64 72" className="h-16 w-14 shrink-0" fill="none" stroke="#f5c84c" strokeWidth="3" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 22 L18 6 L32 18 L46 6 L54 22 Z" fill="#f5c84c33" />
              <circle cx="24" cy="40" r="7" /><path d="M10 66c0-9 6-15 14-15s14 6 14 15" />
              <circle cx="42" cy="38" r="6" /><path d="M36 51c2-2 4-3 6-3 7 0 12 6 12 14" />
            </svg>
          </div>

          <div className="rw-panel">
            <div className="mb-2 flex items-center justify-between gap-2 px-1 text-xs font-bold">
              <span className="text-white/90">{c.panelTitle}</span>
              <span className="shrink-0 text-[#ffe08a]">
                {c.qualified}: {isTeamLoading ? "…" : isTeamError ? "—" : qualifiedMembers}
              </span>
            </div>
            {isTeamError && (
              <button type="button" onClick={() => void refetchTeam()} className="mb-2 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-bold text-white/80">
                {c.teamError}
              </button>
            )}
            <div className="space-y-2.5">
              {TEAM_REWARD_TIERS.map((tier) => {
                const claim = teamData?.milestones?.find((m) => m.members === tier.members);
                const reached = !isTeamError && Boolean(teamData) && qualifiedMembers >= tier.members;
                const unlocked = reached || Boolean(claim);
                const progress = isTeamError ? 0 : Math.min((qualifiedMembers / tier.members) * 100, 100);
                const isVip = tier.kind === "vip";
                const remaining = Math.max(tier.members - qualifiedMembers, 0);
                const vipAtMax = isVip && reached && !claim && teamData?.maxVipLevel != null && (teamData.userVipLevel ?? 0) >= teamData.maxVipLevel;
                const status = isTeamError ? c.unverified : claim?.kind === "cash" ? c.credited : claim?.kind === "vip" ? `${c.upgradedTo} ${claim.vipLevel ?? ""}` : vipAtMax ? c.vipMax : unlocked ? c.reached : `${c.getReward} · ${c.remaining(remaining)}`;
                return (
                  <article key={tier.members} className={`rw-tier ${isVip ? "rw-tier-vip" : ""}`}>
                    <img src={teamImg} alt="" className="h-14 w-14 shrink-0 object-contain" />
                    <div className="min-w-0 flex-1 text-start">
                      <p className="text-xs sm:text-sm font-black leading-snug text-white">{c.when(tier.members)}</p>
                      <p className={`mt-1 flex items-center gap-1 text-[11px] font-bold ${unlocked ? "text-emerald-300" : "text-[#7fd8ff]"}`}>
                        {unlocked && <CircleCheck className="h-3.5 w-3.5" />}{status}
                      </p>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/30">
                        <div className={`h-full rounded-full ${isVip ? "bg-[#f5c84c]" : "bg-[#5fd4ff]"}`} style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <div className={`rw-pill ${isVip ? "rw-pill-vip" : ""}`}>
                      <p className="flex items-center justify-center gap-1 text-lg leading-none font-black">
                        <Coins className="h-4 w-4 text-[#f5c84c]" />
                        {isVip ? c.upgrade : usd(tier.reward ?? 0)}
                      </p>
                      <p className="mt-1 text-[9px] font-bold opacity-80">{isVip ? c.vipLabel : c.cash}</p>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 text-white/70 ${isRTL ? "rotate-180" : ""}`} />
                  </article>
                );
              })}
            </div>
            <Link to="/team" className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-white/20 bg-white/5 py-2 text-xs font-bold text-white">
              {c.myTeam}<ChevronRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
            </Link>
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
                          {new Date(r.createdAt).toLocaleDateString(isAr ? "ar-DZ" : "en-US", {
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
                        {r.source === "vip_upgrade"
                            ? c.vipUpgradeRow
                          : `+${money(r.amount)}`}
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
