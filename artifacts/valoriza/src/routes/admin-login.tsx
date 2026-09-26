import { type FormEvent, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import {
  adminLoginErrorKey,
  getAdminSession,
  loginAdmin,
  type AdminSession,
} from "@/lib/admin-auth.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin-login")({
  ssr: false,
  beforeLoad: async () => {
    let admin: AdminSession | null = null;
    try {
      ({ admin } = await getAdminSession());
    } catch {
      // An unavailable session endpoint should not prevent an admin from attempting login.
    }
    if (admin) throw redirect({ to: "/admin" });
  },
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorKey, setErrorKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorKey("");
    setIsSubmitting(true);
    try {
      await loginAdmin(email.trim(), password);
      await navigate({ to: "/admin", replace: true });
    } catch (cause) {
      setErrorKey(adminLoginErrorKey(cause));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main dir={dir} className="flex min-h-screen items-center justify-center bg-navy-night px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-3xl border border-amber-500/25 bg-navy-deep p-7 shadow-2xl sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-300">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-black">{t("admin.loginTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("admin.loginSubtitle")}</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <label className="block space-y-2 text-sm font-semibold">
            <span>{t("admin.loginEmail")}</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              placeholder={t("admin.loginEmailPlaceholder")}
            />
          </label>
          <label className="block space-y-2 text-sm font-semibold">
            <span>{t("admin.loginPassword")}</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              placeholder={t("admin.loginPasswordPlaceholder")}
            />
          </label>

          {errorKey && (
            <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {t(errorKey)}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LockKeyhole className="h-4 w-4" />
            {isSubmitting ? t("admin.loginSubmitting") : t("admin.loginSubmit")}
          </button>
        </form>
      </section>
    </main>
  );
}