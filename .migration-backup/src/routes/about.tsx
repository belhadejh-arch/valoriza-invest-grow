import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Building2,
  Calendar,
  Compass,
  Headphones,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Vault,
} from "lucide-react";

import { Logo } from "@/components/valoriza/Logo";
import { getAboutData } from "@/lib/valoriza-pages.functions";
import { LoadingState, ErrorState } from "@/components/valoriza/StatusStates";
import { CustomerServiceModal } from "@/components/valoriza/CustomerServiceModal";
import madridHQImg from "@/assets/images/madrid_hq_1789808765652.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "حول المنصة — Valoriza" },
      {
        name: "description",
        content:
          "تعرف على شركة Valoriza للاستثمار: مقرنا في مدريد، إسبانيا، رؤيتنا، أهدافنا وأرقامنا القياسية.",
      },
      { property: "og:title", content: "حول المنصة — Valoriza" },
      {
        property: "og:description",
        content: "استثمر اليوم .. لبناء مستقبلك غداً مع منصة Valoriza.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const [supportOpen, setSupportOpen] = useState(false);
  const fetchData = useServerFn(getAboutData);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["about"],
    queryFn: () => fetchData(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <LoadingState message="جاري تحميل معلومات المنصة..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <ErrorState
          title="تعذر تحميل بيانات المنصة"
          description="يرجى المحاولة مجدداً للاتصال بقاعدة البيانات."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const s = data.settings;
  const companyDesc =
    s.about_company ||
    "تأسست شركة Valoriza للاستثمار في عام 2018 في العاصمة، ويقع مقرها الرئيسي في مدريد، إسبانيا. تعمل على توفير فرص استثمارية مبتكرة وآمنة لعملائنا حول العالم.";
  const visionText =
    s.platform_vision ||
    "ريادة الاستثمار الرقمي العالمي وتقديم أفضل عائد مستدام وتوفير بيئة مالية آمنة وشفافة لجميع المستثمرين حول العالم.";
  const goalsText =
    s.platform_goals ||
    "تنمية الثروات الفردية وتوفير دخل يومي مستدام، حماية رؤوس الأموال، وتقديم حلول مالية مبتكرة تدعم الاستقرار المالي.";
  const membersCount = s.members_count || "75,000";
  const establishedYear = s.established_year || "2018";
  const headquarters = s.headquarters || "مدريد، إسبانيا";
  const fundsCount = s.funds_count || "4 صناديق استثمارية";

  return (
    <div id="about-page" className="min-h-screen bg-background" dir="rtl">
      {/* Top Header matching Section 4 */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-navy-deep/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link
            id="about-back-btn"
            to="/home"
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-glow/50 bg-surface/70 px-3 py-1.5 text-xs font-bold text-cyan-glow hover:bg-surface transition-all shadow-[0_0_10px_oklch(0.82_0.14_205/0.2)]"
          >
            <ArrowRight className="h-4 w-4" />
            <span>الرجوع للرئيسية</span>
          </Link>
          <Logo size="sm" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-4 pb-16 space-y-4">
        {/* Madrid Headquarters Hero Banner matching Section 4 */}
        <section id="about-hq-banner" className="surface-card glow-border overflow-hidden">
          <div className="relative h-44 sm:h-52 w-full">
            <img
              src={madridHQImg}
              alt="المقر الرئيسي لشركة Valoriza في مدريد، إسبانيا"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/60 to-transparent" />

            <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-navy-deep/90 border border-gold/50 px-2.5 py-0.5 text-[11px] font-extrabold text-gold shadow-gold-glow">
                  <Building2 className="h-3.5 w-3.5 text-gold" />
                  المقر الرئيسي
                </span>
                <h1 className="mt-1 text-xl sm:text-2xl font-black text-foreground drop-shadow-md">
                  فالوريزا للاستثمار
                </h1>
              </div>

              <div className="text-start">
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-glow/20 border border-cyan-glow/40 px-2 py-0.5 text-[11px] font-bold text-cyan-glow">
                  <MapPin className="h-3 w-3" />
                  {headquarters}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 pt-2">
            <p className="text-xs sm:text-sm font-semibold text-foreground/90 leading-relaxed text-justify">
              {companyDesc}
            </p>
          </div>
        </section>

        {/* Key Statistics Grid matching Section 4 */}
        <section id="about-statistics-section">
          <h2 className="text-sm font-extrabold text-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-gold" />
            أرقام وإحصائيات المنصة
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Stat 1: Year */}
            <div className="surface-card p-3 border-border/80 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface border border-gold/40 text-gold">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">سنة التأسيس</p>
                <p className="text-base font-black text-gold-gradient">{establishedYear}</p>
              </div>
            </div>

            {/* Stat 2: Members */}
            <div className="surface-card p-3 border-border/80 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface border border-cyan-glow/40 text-cyan-glow">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">الأعضاء النشطون</p>
                <p className="text-base font-black text-cyan-glow">+{membersCount}</p>
              </div>
            </div>

            {/* Stat 3: HQ Location */}
            <div className="surface-card p-3 border-border/80 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface border border-primary/40 text-electric">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">المقر الرسمي</p>
                <p className="text-xs font-black text-foreground">{headquarters}</p>
              </div>
            </div>

            {/* Stat 4: Funds */}
            <div className="surface-card p-3 border-border/80 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface border border-success/40 text-success">
                <Vault className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  الصناديق الاستثمارية
                </p>
                <p className="text-xs font-black text-success">{fundsCount}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Vision matching Section 4 */}
        <section id="about-vision-card" className="surface-card glow-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface border border-cyan-glow/50 text-cyan-glow">
              <Compass className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-extrabold text-foreground">رؤية المنصة</h3>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground text-justify">{visionText}</p>
        </section>

        {/* Platform Goals matching Section 4 */}
        <section id="about-goals-card" className="surface-card glow-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface border border-gold/50 text-gold">
              <Target className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-extrabold text-foreground">أهداف المنصة</h3>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground text-justify">{goalsText}</p>
        </section>

        {/* Trust and Security Pills */}
        <section className="grid grid-cols-2 gap-2.5">
          <div className="surface-card p-3 text-center border-border/70">
            <ShieldCheck className="mx-auto h-6 w-6 text-cyan-glow mb-1" />
            <p className="text-xs font-bold text-foreground">حماية وأمان كامل</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">معاملات مشفرة 100%</p>
          </div>

          <div
            onClick={() => setSupportOpen(true)}
            className="surface-card p-3 text-center border-border/70 cursor-pointer hover:border-cyan-glow transition-all"
          >
            <Headphones className="mx-auto h-6 w-6 text-gold mb-1" />
            <p className="text-xs font-bold text-foreground">دعم فني 24/7</p>
            <p className="text-[10px] text-cyan-glow mt-0.5 font-bold">تواصل الآن ›</p>
          </div>
        </section>

        {/* Quick Return Action Button */}
        <div className="pt-2">
          <Link
            id="about-bottom-home-btn"
            to="/home"
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl brand-gradient py-3.5 text-sm font-extrabold text-primary-foreground shadow-glow active:scale-[0.99] transition-all"
          >
            <span>العودة إلى الصفحة الرئيسية</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      {/* Customer service modal */}
      <CustomerServiceModal
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        customLinks={data.supportLinks.map((l: any) => ({
          title: l.label,
          subtitle: l.sublabel || "",
          platform: l.platform,
          url: l.url,
        }))}
      />
    </div>
  );
}
