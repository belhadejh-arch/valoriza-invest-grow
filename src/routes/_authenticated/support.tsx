import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Headphones,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Clock,
} from "lucide-react";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { getCompanySettingsAndSupport } from "@/lib/valoriza-pages.functions";
import { useI18n } from "@/lib/i18n";

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
  const { t, isRTL } = useI18n();
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

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div
      className="min-h-screen bg-background pb-28 md:pb-12 text-foreground"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/account"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <BackArrow className="h-4 w-4" />
            <span>{t("support.backToAccount")}</span>
          </Link>
          <span className="text-xs font-bold text-cyan-glow flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span>{t("support.officialChannels")}</span>
          </span>
        </div>

        {/* Hero Card */}
        <section className="surface-card glow-border p-6 sm:p-8 rounded-3xl text-center relative overflow-hidden shadow-xl">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-cyan-glow/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-gold/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-xl mx-auto space-y-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-surface border border-cyan-glow/40 text-cyan-glow mb-2 shadow-glow">
              <Headphones className="h-7 w-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {t("support.title")}
            </h1>
            <p className="text-sm font-black text-gold-gradient">{t("support.subtitle")}</p>
            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-cyan-glow" />
              <span>{t("support.workingHours")}</span>
            </div>
          </div>
        </section>

        {/* 4 Glowing Cards in Responsive Grid (1 column on mobile, 2 columns on tablet/desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {isLoading ? (
            <div className="col-span-full py-16 text-center text-xs text-muted-foreground">
              <div className="h-7 w-7 mx-auto animate-spin rounded-full border-2 border-cyan-glow border-t-transparent mb-2" />
              <p>{t("common.loading")}</p>
            </div>
          ) : (
            links.map((item) => {
              const isTelegram = item.platform === "telegram";
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="surface-card glow-border p-5 rounded-3xl flex items-center justify-between gap-4 group hover:border-cyan-glow transition-all active:scale-[0.98] shadow-lg"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-glow transition-transform group-hover:scale-105 ${
                        isTelegram
                          ? "bg-sky-500/20 border-sky-400 text-sky-400"
                          : "bg-emerald-500/20 border-emerald-400 text-emerald-400"
                      }`}
                    >
                      {isTelegram ? (
                        <Send className="h-6 w-6 ml-0.5 rtl:ml-0 rtl:mr-0.5" />
                      ) : (
                        <MessageCircle className="h-6 w-6" />
                      )}
                    </div>

                    <div className="min-w-0 text-start">
                      <h3 className="text-sm font-black text-foreground group-hover:text-cyan-glow transition-colors truncate">
                        {item.label}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {item.sublabel}
                      </p>
                      <span className="text-[10px] font-bold text-gold uppercase tracking-wider block mt-1">
                        {isTelegram ? "Telegram" : "WhatsApp"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-black text-cyan-glow shrink-0 group-hover:translate-x-[-3px] rtl:group-hover:translate-x-[3px] transition-transform">
                    <span>{t("support.contactNow")}</span>
                    <Chevron className="h-4 w-4" />
                  </div>
                </a>
              );
            })
          )}
        </div>

        {/* Security & Verification Card */}
        <div className="rounded-3xl border border-gold/30 surface-card p-5 text-center space-y-1">
          <p className="text-xs font-black text-gold flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>{t("support.alwaysHere")}</span>
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl mx-auto">
            {t("support.securityNotice")}
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
