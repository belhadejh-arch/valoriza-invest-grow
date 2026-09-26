import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Coins,
  Info,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import {
  getWithdrawalInfo,
  bindWithdrawalAddress,
  requestWithdrawal,
  getUserFinancialRecords,
} from "@/lib/valoriza-pages.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/withdrawal")({
  component: WithdrawalPage,
});

const money = (n: number) => `$${n.toFixed(2)}`;

function WithdrawalPage() {
  const { t, isRTL } = useI18n();
  const qc = useQueryClient();
  const [network, setNetwork] = useState<"ERC20" | "BEP20" | "TRC20">("ERC20");
  const [addressInput, setAddressInput] = useState("");
  const [amount, setAmount] = useState<string>("");

  const fetchWithdrawalInfo = getWithdrawalInfo;
  const fetchRecords = getUserFinancialRecords;
  const bindAddressFn = bindWithdrawalAddress;
  const submitWithdrawalFn = requestWithdrawal;

  const { data: info, isLoading: isInfoLoading, isError: isInfoError } = useQuery({
    queryKey: ["withdrawal-info"],
    queryFn: () => fetchWithdrawalInfo(),
  });

  const { data: recordsData, isLoading: isRecordsLoading, isError: isRecordsError } = useQuery({
    queryKey: ["financial-records"],
    queryFn: () => fetchRecords(),
  });

  const balance = info?.balance ?? 0;
  const boundAddress = info?.boundAddress;
  const isAddressLocked = Boolean(boundAddress?.locked && boundAddress?.address);

  useEffect(() => {
    if (boundAddress?.address) {
      setAddressInput(boundAddress.address);
      if (boundAddress.network) {
        setNetwork(boundAddress.network as any);
      }
    }
  }, [boundAddress]);

  const minWithdrawal = info?.settings?.minWithdrawal ?? 6;
  const feePercent = info?.settings?.feePercent ?? 10;
  const startHour = info?.settings?.startHour ?? "09:00";
  const endHour = info?.settings?.endHour ?? "16:00";

  const numAmount = parseFloat(amount) || 0;
  const feeAmount = Math.round(((numAmount * feePercent) / 100) * 100) / 100;
  const netAmount = Math.max(0, Math.round((numAmount - feeAmount) * 100) / 100);

  const bindMutation = useMutation({
    mutationFn: (vals: { network: "ERC20" | "BEP20" | "TRC20"; address: string }) =>
      bindAddressFn(vals),
    onSuccess: (res: any) => {
      if (res.ok) {
        toast.success(t("withdraw.bindSuccess"));
        qc.invalidateQueries({ queryKey: ["withdrawal-info"] });
      } else {
        toast.error(t("common.error"));
      }
    },
    onError: () => toast.error(t("common.error")),
  });

  const withdrawMutation = useMutation({
    mutationFn: (vals: { network: "ERC20" | "BEP20" | "TRC20"; address: string; amount: number }) =>
      submitWithdrawalFn(vals),
    onSuccess: (res: any) => {
      if (res.ok) {
        toast.success(
          `${t("withdraw.receivable")}: ${money(res.netAmount)}. (${t("withdraw.fee")}: ${feePercent}%)`,
        );
        setAmount("");
        qc.invalidateQueries({ queryKey: ["withdrawal-info"] });
        qc.invalidateQueries({ queryKey: ["financial-records"] });
        qc.invalidateQueries({ queryKey: ["account"] });
      } else {
        if (res.reason === "INSUFFICIENT_BALANCE") {
           toast.error(t("withdraw.insufficientBalance"));
        } else if (res.reason === "BELOW_MIN_WITHDRAWAL") {
          toast.error(`${t("withdraw.minNotice")} (${minWithdrawal}$)`);
        } else if (res.reason === "ADDRESS_MISMATCH") {
           toast.error(t("withdraw.addressMismatch"));
        } else {
          toast.error(t("common.error"));
        }
      }
    },
    onError: () => toast.error(t("common.error")),
  });

  if (isInfoLoading || isRecordsLoading) {
    return (
      <div className="min-h-[100dvh] bg-background pb-28 text-foreground" dir={isRTL ? "rtl" : "ltr"}>
        <AppHeader />
        <div className="flex justify-center items-center h-64">
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (isInfoError || isRecordsError || !info || !recordsData) {
    return (
      <div className="min-h-[100dvh] bg-background pb-28 text-foreground" dir={isRTL ? "rtl" : "ltr"}>
        <AppHeader />
        <div className="flex justify-center items-center h-64">
          <p className="text-danger">{t("common.error")}</p>
        </div>
      </div>
    );
  }

  const handleBind = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim() || addressInput.trim().length < 15) {
      toast.error(t("withdraw.addressPlaceholder"));
      return;
    }
    bindMutation.mutate({ network, address: addressInput.trim() });
  };

  const handleSubmitWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) {
      toast.error(t("withdraw.addressPlaceholder"));
      return;
    }
    if (numAmount < minWithdrawal) {
      toast.error(`${t("withdraw.minNotice")} (${minWithdrawal}$)`);
      return;
    }
    if (numAmount > balance) {
      toast.error(t("common.error"));
      return;
    }
    withdrawMutation.mutate({
      network,
      address: addressInput.trim(),
      amount: numAmount,
    });
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div
      className="min-h-screen bg-background pb-28 md:pb-12 text-foreground"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/account"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <BackArrow className="h-4 w-4" />
            <span>{t("support.backToAccount")}</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-black text-gold">
            <Wallet className="h-4 w-4" />
            <span>
              {t("home.accountBalance")}: {money(balance)}
            </span>
          </div>
        </div>

        {/* Bento Grid: Form on Left (7 cols), Info & History on Right (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Column */}
          <div className="lg:col-span-7 space-y-5 text-start">
            {/* Network Selector */}
            <div className="surface-card glow-border p-5 rounded-3xl space-y-3">
              <label className="block text-xs font-black text-foreground">
                {t("withdraw.selectNetwork")}
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(["ERC20", "BEP20", "TRC20"] as const).map((net) => {
                  const isSelected = network === net;
                  return (
                    <button
                      key={net}
                      id={`btn-withdraw-net-${net}`}
                      type="button"
                      disabled={isAddressLocked}
                      onClick={() => setNetwork(net)}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border p-3.5 transition-all cursor-pointer ${
                        isSelected
                          ? "border-cyan-glow bg-surface shadow-glow ring-1 ring-cyan-glow/50"
                          : "border-border bg-surface/50 hover:bg-surface"
                      } ${isAddressLocked && !isSelected ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      {isSelected && (
                        <span className="absolute top-2 start-2 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-glow text-primary-foreground">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      )}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-sm font-black">
                        ₮
                      </div>
                      <span className="mt-2 text-xs font-black text-foreground">USDT-{net}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        ({net})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Address Binding Card */}
            <div className="surface-card glow-border p-5 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gold" />
                  <span>{t("account.walletBind")}</span>
                </span>
                {isAddressLocked ? (
                  <span className="rounded-full bg-success/20 border border-success/40 px-3 py-0.5 text-[10px] font-black text-success flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> {t("withdraw.walletLocked")}
                  </span>
                ) : (
                  <span className="text-[10px] text-gold font-bold">
                    {t("withdraw.bindingRequired")}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {isAddressLocked ? t("withdraw.lockedDesc") : t("withdraw.unlockedDesc")}
              </p>

              <div className="flex items-center gap-2">
                <input
                  id="withdraw-address-field"
                  type="text"
                  placeholder={t("withdraw.addressPlaceholder")}
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  disabled={isAddressLocked}
                  dir="ltr"
                  className="flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none disabled:opacity-80"
                />
                {!isAddressLocked ? (
                  <button
                    id="btn-bind-wallet-address"
                    type="button"
                    disabled={bindMutation.isPending}
                    onClick={handleBind}
                    className="shrink-0 rounded-2xl brand-gradient px-4 py-3 text-xs font-black text-primary-foreground shadow-glow active:scale-95 transition-all cursor-pointer"
                  >
                    {bindMutation.isPending ? t("withdraw.binding") : t("withdraw.bindBtn")}
                  </button>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-success/20 text-success border border-success/30">
                    <Check className="h-5 w-5" />
                  </div>
                )}
              </div>
            </div>

            {/* Withdrawal Amount & Submission */}
            <form
              onSubmit={handleSubmitWithdraw}
              className="surface-card glow-border p-5 rounded-3xl space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-foreground">
                    {t("withdraw.amount")}
                  </label>
                  <button
                    type="button"
                    onClick={() => setAmount(balance > 0 ? balance.toString() : "0")}
                    className="text-xs font-black text-cyan-glow hover:underline cursor-pointer"
                  >
                    {t("withdraw.withdrawAll")} ({money(balance)})
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="withdraw-amount-input"
                    type="number"
                    min={minWithdrawal}
                    max={balance}
                    step="0.01"
                    placeholder={`${t("withdraw.minNotice")} ${minWithdrawal}$`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm font-black text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
                  />
                  <span className="absolute end-4 top-1/2 -translate-y-1/2 text-xs font-black text-gold">
                    USDT
                  </span>
                </div>
              </div>

              {/* Fee breakdown calculation */}
              {numAmount > 0 && (
                <div className="rounded-2xl border border-border bg-surface p-4 text-xs space-y-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("withdraw.requestedAmount")}:</span>
                    <span className="font-black text-foreground">{money(numAmount)}</span>
                  </div>
                  <div className="flex justify-between text-danger">
                    <span>
                      {t("withdraw.platformFee")} ({feePercent}%):
                    </span>
                    <span className="font-black">-{money(feeAmount)}</span>
                  </div>
                  <div className="flex justify-between font-black text-success border-t border-border/60 pt-2.5 text-sm">
                    <span>{t("withdraw.receivable")}:</span>
                    <span className="text-gold-gradient font-black">{money(netAmount)} USDT</span>
                  </div>
                </div>
              )}

              <button
                id="submit-withdraw-button"
                type="submit"
                disabled={withdrawMutation.isPending || numAmount <= 0}
                className="w-full rounded-2xl brand-gradient py-3.5 text-sm font-black text-primary-foreground shadow-glow active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {withdrawMutation.isPending ? t("withdraw.submitting") : t("withdraw.submit")}
              </button>
            </form>
          </div>

          {/* Right Column: Balance Hero + Rules + Recent History */}
          <div className="lg:col-span-5 space-y-5 text-start">
            {/* Balance Hero Card */}
            <div className="surface-card glow-border p-6 rounded-3xl relative overflow-hidden shadow-xl text-center space-y-2">
              <div className="absolute -top-12 -end-12 h-32 w-32 rounded-full bg-cyan-glow/10 blur-2xl pointer-events-none" />
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface border border-cyan-glow/40 text-cyan-glow mb-1 shadow-glow">
                <ArrowUpRight className="h-6 w-6" />
              </div>
              <h2 className="text-sm font-black text-muted-foreground">
                {t("withdraw.withdrawableBalance")}
              </h2>
              <p className="text-3xl sm:text-4xl font-black text-gold-gradient tracking-tight">
                {money(balance)}
              </p>
            </div>

            {/* Important Notes Card */}
            <div className="surface-card glow-border p-5 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 font-black text-cyan-glow text-xs">
                <Info className="h-4 w-4 shrink-0" />
                <span>{t("withdraw.importantNotes")}</span>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-success shrink-0" />
                  <span>
                    {t("withdraw.minNotice")} ({minWithdrawal}$)
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-gold shrink-0" />
                  <span>
                    {t("withdraw.hoursNotice")} {startHour} - {endHour}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Coins className="h-3.5 w-3.5 text-cyan-glow shrink-0" />
                  <span>
                    {t("withdraw.platformFee")}: {feePercent}%
                  </span>
                </p>
              </div>
            </div>

            {/* Recent Withdrawals History */}
            <div className="surface-card glow-border p-5 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-foreground">
                  {t("withdraw.recentHistory")}
                </h3>
                <Link
                  to="/records"
                  search={{ tab: "withdrawals" }}
                  className="text-xs font-black text-cyan-glow hover:underline"
                >
                  {t("withdraw.viewAll")} ›
                </Link>
              </div>

              {!recordsData?.withdrawals || recordsData.withdrawals.length === 0 ? (
                <p className="text-center py-6 text-xs text-muted-foreground">
                  {t("withdraw.noHistory")}
                </p>
              ) : (
                <div className="space-y-2">
                  {recordsData.withdrawals.slice(0, 4).map((w: any) => (
                    <div
                      key={w.id}
                      className="surface-card p-3 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-black text-foreground">
                          -{money(w.amount)}{" "}
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            ({money(w.netAmount)})
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(w.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {w.status === "approved" ? (
                          <span className="rounded-full bg-success/20 border border-success/40 px-2.5 py-0.5 text-[10px] font-black text-success">
                            {t("records.completed")}
                          </span>
                        ) : w.status === "rejected" ? (
                          <span className="rounded-full bg-danger/20 border border-danger/40 px-2.5 py-0.5 text-[10px] font-black text-danger">
                            {t("records.rejected")}
                          </span>
                        ) : (
                          <span className="rounded-full bg-gold/20 border border-gold/40 px-2.5 py-0.5 text-[10px] font-black text-gold">
                            {t("records.pending")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
