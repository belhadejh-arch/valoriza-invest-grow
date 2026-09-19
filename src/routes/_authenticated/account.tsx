import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  Coins,
  Crown,
  FileText,
  Gift,
  Headphones,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  Wallet,
  X,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getAccountData } from "@/lib/valoriza-pages.functions";
import { claimDailyLoginReward } from "@/lib/valoriza.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "حسابي — Valoriza" },
      {
        name: "description",
        content: "الملف الشخصي، رصيد الحساب، المكافأة اليومية وسجلات المعاملات.",
      },
      { property: "og:title", content: "حسابي — Valoriza" },
      { property: "og:description", content: "بيانات حسابك ورصيدك في منصة Valoriza." },
    ],
  }),
  component: AccountPage,
});

const money = (n: number) => `$${n.toFixed(2)}`;

function AccountPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchAccount = useServerFn(getAccountData);
  const claimDaily = useServerFn(claimDailyLoginReward);

  const { data, isLoading } = useQuery({
    queryKey: ["account"],
    queryFn: () => fetchAccount(),
  });

  const claimMutation = useMutation({
    mutationFn: () => claimDaily(),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(`تم الحصول على المكافأة اليومية بنجاح! +${money(res.amount)}`);
        qc.invalidateQueries({ queryKey: ["account"] });
        qc.invalidateQueries({ queryKey: ["home"] });
        qc.invalidateQueries({ queryKey: ["financial-records"] });
      } else {
        toast.info("لقد حصلت بالفعل على مكافأة اليوم، عد غداً مجدداً.");
      }
    },
    onError: () => toast.error("تعذر المطالبة بالمكافأة حالياً"),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن لا تقل عن 6 أحرف");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("تم تغيير كلمة المرور بنجاح");
      setPasswordModalOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء تغيير كلمة المرور");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-28" dir="rtl">
      <AppHeader />

      <main className="mx-auto w-full max-w-lg px-4 pt-4">
        {isLoading || !data ? (
          <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : (
          <>
            {/* User Profile Header matching PDF Page 4 */}
            <section className="surface-card glow-border p-5 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 h-28 w-28 rounded-full bg-cyan-glow/10 blur-2xl pointer-events-none" />

              <div className="flex items-center gap-3.5">
                {/* Avatar with VIP badge */}
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl brand-gradient text-primary-foreground font-black text-2xl shadow-glow">
                    {data.profile.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1.5 -left-1.5 flex items-center gap-0.5 rounded-full bg-navy-deep border border-gold px-1.5 py-0.5 text-[10px] font-extrabold text-gold shadow-md">
                    <Crown className="h-3 w-3 text-gold fill-gold" />
                    <span>VIP {data.profile.vipLevel}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-extrabold text-foreground truncate">
                      {data.profile.username}
                    </h1>
                    {data.profile.trialActive && (
                      <span className="rounded-full bg-cyan-glow/20 border border-cyan-glow/40 px-2 py-0.2 text-[10px] font-bold text-cyan-glow">
                        فترة تجريبية
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {data.profile.email}
                  </p>
                  <p className="text-[11px] text-cyan-glow font-mono mt-1 flex items-center gap-1">
                    <Ticket className="h-3 w-3" />
                    كود الدعوة:{" "}
                    <span className="font-bold select-all">{data.profile.referralCode}</span>
                  </p>
                </div>
              </div>
            </section>

            {/* Account Balance Card matching PDF Page 4 */}
            <section className="mt-4 surface-card glow-border p-5 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-cyan-glow to-transparent" />
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Wallet className="h-4 w-4 text-cyan-glow" />
                <span>رصيد الحساب</span>
              </div>
              <p className="text-3xl font-extrabold text-gold-gradient tracking-tight">
                {money(data.balance)}
              </p>

              {/* 3 Prominent Action Buttons matching PDF Page 4 */}
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                <Link
                  to="/deposit"
                  id="btn-account-deposit"
                  className="flex flex-col items-center justify-center rounded-2xl brand-gradient py-3 px-2 text-primary-foreground shadow-glow active:scale-[0.98] transition-all"
                >
                  <ArrowDownLeft className="h-5 w-5 mb-1 text-gold" />
                  <span className="text-xs font-extrabold">إيداع</span>
                </Link>

                <Link
                  to="/withdrawal"
                  id="btn-account-withdraw"
                  className="flex flex-col items-center justify-center rounded-2xl border border-electric/40 bg-surface/80 py-3 px-2 text-foreground hover:bg-surface active:scale-[0.98] transition-all"
                >
                  <ArrowUpRight className="h-5 w-5 mb-1 text-cyan-glow" />
                  <span className="text-xs font-extrabold">سحب</span>
                </Link>

                <Link
                  to="/support"
                  id="btn-account-support"
                  className="flex flex-col items-center justify-center rounded-2xl border border-gold/40 bg-surface/80 py-3 px-2 text-foreground hover:bg-surface active:scale-[0.98] transition-all"
                >
                  <Headphones className="h-5 w-5 mb-1 text-gold" />
                  <span className="text-xs font-extrabold">خدمة العملاء</span>
                </Link>
              </div>
            </section>

            {/* Daily Login Reward Section matching PDF Page 4 */}
            <section className="mt-4 surface-card glow-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/15 border border-gold/40 text-gold shadow-glow">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-foreground">
                      مكافأة تسجيل الدخول اليومية
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      مكافأة يومية قدرها{" "}
                      <span className="text-gold font-bold">{money(data.dailyReward.amount)}</span>{" "}
                      تضاف لرصيدك مباشرة
                    </p>
                  </div>
                </div>

                <button
                  id="btn-claim-daily-reward"
                  type="button"
                  disabled={data.dailyReward.claimed || claimMutation.isPending}
                  onClick={() => claimMutation.mutate()}
                  className={`shrink-0 rounded-xl px-4 py-2 text-xs font-extrabold shadow-md transition-all ${
                    data.dailyReward.claimed
                      ? "bg-surface text-muted-foreground border border-border cursor-not-allowed"
                      : "gold-gradient text-navy-deep shadow-gold-glow hover:brightness-110 active:scale-95"
                  }`}
                >
                  {data.dailyReward.claimed ? "تم الاستلام ✓" : "احصل عليه"}
                </button>
              </div>
            </section>

            {/* Account Menu Navigation matching PDF Page 4 */}
            <div className="mt-4 surface-card divide-y divide-border/50 overflow-hidden rounded-2xl">
              <Link
                to="/records"
                search={{ tab: "withdrawals" }}
                className="flex items-center justify-between p-3.5 hover:bg-surface/50 transition-colors"
              >
                <div className="flex items-center gap-3 text-xs font-bold text-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface border border-electric/40 text-cyan-glow">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  <span>سجل السحوبات</span>
                </div>
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                to="/records"
                search={{ tab: "deposits" }}
                className="flex items-center justify-between p-3.5 hover:bg-surface/50 transition-colors"
              >
                <div className="flex items-center gap-3 text-xs font-bold text-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface border border-gold/40 text-gold">
                    <ArrowDownLeft className="h-4 w-4" />
                  </div>
                  <span>سجل الإيداع</span>
                </div>
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                to="/records"
                search={{ tab: "transactions" }}
                className="flex items-center justify-between p-3.5 hover:bg-surface/50 transition-colors"
              >
                <div className="flex items-center gap-3 text-xs font-bold text-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface border border-border text-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                  <span>سجل المعاملات المالية</span>
                </div>
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </Link>

              <Link
                to="/records"
                search={{ tab: "rewards" }}
                className="flex items-center justify-between p-3.5 hover:bg-surface/50 transition-colors"
              >
                <div className="flex items-center gap-3 text-xs font-bold text-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface border border-gold/40 text-gold">
                    <Coins className="h-4 w-4" />
                  </div>
                  <span>سجل المكافآت</span>
                </div>
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </Link>

              <button
                type="button"
                onClick={() => setPasswordModalOpen(true)}
                className="w-full flex items-center justify-between p-3.5 hover:bg-surface/50 transition-colors text-right"
              >
                <div className="flex items-center gap-3 text-xs font-bold text-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface border border-border text-cyan-glow">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <span>تغيير كلمة المرور</span>
                </div>
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={signOut}
                className="w-full flex items-center justify-between p-3.5 hover:bg-danger/10 transition-colors text-right text-danger"
              >
                <div className="flex items-center gap-3 text-xs font-bold">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-danger/15 border border-danger/40 text-danger">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span>تسجيل الخروج</span>
                </div>
                <ChevronLeft className="h-4 w-4 text-danger/70" />
              </button>
            </div>
          </>
        )}
      </main>

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setPasswordModalOpen(false)}
        >
          <div
            className="w-full max-w-md surface-card glow-border p-5 relative"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-cyan-glow" />
                <span>تغيير كلمة المرور</span>
              </h3>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  placeholder="لا تقل عن 6 أحرف"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="w-full rounded-xl border border-border bg-navy px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  تأكيد كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  placeholder="أعد إدخال كلمة المرور"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="w-full rounded-xl border border-border bg-navy px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 rounded-xl brand-gradient py-2.5 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-50"
                >
                  {passwordLoading ? "جاري الحفظ..." : "حفظ كلمة المرور"}
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
