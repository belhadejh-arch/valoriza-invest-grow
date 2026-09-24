import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock,
  Coins,
  Copy,
  Info,
  Lock,
  QrCode,
  Sparkles,
  TrendingUp,
  Vault,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createDepositRequest, requestWithdrawal } from "@/lib/valoriza-pages.functions";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";

/* =========================================================================
   1. Deposit Modal (Matching PDF Page 6)
   ========================================================================= */

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses?: Record<string, string>;
}

export function DepositModal({ isOpen, onClose, addresses }: DepositModalProps) {
  const { t, dir } = useI18n();
  const content = useLocalizedContent();
  const [network, setNetwork] = useState<"ERC20" | "BEP20" | "TRC20">("ERC20");
  const [amount, setAmount] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const defaultAddresses: Record<string, string> = {
    ERC20: "0x71a9c2e4d8b6f9a5c1e2d3f4a5b6c7d8e9f0a1b",
    BEP20: "0x71a9c2e4d8b6f9a5c1e2d3f4a5b6c7d8e9f0a1b",
    TRC20: "TQn9Y2khDD95J42FQtQTdwVVRZq5YxZ8Xk",
    ...addresses,
  };

  const currentAddress = defaultAddresses[network] || defaultAddresses.ERC20;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentAddress);
    setCopied(true);
    toast.success(t("public.deposit.copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num < 10) {
      toast.error(t("public.deposit.minimumError"));
      return;
    }

    setSubmitting(true);
    try {
      await createDepositRequest({
        network: network as any,
        amount: num,
        screenshotUrl: "",
      });
      toast.success(t("public.deposit.success"));
      setAmount("");
      onClose();
    } catch {
      toast.error(t("public.deposit.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="deposit-modal-overlay"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="deposit-modal-content"
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-electric/40 bg-navy-deep p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir={dir}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-gold/40 text-gold">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground">{t("public.deposit.title")}</h2>
              <p className="text-[11px] text-muted-foreground">{t("public.deposit.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Network Selector matching Page 6 */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["ERC20", "BEP20", "TRC20"] as const).map((net) => {
            const isSelected = network === net;
            return (
              <button
                key={net}
                id={`deposit-net-${net}`}
                type="button"
                onClick={() => setNetwork(net)}
                className={`relative flex flex-col items-center justify-center rounded-2xl border p-3 transition-all ${
                  isSelected
                    ? "border-cyan-glow bg-surface shadow-[0_0_12px_oklch(0.82_0.14_205/0.3)]"
                    : "border-border/60 bg-navy hover:bg-surface/50"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-1.5 left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-glow text-navy-deep">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-sm font-bold">
                  ₮
                </div>
                <span className="mt-1.5 text-xs font-bold text-foreground">USDT-{net}</span>
                <span className="text-[10px] text-muted-foreground">{net}</span>
              </button>
            );
          })}
        </div>

        {/* Deposit Address Box matching Page 6 */}
        <div className="mt-4 surface-card p-3.5 glow-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">{t("public.deposit.address")}</span>
            <span className="text-[10px] text-cyan-glow font-semibold">
              {t("public.deposit.network").replace("{network}", network)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-navy-deep border border-border/70 p-2.5">
            <code className="text-[11px] text-foreground font-mono truncate select-all" dir="ltr">
              {content(currentAddress, { allowLanguageNeutral: true })}
            </code>
            <button
              id="copy-deposit-addr-btn"
              type="button"
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1 rounded-lg brand-gradient px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground shadow-glow"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? t("public.deposit.copiedShort") : t("public.deposit.copyAddress")}</span>
            </button>
          </div>

          <div className="mt-2.5 flex items-center justify-center gap-1 text-[11px] text-cyan-glow">
            <QrCode className="h-4 w-4" />
            <span>{t("public.deposit.qr")}</span>
          </div>
        </div>

        {/* Amount Input Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">{t("public.deposit.amount")}</label>
            <div className="relative">
              <input
                id="deposit-amount-input"
                type="number"
                min="10"
                step="0.01"
                placeholder={t("public.deposit.amountPlaceholder")}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-navy px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-gold">
                USDT
              </span>
            </div>
          </div>

          <button
            id="submit-deposit-btn"
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl brand-gradient py-3.5 text-sm font-extrabold text-primary-foreground shadow-glow active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? t("public.deposit.submitting") : t("public.deposit.submit")}
          </button>
        </form>

        {/* Notes matching Page 6 */}
        <div className="mt-4 rounded-2xl border border-cyan-glow/30 bg-surface/70 p-3 text-xs leading-relaxed space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-cyan-glow">
            <Info className="h-4 w-4 shrink-0" />
            <span>{t("public.notes.title")}</span>
          </div>
          <p className="flex items-center gap-1 text-muted-foreground text-[11px]">
            <Check className="h-3.5 w-3.5 text-success shrink-0" />
            {t("public.deposit.hours")}
          </p>
          <p className="flex items-center gap-1 text-muted-foreground text-[11px]">
            <Check className="h-3.5 w-3.5 text-success shrink-0" />
            {t("public.deposit.minimum")}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   2. Withdrawal Modal (Matching PDF Page 7 & Page 8 Notes)
   ========================================================================= */

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance?: number;
  existingAddress?: { network: string; address: string; locked: boolean } | null;
  onSuccess?: () => void;
}

export function WithdrawalModal({
  isOpen,
  onClose,
  balance = 125.5,
  existingAddress,
  onSuccess,
}: WithdrawalModalProps) {
  const { t, dir } = useI18n();
  const content = useLocalizedContent();
  const [network, setNetwork] = useState<"ERC20" | "BEP20" | "TRC20">("ERC20");
  const [addressInput, setAddressInput] = useState(
    content(existingAddress?.address || "", { allowLanguageNeutral: true }),
  );
  const [isLocked, setIsLocked] = useState(Boolean(existingAddress?.address));
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const feePercent = 10;
  const numAmount = parseFloat(amount) || 0;
  const feeAmount = (numAmount * feePercent) / 100;
  const netAmount = Math.max(0, numAmount - feeAmount);

  const handleBindAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim() || addressInput.trim().length < 15) {
      toast.error(t("public.withdraw.invalidAddress"));
      return;
    }
    setIsLocked(true);
    toast.success(t("public.withdraw.bindSuccess"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) {
      toast.error(t("public.withdraw.bindFirst"));
      return;
    }
    if (numAmount < 6) {
      toast.error(t("public.withdraw.minimumError"));
      return;
    }
    if (numAmount > balance) {
      toast.error(t("public.withdraw.insufficient"));
      return;
    }

    // Check withdrawal hours 09:00 - 16:00
    // Allow demo submission with notice if outside window
    setSubmitting(true);
    try {
      await requestWithdrawal({
        network: network as any,
        address: addressInput.trim(),
        amount: numAmount,
      });
      toast.success(t("public.withdraw.success").replace("{amount}", netAmount.toFixed(2)));
      setAmount("");
      onClose();
      onSuccess?.();
    } catch {
      toast.error(t("public.withdraw.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="withdrawal-modal-overlay"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="withdrawal-modal-content"
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-electric/40 bg-navy-deep p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir={dir}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-electric/40 text-cyan-glow">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground">{t("public.withdraw.title")}</h2>
              <p className="text-[11px] text-muted-foreground">
                {t("public.withdraw.balance")} <span className="text-gold font-bold">${balance.toFixed(2)}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Network Selector matching Page 7 */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["ERC20", "BEP20", "TRC20"] as const).map((net) => {
            const isSelected = network === net;
            return (
              <button
                key={net}
                id={`withdraw-net-${net}`}
                type="button"
                onClick={() => setNetwork(net)}
                className={`relative flex flex-col items-center justify-center rounded-2xl border p-3 transition-all ${
                  isSelected
                    ? "border-cyan-glow bg-surface shadow-[0_0_12px_oklch(0.82_0.14_205/0.3)]"
                    : "border-border/60 bg-navy hover:bg-surface/50"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-1.5 left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-glow text-navy-deep">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-sm font-bold">
                  ₮
                </div>
                <span className="mt-1.5 text-xs font-bold text-foreground">USDT-{net}</span>
                <span className="text-[10px] text-muted-foreground">({net})</span>
              </button>
            );
          })}
        </div>

        {/* Address Binding Box matching Page 7 & Page 8 Rule 1 */}
        <div className="mt-4 surface-card p-3.5 glow-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 text-gold" />
              {t("public.withdraw.bindAddress")}
            </span>
            {isLocked && (
              <span className="rounded-full bg-success/20 border border-success/40 px-2 py-0.5 text-[10px] font-bold text-success">
                {t("public.withdraw.locked")}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("public.withdraw.addressInstructions")}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <input
              id="withdraw-address-input"
              type="text"
              placeholder={t("public.withdraw.addressPlaceholder")}
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              disabled={isLocked}
              dir="ltr"
              className="w-full rounded-xl border border-border bg-navy px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none disabled:opacity-75"
            />
            {!isLocked ? (
              <button
                id="bind-address-btn"
                type="button"
                onClick={handleBindAddress}
                className="shrink-0 rounded-xl brand-gradient px-3 py-2 text-xs font-bold text-primary-foreground shadow-glow"
              >
                {t("public.withdraw.bind")}
              </button>
            ) : (
              <span className="shrink-0 flex items-center justify-center h-8 w-8 rounded-xl bg-success/20 text-success">
                <Check className="h-4 w-4" />
              </span>
            )}
          </div>

          <p className="mt-2 text-[10px] text-cyan-glow/80">
            {t("public.withdraw.lockNotice")}
          </p>
        </div>

        {/* Amount Input Form matching Page 7 */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">{t("public.withdraw.amount")}</label>
            <div className="relative">
              <input
                id="withdraw-amount-input"
                type="number"
                min="6"
                max={balance}
                step="0.01"
                placeholder={t("public.withdraw.amountPlaceholder")}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-navy px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-gold">
                USDT
              </span>
            </div>
          </div>

          {/* Breakdown fee calculation */}
          {numAmount > 0 && (
            <div className="rounded-xl border border-border/60 bg-surface/50 p-2.5 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("public.withdraw.requested")}</span>
                <span>${numAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-danger">
                <span>{t("public.withdraw.fee")}</span>
                <span>-${feeAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-success border-t border-border/40 pt-1">
                <span>{t("public.withdraw.net")}</span>
                <span>${netAmount.toFixed(2)} USDT</span>
              </div>
            </div>
          )}

          <button
            id="submit-withdraw-btn"
            type="submit"
            disabled={submitting || !isLocked}
            className="w-full rounded-2xl brand-gradient py-3.5 text-sm font-extrabold text-primary-foreground shadow-glow active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? t("public.withdraw.submitting") : t("public.withdraw.submit")}
          </button>
        </form>

        {/* Notes matching Page 7 */}
        <div className="mt-4 rounded-2xl border border-cyan-glow/30 bg-surface/70 p-3 text-xs leading-relaxed space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-cyan-glow">
            <Info className="h-4 w-4 shrink-0" />
            <span>{t("public.notes.title")}</span>
          </div>
          <p className="flex items-center gap-1 text-muted-foreground text-[11px]">
            <Check className="h-3.5 w-3.5 text-success shrink-0" />
            {t("public.withdraw.minimum")}
          </p>
          <p className="flex items-center gap-1 text-muted-foreground text-[11px]">
            <Clock className="h-3.5 w-3.5 text-gold shrink-0" />
            {t("public.withdraw.hours")}
          </p>
          <p className="flex items-center gap-1 text-muted-foreground text-[11px]">
            <Coins className="h-3.5 w-3.5 text-cyan-glow shrink-0" />
            {t("public.withdraw.feeNote")}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   3. Savings Fund Quick Modal (Matching PDF Page 3)
   ========================================================================= */

interface SavingsFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  funds?: Array<{
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    taglineAr: string;
    durationDays: number;
    profitPercent: number;
    minAmount: number;
  }>;
}

export function SavingsFundModal({ isOpen, onClose, funds }: SavingsFundModalProps) {
  const { t, dir } = useI18n();
  const content = useLocalizedContent();
  if (!isOpen) return null;

  const defaultFunds = [
    {
      id: "f1",
      code: "MUMBAI",
      nameAr: t("public.fund.f1Name"),
      nameEn: t("public.fund.f1Name"),
      taglineAr: t("public.fund.f1Tag"),
      durationDays: 3,
      profitPercent: 3.08,
      minAmount: 5,
    },
    {
      id: "f2",
      code: "NEWMEXICO",
      nameAr: t("public.fund.f2Name"),
      nameEn: t("public.fund.f2Name"),
      taglineAr: t("public.fund.f2Tag"),
      durationDays: 10,
      profitPercent: 4.2,
      minAmount: 5,
    },
    {
      id: "f3",
      code: "GXR",
      nameAr: t("public.fund.f3Name"),
      nameEn: t("public.fund.f3Name"),
      taglineAr: t("public.fund.f3Tag"),
      durationDays: 30,
      profitPercent: 6.4,
      minAmount: 5,
    },
    {
      id: "f4",
      code: "NBL",
      nameAr: t("public.fund.f4Name"),
      nameEn: t("public.fund.f4Name"),
      taglineAr: t("public.fund.f4Tag"),
      durationDays: 160,
      profitPercent: 10.8,
      minAmount: 5,
    },
  ];

  const hasAdminFunds = Boolean(funds && funds.length > 0);
  const list = hasAdminFunds ? funds! : defaultFunds;
  const fundTranslationKey = (id: string, field: "Name" | "Tag") => {
    const idNum = id.replace("f", "");
    return `public.fund.f${idNum}${field}`;
  };

  return (
    <div
      id="savings-fund-modal-overlay"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="savings-fund-modal-content"
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-electric/40 bg-navy-deep p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir={dir}
      >
        {/* Header matching Page 3 */}
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-cyan-glow/40 text-cyan-glow">
              <Vault className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground">{t("public.fund.title")}</h2>
              <p className="text-[11px] text-muted-foreground">{t("public.fund.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Hero banner matching Page 3 */}
        <div className="mt-4 surface-card glow-border p-4 text-center">
          <h3 className="text-xl font-extrabold text-gold-gradient">{t("public.fund.title")}</h3>
          <p className="mt-1 text-xs font-bold text-foreground">
            {t("public.fund.safe")}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("public.fund.growth")}
          </p>
        </div>

        {/* Funds List matching Page 3 */}
        <div className="mt-4 space-y-3">
          {list.map((fund) => (
            <div
              key={fund.id}
              className="surface-card glow-border p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface border border-primary/40 text-cyan-glow font-bold text-xs">
                  {content(fund.code, { allowLanguageNeutral: true })}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-foreground">
                    {hasAdminFunds
                      ? content({ ar: fund.nameAr, en: fund.nameEn })
                      : t(fundTranslationKey(fund.id, "Name"))}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {hasAdminFunds
                      ? content(fund.taglineAr)
                      : t(fundTranslationKey(fund.id, "Tag"))}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-cyan-glow">
                      <Clock className="h-3.5 w-3.5" />
                      {t("public.fund.duration")} <b>{fund.durationDays} {t("public.fund.days")}</b>
                    </span>
                    <span className="flex items-center gap-1 text-success font-bold">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {t("public.fund.profit")} {fund.profitPercent}%
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to="/investment"
                onClick={onClose}
                className="shrink-0 inline-flex items-center justify-center rounded-xl gold-gradient px-4 py-2 text-xs font-extrabold text-navy-deep shadow-gold-glow hover:brightness-110 transition-all"
              >
                {t("public.fund.invest")}
              </Link>
            </div>
          ))}
        </div>

        {/* Min investment note matching Page 3 */}
        <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/10 p-3 text-center text-xs font-bold text-gold flex items-center justify-center gap-1.5">
          <Sparkles className="h-4 w-4" />
          <span>{t("public.fund.minimum")}</span>
        </div>
      </div>
    </div>
  );
}
