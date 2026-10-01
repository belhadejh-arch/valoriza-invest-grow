import { useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Headphones,
  Image as ImageIcon,
  Info,
  QrCode,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { createDepositRequest, getCompanySettingsAndSupport } from "@/lib/valoriza-pages.functions";
import { useI18n } from "@/lib/i18n";

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

type NetworkType = "USDT-ERC20" | "USDT-BEP20" | "USDT-TRC20";

function DepositPage() {
  const { t, isRTL } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [network, setNetwork] = useState<NetworkType>("USDT-ERC20");
  const [amount, setAmount] = useState<string>("");
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const fetchSettings = useServerFn(getCompanySettingsAndSupport);
  const submitDeposit = useServerFn(createDepositRequest);

  const { data: configData } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => fetchSettings(),
  });

  const depositAddresses: Record<NetworkType, string> = {
    "USDT-ERC20":
      configData?.settings?.["deposit_address_ERC20"] ||
      "0x71a9c2e4d8b6f9a5c1e2d3f4a5b6c7d8e9f0a1b2",
    "USDT-BEP20":
      configData?.settings?.["deposit_address_BEP20"] ||
      "0x71a9c2e4d8b6f9a5c1e2d3f4a5b6c7d8e9f0a1b2",
    "USDT-TRC20":
      configData?.settings?.["deposit_address_TRC20"] || "TQn9Y2khDD95J42FQtQTdwVVRZq5YxZ8Xk",
  };

  const currentAddress = depositAddresses[network];
  const minDeposit = Number(configData?.settings?.["min_deposit"] ?? "10");

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(currentAddress);
      setCopied(true);
      toast.success(t("deposit.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("deposit.uploadHint"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("common.error"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotPreview(reader.result as string);
      toast.success(t("deposit.proof"));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const depositMutation = useMutation({
    mutationFn: (vals: { network: NetworkType; amount: number; screenshotUrl: string }) =>
      submitDeposit({ data: vals }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(t("deposit.note"));
        setAmount("");
        setScreenshotPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        qc.invalidateQueries({ queryKey: ["financial-records"] });
        qc.invalidateQueries({ queryKey: ["user-wallet"] });
        qc.invalidateQueries({ queryKey: ["account"] });
        setTimeout(() => {
          navigate({ to: "/account" });
        }, 1200);
      } else if (res.reason === "SCREENSHOT_REQUIRED") {
        toast.error(t("deposit.uploadHint"));
      } else if (res.reason === "BELOW_MIN_DEPOSIT") {
        toast.error(`${t("deposit.minNotice")} (${minDeposit}$)`);
      } else {
        toast.error(t("common.error"));
      }
    },
    onError: () => toast.error(t("common.error")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);

    if (isNaN(num) || num < minDeposit) {
      toast.error(`${t("deposit.minNotice")} (${minDeposit}$)`);
      return;
    }

    if (!screenshotPreview) {
      toast.error(t("deposit.uploadHint"));
      return;
    }

    depositMutation.mutate({
      network,
      amount: num,
      screenshotUrl: screenshotPreview,
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
          <Link
            to="/support"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gold hover:underline"
          >
            <Headphones className="h-4 w-4" />
            <span>{t("home.support")}</span>
          </Link>
        </div>

        {/* Bento Grid: Form on Left (7 cols), Notes & QR on Right (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Column */}
          <div className="lg:col-span-7 space-y-5 text-start">
            {/* Network Selection */}
            <div className="surface-card glow-border p-5 rounded-3xl space-y-3">
              <label className="block text-xs font-black text-foreground">
                {t("deposit.network")}
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(
                  [
                    { key: "USDT-ERC20", label: "ERC20", dotColor: "bg-indigo-400" },
                    { key: "USDT-BEP20", label: "BEP20", dotColor: "bg-yellow-400" },
                    { key: "USDT-TRC20", label: "TRC20", dotColor: "bg-red-500" },
                  ] as const
                ).map((item) => {
                  const isSelected = network === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setNetwork(item.key)}
                      className={`relative flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-cyan-glow bg-surface shadow-glow ring-1 ring-cyan-glow/50"
                          : "border-border bg-surface/50 hover:bg-surface"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2 start-2 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-glow text-primary-foreground">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      )}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mb-1.5 font-black text-sm">
                        ₮
                      </div>
                      <span className="text-xs font-black text-foreground">{item.key}</span>
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground font-semibold">
                        <span className={`h-2 w-2 rounded-full ${item.dotColor} inline-block`} />
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deposit Address Box */}
            <div className="surface-card glow-border p-5 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 text-cyan-glow">
                <Coins className="h-4 w-4" />
                <span className="text-xs font-black text-foreground">{t("deposit.address")}</span>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2.5">
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate text-xs font-mono text-foreground text-start px-2"
                    dir="ltr"
                  >
                    {currentAddress}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl brand-gradient text-primary-foreground text-xs font-black shadow-glow active:scale-95 transition-all whitespace-nowrap cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? t("deposit.copied") : t("deposit.copyAddress")}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(!showQrModal)}
                className="flex items-center justify-center gap-2 w-full text-center text-xs font-bold text-cyan-glow hover:underline cursor-pointer pt-1"
              >
                <QrCode className="h-4 w-4" />
                <span>{t("deposit.scanQr")}</span>
              </button>

              {showQrModal && (
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-black max-w-[220px] mx-auto animate-in fade-in duration-200 shadow-xl border border-border">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      currentAddress,
                    )}`}
                    alt="رمز الاستجابة السريعة QR"
                    className="h-40 w-40"
                  />
                  <span className="text-xs font-black text-gray-800 mt-2">{network}</span>
                </div>
              )}
            </div>

            {/* Amount Input Box */}
            <div className="surface-card glow-border p-5 rounded-3xl space-y-3">
              <label className="block text-xs font-black text-foreground">
                {t("deposit.amount")}
              </label>

              <div className="relative flex items-center">
                <input
                  type="number"
                  step="any"
                  min={minDeposit}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`${t("deposit.minNotice")} ${minDeposit}$`}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm font-black text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
                />
                <span className="absolute end-4 top-1/2 -translate-y-1/2 text-xs font-black text-gold">
                  USDT
                </span>
              </div>
            </div>

            {/* Screenshot Upload Box */}
            <div className="surface-card glow-border p-5 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 text-cyan-glow">
                <Camera className="h-4 w-4" />
                <span className="text-xs font-black text-foreground">{t("deposit.proof")}</span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="screenshot-input"
              />

              {!screenshotPreview ? (
                <label
                  htmlFor="screenshot-input"
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface/50 p-6 cursor-pointer hover:border-cyan-glow/60 hover:bg-surface transition-all group text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface border border-cyan-glow/40 text-cyan-glow group-hover:scale-105 transition-transform shadow-glow">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-black text-cyan-glow">
                    {t("deposit.uploadHint")}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    صيغة PNG أو JPG (الحد الأقصى 5 ميجابايت)
                  </span>
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border border-border bg-surface max-h-56 flex items-center justify-center">
                    <img
                      src={screenshotPreview}
                      alt="معاينة إثبات الإيداع"
                      className="w-full h-auto max-h-56 object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveScreenshot}
                      className="absolute top-2 start-2 flex h-8 w-8 items-center justify-center rounded-full bg-danger text-white shadow-md hover:opacity-90 transition-opacity cursor-pointer"
                      title={t("deposit.removeScreenshot")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="screenshot-input"
                      className="flex-1 text-center py-2.5 rounded-xl border border-border bg-surface text-xs font-bold text-foreground cursor-pointer hover:border-cyan-glow transition-colors"
                    >
                      {t("deposit.changeScreenshot")}
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveScreenshot}
                      className="py-2.5 px-4 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs font-bold hover:bg-danger/25 transition-colors cursor-pointer"
                    >
                      {t("deposit.removeScreenshot")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={depositMutation.isPending || !screenshotPreview || !amount}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-sm font-black text-primary-foreground brand-gradient shadow-glow active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
              >
                <Send className="h-4 w-4 rtl:rotate-180" />
                <span>
                  {depositMutation.isPending ? t("deposit.submitting") : t("deposit.submit")}
                </span>
              </button>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground text-center">
                <RotateCcw className="h-3 w-3 text-cyan-glow" />
                <span>{t("deposit.afterSubmitNotice")}</span>
              </p>
            </div>
          </div>

          {/* Right Column: Instructions & Persistent QR */}
          <div className="lg:col-span-5 space-y-5 text-start">
            {/* Notes Card */}
            <div className="surface-card glow-border p-6 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-glow/15 text-cyan-glow">
                  <Info className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-black text-foreground">{t("deposit.notesTitle")}</h3>
              </div>

              <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-glow shrink-0 mt-0.5" />
                  <span>{t("deposit.aroundClock")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-glow shrink-0 mt-0.5" />
                  <span>{t("deposit.minAmount")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  <span>{t("deposit.note")}</span>
                </div>
              </div>
            </div>

            {/* Persistent QR Code Preview Card */}
            <div className="surface-card glow-border p-6 rounded-3xl text-center space-y-3">
              <h4 className="text-xs font-black text-foreground">{t("deposit.scanQr")}</h4>
              <div className="p-3 bg-white rounded-2xl inline-block shadow-md">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    currentAddress,
                  )}`}
                  alt="رمز الاستجابة السريعة QR"
                  className="h-36 w-36 mx-auto"
                />
              </div>
              <p className="text-xs font-mono text-muted-foreground font-bold">{network}</p>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
