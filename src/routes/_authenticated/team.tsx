import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Award,
  Check,
  Coins,
  Copy,
  Layers,
  Percent,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getTeamData } from "@/lib/valoriza-pages.functions";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "فريقي — Valoriza" },
      {
        name: "description",
        content: "معاً نحقق المزيد: إدارة فريقك وعمولات الإحالة على 3 مستويات.",
      },
      { property: "og:title", content: "فريقي — Valoriza" },
      { property: "og:description", content: "أعضاء فريقك وأرباح الإحالة." },
    ],
  }),
  component: TeamPage,
});

const money = (n: number) => `$${n.toFixed(2)}`;

function TeamPage() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | null>(null);

  const fetchData = useServerFn(getTeamData);
  const { data, isLoading } = useQuery({ queryKey: ["team"], queryFn: () => fetchData() });

  const referralCode = data?.referralCode || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = `${origin}/?ref=${referralCode}`;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      toast.success("تم نسخ رمز الدعوة بنجاح!");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error("تعذر نسخ الرمز");
    }
  }

  async function shareOrCopyLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "انضم إلى فريقي في Valoriza",
          text: `ابدأ استثمارك الذكي وحقق أرباحاً يومية مع Valoriza. استخدم كود الدعوة: ${referralCode}`,
          url: referralLink,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      toast.success("تم نسخ رابط الدعوة بنجاح!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("تعذر نسخ الرابط");
    }
  }

  // Level percentages from settings or standard
  const levelPercentages: Record<number, string> = {
    1: "8%",
    2: "4%",
    3: "1%",
  };

  const filteredMembers =
    data?.members && selectedLevelFilter !== null
      ? data.members.filter((m) => m.level === selectedLevelFilter)
      : data?.members || [];

  return (
    <div className="min-h-screen bg-background pb-28" dir="rtl">
      <AppHeader />

      <main className="mx-auto w-full max-w-lg px-4 pt-4">
        {isLoading || !data ? (
          <p className="py-16 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : (
          <>
            {/* Team Hero Card matching PDF Page 5 */}
            <section className="surface-card glow-border p-5 text-center relative overflow-hidden">
              <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-cyan-glow/10 blur-2xl pointer-events-none" />

              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface border border-cyan-glow/40 text-cyan-glow mb-2 shadow-glow">
                <Users className="h-6 w-6" />
              </div>

              <h1 className="text-xl font-extrabold text-foreground">فريقي</h1>
              <p className="mt-1 text-sm font-bold text-gold-gradient">معاً نحقق المزيد</p>
              <p className="mt-1 text-xs text-muted-foreground">
                شارك كود الإحالة مع أصدقائك واكسب عمولات يومية مستمرة على 3 مستويات
              </p>

              {/* Referral Code & Share Link Box matching PDF Page 5 */}
              <div className="mt-4 rounded-2xl border border-border/80 bg-navy-deep/80 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">
                      رمز الدعوة الخاص بك
                    </span>
                    <span className="text-base font-extrabold tracking-widest text-gold font-mono select-all">
                      {referralCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      id="btn-copy-team-code"
                      type="button"
                      onClick={copyCode}
                      className="flex items-center gap-1 rounded-xl brand-gradient px-3 py-2 text-xs font-bold text-primary-foreground shadow-glow active:scale-95 transition-all"
                    >
                      {copiedCode ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{copiedCode ? "تم النسخ" : "نسخ الكود"}</span>
                    </button>

                    <button
                      id="btn-share-team-link"
                      type="button"
                      onClick={shareOrCopyLink}
                      className="flex items-center gap-1 rounded-xl border border-electric/40 bg-surface px-3 py-2 text-xs font-bold text-cyan-glow hover:bg-surface/80 active:scale-95 transition-all"
                    >
                      {copiedLink ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Share2 className="h-3.5 w-3.5" />
                      )}
                      <span>{copiedLink ? "تم النسخ" : "مشاركة الرابط"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 3 Key Team Metrics Cards matching PDF Page 5 */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="surface-card glow-border p-3 text-center">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-gold/15 text-gold border border-gold/30 mb-1.5">
                  <Award className="h-4 w-4" />
                </div>
                <p className="text-[10px] text-muted-foreground font-bold">مكافآت الفريق</p>
                <p className="mt-0.5 text-sm font-extrabold text-gold-gradient">
                  {money(data.teamRewards)}
                </p>
              </div>

              <div className="surface-card glow-border p-3 text-center">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-glow/15 text-cyan-glow border border-cyan-glow/30 mb-1.5">
                  <Users className="h-4 w-4" />
                </div>
                <p className="text-[10px] text-muted-foreground font-bold">عدد أعضاء الفريق</p>
                <p className="mt-0.5 text-sm font-extrabold text-foreground">
                  {data.totalMembers}{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">عضو</span>
                </p>
              </div>

              <div className="surface-card glow-border p-3 text-center">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-success/15 text-success border border-success/30 mb-1.5">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <p className="text-[10px] text-muted-foreground font-bold">إجمالي دخل الفريق</p>
                <p className="mt-0.5 text-sm font-extrabold text-success">
                  {money(data.teamIncome)}
                </p>
              </div>
            </div>

            {/* 3 Referral Levels matching PDF Page 5 */}
            <section className="mt-5">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-cyan-glow" />
                  <span>مستويات الإحالة والعمولات</span>
                </h2>
                {selectedLevelFilter !== null && (
                  <button
                    type="button"
                    onClick={() => setSelectedLevelFilter(null)}
                    className="text-[11px] font-bold text-cyan-glow hover:underline"
                  >
                    عرض جميع المستويات
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {data.levels.map((lvl) => {
                  const isSelected = selectedLevelFilter === lvl.level;
                  const rate = levelPercentages[lvl.level] || "—";
                  return (
                    <button
                      key={lvl.level}
                      type="button"
                      onClick={() => setSelectedLevelFilter(isSelected ? null : lvl.level)}
                      className={`surface-card p-3 text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-cyan-glow bg-surface shadow-[0_0_12px_oklch(0.82_0.14_205/0.25)] ring-1 ring-cyan-glow"
                          : "hover:border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 text-[11px]">
                        <span className="font-extrabold text-foreground">المستوى {lvl.level}</span>
                        <span className="rounded-full bg-gold/20 border border-gold/40 px-1.5 py-0.2 text-[9px] font-bold text-gold">
                          {rate}
                        </span>
                      </div>

                      <div className="mt-2 text-right space-y-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>الأعضاء:</span>
                          <span className="font-bold text-foreground">{lvl.members}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>الأرباح:</span>
                          <span className="font-bold text-success">{money(lvl.earnings)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Commission calculation rule note matching PDF */}
              <div className="mt-3 rounded-xl border border-border/70 bg-surface/60 p-3 text-[11px] text-muted-foreground leading-relaxed flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-glow shrink-0" />
                <span>
                  تحسب العمولات تلقائياً عبر نظام المنصة الذكي عند قيام أعضاء فريقك بالاستثمار أو
                  ترقية باقات VIP.
                </span>
              </div>
            </section>

            {/* Team Members List */}
            <section className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-gold" />
                  <span>
                    أعضاء الفريق{" "}
                    {selectedLevelFilter !== null
                      ? `(المستوى ${selectedLevelFilter})`
                      : `(${data.totalMembers})`}
                  </span>
                </h2>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="surface-card p-6 text-center text-xs text-muted-foreground">
                  {selectedLevelFilter !== null
                    ? `لا يوجد أعضاء في المستوى ${selectedLevelFilter} بعد.`
                    : "لا يوجد أعضاء بعد. شارك كود الإحالة لتبدأ بناء فريقك وجني العمولات!"}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMembers.map((m, i) => (
                    <div
                      key={`${m.email}-${i}`}
                      className="surface-card p-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface border border-border text-foreground font-bold">
                          {m.email.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-foreground truncate max-w-[180px]">
                            {m.email}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            المستوى {m.level} • {levelPercentages[m.level]} عمولة
                          </p>
                        </div>
                      </div>

                      <div className="text-left">
                        <span className="rounded-full bg-gold/15 border border-gold/40 px-2 py-0.5 text-[10px] font-extrabold text-gold">
                          VIP {m.vipLevel}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
