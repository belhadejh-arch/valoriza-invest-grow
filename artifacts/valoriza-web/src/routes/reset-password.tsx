import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/valoriza/Logo";
import { LanguageSwitcher } from "@/components/valoriza/LanguageSwitcher";
import { ThemeToggle } from "@/components/valoriza/ThemeToggle";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "استعادة كلمة المرور — فالوريزا" },
      {
        name: "description",
        content: "استعادة كلمة مرور حساب الإدارة في منصة فالوريزا باستخدام رمز آمن لمرة واحدة.",
      },
    ],
  }),
  component: AdminPasswordResetPage,
});

function AdminPasswordResetPage() {
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    if (newPassword.length < 12) {
      setError("استخدم كلمة مرور من 12 حرفاً على الأقل.");
      return;
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
      setError("كلمة المرور طويلة جداً. الحد الأقصى 72 بايت.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/auth/admin-password-reset", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, newPassword }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        const messages: Record<string, string> = {
          INVALID_RESET_CODE: "الرمز غير صحيح أو سبق استخدامه.",
          RESET_TOO_MANY_ATTEMPTS: "تم إيقاف المحاولات مؤقتاً. حاول بعد 15 دقيقة.",
          RESET_CODE_ALREADY_USED: "استُخدم هذا الرمز. أنشئ رمزاً جديداً في Netlify.",
          ADMIN_RESET_NOT_CONFIGURED: "لم يكتمل إعداد الاستعادة في Netlify بعد.",
          ADMIN_PASSWORD_SYNC_ACTIVE: "أوقف مزامنة كلمة المرور القديمة في Netlify ثم أعد نشر الموقع.",
          ADMIN_ACCOUNT_UNAVAILABLE: "تعذر العثور على حساب الإدارة المحدد في إعدادات الخادم.",
          INVALID_RESET_INPUT: "تحقق من الرمز وكلمة المرور ثم أعد المحاولة.",
        };
        setError(messages[payload.message ?? ""] ?? "تعذر تغيير كلمة المرور. حاول لاحقاً.");
        return;
      }
      setComplete(true);
    } catch {
      setError("تعذر الاتصال بالخادم. تحقق من الاتصال ثم أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="w-full border-b border-border/60 bg-surface/40 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex min-h-[calc(100dvh-66px)] items-center justify-center px-4 py-8">
        <section className="surface-card glow-border w-full max-w-md rounded-3xl p-6 shadow-2xl sm:p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-cyan-glow">
            {complete ? <ShieldCheck className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}
          </div>

          {complete ? (
            <div className="text-center">
              <h1 className="text-2xl font-black text-foreground">تم تحديث كلمة المرور</h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                أُغلقت الجلسات السابقة. سجّل الدخول الآن باستخدام كلمة المرور الجديدة.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient px-5 py-3 font-black text-primary-foreground shadow-glow transition hover:brightness-110"
              >
                الذهاب إلى تسجيل الدخول
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-black text-foreground">استعادة كلمة المرور</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  هذه الصفحة مخصصة لحساب الإدارة. أدخل رمز Netlify السري وأنشئ كلمة مرور جديدة.
                </p>
              </div>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <label className="block space-y-2 text-sm font-bold">
                  <span className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-cyan-glow" />
                    رمز الاستعادة لمرة واحدة
                  </span>
                  <input
                    name="code"
                    type="password"
                    autoComplete="one-time-code"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    maxLength={512}
                    dir="ltr"
                    className="h-12 w-full rounded-2xl border border-border bg-surface/60 px-4 text-left text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                <label className="block space-y-2 text-sm font-bold">
                  <span className="flex items-center gap-2">
                    <LockKeyhole className="h-4 w-4 text-cyan-glow" />
                    كلمة المرور الجديدة
                  </span>
                  <input
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    dir="ltr"
                    className="h-12 w-full rounded-2xl border border-border bg-surface/60 px-4 text-left text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                <label className="block space-y-2 text-sm font-bold">
                  <span className="flex items-center gap-2">
                    <LockKeyhole className="h-4 w-4 text-cyan-glow" />
                    تأكيد كلمة المرور الجديدة
                  </span>
                  <input
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    dir="ltr"
                    className="h-12 w-full rounded-2xl border border-border bg-surface/60 px-4 text-left text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                {error && (
                  <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-2xl brand-gradient px-5 py-3 font-black text-primary-foreground shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "جارٍ تحديث كلمة المرور…" : "حفظ كلمة المرور الجديدة"}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 border-t border-border/50 pt-4 text-center">
            <Link to="/" className="text-sm font-bold text-gold hover:underline">
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
