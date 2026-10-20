import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Crown,
  Gift,
  Share2,
  Users,
  UserRound,
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

const money = (n: number) =>
  `${new Intl.NumberFormat("ar", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)} دولار`;

const levelThemes: Record<
  number,
  { border: string; header: string; ring: string; rate: string; badge: string }
> = {
  1: {
    border: "border-blue-400/70",
    header: "bg-gradient-to-r from-blue-700 to-blue-500",
    ring: "ring-blue-300",
    rate: "bg-gradient-to-r from-blue-700 to-blue-500",
    badge: "border-blue-400/40 bg-blue-500/15 text-blue-100",
  },
  2: {
    border: "border-fuchsia-400/70",
    header: "bg-gradient-to-r from-fuchsia-700 to-purple-500",
    ring: "ring-fuchsia-300",
    rate: "bg-gradient-to-r from-fuchsia-700 to-purple-500",
    badge: "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100",
  },
  3: {
    border: "border-emerald-400/70",
    header: "bg-gradient-to-r from-emerald-700 to-emerald-500",
    ring: "ring-emerald-300",
    rate: "bg-gradient-to-r from-emerald-700 to-emerald-500",
    badge: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
  },
};

const levelKey = (level: number) =>
  level === 1 ? "team.level1" : level === 2 ? "team.level2" : "team.level3";

function TeamPage() {
  const { t, isRTL } = useI18n();
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
        (configuredRate === undefined ? "—" : `${Math.round(configuredRate * 100)}%`),
    };
  });
  const filteredMembers =
    selectedLevelFilter === null
      ? members
      : members.filter((member) => Number(member.level) === selectedLevelFilter);
  const totalMembers = Number(data?.totalMembers ?? members.length);

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
    <div className="min-h-screen bg-background pb-28 md:pb-12" dir={isRTL ? "rtl" : "ltr"}>
      <AppHeader />

      <main className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-5 sm:py-6">
        <section className="space-y-3 rounded-2xl border border-blue-400/20 bg-slate-950/60 p-3 shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
          <div>
            <label
              htmlFor="team-referral-link"
              className="mb-1.5 block text-center text-xs font-bold text-slate-200"
            >
              {t("team.inviteLink")}
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 p-2">
              <input
                id="team-referral-link"
                type="text"
                readOnly
                dir="ltr"
                value={referralLink}
                placeholder={isLoading ? "جارٍ تحميل الرابط…" : isError ? "تعذر تحميل الرابط" : "—"}
                className="min-w-0 flex-1 bg-transparent px-1 text-left text-[11px] text-slate-300 outline-none"
              />
              <button
                type="button"
                onClick={shareOrCopyLink}
                disabled={!referralLink}
                aria-label={copiedLink ? t("common.copied") : t("team.copyLink")}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="team-referral-code"
              className="mb-1.5 block text-center text-xs font-bold text-slate-200"
            >
              {t("team.inviteCode")}
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 p-2">
              <button
                type="button"
                onClick={copyCode}
                disabled={!referralCode}
                aria-label={copiedCode ? t("common.copied") : t("team.copyCode")}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
              >
                {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              <input
                id="team-referral-code"
                type="text"
                readOnly
                dir="ltr"
                value={referralCode}
                placeholder={isLoading ? "جارٍ تحميل الرمز…" : isError ? "تعذر تحميل الرمز" : "—"}
                className="min-w-0 flex-1 bg-transparent px-1 text-center font-mono text-sm font-black tracking-wider text-amber-300 outline-none"
              />
            </div>
          </div>

          <button
            id="btn-share-team-link"
            type="button"
            onClick={shareOrCopyLink}
            disabled={!referralLink}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_4px_16px_rgba(245,158,11,0.2)] transition active:scale-[0.99] disabled:opacity-50"
          >
            {copiedLink ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            <span>{copiedLink ? t("common.copied") : t("team.shareLink")}</span>
          </button>
        </section>

        {isError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-950/30 px-3 py-2.5 text-xs text-red-100"
          >
            <span>
              {error instanceof Error && error.message.toUpperCase().includes("UNAUTHORIZED")
                ? "انتهت جلسة الدخول؛ سجّل الدخول مجددًا."
                : error instanceof Error && error.message.toUpperCase().includes("FORBIDDEN")
                  ? "لا تملك صلاحية عرض بيانات الفريق."
                  : "تعذر تحميل بيانات الفريق من قاعدة البيانات. حاول مرة أخرى."}
            </span>
            <button
              type="button"
              onClick={() => void refetch()}
              className="shrink-0 rounded-lg border border-red-300/40 px-3 py-1.5 font-bold hover:bg-red-900/40"
            >
              {t("common.retry")}
            </button>
          </div>
        )}

        <section className="space-y-3">
          <h1 className="flex items-center justify-center gap-2 text-center text-lg font-black text-amber-300 sm:text-xl">
            <Crown className="h-5 w-5" />
            <span>{t("team.referralLevels")}</span>
            <Crown className="h-5 w-5" />
          </h1>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {isLoading
              ? [1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className="h-36 animate-pulse rounded-xl border border-slate-700 bg-slate-900/70"
                  />
                ))
              : !isError &&
                levels.map((level) => {
                  const theme = levelThemes[level.level];
                  const isSelected = selectedLevelFilter === level.level;
                  return (
                    <button
                      key={level.level}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`${t(levelKey(level.level))}: ${level.members} ${t("team.members")}`}
                      onClick={() =>
                        setSelectedLevelFilter(isSelected ? null : level.level)
                      }
                      className={`overflow-hidden rounded-xl border text-center shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                        theme.border
                      } ${isSelected ? `ring-2 ${theme.ring}` : "hover:-translate-y-0.5"}`}
                    >
                      <div className={`${theme.header} px-1 py-2 text-[11px] font-black text-white sm:text-sm`}>
                        {t(levelKey(level.level))}
                      </div>
                      <div className="space-y-1.5 bg-slate-900/90 p-1.5 sm:p-2">
                        <div className="rounded-md bg-white px-1 py-1.5 text-slate-950 sm:py-2">
                          <div className="text-[9px] font-semibold sm:text-[10px]">
                            {t("team.members")}
                          </div>
                          <div className="text-base font-black sm:text-lg">
                            {level.members}
                          </div>
                        </div>
                        <div className="rounded-md bg-white px-1 py-1.5 text-slate-950 sm:py-2">
                          <div className="text-[9px] font-semibold sm:text-[10px]">
                            إجمالي الأرباح
                          </div>
                          <div className="text-sm font-black sm:text-base">
                            {money(level.earnings)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
          </div>

          <div className="overflow-hidden rounded-2xl border border-amber-300/35 bg-slate-950/60">
            <h2 className="flex items-center justify-center gap-2 border-b border-amber-300/20 px-3 py-2.5 text-center text-xs font-black text-amber-200 sm:text-sm">
              <Gift className="h-4 w-4" />
              <span>{t("team.referralRewardRates")}</span>
            </h2>
            <div className="grid grid-cols-3 gap-2 p-2">
              {levels.map((level) => {
                const theme = levelThemes[level.level];
                return (
                  <div
                    key={level.level}
                    className={`${theme.rate} flex min-h-12 flex-col items-center justify-center rounded-xl px-1.5 py-2 text-center text-white shadow`}
                  >
                    <span className="text-[9px] font-semibold leading-tight sm:text-[11px]">
                      من {t(levelKey(level.level))}
                    </span>
                    <span className="text-sm font-black sm:text-base">
                      {level.ratePercent}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="px-1 text-center text-[10px] leading-relaxed text-slate-400">
            {t("team.autoCalcNote")}
          </p>
        </section>

        <section id="team-members" className="overflow-hidden rounded-2xl border border-blue-400/25 bg-slate-950/60 shadow-lg">
          <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-blue-800 to-blue-600 px-3 py-3 text-white">
            <h2 className="flex items-center gap-2 text-sm font-black sm:text-base">
              <Users className="h-4 w-4" />
              <span>
                {t("team.teamMembers")}
                {selectedLevelFilter !== null
                  ? ` — ${t(levelKey(selectedLevelFilter))}`
                  : ""}
              </span>
            </h2>
            {selectedLevelFilter !== null && (
              <button
                type="button"
                onClick={() => setSelectedLevelFilter(null)}
                className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold hover:bg-white/25"
              >
                {t("team.viewAllLevels")}
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2 p-3">
              {[1, 2].map((row) => (
                <div
                  key={row}
                  className="h-12 animate-pulse rounded-lg bg-slate-800/70"
                />
              ))}
            </div>
          ) : isError ? null : filteredMembers.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs leading-relaxed text-slate-400">
              {selectedLevelFilter !== null ? t("team.noMembersInLevel") : t("team.noMembers")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[340px] table-fixed text-right text-xs">
                <thead className="border-b border-blue-300/20 bg-slate-900/90 text-slate-300">
                  <tr>
                    <th className="w-12 px-3 py-2.5 text-center font-bold">#</th>
                    <th className="w-28 px-2 py-2.5 text-center font-bold">
                      {t("team.level")}
                    </th>
                    <th className="px-3 py-2.5 text-right font-bold">
                      البريد الإلكتروني
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member, index) => {
                    const level = Number(member.level);
                    const theme = levelThemes[level] ?? levelThemes[1];
                    const memberEmail = member.email || member.username || "—";
                    return (
                      <tr
                        key={member.id}
                        className="border-b border-slate-800/90 last:border-0"
                      >
                        <td className="px-3 py-3 text-center font-black text-slate-200">
                          {index + 1}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-slate-300">
                              {t(levelKey(level))}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${theme.badge}`}
                            >
                              {t("team.level")} {level}
                            </span>
                          </div>
                        </td>
                        <td className="max-w-0 px-3 py-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-left font-semibold text-slate-100" dir="ltr">
                              {memberEmail}
                            </span>
                            <UserRound className="h-4 w-4 shrink-0 text-cyan-300" />
                            <span className="shrink-0 rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-200" dir="ltr">
                              المستوى المميز {Number(member.vipLevel ?? 0)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
