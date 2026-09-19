import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Gift } from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getRewardsData } from "@/lib/valoriza-pages.functions";
import { claimDailyLoginReward } from "@/lib/valoriza.functions";

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({
    meta: [
      { title: "المكافآت — Valoriza" },
      { name: "description", content: "سجل مكافآتك اليومية وجوائز عجلة الحظ." },
      { property: "og:title", content: "المكافآت — Valoriza" },
      { property: "og:description", content: "سجل مكافآتك اليومية وجوائزك." },
    ],
  }),
  component: RewardsPage,
});

const money = (n: number) => `$${n.toFixed(2)}`;

function RewardsPage() {
  const qc = useQueryClient();
  const fetchData = useServerFn(getRewardsData);
  const claim = useServerFn(claimDailyLoginReward);
  const { data, isLoading } = useQuery({ queryKey: ["rewards"], queryFn: () => fetchData() });

  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: (res) => {
      toast[res.ok ? "success" : "error"](
        res.ok ? "تم استلام المكافأة" : "تم الاستلام مسبقاً اليوم",
      );
      qc.invalidateQueries({ queryKey: ["rewards"] });
      qc.invalidateQueries({ queryKey: ["home"] });
    },
    onError: () => toast.error("تعذر استلام المكافأة"),
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader />
      <main className="mx-auto w-full max-w-lg px-4 pt-4">
        {isLoading || !data ? (
          <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : (
          <>
            <section className="surface-card glow-border p-5 text-center">
              <p className="text-xs text-muted-foreground">إجمالي المكافآت</p>
              <p className="mt-1 text-3xl font-extrabold text-gold-gradient">
                {money(data.totalRewards)}
              </p>
              <button
                type="button"
                disabled={data.dailyRewardClaimed || claimMutation.isPending}
                onClick={() => claimMutation.mutate()}
                className="mt-4 w-full rounded-2xl gold-gradient px-4 py-2.5 text-sm font-extrabold text-navy-deep disabled:opacity-50"
              >
                <Gift className="ml-1 inline h-4 w-4" />
                {data.dailyRewardClaimed
                  ? "تم استلام مكافأة اليوم"
                  : `استلام مكافأة اليوم ${money(data.dailyRewardAmount)}`}
              </button>
            </section>

            <h2 className="mt-5 text-base font-extrabold text-foreground">السجل</h2>
            {data.rewards.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">لا توجد مكافآت بعد.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.rewards.map((r) => (
                  <li
                    key={r.id}
                    className="surface-card flex items-center justify-between gap-2 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {r.description ?? r.source}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString("ar")}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold text-success">
                      +{money(r.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
