import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  FileText,
  Gift,
  Headphones,
  KeyRound,
  LogOut,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  Wallet,
  X,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getAccountData } from "@/lib/valoriza-pages.functions";
import { claimDailyLoginReward } from "@/lib/valoriza.functions";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

const money = (n: number | null | undefined) => {
  const value = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `$${value.toFixed(2)}`;
};

function AccountPage() {
  const { t, isRTL } = useI18n();
  const content = useLocalizedContent();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchAccount = getAccountData;
  const claimDaily = claimDailyLoginReward;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["account"],
    queryFn: () => fetchAccount(),
  });

  const claimMutation = useMutation({
    mutationFn: () => claimDaily(),
    onSuccess: (res: any) => {
      if (res.ok) {
        toast.success(`${t("rewards.claimSuccess")} +${money(res.amount)}`);
        qc.invalidateQueries({ queryKey: ["account"] });
        qc.invalidateQueries({ queryKey: ["home"] });
        qc.invalidateQueries({ queryKey: ["financial-records"] });
      } else {
        toast.info(t("rewards.alreadyClaimed"));
      }
    },
    onError: () => toast.error(t("common.error")),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(t("account.passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("account.passwordMismatch"));
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t("account.passwordChangedSuccess"));
      setPasswordModalOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(t("common.error"));
    } finally {
      setPasswordLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-28 md:pb-12 text-foreground" dir={isRTL ? "rtl" : "ltr"}>
        <AppHeader />
        <div className="flex justify-center items-center h-64">
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background pb-28 md:pb-12 text-foreground" dir={isRTL ? "rtl" : "ltr"}>
        <AppHeader />
        <div className="flex justify-center items-center h-64">
          <p className="text-danger">{t("common.error")}</p>
        </div>
      </div>
    );
  }

  const rawProfile = data.profile ?? {};
  const profile = {
    username: rawProfile.username ?? "",
    email: rawProfile.email ?? "",
    referralCode: rawProfile.referralCode ?? rawProfile.referral_code ?? "",
    vipLevel: Number(rawProfile.vipLevel ?? rawProfile.vip_level ?? 0),
    trialActive: Boolean(rawProfile.trialActive ?? rawProfile.trial_active),
  };
  const dailyReward = data.dailyReward ?? { amount: 0, claimed: false };
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div
      className="min-h-screen bg-background pb-28 md:pb-12 text-foreground"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Bento Section (2 Columns on desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-stretch">
              {/* Profile Card */}
              <section className="md:col-span-6 surface-card glow-border p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between text-start">
                <div className="absolute -top-12 -left-12 h-36 w-36 rounded-full bg-cyan-glow/10 blur-2xl pointer-events-none" />

                <div className="relative z-10 flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl brand-gradient text-primary-foreground font-black text-2xl shadow-glow">
                      {content(profile.username, { allowUserIdentifier: true }).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1.5 -start-1.5 flex items-center gap-1 rounded-full bg-background border border-gold px-2 py-0.5 text-[10px] font-black text-gold shadow-md">
                      <Crown className="h-3 w-3 text-gold fill-gold" />
                      <span>VIP {profile.vipLevel}</span>
                    </div>
                  </div>

                  {/* Profile info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg font-black text-foreground truncate">
                        {content(profile.username, { allowUserIdentifier: true })}
                      </h1>
                      {profile.trialActive && (
                        <span className="rounded-full bg-cyan-glow/20 border border-cyan-glow/40 px-2 py-0.5 text-[10px] font-bold text-cyan-glow">
                          {t("account.trialPeriod")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {content(profile.email, { allowUserIdentifier: true })}
                    </p>
                    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1 text-xs font-mono text-cyan-glow">
                      <Ticket className="h-3.5 w-3.5" />
                      <span>{t("team.inviteCode")}:</span>
                      <span className="font-black select-all text-gold">
                        {content(profile.referralCode, { allowLanguageNeutral: true })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Daily Reward Mini Card */}
                <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 border border-gold/40 text-gold">
                      <Gift className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {t("rewards.claimToday")}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        +{money(dailyReward.amount)}
                      </p>
                    </div>
                  </div>

                  <button
                    id="btn-claim-daily-reward"
                    type="button"
                    disabled={dailyReward.claimed || claimMutation.isPending}
                    onClick={() => claimMutation.mutate()}
                    className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black shadow-md transition-all cursor-pointer ${
                      dailyReward.claimed
                        ? "bg-surface text-muted-foreground border border-border cursor-not-allowed"
                        : "brand-gradient text-primary-foreground shadow-glow hover:opacity-95 active:scale-95"
                    }`}
                  >
                    {dailyReward.claimed ? t("rewards.claimedToday") : t("rewards.claimToday")}
                  </button>
                </div>
              </section>

              {/* Balance & Action Buttons Card */}
              <section className="md:col-span-6 surface-card glow-border p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between text-start shadow-xl">
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-cyan-glow to-transparent" />

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wallet className="h-4 w-4 text-cyan-glow" />
                    <span className="font-semibold">{t("home.accountBalance")}</span>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-gold-gradient tracking-tight">
                    {money(data.balance)}
                  </p>
                </div>

                {/* 3 Prominent Quick Action Buttons */}
                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  <Link
                    to="/deposit"
                    id="btn-account-deposit"
                    className="flex flex-col items-center justify-center rounded-2xl brand-gradient py-3.5 px-2 text-primary-foreground shadow-glow active:scale-95 transition-all text-center"
                  >
                    <ArrowDownLeft className="h-5 w-5 mb-1 text-gold" />
                    <span className="text-xs font-black">{t("home.deposit")}</span>
                  </Link>

                  <Link
                    to="/withdrawal"
                    id="btn-account-withdraw"
                    className="flex flex-col items-center justify-center rounded-2xl border border-cyan-glow/40 bg-surface/80 py-3.5 px-2 text-foreground hover:bg-surface active:scale-95 transition-all text-center"
                  >
                    <ArrowUpRight className="h-5 w-5 mb-1 text-cyan-glow" />
                    <span className="text-xs font-black">{t("home.withdraw")}</span>
                  </Link>

                  <Link
                    to="/support"
                    id="btn-account-support"
                    className="flex flex-col items-center justify-center rounded-2xl border border-gold/40 bg-surface/80 py-3.5 px-2 text-foreground hover:bg-surface active:scale-95 transition-all text-center"
                  >
                    <Headphones className="h-5 w-5 mb-1 text-gold" />
                    <span className="text-xs font-black">{t("home.support")}</span>
                  </Link>
                </div>
              </section>
            </div>

            {/* Bottom Bento Section: Menu Links (Left) + Security Notes (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-start">
              {/* Account Menu Navigation */}
              <div className="md:col-span-7 surface-card divide-y divide-border/60 overflow-hidden rounded-3xl">
                <Link
                  to="/records"
                  search={{ tab: "withdrawals" }}
                  className="flex items-center justify-between p-4 hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-3.5 text-xs font-black text-foreground">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-cyan-glow/40 text-cyan-glow">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                    <span>{t("account.recordsWithdrawals")}</span>
                  </div>
                  <Chevron className="h-4 w-4 text-muted-foreground" />
                </Link>

                <Link
                  to="/records"
                  search={{ tab: "deposits" }}
                  className="flex items-center justify-between p-4 hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-3.5 text-xs font-black text-foreground">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-gold/40 text-gold">
                      <ArrowDownLeft className="h-4 w-4" />
                    </div>
                    <span>{t("account.recordsDeposits")}</span>
                  </div>
                  <Chevron className="h-4 w-4 text-muted-foreground" />
                </Link>

                <Link
                  to="/records"
                  search={{ tab: "transactions" }}
                  className="flex items-center justify-between p-4 hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-3.5 text-xs font-black text-foreground">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border text-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span>{t("account.recordsTransactions")}</span>
                  </div>
                  <Chevron className="h-4 w-4 text-muted-foreground" />
                </Link>

                <Link
                  to="/records"
                  search={{ tab: "rewards" }}
                  className="flex items-center justify-between p-4 hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-3.5 text-xs font-black text-foreground">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-gold/40 text-gold">
                      <Coins className="h-4 w-4" />
                    </div>
                    <span>{t("account.recordsRewards")}</span>
                  </div>
                  <Chevron className="h-4 w-4 text-muted-foreground" />
                </Link>

                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-surface transition-colors text-start cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 text-xs font-black text-foreground">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border text-cyan-glow">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <span>{t("account.changePass")}</span>
                  </div>
                  <Chevron className="h-4 w-4 text-muted-foreground" />
                </button>

                <button
                  type="button"
                  onClick={signOut}
                  className="w-full flex items-center justify-between p-4 hover:bg-danger/10 transition-colors text-start text-danger cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 text-xs font-black">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger/15 border border-danger/40 text-danger">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <span>{t("account.logout")}</span>
                  </div>
                  <Chevron className="h-4 w-4 text-danger/70" />
                </button>
              </div>

              {/* Safety Information Bento Card */}
              <div className="md:col-span-5 surface-card glow-border p-6 rounded-3xl space-y-4 text-start">
                <div className="flex items-center gap-2 text-cyan-glow">
                  <ShieldCheck className="h-5 w-5" />
                  <h3 className="text-sm font-black text-foreground">
                    {t("account.securityNoticeTitle")}
                  </h3>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("account.securityNoticeDesc")}
                </p>

                <div className="rounded-2xl border border-border bg-surface p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("home.vipStatus")}:</span>
                    <span className="font-black text-gold">VIP {profile.vipLevel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("account.dataProtection")}</span>
                    <span className="font-black text-success">
                      {t("account.sslEncryption")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
      </main>

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setPasswordModalOpen(false)}
        >
          <div
            className="w-full max-w-md surface-card glow-border p-6 rounded-3xl relative shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            dir={isRTL ? "rtl" : "ltr"}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-cyan-glow" />
                <span>{t("account.changePass")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="mt-4 space-y-4 text-start">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {t("account.newPassword")}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  {t("account.confirmPassword")}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 rounded-xl brand-gradient py-3 text-xs font-black text-primary-foreground shadow-glow disabled:opacity-50 cursor-pointer"
                >
                  {passwordLoading ? t("account.saving") : t("account.savePassword")}
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="rounded-xl border border-border bg-surface px-4 py-3 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
