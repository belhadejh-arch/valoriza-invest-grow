import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
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

export const Route = createFileRoute("/_authenticated/withdrawal")({
  head: () => ({
    meta: [
      { title: "السحب — Valoriza" },
      { name: "description", content: "سحب أرباحك ورصيدك إلى محفظتك الرقمية بأمان وبأقل رسوم." },
      { property: "og:title", content: "السحب — Valoriza" },
      { property: "og:description", content: "سحب الرصيد في منصة Valoriza." },
    ],
  }),
  component: WithdrawalPage,
});

const money = (n: number) => `$${n.toFixed(2)}`;

function WithdrawalPage() {
  const qc = useQueryClient();
  const [network, setNetwork] = useState<"ERC20" | "BEP20" | "TRC20">("ERC20");
  const [addressInput, setAddressInput] = useState("");
  const [amount, setAmount] = useState<string>("");

  const fetchWithdrawalInfo = useServerFn(getWithdrawalInfo);
  const fetchRecords = useServerFn(getUserFinancialRecords);
  const bindAddressFn = useServerFn(bindWithdrawalAddress);
  const submitWithdrawalFn = useServerFn(requestWithdrawal);

  const { data: info, isLoading: infoLoading } = useQuery({
    queryKey: ["withdrawal-info"],
    queryFn: () => fetchWithdrawalInfo(),
  });

  const { data: recordsData } = useQuery({
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
      bindAddressFn({ data: vals }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("تم ربط وقفل عنوان السحب بحسابك بنجاح وحمايته من التغيير.");
        qc.invalidateQueries({ queryKey: ["withdrawal-info"] });
      } else {
        toast.error(res.message || "تعذر ربط عنوان المحفظة");
      }
    },
    onError: () => toast.error("حدث خطأ أثناء ربط العنوان"),
  });

  const withdrawMutation = useMutation({
    mutationFn: (vals: { network: "ERC20" | "BEP20" | "TRC20"; address: string; amount: number }) =>
      submitWithdrawalFn({ data: vals }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(
          `تم تقديم طلب السحب بمبلغ صافي ${money(res.netAmount)} بعد خصم رسوم (${feePercent}%). سيتم الإرسال بعد الفحص.`,
        );
        setAmount("");
        qc.invalidateQueries({ queryKey: ["withdrawal-info"] });
        qc.invalidateQueries({ queryKey: ["financial-records"] });
        qc.invalidateQueries({ queryKey: ["account"] });
      } else {
        if (res.reason === "INSUFFICIENT_BALANCE") {
          toast.error("رصيدك المتاح غير كافٍ لإتمام السحب");
        } else if (res.reason === "BELOW_MIN_WITHDRAWAL") {
          toast.error(`الحد الأدنى للسحب هو ${minWithdrawal} دولارات`);
        } else if (res.reason === "ADDRESS_MISMATCH") {
          toast.error(res.message);
        } else {
          toast.error("تعذر معالجة طلب السحب حالياً");
        }
      }
    },
    onError: () => toast.error("حدث خطأ في الخادم أثناء تقديم السحب"),
  });

  const handleBind = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim() || addressInput.trim().length < 15) {
      toast.error("يرجى إدخال عنوان محفظة صحيح لا يقل عن 15 حرفاً");
      return;
    }
    bindMutation.mutate({ network, address: addressInput.trim() });
  };

  const handleSubmitWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) {
      toast.error("يرجى إدخال وربط عنوان السحب أولاً");
      return;
    }
    if (numAmount < minWithdrawal) {
      toast.error(`الحد الأدنى للسحب هو ${minWithdrawal} دولارات`);
      return;
    }
    if (numAmount > balance) {
      toast.error("رصيدك الحالي غير كافٍ لتغطية مبلغ السحب");
      return;
    }
    withdrawMutation.mutate({
      network,
      address: addressInput.trim(),
      amount: numAmount,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-28" dir="rtl">
      <AppHeader />

      <main className="mx-auto w-full max-w-lg px-4 pt-4">
        {/* Navigation Breadcrumb */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/account"
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للحساب</span>
          </Link>
          <div className="flex items-center gap-1 text-xs font-extrabold text-gold">
            <Wallet className="h-3.5 w-3.5" />
            <span>الرصيد: {infoLoading ? "..." : money(balance)}</span>
          </div>
        </div>

        {/* Page Title Card matching PDF Page 7 */}
        <section className="surface-card glow-border p-5 text-center relative overflow-hidden">
          <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-electric/10 blur-2xl pointer-events-none" />
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface border border-electric/40 text-cyan-glow mb-2 shadow-glow">
            <ArrowUpRight className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground">السحب</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            سحب رصيدك إلى محفظتك الرقمية المعتمدة
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-gold/40 bg-surface/80 px-4 py-1.5">
            <span className="text-xs text-muted-foreground">الرصيد القابل للسحب:</span>
            <span className="text-base font-extrabold text-gold-gradient">{money(balance)}</span>
          </div>
        </section>

        {/* Network Selector matching PDF Page 7 */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-foreground mb-2">اختر شبكة السحب</label>
          <div className="grid grid-cols-3 gap-2">
            {(["ERC20", "BEP20", "TRC20"] as const).map((net) => {
              const isSelected = network === net;
              return (
                <button
                  key={net}
                  id={`btn-withdraw-net-${net}`}
                  type="button"
                  disabled={isAddressLocked}
                  onClick={() => setNetwork(net)}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border p-3 transition-all ${
                    isSelected
                      ? "border-cyan-glow bg-surface shadow-[0_0_15px_oklch(0.82_0.14_205/0.25)] ring-1 ring-cyan-glow/50"
                      : "border-border/60 bg-navy hover:bg-surface/50"
                  } ${isAddressLocked && !isSelected ? "opacity-40 cursor-not-allowed" : ""}`}
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
        </div>

        {/* Address Binding Card matching PDF Page 7 & Page 8 Rule 1 */}
        <div className="mt-4 surface-card p-4 glow-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-gold" />
              <span>ربط عنوان المحفظة</span>
            </span>
            {isAddressLocked ? (
              <span className="rounded-full bg-success/20 border border-success/40 px-2.5 py-0.5 text-[10px] font-bold text-success flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> مقفل ومحمي
              </span>
            ) : (
              <span className="text-[10px] text-gold font-bold">مطلوب للربط</span>
            )}
          </div>

          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            {isAddressLocked
              ? "عنوانك مسجل ومقفل لحماية أموالك من أي محاولة تغيير غير مصرح بها."
              : "قم بإدخال عنوان محفظتك ثم اضغط (ربط) لحفظه بحسابك بصورة دائمة."}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <input
              id="withdraw-address-field"
              type="text"
              placeholder="أدخل عنوان المحفظة (يبدأ بـ 0x أو T)"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              disabled={isAddressLocked}
              dir="ltr"
              className="w-full rounded-xl border border-border bg-navy px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none disabled:opacity-80"
            />
            {!isAddressLocked ? (
              <button
                id="btn-bind-wallet-address"
                type="button"
                disabled={bindMutation.isPending}
                onClick={handleBind}
                className="shrink-0 rounded-xl brand-gradient px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-glow active:scale-95 transition-all"
              >
                {bindMutation.isPending ? "..." : "ربط 🔗"}
              </button>
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/20 text-success border border-success/30">
                <Check className="h-5 w-5" />
              </div>
            )}
          </div>

          {isAddressLocked ? (
            <p className="mt-2 text-[10px] text-cyan-glow/80 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 shrink-0" />
              <span>لا يمكن تغيير العنوان إلا بطلب رسمي من خلال خدمة العملاء.</span>
            </p>
          ) : (
            <p className="mt-2 text-[10px] text-gold/80 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3 shrink-0" />
              <span>تأكد من دقة العنوان، سيتم قفله بمجرد الربط أو السحب لأول مرة.</span>
            </p>
          )}
        </div>

        {/* Withdrawal Form */}
        <form onSubmit={handleSubmitWithdraw} className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-foreground">مبلغ السحب (USDT)</label>
              <button
                type="button"
                onClick={() => setAmount(balance > 0 ? balance.toString() : "0")}
                className="text-xs font-bold text-cyan-glow hover:underline"
              >
                سحب الكل ({money(balance)})
              </button>
            </div>

            <div className="relative">
              <input
                id="withdraw-amount-input"
                type="number"
                min={minWithdrawal}
                max={balance}
                step="0.01"
                placeholder={`الحد الأدنى ${minWithdrawal}$`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-navy px-4 py-3.5 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-gold">
                USDT
              </span>
            </div>
          </div>

          {/* Breakdown fee box matching PDF */}
          {numAmount > 0 && (
            <div className="rounded-2xl border border-border/80 bg-surface/70 p-3.5 text-xs space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>المبلغ المطلوب سحبه:</span>
                <span className="font-bold text-foreground">{money(numAmount)}</span>
              </div>
              <div className="flex justify-between text-danger">
                <span>رسوم المنصة ({feePercent}%):</span>
                <span className="font-bold">-{money(feeAmount)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-success border-t border-border/50 pt-2 text-sm">
                <span>صافي المبلغ المستلم:</span>
                <span className="text-gold-gradient">{money(netAmount)} USDT</span>
              </div>
            </div>
          )}

          <button
            id="submit-withdraw-button"
            type="submit"
            disabled={withdrawMutation.isPending || numAmount <= 0}
            className="w-full rounded-2xl brand-gradient py-3.5 text-sm font-extrabold text-primary-foreground shadow-glow active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {withdrawMutation.isPending ? "جاري المعالجة..." : "تقديم طلب السحب ✈"}
          </button>
        </form>

        {/* Important Notes matching PDF Page 7 */}
        <div className="mt-5 rounded-2xl border border-cyan-glow/30 bg-surface/70 p-4 text-xs leading-relaxed space-y-2.5">
          <div className="flex items-center gap-1.5 font-bold text-cyan-glow">
            <Info className="h-4 w-4 shrink-0" />
            <span>ملاحظات هامة:</span>
          </div>
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <Check className="h-3.5 w-3.5 text-success shrink-0" />
            <span>الحد الأدنى للسحب هو {minWithdrawal} دولارات.</span>
          </p>
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <Clock className="h-3.5 w-3.5 text-gold shrink-0" />
            <span>
              وقت السحب من الساعة {startHour} صباحاً إلى غاية {endHour} مساءً.
            </span>
          </p>
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <Coins className="h-3.5 w-3.5 text-cyan-glow shrink-0" />
            <span>رسوم السحب هي {feePercent}%.</span>
          </p>
        </div>

        {/* Recent Withdrawals History */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold text-foreground">سجل السحوبات الأخيرة</h2>
            <Link
              to="/records"
              search={{ tab: "withdrawals" }}
              className="text-xs font-bold text-cyan-glow hover:underline"
            >
              عرض الكل ›
            </Link>
          </div>

          {!recordsData?.withdrawals || recordsData.withdrawals.length === 0 ? (
            <div className="surface-card p-6 text-center text-xs text-muted-foreground">
              لا توجد طلبات سحب سابقة.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recordsData.withdrawals.slice(0, 5).map((w) => (
                <div
                  key={w.id}
                  className="surface-card p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-electric/40 text-cyan-glow font-bold">
                      ↑
                    </div>
                    <div>
                      <p className="font-extrabold text-foreground">
                        -{money(w.amount)}{" "}
                        <span className="text-[10px] text-muted-foreground">
                          (صافي: {money(w.netAmount)})
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(w.createdAt).toLocaleString("ar-EG", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  <div>
                    {w.status === "approved" ? (
                      <span className="rounded-full bg-success/20 border border-success/40 px-2.5 py-0.5 text-[10px] font-bold text-success">
                        تم التحويل بنجاح
                      </span>
                    ) : w.status === "rejected" ? (
                      <span className="rounded-full bg-danger/20 border border-danger/40 px-2.5 py-0.5 text-[10px] font-bold text-danger">
                        مرفوض
                      </span>
                    ) : (
                      <span className="rounded-full bg-gold/20 border border-gold/40 px-2.5 py-0.5 text-[10px] font-bold text-gold">
                        قيد المعالجة
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
