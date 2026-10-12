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
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getAdminSettings, saveAdminSettings } from "@/lib/valoriza-admin.functions";

type AdminPasswordFormValues = {
  newPassword: string;
  confirmPassword: string;
};

export function AdminSettingsTab() {
  const queryClient = useQueryClient();
  const adminPasswordForm = useForm<AdminPasswordFormValues>({
    mode: "onChange",
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

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

  const adminPasswordMutation = useMutation({
    mutationFn: async ({ newPassword }: AdminPasswordFormValues) => {
      const result = await supabase.auth.updateUser({ password: newPassword });
      if (result.error) throw result.error;
      if (!result.data?.ok) {
        throw new Error(result.data?.message || "تعذر تغيير كلمة المرور.");
      }
      return result.data;
    },
    onSuccess: (result) => {
      toast.success(result.message || "تم تغيير كلمة مرور المدير بنجاح.");
      adminPasswordForm.reset();
    },
    onError: (err: any) => toast.error(err.message || "تعذر تغيير كلمة المرور."),
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
    <div className="space-y-5">
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

      {/* Platform Global Switches Section */}
      <div className="rounded-2xl border border-border bg-surface/70 p-4 shadow-sm">
        <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5 pb-3 border-b border-border/60">
          <ShieldCheck className="h-4 w-4 text-cyan-glow" />
          <span>المفاتيح العامة للتحكم بالمنصة (ON / OFF)</span>
        </h3>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/80">
            <div>
              <p className="text-xs font-black text-foreground">تفعيل السحب لجميع المستخدمين</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                عند التعطيل (OFF) يُقفل السحب عامةً وتظهر رسالة توضيحية للمستخدمين
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                handleChange(
                  "withdrawals_enabled",
                  form["withdrawals_enabled"] === "false" ? "true" : "false",
                )
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                form["withdrawals_enabled"] !== "false" ? "bg-emerald-500" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  form["withdrawals_enabled"] !== "false"
                    ? "translate-x-5 rtl:-translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/80">
            <div>
              <p className="text-xs font-black text-foreground">تفعيل المهام اليومية</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                عند التعطيل (OFF) تختفي المهام وتظهر للمستخدم رسالة "لا توجد مهام اليوم"
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                handleChange("tasks_enabled", form["tasks_enabled"] === "false" ? "true" : "false")
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                form["tasks_enabled"] !== "false" ? "bg-emerald-500" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  form["tasks_enabled"] !== "false"
                    ? "translate-x-5 rtl:-translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Customer Service & Platform Info */}
      <div className="rounded-2xl border border-border bg-surface/70 p-4 shadow-sm">
        <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5 pb-3 border-b border-border/60">
          <Headphones className="h-4 w-4 text-purple-400" />
          <span>خدمة العملاء والروابط الرسمية (مجموعات تيليجرام وواتساب)</span>
        </h3>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              رابط مجموعة Telegram الرسمية
            </label>
            <input
              type="text"
              value={form["telegram_group_url"] || ""}
              onChange={(e) => handleChange("telegram_group_url", e.target.value)}
              placeholder="https://t.me/your_group"
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              رابط مجموعة WhatsApp الرسمية
            </label>
            <input
              type="text"
              value={form["whatsapp_group_url"] || ""}
              onChange={(e) => handleChange("whatsapp_group_url", e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              رابط تليجرام للدعم الفني (Support)
            </label>
            <input
              type="text"
              value={form["telegram_support_url"] || ""}
              onChange={(e) => handleChange("telegram_support_url", e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground font-bold">
              رابط واتساب للدعم الفني (Support)
            </label>
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

      <section className="rounded-2xl border border-cyan-glow/30 bg-surface/70 p-4 shadow-sm">
        <div className="flex items-start gap-3 border-b border-border/60 pb-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-glow/10 text-cyan-glow">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-xs font-extrabold text-foreground">أمان حساب المدير</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              غيّر كلمة مرور الحساب الحالي مباشرة. لن يُطلب منك إدخال كلمة المرور القديمة.
            </p>
          </div>
        </div>

        <Form {...adminPasswordForm}>
          <form
            onSubmit={adminPasswordForm.handleSubmit((values) =>
              adminPasswordMutation.mutate(values),
            )}
            className="mt-4 space-y-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={adminPasswordForm.control}
                name="newPassword"
                rules={{
                  required: "أدخل كلمة المرور الجديدة.",
                  minLength: {
                    value: 6,
                    message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل.",
                  },
                  validate: (value) =>
                    new TextEncoder().encode(value).length <= 72 ||
                    "كلمة المرور يجب ألا تتجاوز 72 بايتًا.",
                }}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-bold text-muted-foreground">
                      كلمة المرور الجديدة
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          if (adminPasswordForm.getValues("confirmPassword")) {
                            void adminPasswordForm.trigger("confirmPassword");
                          }
                        }}
                        type="password"
                        autoComplete="new-password"
                        maxLength={72}
                        data-testid="input-admin-new-password"
                        className="border-border bg-surface text-xs text-foreground focus-visible:ring-cyan-glow"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={adminPasswordForm.control}
                name="confirmPassword"
                rules={{
                  required: "أعد كتابة كلمة المرور الجديدة للتأكيد.",
                  validate: (value) =>
                    value === adminPasswordForm.getValues("newPassword") ||
                    "كلمتا المرور غير متطابقتين.",
                }}
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] font-bold text-muted-foreground">
                      تأكيد كلمة المرور الجديدة
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        autoComplete="new-password"
                        maxLength={72}
                        data-testid="input-admin-confirm-password"
                        className="border-border bg-surface text-xs text-foreground focus-visible:ring-cyan-glow"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            <button
              type="submit"
              disabled={
                !adminPasswordForm.formState.isValid || adminPasswordMutation.isPending
              }
              data-testid="button-change-admin-password"
              className="flex items-center justify-center gap-2 rounded-xl brand-gradient px-5 py-2.5 text-xs font-black text-primary-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adminPasswordMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>جارٍ تغيير كلمة المرور...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>حفظ كلمة المرور الجديدة</span>
                </>
              )}
            </button>
          </form>
        </Form>
      </section>
    </div>
  );
}
