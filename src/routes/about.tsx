import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Headphones, ShieldCheck, Users } from "lucide-react";

import { Logo } from "@/components/valoriza/Logo";
import { getAboutData } from "@/lib/valoriza-pages.functions";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "حول المنصة — Valoriza" },
      {
        name: "description",
        content: "Valoriza منصة استثمار عالمية: استثمر اليوم .. ابنِ الغد. أمان عالي ودعم دائم.",
      },
      { property: "og:title", content: "حول المنصة — Valoriza" },
      { property: "og:description", content: "Valoriza منصة استثمار عالمية: استثمر اليوم .. ابنِ الغد." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const fetchData = useServerFn(getAboutData);
  const { data } = useQuery({ queryKey: ["about"], queryFn: () => fetchData() });
  const members = data?.settings["members_count"];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-lg px-4 pb-12 pt-6">
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/"
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
          >
            رجوع <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Logo size="sm" />
        </div>

        <section className="mt-5 surface-card glow-border p-5 text-center">
          <h1 className="text-2xl font-extrabold text-gold-gradient">Valoriza</h1>
          <p className="mt-1 text-sm font-bold text-foreground">استثمر اليوم .. ابنِ الغد</p>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            منصة عالمية توفر فرصاً حقيقية لربح المال عبر باقات العضوية وصناديق التوفير والمهام
            اليومية ونظام الإحالة على ثلاثة مستويات، بأمان عالي ودعم متواصل.
          </p>
          {members && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-cyan-glow">
              <Users className="h-4 w-4" /> أكثر من {Number(members).toLocaleString("ar")} عضو
            </p>
          )}
        </section>

        <ul className="mt-4 grid grid-cols-2 gap-2">
          <li className="surface-card px-3 py-4 text-center">
            <ShieldCheck className="mx-auto h-5 w-5 text-cyan-glow" />
            <p className="mt-1.5 text-xs font-semibold text-foreground">حماية الأموال</p>
          </li>
          <li className="surface-card px-3 py-4 text-center">
            <Headphones className="mx-auto h-5 w-5 text-cyan-glow" />
            <p className="mt-1.5 text-xs font-semibold text-foreground">دعم على مدار الساعة</p>
          </li>
        </ul>

        {data && data.supportLinks.length > 0 && (
          <section className="mt-5">
            <h2 className="text-base font-extrabold text-foreground">خدمة العملاء</h2>
            <ul className="mt-3 space-y-2">
              {data.supportLinks.map((l) => (
                <li key={l.id}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="surface-card flex items-center justify-between gap-2 px-3 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-foreground">{l.label}</span>
                      {l.sublabel && (
                        <span className="block truncate text-[11px] text-muted-foreground">{l.sublabel}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-cyan-glow">فتح</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
