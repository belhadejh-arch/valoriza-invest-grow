import { useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ChevronRight,
  Headphones,
  Copy,
  Check,
  QrCode,
  Coins,
  Camera,
  Image as ImageIcon,
  Trash2,
  Send,
  RotateCcw,
  Info,
  CheckCircle2,
} from "lucide-react";

import { createDepositRequest, getCompanySettingsAndSupport } from "@/lib/valoriza-pages.functions";

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
      toast.success("تم نسخ عنوان الإيداع بنجاح");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذر النسخ، يرجى نسخ العنوان يدوياً");
    }
  };

  // Handle Screenshot file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة صالح (PNG, JPG, JPEG)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotPreview(reader.result as string);
      toast.success("تم تحميل لقطة الشاشة بنجاح");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("تمت إزالة لقطة الشاشة");
  };

  const depositMutation = useMutation({
    mutationFn: (vals: { network: NetworkType; amount: number; screenshotUrl: string }) =>
      submitDeposit({ data: vals }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("تم تقديم طلب الإيداع بنجاح! سيتم مراجعته وتأكيد الرصيد بعد الفحص.");
        setAmount("");
        setScreenshotPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        qc.invalidateQueries({ queryKey: ["financial-records"] });
        qc.invalidateQueries({ queryKey: ["user-wallet"] });
        setTimeout(() => {
          navigate({ to: "/account" });
        }, 1200);
      } else if (res.reason === "SCREENSHOT_REQUIRED") {
        toast.error("يجب تحميل لقطة شاشة لعملية التحويل لإتمام الطلب");
      } else if (res.reason === "BELOW_MIN_DEPOSIT") {
        toast.error(`الحد الأدنى للإيداع هو ${minDeposit} دولارات`);
      } else {
        toast.error("تعذر إتمام طلب الإيداع، يرجى التحقق من البيانات");
      }
    },
    onError: () => toast.error("حدث خطأ في الاتصال، يرجى المحاولة لاحقاً"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);

    if (isNaN(num) || num < minDeposit) {
      toast.error(`يرجى إدخال مبلغ صحيح. الحد الأدنى للإيداع هو ${minDeposit} دولارات`);
      return;
    }

    if (!screenshotPreview) {
      toast.error("يجب تحميل لقطة شاشة لعملية التحويل لإرسال الطلب");
      return;
    }

    depositMutation.mutate({
      network,
      amount: num,
      screenshotUrl: screenshotPreview,
    });
  };

  return (
    <div className="min-h-screen bg-[#071328] text-white pb-20 font-sans select-none" dir="rtl">
      {/* Top App Header as in PDF Page 4 */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#071328]/95 backdrop-blur-md border-b border-[#122b52]">
        <Link
          to="/account"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0d2242] text-white hover:bg-[#153463] transition-colors"
          aria-label="العودة"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-white tracking-wide">الإيداع</h1>
        <Link
          to="/support"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0d2242] text-[#00e5ff] hover:bg-[#153463] transition-colors"
          aria-label="خدمة العملاء"
        >
          <Headphones className="h-5 w-5" />
        </Link>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pt-4 space-y-4">
        {/* Network Selection - 3 Cards exactly as in PDF Page 4 */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* ERC20 */}
          <button
            type="button"
            onClick={() => setNetwork("USDT-ERC20")}
            className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 ${
              network === "USDT-ERC20"
                ? "bg-[#0b2247] border-[#00d2ff] shadow-[0_0_15px_rgba(0,210,255,0.3)] ring-1 ring-[#00d2ff]"
                : "bg-[#0a1b36] border-[#132c54] text-gray-300 hover:border-[#1e427b]"
            }`}
          >
            {network === "USDT-ERC20" && (
              <span className="absolute top-1.5 left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00d2ff] text-[#071328]">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#26a17b]/20 border border-[#26a17b]/40 text-[#26a17b] mb-1.5">
              <span className="font-extrabold text-sm tracking-tighter">₮</span>
            </div>
            <span className="text-xs font-bold text-white">USDT-ERC20</span>
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-400">
              <span className="h-2 w-2 rounded-full bg-indigo-400 inline-block" />
              <span>ERC20</span>
            </div>
          </button>

          {/* BEP20 */}
          <button
            type="button"
            onClick={() => setNetwork("USDT-BEP20")}
            className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 ${
              network === "USDT-BEP20"
                ? "bg-[#0b2247] border-[#00d2ff] shadow-[0_0_15px_rgba(0,210,255,0.3)] ring-1 ring-[#00d2ff]"
                : "bg-[#0a1b36] border-[#132c54] text-gray-300 hover:border-[#1e427b]"
            }`}
          >
            {network === "USDT-BEP20" && (
              <span className="absolute top-1.5 left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00d2ff] text-[#071328]">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#26a17b]/20 border border-[#26a17b]/40 text-[#26a17b] mb-1.5">
              <span className="font-extrabold text-sm tracking-tighter">₮</span>
            </div>
            <span className="text-xs font-bold text-white">USDT-BEP20</span>
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-yellow-400">
              <span className="h-2 w-2 rotate-45 bg-yellow-400 inline-block" />
              <span>BEP20</span>
            </div>
          </button>

          {/* TRC20 */}
          <button
            type="button"
            onClick={() => setNetwork("USDT-TRC20")}
            className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 ${
              network === "USDT-TRC20"
                ? "bg-[#0b2247] border-[#00d2ff] shadow-[0_0_15px_rgba(0,210,255,0.3)] ring-1 ring-[#00d2ff]"
                : "bg-[#0a1b36] border-[#132c54] text-gray-300 hover:border-[#1e427b]"
            }`}
          >
            {network === "USDT-TRC20" && (
              <span className="absolute top-1.5 left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00d2ff] text-[#071328]">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#26a17b]/20 border border-[#26a17b]/40 text-[#26a17b] mb-1.5">
              <span className="font-extrabold text-sm tracking-tighter">₮</span>
            </div>
            <span className="text-xs font-bold text-white">USDT-TRC20</span>
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-red-400">
              <span className="h-2 w-2 rounded-sm bg-red-500 inline-block" />
              <span>TRC20</span>
            </div>
          </button>
        </div>

        {/* Deposit Address Box - matching PDF Page 4 */}
        <div className="rounded-2xl bg-[#091b38] border border-[#132d56] p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2 text-[#00d2ff]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00d2ff]/15">
              <Coins className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-white">عنوان الإيداع</span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-[#051124] border border-[#12274b] p-2.5">
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-mono text-gray-200 text-left" dir="ltr">
                {currentAddress}
              </p>
            </div>
            <button
              type="button"
              onClick={copyAddress}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0c2850] border border-[#00d2ff]/40 text-[#00d2ff] text-xs font-bold hover:bg-[#00d2ff] hover:text-[#071328] transition-all whitespace-nowrap"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>نسخ العنوان</span>
            </button>
          </div>

          {/* QR Code prompt button */}
          <button
            type="button"
            onClick={() => setShowQrModal(!showQrModal)}
            className="mt-3 flex items-center justify-center gap-2 w-full text-center text-xs font-medium text-[#00d2ff] hover:text-[#80e5ff] transition-colors"
          >
            <QrCode className="h-4 w-4" />
            <span>يمكنك مسح رمز الاستجابة السريعة (QR) للإرسال الإيداع بسهولة</span>
          </button>

          {/* QR Code Inline toggle */}
          {showQrModal && (
            <div className="mt-3 flex flex-col items-center justify-center p-3 rounded-xl bg-white text-black max-w-[200px] mx-auto animate-in fade-in duration-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  currentAddress,
                )}`}
                alt="QR Code"
                className="h-36 w-36"
              />
              <span className="text-[11px] font-bold text-gray-700 mt-1">{network}</span>
            </div>
          )}
        </div>

        {/* Amount Input Box - matching PDF Page 4 */}
        <div className="rounded-2xl bg-[#091b38] border border-[#132d56] p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2 text-[#00d2ff]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00d2ff]/15">
              <Coins className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-white">المبلغ</span>
          </div>

          <div className="relative flex items-center rounded-xl bg-[#051124] border border-[#12274b] px-3 py-2.5 focus-within:border-[#00d2ff] transition-colors">
            <input
              type="number"
              step="any"
              min={minDeposit}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="أدخل المبلغ بالدولار"
              className="w-full bg-transparent text-sm font-bold text-white placeholder-gray-500 focus:outline-none"
            />
            <span className="text-xs font-extrabold text-[#00d2ff] bg-[#0c2850] px-2.5 py-1 rounded-md border border-[#00d2ff]/30">
              USDT
            </span>
          </div>
        </div>

        {/* Screenshot Upload Box - Strictly in Deposit Page only (Instructions 12 & 13) */}
        <div className="rounded-2xl bg-[#091b38] border border-[#132d56] p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-1 text-[#00d2ff]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00d2ff]/15">
              <Camera className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-white">تحميل لقطة شاشة</span>
          </div>
          <p className="text-[11px] text-gray-400 mb-3 pr-9">
            قم بتحميل لقطة شاشة لعملية الإيداع الخاصة بك
          </p>

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
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#1a3865] bg-[#051124]/70 p-6 cursor-pointer hover:border-[#00d2ff]/60 hover:bg-[#081833] transition-all group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0c2448] text-[#00d2ff] group-hover:scale-110 transition-transform">
                <ImageIcon className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-[#00d2ff]">اختر لقطة الشاشة</span>
              <span className="text-[10px] text-gray-400">
                انقر هنا لاختيار الصورة من الهاتف أو السحب والإفلات
              </span>
            </label>
          ) : (
            <div className="space-y-3">
              {/* Preview Container */}
              <div className="relative rounded-xl overflow-hidden border border-[#00d2ff]/40 bg-[#051124] max-h-56 flex items-center justify-center">
                <img
                  src={screenshotPreview}
                  alt="Deposit Screenshot Preview"
                  className="w-full h-auto max-h-56 object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveScreenshot}
                  className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600/90 text-white shadow-md hover:bg-red-700 transition-colors"
                  title="حذف الصورة"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Action Buttons for Preview */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="screenshot-input"
                  className="flex-1 text-center py-2 rounded-lg bg-[#0c2850] border border-[#00d2ff]/40 text-[#00d2ff] text-xs font-bold cursor-pointer hover:bg-[#00d2ff] hover:text-[#071328] transition-colors"
                >
                  تغيير لقطة الشاشة
                </label>
                <button
                  type="button"
                  onClick={handleRemoveScreenshot}
                  className="py-2 px-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
                >
                  حذف
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button - matching PDF Page 4 */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={depositMutation.isPending || !screenshotPreview || !amount}
            className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-sm font-extrabold text-white transition-all shadow-lg ${
              depositMutation.isPending || !screenshotPreview || !amount
                ? "bg-[#0f2c57] text-gray-400 cursor-not-allowed border border-[#183a6f]"
                : "bg-gradient-to-r from-[#00b4db] to-[#0083b0] hover:from-[#00c6ff] hover:to-[#0072ff] active:scale-[0.99] shadow-[0_0_20px_rgba(0,180,219,0.4)]"
            }`}
          >
            <Send className="h-4 w-4 rotate-180" />
            <span>{depositMutation.isPending ? "جاري الإرسال..." : "تقديم"}</span>
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 text-center mt-2.5">
            <RotateCcw className="h-3 w-3 text-[#00d2ff]" />
            <span>بعد الضغط على تقديم سيتم إرسال طلب الإيداع</span>
          </p>
        </div>

        {/* Notes Card - matching PDF Page 4 */}
        <div className="rounded-2xl bg-[#091b38] border border-[#132d56] p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00d2ff] text-[#071328]">
                <Info className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-white">ملاحظات</span>
            </div>
            <div className="space-y-1.5 text-xs text-gray-300 pr-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#00d2ff] shrink-0" />
                <span>الإيداع يكون على مدار 24 ساعة.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#00d2ff] shrink-0" />
                <span>الحد الأدنى للإيداع هو 10 دولارات.</span>
              </div>
            </div>
          </div>

          {/* Graphic badge */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#26a17b]/30 to-[#00d2ff]/20 border border-[#26a17b]/40 text-[#26a17b] shadow-[0_0_15px_rgba(38,161,123,0.3)] shrink-0">
            <span className="text-3xl font-black">₮</span>
          </div>
        </div>
      </main>
    </div>
  );
}
