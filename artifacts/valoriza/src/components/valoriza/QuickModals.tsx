import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  bindWithdrawalAddress,
  getInvestmentData,
  getWithdrawalInfo,
  investInSavingsFund,
  requestWithdrawal,
} from "@/lib/valoriza-pages.functions";
import { backendRequest } from "@/lib/backend-client";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";

/* =========================================================================
   1. Deposit Modal (Matching PDF Page 6)
   ========================================================================= */

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses?: Record<string, string>;
  minDeposit?: number;
  onSuccess?: () => void;
}

export function DepositModal({ isOpen, onClose, addresses, minDeposit = 10, onSuccess }: DepositModalProps) {
  const { t, dir } = useI18n();
  const [network, setNetwork] = useState<"USDT-ERC20" | "USDT-BEP20" | "USDT-TRC20">("USDT-ERC20");
  const [amount, setAmount] = useState<string>("");
  const [proof, setProof] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentAddress = addresses?.[network.replace("USDT-", "")] ?? "";

  const handleCopy = () => {
    if (!currentAddress) {
      toast.error(t("common.error"));
      return;
    }
    void navigator.clipboard.writeText(currentAddress).then(() => {
      setCopied(true);
      toast.success(t("public.deposit.copied"));
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error(t("common.error")));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!Number.isFinite(num) || num < minDeposit) {
      toast.error(t("public.deposit.minimumError"));
      return;
    }
    if (!proof) {
      toast.error(t("deposit.uploadHint"));
      return;
    }
    if (!currentAddress) {
      toast.error(t("common.error"));
      return;
    }

    setSubmitting(true);
    try {
      const upload = await backendRequest<{
        uploadURL?: string;
        uploadUrl?: string;
        signedUrl?: string;
        objectPath?: string;
      }>("/api/app/deposit-proof/upload-url", {
        method: "POST",
        body: JSON.stringify({
          name: proof.name,
          size: proof.size,
          contentType: proof.type,
        }),
      });
      const uploadURL = upload.uploadURL ?? upload.uploadUrl ?? upload.signedUrl;
      if (!uploadURL || !upload.objectPath) {
        throw new Error("Deposit proof upload URL response is incomplete");
      }
      const uploaded = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": proof.type },
        body: proof,
      });
      if (!uploaded.ok) throw new Error(`Deposit proof upload failed: ${uploaded.status}`);
      const result = await backendRequest<{ ok?: boolean; reason?: string }>("/api/app/deposit", {
        method: "POST",
        body: JSON.stringify({ network, amount: num, objectPath: upload.objectPath }),
      });
      if (!result.ok) {
        if (result.reason === "BELOW_MIN_DEPOSIT") toast.error(t("public.deposit.minimumError"));
        else if (result.reason === "SCREENSHOT_REQUIRED") toast.error(t("deposit.uploadHint"));
        else toast.error(t("public.deposit.error"));
        return;
      }
      toast.success(`${t("public.deposit.success")} (${t("records.pending")})`);
      setAmount("");
      setProof(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Deposit submission failed", error);
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
          {(["USDT-ERC20", "USDT-BEP20", "USDT-TRC20"] as const).map((net) => {
            const displayNetwork = net.replace("USDT-", "");
            const isSelected = network === net;
            return (
              <button
                key={displayNetwork}
                id={`deposit-net-${displayNetwork}`}
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
                  <span className="mt-1.5 text-xs font-bold text-foreground">{net}</span>
                <span className="text-[10px] text-muted-foreground">{displayNetwork}</span>
              </button>
            );
          })}
        </div>

        {/* Deposit Address Box matching Page 6 */}
        <div className="mt-4 surface-card p-3.5 glow-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">{t("public.deposit.address")}</span>
            <span className="text-[10px] text-cyan-glow font-semibold">
               {t("public.deposit.network").replace("{network}", network.replace("USDT-", ""))}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-navy-deep border border-border/70 p-2.5">
            <code className="text-[11px] text-foreground font-mono truncate select-all" dir="ltr">
              {currentAddress || t("common.error")}
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
                min={minDeposit}
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

          <div className="space-y-2">
            <label className="block text-xs font-bold text-foreground">{t("deposit.proof")}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                  toast.error(t("deposit.invalidImage"));
                  event.target.value = "";
                  return;
                }
                if (file.size > 5 * 1024 * 1024) {
                  toast.error(t("deposit.fileTooLarge"));
                  event.target.value = "";
                  return;
                }
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setProof(file);
                setPreviewUrl(URL.createObjectURL(file));
              }}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-2 file:text-xs file:font-bold file:text-foreground"
            />
            {previewUrl && <img src={previewUrl} alt={t("deposit.previewAlt")} className="max-h-36 rounded-xl object-contain" />}
          </div>

          <button
            id="submit-deposit-btn"
            type="submit"
            disabled={submitting || !proof || !currentAddress}
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
  balance,
  existingAddress,
  onSuccess,
}: WithdrawalModalProps) {
  const { t, dir } = useI18n();
  const qc = useQueryClient();
  const [network, setNetwork] = useState<"ERC20" | "BEP20" | "TRC20">("ERC20");
  const [addressInput, setAddressInput] = useState("");
  const [amount, setAmount] = useState<string>("");
  const withdrawalInfoQuery = useQuery({
    queryKey: ["withdrawal-info"],
    queryFn: getWithdrawalInfo,
    enabled: isOpen,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const info = withdrawalInfoQuery.data as any;
  const boundAddress = info?.boundAddress ?? existingAddress ?? null;
  const isLocked = Boolean(boundAddress?.locked && boundAddress?.address);
  const activeNetwork = boundAddress?.network ?? "ERC20";
  const availableBalance = Number(info?.balance ?? balance ?? 0);
  const feePercent = Number(info?.settings?.feePercent ?? 10);
  const minWithdrawal = Number(info?.settings?.minWithdrawal ?? 6);

  useEffect(() => {
    if (boundAddress?.address) {
      setAddressInput(boundAddress.address);
      if (["ERC20", "BEP20", "TRC20"].includes(boundAddress.network)) {
        setNetwork(boundAddress.network);
      }
    } else if (info) {
      setAddressInput("");
    }
  }, [boundAddress?.address, boundAddress?.network, info]);

  const numAmount = parseFloat(amount) || 0;
  const feeAmount = (numAmount * feePercent) / 100;
  const netAmount = Math.max(0, numAmount - feeAmount);

  const bindMutation = useMutation({
    mutationFn: bindWithdrawalAddress,
    onSuccess: (result: any) => {
      if (result?.ok) {
        toast.success(t("public.withdraw.bindSuccess"));
        qc.invalidateQueries({ queryKey: ["withdrawal-info"] });
      } else {
        toast.error(t("public.withdraw.error"));
      }
    },
    onError: () => toast.error(t("public.withdraw.error")),
  });

  const withdrawalMutation = useMutation({
    mutationFn: requestWithdrawal,
    onSuccess: (result: any) => {
      if (result?.ok) {
        toast.success(
          t("public.withdraw.success").replace("{amount}", Number(result.netAmount ?? netAmount).toFixed(2)),
        );
        setAmount("");
        qc.invalidateQueries({ queryKey: ["withdrawal-info"] });
        qc.invalidateQueries({ queryKey: ["financial-records"] });
        qc.invalidateQueries({ queryKey: ["account"] });
        qc.invalidateQueries({ queryKey: ["home"] });
        onSuccess?.();
        onClose();
      } else if (result?.reason === "INSUFFICIENT_BALANCE") {
        toast.error(t("public.withdraw.insufficient"));
      } else if (result?.reason === "BELOW_MIN_WITHDRAWAL") {
        toast.error(t("public.withdraw.minimumError"));
      } else if (result?.reason === "ADDRESS_MISMATCH") {
        toast.error(t("withdraw.addressMismatch"));
      } else {
        toast.error(t("public.withdraw.error"));
      }
    },
    onError: () => toast.error(t("public.withdraw.error")),
  });

  if (!isOpen) return null;

  const handleBindAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim() || addressInput.trim().length < 15) {
      toast.error(t("public.withdraw.invalidAddress"));
      return;
    }
    bindMutation.mutate({ network, address: addressInput.trim() });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) {
      toast.error(t("public.withdraw.bindFirst"));
      return;
    }
    if (numAmount < minWithdrawal) {
      toast.error(t("public.withdraw.minimumError"));
      return;
    }
    if (numAmount > availableBalance) {
      toast.error(t("public.withdraw.insufficient"));
      return;
    }

    if (!isLocked || network !== activeNetwork || addressInput.trim() !== boundAddress?.address) {
      toast.error(t("withdraw.addressMismatch"));
      return;
    }
    withdrawalMutation.mutate({ network, address: boundAddress.address, amount: numAmount });
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
                 {t("public.withdraw.balance")} <span className="text-gold font-bold">${availableBalance.toFixed(2)}</span>
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
                disabled={isLocked}
                onClick={() => setNetwork(net)}
                className={`relative flex flex-col items-center justify-center rounded-2xl border p-3 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
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
              disabled={isLocked || withdrawalInfoQuery.isLoading}
              dir="ltr"
              className="w-full rounded-xl border border-border bg-navy px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none disabled:opacity-75"
            />
            {!isLocked ? (
              <button
                id="bind-address-btn"
                type="button"
                onClick={handleBindAddress}
                disabled={
                  bindMutation.isPending ||
                  withdrawalInfoQuery.isLoading ||
                  withdrawalInfoQuery.isError
                }
                className="shrink-0 rounded-xl brand-gradient px-3 py-2 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {bindMutation.isPending ? t("withdraw.binding") : t("public.withdraw.bind")}
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
                min={minWithdrawal}
                max={availableBalance}
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
            disabled={withdrawalMutation.isPending || !isLocked || withdrawalInfoQuery.isLoading}
            className="w-full rounded-2xl brand-gradient py-3.5 text-sm font-extrabold text-primary-foreground shadow-glow active:scale-[0.99] disabled:opacity-50"
          >
            {withdrawalMutation.isPending ? t("public.withdraw.submitting") : t("public.withdraw.submit")}
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
}

export function SavingsFundModal({ isOpen, onClose }: SavingsFundModalProps) {
  const { t, dir } = useI18n();
  const content = useLocalizedContent();
  const qc = useQueryClient();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const investmentQuery = useQuery({
    queryKey: ["investment"],
    queryFn: getInvestmentData,
    enabled: isOpen,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const investmentData = investmentQuery.data as any;
  const funds = investmentData?.funds ?? [];
  const balance = Number(investmentData?.wallet?.balance ?? investmentData?.walletBalance ?? 0);
  const lowestMinimum = funds.length
    ? Math.min(...funds.map((fund: any) => Number(fund.minAmount ?? fund.min_amount ?? 0)))
    : null;
  const investMutation = useMutation({
    mutationFn: (values: { fundId: string; amount: number; name: string }) =>
      investInSavingsFund({ fundId: values.fundId, amount: values.amount }),
    onSuccess: (result: any, values) => {
      if (result?.ok) {
        const expectedProfit = result.expectedProfit ?? result.expected_profit;
        if (expectedProfit !== undefined && expectedProfit !== null && Number.isFinite(Number(expectedProfit))) {
          toast.success(
            t("investment.investSuccess")
              .replace("{fund}", values.name)
              .replace("{profit}", `$${Number(expectedProfit).toFixed(2)}`),
          );
        } else {
          toast.success(t("common.success"));
        }
        setAmounts((current) => ({ ...current, [values.fundId]: "" }));
        qc.invalidateQueries({ queryKey: ["investment"] });
        qc.invalidateQueries({ queryKey: ["home"] });
        qc.invalidateQueries({ queryKey: ["account"] });
        qc.invalidateQueries({ queryKey: ["financial-records"] });
      } else if (result?.reason === "INSUFFICIENT_BALANCE") {
        toast.error(t("investment.insufficientFunds"));
      } else if (result?.reason === "BELOW_MIN_AMOUNT") {
        toast.error(t("investment.belowMin").replace("{amount}", String(result.minAmount)));
      } else {
        toast.error(t("investment.investError"));
      }
    },
    onError: () => toast.error(t("investment.processError")),
  });

  if (!isOpen) return null;

  const fieldVariants = (fund: any, field: string) => ({
    ar: fund[`${field}Ar`] ?? fund[`${field}_ar`] ?? fund[field]?.ar,
    en: fund[`${field}En`] ?? fund[`${field}_en`] ?? fund[field]?.en ?? fund[field],
    fr: fund[`${field}Fr`] ?? fund[`${field}_fr`] ?? fund[field]?.fr,
    es: fund[`${field}Es`] ?? fund[`${field}_es`] ?? fund[field]?.es,
  });
  const handleInvest = (event: React.FormEvent, fund: any) => {
    event.preventDefault();
    const minimum = Number(fund.minAmount ?? fund.min_amount ?? 0);
    const amount = Number(amounts[fund.id] ?? minimum);
    if (!Number.isFinite(amount) || amount < minimum) {
      toast.error(t("investment.minAmountError").replace("{amount}", String(minimum)));
      return;
    }
    if (amount > balance) {
      toast.error(t("investment.balanceTooLow"));
      return;
    }
    investMutation.mutate({
      fundId: fund.id,
      amount,
      name: content(fieldVariants(fund, "name")),
    });
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
          <p className="mt-1 text-xs font-bold text-foreground">{t("investment.availableBalance")}</p>
          <p className="mt-1 text-[11px] text-gold">
            {investmentQuery.isLoading
              ? t("common.loading")
              : investmentQuery.isError
                ? t("common.error")
                : `$${balance.toFixed(2)}`}
          </p>
        </div>

        {/* Funds List matching Page 3 */}
        <div className="mt-4 space-y-3">
          {investmentQuery.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : investmentQuery.isError ? (
            <p className="py-6 text-center text-sm text-danger">{t("common.error")}</p>
          ) : funds.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("investment.unavailable")}</p>
          ) : funds.map((fund: any) => {
            const minimum = Number(fund.minAmount ?? fund.min_amount ?? 0);
            const durationDays = Number(fund.durationDays ?? fund.duration_days ?? 0);
            const profitPercent = Number(fund.profitPercent ?? fund.profit_percent ?? 0);
            const fundName = content(fieldVariants(fund, "name"));
            return (
            <div
              key={fund.id}
              className="surface-card glow-border p-3.5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface border border-primary/40 text-cyan-glow font-bold text-xs">
                  {content(fund.code, { allowLanguageNeutral: true })}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-foreground">{fundName}</h4>
                  <p className="text-[11px] text-muted-foreground">{content(fieldVariants(fund, "tagline"))}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-cyan-glow">
                      <Clock className="h-3.5 w-3.5" />
                      {t("public.fund.duration")} <b>{durationDays} {t("public.fund.days")}</b>
                    </span>
                    <span className="flex items-center gap-1 text-success font-bold">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {t("public.fund.profit")} {profitPercent}%
                    </span>
                  </div>
                </div>
              </div>
              <form onSubmit={(event) => handleInvest(event, fund)} className="flex gap-2">
                <input
                  type="number"
                  min={minimum}
                  max={balance}
                  step="0.01"
                  value={amounts[fund.id] ?? ""}
                  onChange={(event) => setAmounts((current) => ({ ...current, [fund.id]: event.target.value }))}
                  placeholder={t("investment.minPlaceholder").replace("{amount}", String(minimum))}
                  className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground"
                  required
                />
                <button
                  type="submit"
                  disabled={investMutation.isPending || balance < minimum}
                  className="shrink-0 rounded-xl gold-gradient px-4 py-2 text-xs font-extrabold text-navy-deep shadow-gold-glow hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {investMutation.isPending ? t("common.loading") : t("investment.investNow")}
                </button>
              </form>
            </div>
          );})}
        </div>

        {/* Min investment note matching Page 3 */}
        {lowestMinimum !== null && (
          <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/10 p-3 text-center text-xs font-bold text-gold flex items-center justify-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            <span>{t("investment.minAmount")}: ${lowestMinimum}</span>
          </div>
        )}
      </div>
    </div>
  );
}
