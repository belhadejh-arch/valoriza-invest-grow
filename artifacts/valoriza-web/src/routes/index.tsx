import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Ticket,
  User,
  Headphones,
  TrendingUp,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/valoriza/Logo";
import { LanguageSwitcher } from "@/components/valoriza/LanguageSwitcher";
import { ThemeToggle } from "@/components/valoriza/ThemeToggle";
import { useI18n } from "@/lib/i18n";
import heroCity from "@/assets/hero-city.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — فالوريزا | استثمر اليوم .. لبناء مستقبلك غداً" },
      {
        name: "description",
        content: "سجل الدخول إلى حساب Valoriza: منصة عالمية وفرص حقيقية لربح المال بأمان وسهولة.",
      },
      { property: "og:title", content: "فالوريزا — استثمر اليوم .. لبناء مستقبلك غداً" },
      {
        property: "og:description",
        content: "منصة عالمية .. فرص حقيقية لربح المال. آمن - سهل - سريع.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { t, isRTL } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    referral: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function getFriendlyErrorMessage(rawMsg: string): string {
    if (!rawMsg) return "حدث خطأ غير متوقع أثناء معالجة الطلب";
    if (
      rawMsg.includes("ACCOUNT_EXISTS") ||
      rawMsg.includes("already registered") ||
      rawMsg.includes("مسجل بالفعل")
    ) {
      return "هذا البريد الإلكتروني مسجل بالفعل! يمكنك تسجيل الدخول مباشرة.";
    }
    if (rawMsg.includes("INVALID_CREDENTIALS") || rawMsg.includes("Invalid login")) {
      return "بيانات الدخول غير صحيحة، يرجى التأكد من البريد الإلكتروني وكلمة المرور.";
    }
    if (rawMsg.includes("ACCOUNT_BLOCKED")) {
      return "تم تجميد هذا الحساب من قبل إدارة المنصة.";
    }
    if (rawMsg.includes("INVALID_REGISTRATION")) {
      return "بيانات التسجيل غير مكتملة، كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
    }
    if (
      rawMsg.includes("fetch") ||
      rawMsg.includes("Failed to fetch") ||
      rawMsg.includes("Network")
    ) {
      return "تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.";
    }
    return rawMsg;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "register") {
        if (form.username.trim().length < 3) {
          toast.error(t("auth.errUsernameLen"));
          return;
        }
        if (form.password.length < 6) {
          toast.error(t("auth.errPasswordLen"));
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              username: form.username.trim(),
              phone: form.phone.trim(),
              referral_code: form.referral.trim().toUpperCase(),
            },
          },
        });
        if (error) {
          toast.error(getFriendlyErrorMessage(error.message));
          return;
        }
        toast.success(t("auth.accountCreated"));
        navigate({ to: "/home", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) {
          toast.error(getFriendlyErrorMessage(error.message));
          return;
        }
        toast.success(t("auth.welcomeBack"));
        navigate({ to: "/home", replace: true });
      }
    } catch (err: unknown) {
      console.error("Auth submit error:", err);
      const msg =
        err instanceof Error ? getFriendlyErrorMessage(err.message) : "تعذر الاتصال بالسيرفر";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      id="auth-screen-container"
      className="min-h-[100dvh] flex flex-col justify-between bg-background text-foreground transition-colors duration-200"
    >
      {/* Top Header Bar with Logo and Controls */}
      <header
        id="auth-top-header"
        className="w-full border-b border-border/60 bg-surface/40 backdrop-blur-md px-4 py-2 sm:py-2.5 z-20"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area: Zero-scroll on mobile, 2-column grid on desktop */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-center">
          {/* Desktop Left Showcase Column (Hidden on short/compact mobile screens to guarantee no scroll) */}
          <div className="hidden md:flex md:col-span-6 flex-col justify-center space-y-5">
            <div className="relative overflow-hidden rounded-3xl glow-border shadow-2xl">
              <img
                src={heroCity}
                alt="المقر الرئيسي لشركة فالوريزا في مدريد"
                width={1280}
                height={720}
                className="h-64 lg:h-72 w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/60 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-6 text-start">
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gold/20 border border-gold/40 px-3 py-0.5 text-xs font-bold text-gold mb-2">
                  <Sparkles className="h-3 w-3" />
                  {t("auth.heroTag")}
                </span>
                <h1 className="text-3xl font-black text-white">{t("auth.heroTitle")}</h1>
                <p className="text-base font-bold text-gold-soft mt-1">{t("auth.heroSubtitle")}</p>
                <p className="text-xs text-slate-300 mt-1">
                  باسيو دي لا كاستيلانا 95، مدريد، إسبانيا · رقم التسجيل B-88392104
                </p>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: ShieldCheck, title: t("auth.benefitSecurity"), color: "text-cyan-glow" },
                { icon: Headphones, title: t("auth.benefitSupport"), color: "text-primary" },
                { icon: TrendingUp, title: t("auth.benefitProfit"), color: "text-gold" },
              ].map(({ icon: Icon, title, color }) => (
                <div
                  key={title}
                  className="surface-card p-3 rounded-2xl flex flex-col items-center"
                >
                  <Icon className={`h-5 w-5 ${color}`} />
                  <span className="mt-1.5 text-[11px] font-bold text-foreground leading-tight">
                    {title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Form Column (Responsive card that fits effortlessly on mobile) */}
          <div className="w-full md:col-span-6 max-w-md mx-auto">
            {/* Compact Mobile Brand Header Banner (Only visible on mobile, minimal height) */}
            <div className="md:hidden flex items-center justify-between mb-3 px-1">
              <div>
                <h1 className="text-lg font-black text-gold-gradient leading-tight">
                  {t("auth.heroTitle")}
                </h1>
                <p className="text-xs font-semibold text-muted-foreground">
                  {t("auth.heroSubtitle")}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-2.5 py-0.5 text-[10px] font-bold text-cyan-glow">
                <Sparkles className="h-3 w-3 text-gold" />
                {t("auth.heroTag")}
              </span>
            </div>

            <div
              id="auth-card"
              className="surface-card glow-border p-4 sm:p-6 shadow-2xl relative transition-all"
            >
              {/* Form Title & Subtitle */}
              <div className="text-center mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-black text-foreground">
                  {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
                </h2>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  {mode === "login" ? t("auth.loginSubtitle") : t("auth.registerSubtitle")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
                {mode === "register" && (
                  <Field
                    id="auth-field-username"
                    icon={User}
                    placeholder={t("auth.username")}
                    value={form.username}
                    onChange={set("username")}
                    required
                  />
                )}

                <Field
                  id="auth-field-email"
                  icon={Mail}
                  type="email"
                  placeholder={t("auth.email")}
                  value={form.email}
                  onChange={set("email")}
                  required
                />

                {mode === "register" && (
                  <Field
                    id="auth-field-phone"
                    icon={Phone}
                    placeholder={t("auth.phone")}
                    value={form.phone}
                    onChange={set("phone")}
                  />
                )}

                <Field
                  id="auth-field-password"
                  icon={Lock}
                  type="password"
                  placeholder={t("auth.password")}
                  value={form.password}
                  onChange={set("password")}
                  required
                />

                {mode === "register" && (
                  <Field
                    id="auth-field-referral"
                    icon={Ticket}
                    placeholder={t("auth.referral")}
                    value={form.referral}
                    onChange={set("referral")}
                  />
                )}

                <button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-2xl brand-gradient py-2.5 sm:py-3 text-sm sm:text-base font-black text-primary-foreground shadow-glow hover:brightness-110 active:scale-98 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <span>{t("auth.processing")}</span>
                  ) : (
                    <>
                      <span>{mode === "login" ? t("auth.loginBtn") : t("auth.registerBtn")}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Mode Switch Button */}
              <div className="mt-3 sm:mt-4 text-center text-xs text-muted-foreground border-t border-border/50 pt-2.5">
                <div>
                  <span>{mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}</span>{" "}
                  <button
                    id="auth-toggle-mode-btn"
                    type="button"
                    onClick={() => setMode(mode === "login" ? "register" : "login")}
                    className="font-black text-gold hover:underline underline-offset-4 focus:outline-none"
                  >
                    {mode === "login" ? t("auth.switchRegister") : t("auth.switchLogin")}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Mobile Trust Indicators (Slim horizontal row) */}
            <div className="md:hidden mt-3 flex items-center justify-around text-center text-[10px] text-muted-foreground px-2">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-glow" />
                {t("auth.benefitSecurity")}
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1">
                <Headphones className="h-3.5 w-3.5 text-primary" />
                {t("auth.benefitSupport")}
              </span>
              <span className="text-border">•</span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-gold" />
                {t("auth.benefitProfit")}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="py-2 text-center text-[10px] text-muted-foreground border-t border-border/40">
        شركة فالوريزا للاستثمار · مدريد، إسبانيا · سجل تجاري رقم B-88392104
      </footer>
    </div>
  );
}

function Field({
  icon: Icon,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ElementType;
  id?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface/60 px-3 py-2 sm:py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 transition-all">
      <Icon className="h-4 w-4 shrink-0 text-cyan-glow" />
      <input
        id={id}
        {...props}
        className="w-full min-w-0 bg-transparent text-xs sm:text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
