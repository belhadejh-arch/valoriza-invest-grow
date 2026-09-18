import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Mail, Phone, ShieldCheck, Ticket, User, Headphones, TrendingUp } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/valoriza/Logo";
import heroCity from "@/assets/hero-city.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — Valoriza" },
      {
        name: "description",
        content: "سجل الدخول إلى حساب Valoriza: منصة عالمية وفرص حقيقية لربح المال بأمان وسهولة.",
      },
      { property: "og:title", content: "تسجيل الدخول — Valoriza" },
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "register") {
        if (form.username.trim().length < 3) {
          toast.error("اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
          return;
        }
        if (form.password.length < 6) {
          toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
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
          toast.error(error.message);
          return;
        }
        toast.success("تم إنشاء حسابك بنجاح");
        navigate({ to: "/home", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) {
          toast.error("بيانات الدخول غير صحيحة");
          return;
        }
        toast.success("مرحباً بعودتك");
        navigate({ to: "/home", replace: true });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-lg px-4 pb-10 pt-6">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        <div className="relative mt-5 overflow-hidden rounded-3xl glow-border">
          <img
            src={heroCity}
            alt="استثمر اليوم لبناء مستقبلك غداً"
            width={1280}
            height={720}
            className="h-44 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-navy-deep/90 via-navy-deep/60 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center gap-1 p-4 text-right">
            <h1 className="text-2xl font-extrabold leading-snug text-gold-gradient">منصة عالمية</h1>
            <p className="text-lg font-bold text-foreground">فرص حقيقية لربح المال</p>
            <p className="text-xs font-semibold text-cyan-glow">آمن - سهل - سريع</p>
          </div>
        </div>

        <div className="mt-5 surface-card p-5">
          <h2 className="text-center text-xl font-extrabold text-foreground">
            {mode === "login" ? "مرحباً بعودتك" : "إنشاء حساب جديد"}
          </h2>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            {mode === "login" ? "سجل الدخول إلى حسابك" : "أكمل بياناتك للانضمام إلى Valoriza"}
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            {mode === "register" && (
              <Field icon={User} placeholder="اسم المستخدم" value={form.username} onChange={set("username")} />
            )}
            <Field
              icon={Mail}
              type="email"
              placeholder="البريد الإلكتروني"
              value={form.email}
              onChange={set("email")}
              required
            />
            {mode === "register" && (
              <Field icon={Phone} placeholder="رقم الهاتف" value={form.phone} onChange={set("phone")} />
            )}
            <Field
              icon={Lock}
              type="password"
              placeholder="كلمة المرور"
              value={form.password}
              onChange={set("password")}
              required
            />
            {mode === "register" && (
              <Field
                icon={Ticket}
                placeholder="رمز الدعوة (اختياري)"
                value={form.referral}
                onChange={set("referral")}
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-2xl brand-gradient px-4 py-3 text-base font-extrabold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {loading ? "جارٍ المعالجة..." : mode === "login" ? "تسجيل الدخول ←" : "سجل الآن ←"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {mode === "login" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-bold text-gold underline underline-offset-4"
            >
              {mode === "login" ? "سجل الآن" : "تسجيل الدخول"}
            </button>
          </p>
        </div>

        <ul className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            { icon: ShieldCheck, label: "أمان عالي" },
            { icon: Headphones, label: "دعم دائم" },
            { icon: TrendingUp, label: "فرص ربح يومية" },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="surface-card px-2 py-3">
              <Icon className="mx-auto h-5 w-5 text-cyan-glow" />
              <span className="mt-1.5 block text-[11px] font-semibold text-foreground">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-navy-deep/70 px-3 py-2.5 focus-within:border-primary">
      <Icon className="h-4 w-4 shrink-0 text-cyan-glow" />
      <input
        {...props}
        className="w-full min-w-0 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
