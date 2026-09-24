import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Crown,
  Gift,
  Link2,
  UserRound,
  Users,
  Wallet,
  Copy,
  Share2,
} from "lucide-react";
import { MdContentCopy } from "react-icons/md";
import { FaShareAlt } from "react-icons/fa";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";
import { useGetTeam } from "@workspace/api-client-react";

export const Route = createFileRoute("/_authenticated/team")({
  component: TeamPage,
});

const money = (n: number | null | undefined) => {
  const value = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `$ ${value.toFixed(2)}`;
};

function TeamPage() {
  const { t, isRTL, lang } = useI18n();
  const content = useLocalizedContent();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data, isLoading, isError } = useGetTeam();

  const referralCode = data?.referralCode || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  let rawLink = data?.referralLink || `${origin}/?ref=${referralCode}`;
  if (rawLink && rawLink.startsWith("/")) {
    rawLink = `${origin}${rawLink}`;
  }
  const referralLink = rawLink;

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
          title: t("team.shareTitle"),
          text: t("team.shareText").replace("{code}", referralCode),
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

  const rateForLevel = (level: number) => {
    const rate = data?.levels?.find((item) => item.level === level)?.rewardRate;
    return `${Number.isFinite(Number(rate)) ? Number(rate) : 0}%`;
  };
  const level1Rate = rateForLevel(1);
  const level2Rate = rateForLevel(2);
  const level3Rate = rateForLevel(3);

  const members = data?.members || [];
  
  const getLevelName = (lvl: number) => {
    const levelNames = ["", "team.levelOne", "team.levelTwo", "team.levelThree", "team.levelFour", "team.levelFive", "team.levelSix"];
    const levelKey = levelNames[lvl];
    return levelKey ? t(levelKey) : t("team.levelNumber").replace("{level}", String(lvl));
  };

  const getVipColor = (vipLvl: number) => {
    const v = vipLvl || 0;
    if (v === 1) return "text-white bg-blue-500/20 border-blue-500/50";
    if (v === 2) return "text-white bg-purple-500/20 border-purple-500/50";
    if (v === 3) return "text-white bg-yellow-500/20 border-yellow-500/50";
    if (v >= 4) return "text-white bg-green-500/20 border-green-500/50";
    return "text-gray-400 bg-gray-500/20 border-gray-500/50";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b19] flex items-center justify-center text-white" dir={isRTL ? "rtl" : "ltr"}>
        <p>{t("team.loading")}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#070b19] flex flex-col gap-4 items-center justify-center text-white" dir={isRTL ? "rtl" : "ltr"}>
        <p className="text-red-400">{t("team.fetchError")}</p>
        <button className="bg-blue-600 px-4 py-2 rounded-lg" onClick={() => window.location.reload()}>{t("common.retry")}</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b19] pb-28 md:pb-12 text-white font-sans" dir={isRTL ? "rtl" : "ltr"}>
      <AppHeader />

      <main className="mx-auto w-full max-w-4xl px-2 sm:px-4 py-4 space-y-4">
        {/* Hero Image / Banner */}
        <div key={lang} lang={lang} className="relative w-full rounded-xl overflow-hidden border border-[#233560] bg-gradient-to-br from-[#0a1840] to-[#040813] p-4 flex flex-row items-center justify-between shadow-[0_0_15px_rgba(0,180,255,0.1)]">
          <div className="flex flex-col items-start gap-1 z-10">
            <div className="flex items-center gap-2">
              <Crown aria-hidden="true" className="h-8 w-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,.7)]" />
              <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 drop-shadow-md">
                {t("team.bannerTitle")}
              </span>
            </div>
            <p className="text-sm md:text-base font-bold text-white mt-1 drop-shadow-md">{t("team.bannerSubtitle")}</p>
          </div>
          
          <div className="flex flex-col items-center justify-center z-10 text-center ml-2">
            <Users aria-hidden="true" className="h-8 w-8 text-cyan-300 mb-1" />
            <p className="text-sm md:text-base font-bold text-white drop-shadow-md">{t("team.inviteFriends")}</p>
            <p className="text-sm md:text-base font-bold text-yellow-400 drop-shadow-md mb-1">{t("team.buildTeam")}</p>
            <p className="text-[10px] md:text-xs text-gray-300 drop-shadow-md">{t("team.growIncome")}</p>
          </div>

          <div className="absolute right-0 top-0 opacity-10 md:opacity-20 pointer-events-none mix-blend-screen w-1/2 h-full">
            <div className="w-full h-full bg-blue-500 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/4"></div>
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          {/* Total Income */}
          <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-b from-[#101b38] to-[#060a17] p-2 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500 to-cyan-500/0"></div>
             <Wallet aria-hidden="true" className="h-5 w-5 text-cyan-300 mb-1" />
              <p className="text-[10px] md:text-xs text-gray-300 font-semibold mb-1">{t("team.teamIncome")}</p>
             <p className="text-base md:text-xl font-black text-yellow-400">{money(data?.teamIncome)}</p>
          </div>

          {/* Total Members */}
          <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-b from-[#101b38] to-[#060a17] p-2 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500 to-cyan-500/0"></div>
             <Users aria-hidden="true" className="h-5 w-5 text-cyan-300 mb-1" />
              <p className="text-[10px] md:text-xs text-gray-300 font-semibold mb-1">{t("team.memberCount")}</p>
             <div className="flex items-center gap-1">
               <p className="text-base md:text-xl font-black text-yellow-400">{data?.totalMembers || 0}</p>
             </div>
          </div>

          {/* Team Rewards */}
          <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-b from-[#101b38] to-[#060a17] p-2 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500 to-cyan-500/0"></div>
             <Crown aria-hidden="true" className="h-5 w-5 text-yellow-400 mb-1" />
              <p className="text-[10px] md:text-xs text-gray-300 font-semibold mb-1">{t("team.teamRewards")}</p>
             <p className="text-base md:text-xl font-black text-yellow-400">{money(data?.teamRewards)}</p>
          </div>
        </div>

        {/* Links Row */}
        <div className="flex flex-col md:flex-row gap-2">
          {/* Invite Link */}
          <div className="flex-1 rounded-xl border border-cyan-500/30 bg-gradient-to-b from-[#101b38] to-[#060a17] flex flex-col items-stretch overflow-hidden">
            <div className="bg-[#18274d] py-1.5 px-3 text-center border-b border-[#233560]">
                <p className="text-[11px] text-gray-300 font-bold flex items-center justify-center gap-1"><Link2 className="h-3 w-3" /> {t("team.inviteLinkLabel")}</p>
            </div>
            <div className="flex items-center p-1.5 gap-1.5">
              <div className="bg-[#0b1226] border border-[#233560] rounded flex-1 px-2 py-1.5 flex items-center justify-between overflow-hidden">
                <span className="text-[10px] md:text-xs text-gray-400 truncate dir-ltr text-left w-full mr-2">{content(referralLink, { allowLanguageNeutral: true })}</span>
                <button onClick={shareOrCopyLink} className="text-gray-400 hover:text-white shrink-0">
                  <MdContentCopy size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Referral Code */}
          <div className="flex-1 md:flex-none md:w-1/3 rounded-xl border border-cyan-500/30 bg-gradient-to-b from-[#101b38] to-[#060a17] flex flex-col items-stretch overflow-hidden">
            <div className="bg-[#18274d] py-1.5 px-3 text-center border-b border-[#233560]">
               <p className="text-[11px] text-gray-300 font-bold">{t("team.referralCodeLabel")}</p>
            </div>
            <div className="flex items-center p-1.5 gap-1.5">
              <div className="bg-[#0b1226] border border-[#233560] rounded flex-1 px-2 py-1.5 flex items-center justify-between">
                <span className="text-xs md:text-sm font-bold text-yellow-500 text-center w-full">{content(referralCode, { allowLanguageNeutral: true })}</span>
                <button onClick={copyCode} className="text-gray-400 hover:text-white shrink-0">
                  <MdContentCopy size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Share Button */}
          <div className="flex-none rounded-xl border border-yellow-500/50 bg-gradient-to-b from-yellow-600 to-yellow-700 flex items-center justify-center p-1.5 cursor-pointer hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]" onClick={shareOrCopyLink}>
            <div className="flex items-center justify-center gap-1.5 px-3 h-full">
              <span className="text-xs font-bold text-[#070b19]">{t("team.shareLinkLabel")}</span>
              <FaShareAlt size={12} className="text-[#070b19]" />
            </div>
          </div>
        </div>

        {/* Levels Title */}
        <div className="flex items-center justify-center gap-2 mt-4">
            <Crown aria-hidden="true" className="h-5 w-5 text-yellow-400" />
           <span className="text-lg font-bold text-yellow-400">{t("team.levelsTitle")}</span>
            <Crown aria-hidden="true" className="h-5 w-5 text-yellow-400" />
        </div>

        {/* Levels Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Level 1 */}
          <div className="rounded-xl border border-blue-400/50 bg-gradient-to-b from-[#102048] to-[#08122a] overflow-hidden flex flex-col shadow-[0_0_10px_rgba(59,130,246,0.1)]">
            <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white text-center py-1.5 font-bold text-xs">
              {t("team.levelOne")}
            </div>
            <div className="p-2 flex flex-col gap-2">
              <div className="bg-white rounded p-1.5 flex flex-col items-center justify-center">
                <p className="text-[9px] text-gray-700 font-bold mb-0.5">{t("team.levelMembers")}</p>
                <p className="text-sm font-black text-[#0b1226]">{data?.levels?.[0]?.members || 0}</p>
              </div>
              <div className="bg-white rounded p-1.5 flex flex-col items-center justify-center">
                <p className="text-[9px] text-gray-700 font-bold mb-0.5">{t("team.totalEarnings")}</p>
                <p className="text-sm font-black text-[#0b1226]">{money(data?.levels?.[0]?.earnings)}</p>
              </div>
            </div>
          </div>

          {/* Level 2 */}
          <div className="rounded-xl border border-purple-400/50 bg-gradient-to-b from-[#251545] to-[#120a22] overflow-hidden flex flex-col shadow-[0_0_10px_rgba(168,85,247,0.1)]">
            <div className="bg-gradient-to-r from-purple-700 to-purple-500 text-white text-center py-1.5 font-bold text-xs">
              {t("team.levelTwo")}
            </div>
            <div className="p-2 flex flex-col gap-2">
              <div className="bg-white rounded p-1.5 flex flex-col items-center justify-center">
                <p className="text-[9px] text-gray-700 font-bold mb-0.5">{t("team.levelMembers")}</p>
                <p className="text-sm font-black text-[#0b1226]">{data?.levels?.[1]?.members || 0}</p>
              </div>
              <div className="bg-white rounded p-1.5 flex flex-col items-center justify-center">
                <p className="text-[9px] text-gray-700 font-bold mb-0.5">{t("team.totalEarnings")}</p>
                <p className="text-sm font-black text-[#0b1226]">{money(data?.levels?.[1]?.earnings)}</p>
              </div>
            </div>
          </div>

          {/* Level 3 */}
          <div className="rounded-xl border border-emerald-400/50 bg-gradient-to-b from-[#103028] to-[#081814] overflow-hidden flex flex-col shadow-[0_0_10px_rgba(16,185,129,0.1)]">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 text-white text-center py-1.5 font-bold text-xs">
              {t("team.levelThree")}
            </div>
            <div className="p-2 flex flex-col gap-2">
              <div className="bg-white rounded p-1.5 flex flex-col items-center justify-center">
                <p className="text-[9px] text-gray-700 font-bold mb-0.5">{t("team.levelMembers")}</p>
                <p className="text-sm font-black text-[#0b1226]">{data?.levels?.[2]?.members || 0}</p>
              </div>
              <div className="bg-white rounded p-1.5 flex flex-col items-center justify-center">
                <p className="text-[9px] text-gray-700 font-bold mb-0.5">{t("team.totalEarnings")}</p>
                <p className="text-sm font-black text-[#0b1226]">{money(data?.levels?.[2]?.earnings)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invite Rewards Strip */}
        <div className="flex flex-col md:flex-row gap-1">
          <div className="bg-transparent border border-yellow-600 rounded-lg py-1.5 px-3 flex items-center justify-center md:flex-none">
             <p className="text-xs font-bold text-yellow-400 flex items-center gap-1"><Gift className="h-4 w-4" /> {t("team.inviteRewards")}</p>
          </div>
          <div className="flex-1 flex gap-1">
            <div className="flex-1 bg-gradient-to-r from-blue-700 to-blue-500 rounded-lg flex flex-col items-center justify-center py-1 border border-blue-400">
                <span className="text-[9px] text-blue-100">{t("team.fromLevelOne")}</span>
               <span className="text-sm font-black text-white">{level1Rate}</span>
            </div>
            <div className="flex-1 bg-gradient-to-r from-purple-700 to-purple-500 rounded-lg flex flex-col items-center justify-center py-1 border border-purple-400">
                <span className="text-[9px] text-purple-100">{t("team.fromLevelTwo")}</span>
               <span className="text-sm font-black text-white">{level2Rate}</span>
            </div>
            <div className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-lg flex flex-col items-center justify-center py-1 border border-emerald-400">
                <span className="text-[9px] text-emerald-100">{t("team.fromLevelThree")}</span>
               <span className="text-sm font-black text-white">{level3Rate}</span>
            </div>
          </div>
        </div>

        {/* Team Members List */}
        <div className="rounded-xl border border-cyan-500/40 bg-[#091026] overflow-hidden mt-4 shadow-lg">
          <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-center py-1.5 border-b border-cyan-500/40">
              <span className="text-sm font-bold text-white drop-shadow-md">{t("team.membersHeading")}</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isRTL ? "text-right" : "text-left"}`}>
              <thead>
                <tr className="bg-[#121c38] border-b border-[#233560]">
                  <th className="py-2 px-2 text-center text-gray-300 font-bold w-10">#</th>
                  <th className="py-2 px-2 text-center text-gray-300 font-bold w-32">{t("team.level")}</th>
                  <th className={`py-2 px-3 text-gray-300 font-bold ${isRTL ? "text-right" : "text-left"}`}>{t("team.email")}</th>
                </tr>
              </thead>
              <tbody>
                {members.length > 0 ? (
                  members.map((m, idx) => (
                    <tr key={m.id || idx} className="border-b border-[#18274d] hover:bg-[#152345] transition-colors">
                      <td className="py-2 px-2 text-center font-bold text-gray-300">{idx + 1}</td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-gray-400">{getLevelName(m.level)}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${getVipColor(m.vipLevel)}`}>
                            VIP {m.vipLevel || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 font-semibold text-gray-200 dir-ltr text-left">
                        <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 shrink-0 text-cyan-300" />{content(m.email, { allowUserIdentifier: true })}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500 text-sm">
                      {t("team.noMembers")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <BottomNav />
    </div>
  );
}

