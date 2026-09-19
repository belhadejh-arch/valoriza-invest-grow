import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowRight,
  Check,
  Clock,
  Copy,
  Info,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import {
  createDepositRequest,
  getCompanySettingsAndSupport,
  getUserFinancialRecords,
} from "@/lib/valoriza-pages.functions";

export const Route = createFileRoute("/_authenticated/deposit")({
  head: () => ({
    meta: [
      { title: "الإيداع — Valoriza" },
      {
        name: "description",
        content: "شحن رصيد حسابك بالدولار الرقمي USDT عبر شبكات ERC20, BEP20, TRC20.",
      },
      { property: "og:title", content: "الإيداع — Valoriza" },
      { property: "og:description", content: "شحن الرصيد في منصة Valoriza." },
    ],
  }),
  component: DepositPage,
});

const money = (n: number) => `$${n.toFixed(2)}`;

function DepositPage() {
  const qc = useQueryClient();
  const [network, setNetwork] = useState<"ERC20" | "BEP20" | "TRC20">("ERC20");
  const [amount, setAmount] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const fetchSettings = useServerFn(getCompanySettingsAndSupport);
  const fetchRecords = useServerFn(getUserFinancialRecords);
  const submitDeposit = useServerFn(createDepositRequest);

  const { data: configData } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => fetchSettings(),
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ["financial-records"],
    queryFn: () => fetchRecords(),
  });

  const depositAddresses: Record<string, string> = {
    ERC20:
      configData?.settings?.["deposit_address_ERC20"] ||
      "0x71a9c2e4d8b6f9a5c1e2d3f4a5b6c7d8e9f0a1b2",
    BEP20:
      configData?.settings?.["deposit_address_BEP20"] ||
      "0x71a9c2e4d8b6f9a5c1e2d3f4a5b6c7d8e9f0a1b2",
    TRC20: configData?.settings?.["deposit_address_TRC20"] || "TQn9Y2khDD95J42FQtQTdwVVRZq5YxZ8Xk",
  };

  const currentAddress = depositAddresses[network];
  const minDeposit = Number(configData?.settings?.["min_deposit"] ?? "10");

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(currentAddress);
      setCopied(true);
      toast.success("تم نسخ عنوان الإيداع بنجاح");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذر النسخ، يرجى نسخ العنوان يدوياً");
    }
  };

  const depositMutation = useMutation({
    mutationFn: (vals: { network: "ERC20" | "BEP20" | "TRC20"; amount: number; txHash?: string }) =>
      submitDeposit({ data: vals }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("تم تقديم طلب الإيداع بنجاح! سيتم مراجعته وتأكيد الرصيد بعد الفحص.");
        setAmount("");
        setTxHash("");
        qc.invalidateQueries({ queryKey: ["financial-records"] });
      } else {
        toast.error("تعذر إتمام الطلب: المبلغ أقل من الحد الأدنى");
      }
    },
    onError: () => toast.error("حدث خطأ أثناء معالجة الطلب"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num < minDeposit) {
      toast.error(`الحد الأدنى للإيداع هو ${minDeposit} دولارات`);
      return;
    }
    depositMutation.mutate({
      network,
      amount: num,
      txHash: txHash.trim() || undefined,
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
          <span className="text-xs font-extrabold text-cyan-glow flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> بوابة إيداع آمنة
          </span>
        </div>

        {/* Page Title Card matching PDF Page 6 */}
        <section className="surface-card glow-border p-5 text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-cyan-glow/10 blur-2xl pointer-events-none" />
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface border border-gold/40 text-gold mb-2 shadow-glow">
            <ArrowDownLeft className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground">الإيداع</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            شحن الرصيد الفوري عبر شبكات العملات الرقمية المستقرة USDT
          </p>
        </section>

        {/* Network Selection matching PDF Page 6 */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-foreground mb-2">اختر شبكة الإيداع</label>
          <div className="grid grid-cols-3 gap-2">
            {(["ERC20", "BEP20", "TRC20"] as const).map((net) => {
              const isSelected = network === net;
              return (
                <button
                  key={net}
                  id={`btn-network-${net}`}
                  type="button"
                  onClick={() => setNetwork(net)}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border p-3 transition-all ${
                    isSelected
                      ? "border-cyan-glow bg-surface shadow-[0_0_15px_oklch(0.82_0.14_205/0.25)] ring-1 ring-cyan-glow/50"
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
        </div>

        {/* Deposit Address Box matching PDF Page 6 */}
        <div className="mt-4 surface-card p-4 glow-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">عنوان المحفظة للإيداع</span>
            <span className="text-[11px] text-cyan-glow font-bold">شبكة {network}</span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-navy-deep border border-border/80 p-3">
            <code className="text-[11px] text-foreground font-mono truncate select-all" dir="ltr">
              {currentAddress}
            </code>
            <button
              id="copy-deposit-address"
              type="button"
              onClick={copyAddress}
              className="flex shrink-0 items-center gap-1.5 rounded-xl brand-gradient px-3 py-2 text-xs font-bold text-primary-foreground shadow-glow active:scale-95 transition-all"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "تم النسخ" : "نسخ"}</span>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-surface/50 py-2 text-xs text-cyan-glow font-medium border border-cyan-glow/20">
            <QrCode className="h-4 w-4" />
            <span>امسح رمز الاستجابة السريعة (QR) أو انسخ العنوان للتحويل</span>
          </div>
        </div>

        {/* Deposit Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              مبلغ الإيداع (USDT)
            </label>
            <div className="relative">
              <input
                id="deposit-amount-input"
                type="number"
                min={minDeposit}
                step="0.01"
                placeholder={`أدخل المبلغ (الحد الأدنى ${minDeposit}$)`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-navy px-4 py-3.5 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-gold">
                USDT
              </span>
            </div>

            {/* Presets */}
            <div className="mt-2 flex items-center gap-2">
              {[10, 50, 100, 250, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className="rounded-xl border border-border/70 bg-surface/60 px-2.5 py-1 text-xs font-bold text-muted-foreground hover:text-cyan-glow hover:border-cyan-glow/50 transition-colors"
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              معرّف المعاملة TXID (اختياري لتسريع التأكيد)
            </label>
            <input
              id="deposit-txhash-input"
              type="text"
              placeholder="ضع رمز تجزئة التحويل (Hash/TxID) هنا"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              dir="ltr"
              className="w-full rounded-2xl border border-border bg-navy px-4 py-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
            />
          </div>

          <button
            id="submit-deposit-button"
            type="submit"
            disabled={depositMutation.isPending}
            className="w-full rounded-2xl brand-gradient py-3.5 text-sm font-extrabold text-primary-foreground shadow-glow active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {depositMutation.isPending ? (
              <span>جاري تقديم الطلب...</span>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>تقديم طلب الإيداع</span>
              </>
            )}
          </button>
        </form>

        {/* Important Notes matching PDF Page 6 */}
        <div className="mt-5 rounded-2xl border border-cyan-glow/30 bg-surface/70 p-4 text-xs leading-relaxed space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-cyan-glow">
            <Info className="h-4 w-4 shrink-0" />
            <span>ملاحظات هامة:</span>
          </div>
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <Check className="h-3.5 w-3.5 text-success shrink-0" />
            <span>الإيداع متاح على مدار 24 ساعة يومياً.</span>
          </p>
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <Check className="h-3.5 w-3.5 text-success shrink-0" />
            <span>الحد الأدنى للإيداع هو {minDeposit} دولارات.</span>
          </p>
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            <Clock className="h-3.5 w-3.5 text-gold shrink-0" />
            <span>يتم التأكيد وإضافة الرصيد بمجرد مراجعة العملية عبر البلوكشين.</span>
          </p>
        </div>

        {/* Recent Deposits History */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold text-foreground">سجل الإيداعات الأخيرة</h2>
            <Link
              to="/records"
              search={{ tab: "deposits" }}
              className="text-xs font-bold text-cyan-glow hover:underline"
            >
              عرض الكل ›
            </Link>
          </div>

          {recordsLoading ? (
            <p className="py-6 text-center text-xs text-muted-foreground">جارٍ التحميل...</p>
          ) : !recordsData?.deposits || recordsData.deposits.length === 0 ? (
            <div className="surface-card p-6 text-center text-xs text-muted-foreground">
              لا توجد طلبات إيداع سابقة حتى الآن.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recordsData.deposits.slice(0, 5).map((dep) => (
                <div
                  key={dep.id}
                  className="surface-card p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-emerald-500/40 text-emerald-400 font-bold">
                      ₮
                    </div>
                    <div>
                      <p className="font-extrabold text-foreground">
                        +{money(dep.amount)}{" "}
                        <span className="text-[10px] text-muted-foreground">
                          USDT-{dep.network}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(dep.createdAt).toLocaleString("ar-EG", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  <div>
                    {dep.status === "approved" ? (
                      <span className="rounded-full bg-success/20 border border-success/40 px-2.5 py-0.5 text-[10px] font-bold text-success">
                        مكتمل ومؤكد
                      </span>
                    ) : dep.status === "rejected" ? (
                      <span className="rounded-full bg-danger/20 border border-danger/40 px-2.5 py-0.5 text-[10px] font-bold text-danger">
                        مرفوض
                      </span>
                    ) : (
                      <span className="rounded-full bg-gold/20 border border-gold/40 px-2.5 py-0.5 text-[10px] font-bold text-gold">
                        قيد المراجعة
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
