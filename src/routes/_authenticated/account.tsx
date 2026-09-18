import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Mail, Phone, Crown, Ticket } from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getAccountData } from "@/lib/valoriza-pages.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "حسابي — Valoriza" },
      { name: "description", content: "بيانات حسابك ورصيدك ومستوى العضوية." },
      { property: "og:title", content: "حسابي — Valoriza" },
      { property: "og:description", content: "بيانات حسابك ورصيدك." },
    ],
  }),
  component: AccountPage,
});

const money = (n: number) => `$${n.toFixed(2)}`;

function AccountPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchData = useServerFn(getAccountData);
  const { data, isLoading } = useQuery({ queryKey: ["account"], queryFn: () => fetchData() });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader />
      <main className="mx-auto w-full max-w-lg px-4 pt-4">
        {isLoading || !data ? (
          <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : (
          <>
            <section className="surface-card glow-border p-5 text-center">
              <p className="text-lg font-extrabold text-foreground">{data.profile.username}</p>
              <p className="mt-1 text-xs text-muted-foreground">الرصيد المتاح</p>
              <p className="text-3xl font-extrabold text-gold-gradient">{money(data.balance)}</p>
            </section>

            <ul className="mt-4 space-y-2">
              <Row icon={Mail} label="البريد الإلكتروني" value={data.profile.email} />
              <Row icon={Phone} label="رقم الهاتف" value={data.profile.phone ?? "غير مضاف"} />
              <Row icon={Crown} label="مستوى العضوية" value={`VIP ${data.profile.vipLevel}`} />
              <Row icon={Ticket} label="رمز الدعوة" value={data.profile.referralCode} />
            </ul>

            <button
              type="button"
              onClick={signOut}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/60 px-4 py-3 text-sm font-extrabold text-danger"
            >
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </button>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <li className="surface-card flex items-center justify-between gap-2 px-3 py-3">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4 text-cyan-glow" /> {label}
      </span>
      <span className="truncate text-xs font-bold text-foreground">{value}</span>
    </li>
  );
}
