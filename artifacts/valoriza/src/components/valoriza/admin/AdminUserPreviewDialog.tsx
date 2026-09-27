import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Mail, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import {
  changeUserEmail,
  getAdminUserPreview,
  resetUserPassword,
  type AdminUserPreview,
} from "@/lib/valoriza-admin.functions";
import { useI18n } from "@/lib/i18n";

type Props = { userId: string; onClose: () => void };

function money(value: number) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function RecentActivity({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: { amount: number; status: string; network?: string; createdAt: string }[];
  emptyLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-3">
      <h3 className="mb-2 text-xs font-bold text-foreground">{title}</h3>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={`${item.createdAt}-${index}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 text-xs">
              <span className="font-bold text-foreground">{money(item.amount)} {item.network ?? ""}</span>
              <span className="text-muted-foreground">{item.status} · {new Date(item.createdAt).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      )}
    </section>
  );
}

export function AdminUserPreviewDialog({ userId, onClose }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const previewKey = ["admin-user-preview", userId];
  const { data, isLoading, isError } = useQuery({
    queryKey: previewKey,
    queryFn: () => getAdminUserPreview(userId),
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data?.user.email) setEmail(data.user.email);
  }, [data?.user.email]);

  const emailMutation = useMutation({
    mutationFn: changeUserEmail,
    onSuccess: (result) => {
      queryClient.setQueryData<AdminUserPreview>(previewKey, (current) =>
        current ? { ...current, user: { ...current.user, email: result.email } } : current,
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(t("admin.emailUpdated"));
    },
    onError: (error) => {
      const duplicate = error instanceof Error && error.message.includes("409");
      toast.error(t(duplicate ? "admin.emailInUse" : "common.error"));
    },
  });
  const passwordMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: () => {
      setNewPassword("");
      toast.success(t("admin.userPasswordReset"));
    },
    onError: () => toast.error(t("common.error")),
  });

  const saveEmail = (event: FormEvent) => {
    event.preventDefault();
    if (!data || emailMutation.isPending) return;
    const normalized = email.trim().toLowerCase();
    if (normalized === data.user.email.toLowerCase()) return;
    emailMutation.mutate({ userId, email: normalized });
  };
  const savePassword = (event: FormEvent) => {
    event.preventDefault();
    if (passwordMutation.isPending || newPassword.length < 8 ||
        new TextEncoder().encode(newPassword).length > 72) {
      toast.error(t("admin.userPasswordRule"));
      return;
    }
    passwordMutation.mutate({ userId, newPassword });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-preview-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-cyan-glow/40 bg-navy-deep p-4 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h2 id="admin-user-preview-title" className="flex items-center gap-2 text-base font-black text-foreground">
              <Eye className="h-5 w-5 text-cyan-glow" />
              {t("admin.previewUser")}
            </h2>
            <p className="mt-1 text-xs text-amber-400">{t("admin.previewReadOnly")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? <p className="py-12 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
          : isError || !data ? <p role="alert" className="py-12 text-center text-sm text-danger">{t("common.error")}</p>
          : (
            <div className="mt-4 space-y-4">
              <section className="grid gap-3 rounded-2xl border border-border bg-surface/60 p-4 text-xs sm:grid-cols-2">
                <div><span className="text-muted-foreground">{t("admin.user")}</span><p className="mt-1 font-bold text-foreground">{data.user.username}</p></div>
                <div><span className="text-muted-foreground">{t("admin.currentEmail")}</span><p className="mt-1 break-all font-bold text-foreground">{data.user.email}</p></div>
                <div><span className="text-muted-foreground">{t("admin.registrationDate")}</span><p className="mt-1 font-bold text-foreground">{new Date(data.user.createdAt).toLocaleDateString()}</p></div>
                <div><span className="text-muted-foreground">{t("admin.referralCode")}</span><p className="mt-1 font-bold text-foreground">{data.user.referralCode}</p></div>
                <div><span className="text-muted-foreground">{t("admin.vipRank")}</span><p className="mt-1 font-bold text-foreground">VIP {data.user.vipLevel}</p></div>
                <div><span className="text-muted-foreground">{t("admin.tasksCompleted")}</span><p className="mt-1 font-bold text-foreground">{data.tasksCompleted}</p></div>
                <div><span className="text-muted-foreground">{t("admin.phone")}</span><p className="mt-1 font-bold text-foreground">{data.user.phone || "—"}</p></div>
                <div><span className="text-muted-foreground">{t("common.status")}</span><p className="mt-1 font-bold text-foreground">{data.user.isBlocked ? t("admin.blocked") : t("status.active")}</p></div>
              </section>

              <section className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-3">
                {([
                  [t("admin.availableBalance"), data.wallet.balance],
                  [t("home.totalEarned"), data.wallet.totalEarned],
                  [t("admin.totalDeposits"), data.wallet.totalDeposited],
                  [t("admin.totalWithdrawals"), data.wallet.totalWithdrawn],
                  [t("home.investedBalance"), data.wallet.investedBalance],
                  [t("home.teamIncome"), data.wallet.teamIncome],
                ] as const).map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border bg-surface/60 p-3">
                    <p className="text-muted-foreground">{label}</p>
                    <p className="mt-1 font-black text-foreground">{money(value)}</p>
                  </div>
                ))}
              </section>

              <div className="grid gap-3 sm:grid-cols-3">
                <RecentActivity title={t("admin.depositsTab")} items={data.deposits} emptyLabel={t("admin.noRecentActivity")} />
                <RecentActivity title={t("admin.withdrawalsTab")} items={data.withdrawals} emptyLabel={t("admin.noRecentActivity")} />
                <RecentActivity title={t("admin.funds")} items={data.investments} emptyLabel={t("admin.noRecentActivity")} />
              </div>

              <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
                <form onSubmit={saveEmail} className="space-y-2 rounded-2xl border border-border bg-surface/60 p-4">
                  <label htmlFor="admin-user-email" className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Mail className="h-4 w-4 text-cyan-glow" />{t("admin.changeUserEmail")}
                  </label>
                  <input id="admin-user-email" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-border bg-navy-deep px-3 py-2 text-sm text-foreground focus:border-cyan-glow focus:outline-none" />
                  <button type="submit" disabled={emailMutation.isPending || email.trim().toLowerCase() === data.user.email.toLowerCase()}
                    className="rounded-xl border border-cyan-glow/50 px-4 py-2 text-xs font-bold text-cyan-glow disabled:opacity-50">
                    {emailMutation.isPending ? t("common.loading") : t("admin.saveUserEmail")}
                  </button>
                </form>
                <form onSubmit={savePassword} className="space-y-2 rounded-2xl border border-border bg-surface/60 p-4">
                  <label htmlFor="admin-user-password" className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-amber-400" />{t("admin.resetUserPassword")}
                  </label>
                  <input id="admin-user-password" type="password" autoComplete="new-password" required minLength={8}
                    value={newPassword} onChange={(event) => setNewPassword(event.target.value)}
                    placeholder={t("admin.newUserPassword")}
                    className="w-full rounded-xl border border-border bg-navy-deep px-3 py-2 text-sm text-foreground focus:border-cyan-glow focus:outline-none" />
                  <p className="text-[11px] text-muted-foreground">{t("admin.userPasswordRule")}</p>
                  <button type="submit" disabled={passwordMutation.isPending || !newPassword}
                    className="rounded-xl border border-amber-500/50 px-4 py-2 text-xs font-bold text-amber-400 disabled:opacity-50">
                    {passwordMutation.isPending ? t("common.loading") : t("admin.saveUserPassword")}
                  </button>
                </form>
              </div>
              <p className="text-xs text-muted-foreground">{t("admin.credentialsSessionsNotice")}</p>
            </div>
          )}
      </div>
    </div>
  );
}