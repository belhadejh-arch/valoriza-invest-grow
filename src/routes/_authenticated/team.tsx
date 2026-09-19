import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Award,
  Check,
  Copy,
  Layers,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getTeamData } from "@/lib/valoriza-pages.functions";
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

const money = (n: number) => `$${n.toFixed(2)}`;

function TeamPage() {
  const { t, isRTL } = useI18n();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | null>(null);

  const fetchData = useServerFn(getTeamData);
  const { data, isLoading } = useQuery({ queryKey: ["team"], queryFn: () => fetchData() });

  const referralCode = data?.referralCode || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = `${origin}/?ref=${referralCode}`;

  async function copyCode() {
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
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Valoriza Team",
          text: `Valoriza Referral Code: ${referralCode}`,
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

  const levelPercentages: Record<number, string> = {
    1: "10%",
    2: "3%",
    3: "1%",
  };

  const filteredMembers =
    data?.members && selectedLevelFilter !== null
      ? data.members.filter((m) => m.level === selectedLevelFilter)
      : data?.members || [];

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-12" dir={isRTL ? "rtl" : "ltr"}>
      <AppHeader />

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {isLoading || !data ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-glow border-t-transparent" />
            <p className="text-sm font-medium text-muted-foreground">{t("common.loading")}</p>
          </div>
        ) : (
          <>
            {/* Team Hero Section (Responsive 2-column on desktop) */}
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
                      <ShieldCheck className="h-4 w-4 text-success" />3 {t("team.referralLevels")}
                    </span>
                    <span>•</span>
                    <span className="text-gold font-bold">14% Total Commission</span>
                  </div>
                </div>

                {/* Referral Code & Share Link Bento Card */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl border border-border/80 bg-surface/90 p-4 sm:p-5 space-y-3.5 shadow-lg">
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium mb-1">
                        {t("team.inviteCode")}
                      </span>
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border bg-background">
                        <span className="text-lg font-black tracking-widest text-gold font-mono select-all">
                          {referralCode}
                        </span>
                        <button
                          id="btn-copy-team-code"
                          type="button"
                          onClick={copyCode}
                          className="flex items-center gap-1.5 rounded-lg brand-gradient px-3 py-2 text-xs font-black text-primary-foreground shadow active:scale-95 transition-all"
                        >
                          {copiedCode ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
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
                          type="text"
                          readOnly
                          value={referralLink}
                          className="w-full text-xs font-mono text-muted-foreground bg-background border border-border rounded-xl px-3 py-2.5 truncate focus:outline-none"
                        />
                        <button
                          id="btn-share-team-link"
                          type="button"
                          onClick={shareOrCopyLink}
                          className="shrink-0 flex items-center gap-1.5 rounded-xl border border-cyan-glow/40 bg-surface px-3 py-2.5 text-xs font-black text-cyan-glow hover:bg-surface/80 active:scale-95 transition-all"
                        >
                          {copiedLink ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Share2 className="h-3.5 w-3.5" />
                          )}
                          <span>{copiedLink ? t("common.copied") : t("team.shareLink")}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 3 Key Team Metrics (Bento-Grid 3 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="surface-card glow-border p-4 sm:p-5 rounded-2xl flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {t("team.teamRewards")}
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-gold-gradient mt-0.5">
                    {money(data.teamRewards)}
                  </p>
                </div>
              </div>

              <div className="surface-card glow-border p-4 sm:p-5 rounded-2xl flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-glow/15 text-cyan-glow border border-cyan-glow/30">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {t("team.totalMembers")}
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-foreground mt-0.5">
                    {data.totalMembers}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {t("team.members")}
                    </span>
                  </p>
                </div>
              </div>

              <div className="surface-card glow-border p-4 sm:p-5 rounded-2xl flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success border border-success/30">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {t("team.teamIncome")}
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-success mt-0.5">
                    {money(data.teamIncome)}
                  </p>
                </div>
              </div>
            </div>

            {/* 3 Referral Levels */}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {data.levels.map((lvl) => {
                  const isSelected = selectedLevelFilter === lvl.level;
                  const rate = levelPercentages[lvl.level] || "—";
                  return (
                    <button
                      key={lvl.level}
                      type="button"
                      onClick={() => setSelectedLevelFilter(isSelected ? null : lvl.level)}
                      className={`surface-card p-4 sm:p-5 rounded-2xl text-start transition-all cursor-pointer ${
                        isSelected
                          ? "border-cyan-glow bg-surface shadow-[0_0_15px_oklch(0.82_0.14_205/0.25)] ring-1 ring-cyan-glow"
                          : "hover:border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-foreground text-sm sm:text-base">
                          {t("status.active", "Level")} {lvl.level}
                        </span>
                        <span className="rounded-full bg-gold/20 border border-gold/40 px-2.5 py-0.5 text-xs font-black text-gold">
                          {rate}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t("team.members")}:</span>
                          <span className="font-black text-foreground">{lvl.members}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t("team.earnings")}:</span>
                          <span className="font-black text-success">+{money(lvl.earnings)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Commission note */}
              <div className="rounded-2xl border border-border/70 bg-surface/70 p-4 text-xs text-muted-foreground leading-relaxed flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-cyan-glow shrink-0" />
                <span>{t("team.autoCalcNote")}</span>
              </div>
            </section>

            {/* Team Members List (Bento-Grid 1-3 columns) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-gold" />
                  <span>
                    {t("team.teamMembers")}{" "}
                    {selectedLevelFilter !== null
                      ? `(${t("status.active", "Level")} ${selectedLevelFilter})`
                      : `(${data.totalMembers})`}
                  </span>
                </h2>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="surface-card p-8 sm:p-12 text-center rounded-2xl">
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {selectedLevelFilter !== null
                      ? t("team.noMembersInLevel")
                      : t("team.noMembers")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMembers.map((m, i) => (
                    <div
                      key={`${m.email}-${i}`}
                      className="surface-card p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface border border-border text-foreground font-black text-sm">
                          {m.email.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-foreground truncate">{m.email}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Level {m.level} • {levelPercentages[m.level]}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full bg-gold/15 border border-gold/40 px-2.5 py-0.5 text-[11px] font-black text-gold">
                        VIP {m.vipLevel}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
