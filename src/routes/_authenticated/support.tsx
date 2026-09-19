import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  ChevronLeft,
  Headphones,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getCompanySettingsAndSupport } from "@/lib/valoriza-pages.functions";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [
      { title: "خدمة العملاء — Valoriza" },
      {
        name: "description",
        content: "تواصل مع فريق خدمة العملاء وقنوات الدعم الرسمية لمنصة Valoriza.",
      },
      { property: "og:title", content: "خدمة العملاء — Valoriza" },
      { property: "og:description", content: "قنوات التواصل والدعم الفني الرسمية." },
    ],
  }),
  component: SupportPage,
});

export function SupportPage() {
  const fetchSettings = useServerFn(getCompanySettingsAndSupport);
  const { data, isLoading } = useQuery({
    queryKey: ["support-links"],
    queryFn: () => fetchSettings(),
  });

  const links = data?.supportLinks ?? [
    {
      id: "sup-1",
      label: "موظف الاستقبال",
      sublabel: "على تيليجرام",
      platform: "telegram",
      url: "https://t.me/valoriza_support",
    },
    {
      id: "sup-2",
      label: "موظف الاستقبال",
      sublabel: "على واتساب",
      platform: "whatsapp",
      url: "https://wa.me/34600000000",
    },
    {
      id: "sup-3",
      label: "المجموعة الرسمية",
      sublabel: "على تيليجرام",
      platform: "telegram",
      url: "https://t.me/valoriza_official_group",
    },
    {
      id: "sup-4",
      label: "المجموعة الرسمية",
      sublabel: "على واتساب",
      platform: "whatsapp",
      url: "https://chat.whatsapp.com/valoriza_vip",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-28" dir="rtl">
      <AppHeader />

      <main className="mx-auto w-full max-w-lg px-4 pt-4">
        {/* Navigation Breadcrumb */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/account"
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة للحساب</span>
          </Link>
          <span className="text-xs font-extrabold text-cyan-glow flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> قنوات موثوقة ومعتمدة
          </span>
        </div>

        {/* Page Hero Card matching PDF Page 13 */}
        <section className="surface-card glow-border p-5 text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-cyan-glow/10 blur-2xl pointer-events-none" />
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface border border-cyan-glow/40 text-cyan-glow mb-2 shadow-glow">
            <Headphones className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground">خدمة العملاء</h1>
          <p className="mt-1 text-sm font-bold text-gold-gradient">تواصل معنا وسنكون في خدمتك</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            فريق الدعم الفني متواجد على مدار 24 ساعة للإجابة على استفساراتكم ومساعدتكم
          </p>
        </section>

        {/* 4 Glowing Cards matching PDF Page 13 */}
        <div className="mt-4 space-y-3">
          {isLoading ? (
            <p className="py-12 text-center text-xs text-muted-foreground">جارٍ تحميل القنوات...</p>
          ) : (
            links.map((item) => {
              const isTelegram = item.platform === "telegram";
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="surface-card glow-border p-4 flex items-center justify-between gap-3 group hover:border-cyan-glow transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-glow ${
                        isTelegram
                          ? "bg-sky-500/20 border-sky-400 text-sky-400"
                          : "bg-emerald-500/20 border-emerald-400 text-emerald-400"
                      }`}
                    >
                      {isTelegram ? (
                        <Send className="h-6 w-6 ml-0.5" />
                      ) : (
                        <MessageCircle className="h-6 w-6" />
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-foreground group-hover:text-cyan-glow transition-colors">
                        {item.label}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.sublabel}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-cyan-glow group-hover:translate-x-[-3px] transition-transform">
                    <span>تواصل الآن</span>
                    <ChevronLeft className="h-4 w-4" />
                  </div>
                </a>
              );
            })
          )}
        </div>

        {/* Working hours card */}
        <div className="mt-6 rounded-2xl border border-gold/30 bg-surface/80 p-4 text-center">
          <p className="text-xs font-extrabold text-gold flex items-center justify-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            <span>نحن هنا لمساعدتك دائماً</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
            جميع القنوات الرسمية موثقة ومعتمدة من إدارة Valoriza، تجنب مشاركة بيانات المرور أو
            الرموز السرية مع أي شخص.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
