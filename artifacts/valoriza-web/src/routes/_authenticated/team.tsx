import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Award,
  Check,
  Copy,
  Crown,
  Gift,
  Layers,
  ShieldCheck,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getTeamData, type TeamPageData } from "@/lib/valoriza-pages.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "فريقي — Valoriza" },
      {
        name: "description",
        content: "معاً نحقق المزيد: إدارة فريقك وعمولات الإحالة على 3 مستويات.",
      },
      { property: "og:title", content: "فريقي — Valoriza" },
      { property: "og:description", content: "أعضاء فريقك وأرباح الإحالة." },
    ],
  }),
  component: TeamPage,
});

const money = (n: number, language: "ar" | "en" | "es") =>
  new Intl.NumberFormat(({ ar: "ar-DZ", en: "en-US", es: "es-ES" })[language], {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const levelKey = (level: number) =>
  level === 1 ? "team.level1" : level === 2 ? "team.level2" : "team.level3";

function TeamPage() {
  const { t, isRTL, lang } = useI18n();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | null>(null);

  const fetchData = useServerFn(getTeamData);
  const { data, error, isLoading, isError, refetch } = useQuery<TeamPageData>({
    queryKey: ["team"],
    queryFn: () => fetchData(),
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
    refetchInterval: 30_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const referralCode = data?.referralCode || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = referralCode
    ? `${origin}/?ref=${encodeURIComponent(referralCode)}`
    : "";
  const members = Array.isArray(data?.members) ? data.members : [];
  const levels = [1, 2, 3].map((level) => {
    const apiLevel = data?.levels?.find((item) => Number(item.level) === level);
    const configuredRate =
      level === 1 ? data?.rates?.l1 : level === 2 ? data?.rates?.l2 : data?.rates?.l3;
    return {
      level,
      members: Number(apiLevel?.members ?? 0),
      earnings: Number(apiLevel?.earnings ?? 0),
      ratePercent:
        apiLevel?.ratePercent ??
        (configuredRate === undefined ? "—" : `${Number((configuredRate * 100).toFixed(4))}%`),
    };
  });
  const filteredMembers =
    selectedLevelFilter === null
      ? members
      : members.filter((member) => Number(member.level) === selectedLevelFilter);
  const totalMembers = Number(data?.totalMembers ?? members.length);
  const totalTeamRewards = Number(data?.teamRewards ?? data?.teamIncome ?? 0);

  async function copyCode() {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      toast.success(t("common.copied"));
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error(t("common.error"));
    }
  }

  async function shareOrCopyLink() {
    if (!referralLink) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "فريق فالوريزا",
          text: `رمز الدعوة الخاص بي: ${referralCode}`,
          url: referralLink,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      toast.success(t("common.copied"));
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-12 text-foreground" dir={isRTL ? "rtl" : "ltr"}>
      <AppHeader />

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <section className="surface-card glow-border p-5 sm:p-6 lg:p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-cyan-glow/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gold/10 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3 text-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-glow/30 bg-cyan-glow/10 px-3 py-1 text-xs font-bold text-cyan-glow">
                <Users className="h-4 w-4" />
                <span>{t("team.title")}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {t("team.togetherWeAchieve")}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                {t("team.subtitle")}
              </p>
              <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  3 {t("team.referralLevels")}
                </span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-border/80 bg-surface/90 p-4 sm:p-5 space-y-3.5 shadow-lg">
                <div>
                  <span className="text-xs text-muted-foreground block font-medium mb-1">
                    {t("team.inviteCode")}
                  </span>
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border bg-background">
                    <span className="text-lg font-black tracking-widest text-gold font-mono select-all">
                      {isLoading ? "…" : referralCode || "—"}
                    </span>
                    <button
                      type="button"
                      onClick={copyCode}
                      disabled={!referralCode}
                      aria-label={copiedCode ? t("common.copied") : t("team.copyCode")}
                      className="flex items-center gap-1.5 rounded-lg brand-gradient px-3 py-2 text-xs font-black text-primary-foreground shadow active:scale-95 transition-all disabled:opacity-50"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedCode ? t("common.copied") : t("team.copyCode")}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block font-medium mb-1">
                    {t("team.inviteLink")}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      id="team-referral-link"
                      type="text"
                      readOnly
                      dir="ltr"
                      value={referralLink}
                      placeholder={isLoading ? "…" : "—"}
                      className="w-full text-xs font-mono text-muted-foreground bg-background border border-border rounded-xl px-3 py-2.5 truncate focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={shareOrCopyLink}
                      disabled={!referralLink}
                      aria-label={copiedLink ? t("common.copied") : t("team.copyLink")}
                      className="shrink-0 flex items-center gap-1.5 rounded-xl border border-cyan-glow/40 bg-surface px-3 py-2.5 text-xs font-black text-cyan-glow hover:bg-surface/80 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                      <span>{copiedLink ? t("common.copied") : t("team.shareLink")}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="surface-card glow-border p-4 sm:p-5 rounded-2xl flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">{t("team.totalTeamRewards")}</p>
              <p id="team-total-rewards" className="text-xl sm:text-2xl font-black text-gold-gradient mt-0.5">
                {isLoading || isError ? "—" : money(totalTeamRewards, lang)}
              </p>
            </div>
          </div>
          <div className="surface-card glow-border p-4 sm:p-5 rounded-2xl flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-glow/15 text-cyan-glow border border-cyan-glow/30">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">{t("team.totalMembers")}</p>
              <p id="team-member-count" className="text-xl sm:text-2xl font-black text-foreground mt-0.5">
                {isLoading || isError ? "—" : totalMembers}{" "}
                <span className="text-xs font-normal text-muted-foreground">{t("team.members")}</span>
              </p>
            </div>
          </div>
          <div className="surface-card glow-border p-4 sm:p-5 rounded-2xl flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success border border-success/30">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">{t("team.teamIncome")}</p>
              <p className="text-xl sm:text-2xl font-black text-success mt-0.5">
                {isLoading || isError ? "—" : money(Number(data?.teamIncome ?? 0), lang)}
              </p>
            </div>
          </div>
        </div>

        {isError && (
          <div role="alert" className="surface-card rounded-2xl border border-danger/40 p-4 text-center">
            <p className="text-sm font-bold text-danger">
              {error instanceof Error && error.message.toUpperCase().includes("UNAUTHORIZED")
                ? "انتهت جلسة الدخول؛ سجّل الدخول مجددًا."
                : error instanceof Error && error.message.toUpperCase().includes("FORBIDDEN")
                  ? "لا تملك صلاحية عرض بيانات الفريق."
                  : "تعذر تحميل بيانات الفريق من قاعدة البيانات."}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-foreground"
            >
              {t("common.retry")}
            </button>
          </div>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-cyan-glow" />
              <span>{t("team.referralLevels")}</span>
            </h2>
            {selectedLevelFilter !== null && (
              <button
                type="button"
                onClick={() => setSelectedLevelFilter(null)}
                className="text-xs font-bold text-cyan-glow hover:underline cursor-pointer"
              >
                {t("team.viewAllLevels")}
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {[1, 2, 3].map((level) => (
                <div key={level} className="surface-card h-32 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {levels.map((level) => {
                const isSelected = selectedLevelFilter === level.level;
                return (
                  <button
                    key={level.level}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedLevelFilter(isSelected ? null : level.level)}
                    className={`surface-card p-4 sm:p-5 rounded-2xl text-start transition-all cursor-pointer ${
                      isSelected
                        ? "border-cyan-glow bg-surface shadow-[0_0_15px_oklch(0.82_0.14_205/0.25)] ring-1 ring-cyan-glow"
                        : "hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-foreground text-sm sm:text-base">
                        {t(levelKey(level.level))}
                      </span>
                      <span className="rounded-full bg-gold/20 border border-gold/40 px-2.5 py-0.5 text-xs font-black text-gold">
                        {level.ratePercent}
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t("team.members")}:</span>
                        <span className="font-black text-foreground">{level.members}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t("team.earnings")}:</span>
                        <span className="font-black text-success">+{money(level.earnings, lang)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="rounded-2xl border border-border/70 bg-surface/70 p-4 text-xs text-muted-foreground leading-relaxed flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-cyan-glow shrink-0" />
            <span>{t("team.autoCalcNote")}</span>
          </div>
        </section>

        <section id="team-members" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-gold" />
              <span>
                {t("team.teamMembers")}
                {selectedLevelFilter !== null ? ` (${t(levelKey(selectedLevelFilter))})` : ` (${totalMembers})`}
              </span>
            </h2>
          </div>

          {isLoading ? (
            <div className="surface-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="surface-card p-8 sm:p-12 text-center rounded-2xl">
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {selectedLevelFilter !== null ? t("team.noMembersInLevel") : t("team.noMembers")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMembers.map((member, index) => {
                const memberName = member.email || member.username || "—";
                const memberLevel = Number(member.level);
                return (
                  <div
                    key={`${member.id}-${index}`}
                    className="surface-card p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface border border-border text-foreground font-black text-sm">
                        {memberName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-foreground truncate" dir="ltr">{memberName}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {t(levelKey(memberLevel))} • {levels[memberLevel - 1]?.ratePercent ?? "—"}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-gold/15 border border-gold/40 px-2.5 py-0.5 text-[11px] font-black text-gold">
                      المستوى المميز {Number(member.vipLevel ?? 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
