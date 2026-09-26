import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  DollarSign,
  Wallet,
  Headphones,
  ShieldCheck,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  changeAdminPassword,
  getAdminSettings,
  saveAdminSettings,
} from "@/lib/valoriza-admin.functions";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";

export function AdminSettingsTab() {
  const { t } = useI18n();
  const content = useLocalizedContent();
  const queryClient = useQueryClient();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const {
    data: initialSettings,
    isLoading,
  } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => getAdminSettings(),
  });

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialSettings) {
      // Cast values to strings for form handling
      const mapped = Object.entries(initialSettings).reduce((acc, [k, v]) => {
         acc[k] = v !== null && v !== undefined ? String(v) : "";
         return acc;
      }, {} as Record<string, string>);
      setForm(mapped);
    }
  }, [initialSettings]);

  const saveMutation = useMutation({
    mutationFn: saveAdminSettings,
    onSuccess: () => {
      toast.success(t("admin.settingsSaved"));
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["account-data"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const passwordMutation = useMutation({
    mutationFn: changeAdminPassword,
    onSuccess: () => {
      toast.success(t("account.passwordChangedSuccess"));
      setPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      queryClient.invalidateQueries({ queryKey: ["account-data"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const handlePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error(t("admin.passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("account.passwordMismatch"));
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert strings back to numbers/objects as expected by API
    const payload = {
      ...form,
      min_deposit: form.min_deposit ? Number(form.min_deposit) : undefined,
      min_withdrawal: form.min_withdrawal ? Number(form.min_withdrawal) : undefined,
      withdrawal_fee_percent: form.withdrawal_fee_percent ? Number(form.withdrawal_fee_percent) : undefined,
      daily_login_reward: form.daily_login_reward ? Number(form.daily_login_reward) : undefined,
      referral_rate_l1: form.referral_rate_l1 ? Number(form.referral_rate_l1) : undefined,
      referral_rate_l2: form.referral_rate_l2 ? Number(form.referral_rate_l2) : undefined,
      referral_rate_l3: form.referral_rate_l3 ? Number(form.referral_rate_l3) : undefined,
    };
    saveMutation.mutate({ settings: payload });
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-muted-foreground">
        <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
        {t("admin.loadingSettings")}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSave} className="space-y-5">
      {/* Financial Limits Section */}
      <div className="rounded-2xl border border-border bg-surface/70 p-4 shadow-sm">
        <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5 pb-3 border-b border-border/60">
          <DollarSign className="h-4 w-4 text-gold" />
          <span>{t("admin.financialLimitsAndFees")}</span>
        </h3>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              {t("admin.minimumDepositUsd")}
            </label>
            <input
              type="number"
              step="1"
              value={form["min_deposit"] ?? ""}
              onChange={(e) => handleChange("min_deposit", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              {t("admin.minimumWithdrawalUsd")}
            </label>
            <input
              type="number"
              step="1"
              value={form["min_withdrawal"] ?? ""}
              onChange={(e) => handleChange("min_withdrawal", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">{t("admin.withdrawalFeePercent")}</label>
            <input
              type="number"
              step="0.5"
              value={form["withdrawal_fee_percent"] ?? ""}
              onChange={(e) => handleChange("withdrawal_fee_percent", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              {t("admin.loginRewardUsd")}
            </label>
            <input
              type="number"
              step="0.05"
              value={form["daily_login_reward"] ?? ""}
              onChange={(e) => handleChange("daily_login_reward", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Referral Rates Section */}
      <div className="rounded-2xl border border-border bg-surface/70 p-4 shadow-sm">
        <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5 pb-3 border-b border-border/60">
          <DollarSign className="h-4 w-4 text-cyan-glow" />
          <span>{t("admin.referralCommissionRates")}</span>
        </h3>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              {t("admin.levelOneCommission")}
            </label>
            <input
              type="number"
              step="0.5"
              value={form["referral_rate_l1"] || ""}
              onChange={(e) => handleChange("referral_rate_l1", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              {t("admin.levelTwoCommission")}
            </label>
            <input
              type="number"
              step="0.5"
              value={form["referral_rate_l2"] || ""}
              onChange={(e) => handleChange("referral_rate_l2", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              {t("admin.levelThreeCommission")}
            </label>
            <input
              type="number"
              step="0.5"
              value={form["referral_rate_l3"] || ""}
              onChange={(e) => handleChange("referral_rate_l3", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Deposit Addresses Section */}
      <div className="rounded-2xl border border-border bg-surface/70 p-4 shadow-sm">
        <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5 pb-3 border-b border-border/60">
          <Wallet className="h-4 w-4 text-cyan-glow" />
          <span>{t("admin.officialDepositWalletAddresses")}</span>
        </h3>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              {t("admin.trc20Address")}
            </label>
            <input
              type="text"
              value={content(form["deposit_address_TRC20"] || "", { allowLanguageNeutral: true })}
              onChange={(e) => handleChange("deposit_address_TRC20", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              {t("admin.bep20Address")}
            </label>
            <input
              type="text"
              value={content(form["deposit_address_BEP20"] || "", { allowLanguageNeutral: true })}
              onChange={(e) => handleChange("deposit_address_BEP20", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              {t("admin.erc20Address")}
            </label>
            <input
              type="text"
              value={content(form["deposit_address_ERC20"] || "", { allowLanguageNeutral: true })}
              onChange={(e) => handleChange("deposit_address_ERC20", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* Customer Service & Platform Info */}
      <div className="rounded-2xl border border-border bg-surface/70 p-4 shadow-sm">
        <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5 pb-3 border-b border-border/60">
          <Headphones className="h-4 w-4 text-purple-400" />
          <span>{t("admin.customerServiceAndLinks")}</span>
        </h3>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              {t("admin.telegramSupportUrl")}
            </label>
            <input
              type="text"
              value={content(form["telegram_support_url"] || "", { allowLanguageNeutral: true })}
              onChange={(e) => handleChange("telegram_support_url", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">{t("admin.whatsappSupportUrl")}</label>
            <input
              type="text"
              value={content(form["whatsapp_support_url"] || "", { allowLanguageNeutral: true })}
              onChange={(e) => handleChange("whatsapp_support_url", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[10px] text-muted-foreground font-bold">
              {t("admin.platformSloganArabicSource")}
            </label>
            <input
              type="text"
              value={form["app_slogan"] || ""}
              placeholder={t("admin.platformSloganArabicPlaceholder")}
              onChange={(e) => handleChange("app_slogan", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center justify-center gap-2 rounded-2xl brand-gradient px-6 py-3 text-xs font-black text-primary-foreground shadow-glow hover:opacity-95 active:scale-95 disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{t("admin.savingSettings")}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{t("admin.saveAllSettings")}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setPasswordModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 py-3 text-xs font-bold text-foreground hover:border-cyan-glow"
          >
            <ShieldCheck className="h-4 w-4 text-cyan-glow" />
            <span>{t("account.changePass")}</span>
          </button>
        </div>
      </div>
      </form>

      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={handlePasswordSubmit}
            className="w-full max-w-sm space-y-4 rounded-3xl border border-cyan-glow/40 bg-navy-deep p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-extrabold text-foreground">{t("account.changePass")}</h3>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                aria-label={t("common.close")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground">{t("auth.password")}</label>
              <input
                required
                autoComplete="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground">{t("account.newPassword")}</label>
              <input
                required
                minLength={8}
                autoComplete="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground">{t("account.confirmPassword")}</label>
              <input
                required
                minLength={8}
                autoComplete="new-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!currentPassword || !newPassword || !confirmPassword || passwordMutation.isPending}
              className="w-full rounded-xl brand-gradient py-2.5 text-xs font-black text-primary-foreground shadow-glow disabled:opacity-50"
            >
              {passwordMutation.isPending ? t("account.saving") : t("account.savePassword")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
