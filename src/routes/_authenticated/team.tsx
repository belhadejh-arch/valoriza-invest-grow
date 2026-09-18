import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Users } from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getTeamData } from "@/lib/valoriza-pages.functions";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "فريقي — Valoriza" },
      { name: "description", content: "أعضاء فريقك وعمولات الإحالة على ثلاثة مستويات." },
      { property: "og:title", content: "فريقي — Valoriza" },
      { property: "og:description", content: "أعضاء فريقك وعمولات الإحالة." },
    ],
  }),
  component: TeamPage,
});

const money = (n: number) => `$${n.toFixed(2)}`;

function TeamPage() {
  const fetchData = useServerFn(getTeamData);
  const { data, isLoading } = useQuery({ queryKey: ["team"], queryFn: () => fetchData() });

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("تم نسخ رمز الدعوة");
    } catch {
      toast.error("تعذر النسخ");
    }
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
              <p className="text-xs text-muted-foreground">دخل الفريق</p>
              <p className="mt-1 text-3xl font-extrabold text-gold-gradient">{money(data.teamIncome)}</p>
              <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-border bg-navy-deep/60 px-3 py-2.5">
                <span className="truncate text-sm font-bold tracking-widest text-foreground">
                  {data.referralCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyCode(data.referralCode)}
                  className="flex shrink-0 items-center gap-1 rounded-xl gold-gradient px-3 py-1.5 text-xs font-extrabold text-navy-deep"
                >
                  <Copy className="h-3.5 w-3.5" /> نسخ
                </button>
              </div>
            </section>

            <ul className="mt-4 grid grid-cols-3 gap-2">
              {data.levels.map((l) => (
                <li key={l.level} className="surface-card px-2 py-3 text-center">
                  <p className="text-[11px] text-muted-foreground">المستوى {l.level}</p>
                  <p className="mt-1 text-sm font-extrabold text-foreground">{l.members} عضو</p>
                  <p className="text-[11px] text-success">{money(l.earnings)}</p>
                </li>
              ))}
            </ul>

            <section className="mt-4 surface-card p-4">
              <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <Users className="h-4 w-4 text-cyan-glow" /> الأعضاء ({data.totalMembers})
              </p>
              {data.members.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  لا يوجد أعضاء بعد. شارك رمز الدعوة لتبدأ بناء فريقك.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.members.map((m, i) => (
                    <li
                      key={`${m.email}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border bg-navy-deep/60 px-3 py-2"
                    >
                      <span className="truncate text-xs text-foreground">{m.email}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        م{m.level} • VIP {m.vipLevel}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
