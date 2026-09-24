import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Save,
  DollarSign,
  Wallet,
  Headphones,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { getAdminSettings, saveAdminSettings } from "@/lib/valoriza-admin.functions";

export function AdminSettingsTab() {
  const queryClient = useQueryClient();

  const {
    data: initialSettings,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => getAdminSettings(),
  });

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialSettings) {
      setForm(initialSettings);
    }
  }, [initialSettings]);

  const saveMutation = useMutation({
    mutationFn: saveAdminSettings,
    onSuccess: () => {
      toast.success("تم حفظ إعدادات المنصة بنجاح 🎉");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["account-data"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-muted-foreground">
        <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
        جارٍ جلب إعدادات المنصة...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Financial Limits Section */}
      <div className="rounded-2xl border border-border bg-surface/70 p-4 shadow-sm">
        <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5 pb-3 border-b border-border/60">
          <DollarSign className="h-4 w-4 text-gold" />
          <span>الحدود المالية ورسوم السحب</span>
        </h3>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              الحد الأدنى للإيداع ($)
            </label>
            <input
              type="number"
              step="1"
              value={form["min_deposit"] || "10"}
              onChange={(e) => handleChange("min_deposit", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              الحد الأدنى للسحب ($)
            </label>
            <input
              type="number"
              step="1"
              value={form["min_withdrawal"] || "10"}
              onChange={(e) => handleChange("min_withdrawal", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">رسوم السحب (%)</label>
            <input
              type="number"
              step="0.5"
              value={form["withdrawal_fee_percent"] || "5"}
              onChange={(e) => handleChange("withdrawal_fee_percent", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              مكافأة تسجيل الدخول ($)
            </label>
            <input
              type="number"
              step="0.05"
              value={form["daily_login_reward"] || "0.20"}
              onChange={(e) => handleChange("daily_login_reward", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Deposit Addresses Section */}
      <div className="rounded-2xl border border-border bg-surface/70 p-4 shadow-sm">
        <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5 pb-3 border-b border-border/60">
          <Wallet className="h-4 w-4 text-cyan-glow" />
          <span>عناوين محافظ الإيداع الرسمية (USDT)</span>
        </h3>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              عنوان شبكة TRC20 (Tron)
            </label>
            <input
              type="text"
              value={form["deposit_address_trc20"] || ""}
              onChange={(e) => handleChange("deposit_address_trc20", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              عنوان شبكة BEP20 (BNB Smart Chain)
            </label>
            <input
              type="text"
              value={form["deposit_address_bep20"] || ""}
              onChange={(e) => handleChange("deposit_address_bep20", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              عنوان شبكة ERC20 (Ethereum)
            </label>
            <input
              type="text"
              value={form["deposit_address_erc20"] || ""}
              onChange={(e) => handleChange("deposit_address_erc20", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* Customer Service & Platform Info */}
      <div className="rounded-2xl border border-border bg-surface/70 p-4 shadow-sm">
        <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5 pb-3 border-b border-border/60">
          <Headphones className="h-4 w-4 text-purple-400" />
          <span>خدمة العملاء والروابط الرسمية</span>
        </h3>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              رابط تليجرام للدعم
            </label>
            <input
              type="text"
              value={form["telegram_support_url"] || ""}
              onChange={(e) => handleChange("telegram_support_url", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">رابط واتساب للدعم</label>
            <input
              type="text"
              value={form["whatsapp_support_url"] || ""}
              onChange={(e) => handleChange("whatsapp_support_url", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[10px] text-muted-foreground font-bold">
              شعار المنصة (Slogan)
            </label>
            <input
              type="text"
              value={form["app_slogan"] || "Invest Today .. Build Tomorrow"}
              onChange={(e) => handleChange("app_slogan", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="flex items-center justify-center gap-2 rounded-2xl brand-gradient px-6 py-3 text-xs font-black text-primary-foreground shadow-glow hover:opacity-95 active:scale-95 disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>جارٍ حفظ الإعدادات...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>حفظ جميع إعدادات المنصة</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
