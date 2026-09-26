import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Coins,
  Gift,
  Headphones,
  Info,
  MapPin,
  Sparkles,
  TrendingUp,
  Users,
  Vault,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import { LuckyWheel } from "@/components/valoriza/LuckyWheel";
import { CustomerServiceModal } from "@/components/valoriza/CustomerServiceModal";
import { DepositModal, WithdrawalModal, SavingsFundModal } from "@/components/valoriza/QuickModals";
import { getHomeData, claimDailyLoginReward, spinLuckyWheel } from "@/lib/valoriza.functions";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";
import heroCityImg from "@/assets/hero-city.webp";
import madridHQImg from "@/assets/images/madrid-hq.webp";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

const money = (n: number) => `$${n.toFixed(2)}`;

// Slides for the Hero Banner matching Section 3
const HERO_SLIDES = [
  {
    titleKey: "home.slideInvest",
    subtitleKey: "home.slideFuture",
    captionKey: "home.slideSafe",
    ctaKey: "home.startNow",
    ctaTo: "/investment",
  },
  {
    titleKey: "home.slideFunds",
    subtitleKey: "home.slideProfit",
    captionKey: "home.slidePlans",
    ctaKey: "home.exploreFunds",
    ctaTo: "/investment",
  },
  {
    titleKey: "home.slideTeam",
    subtitleKey: "home.slideCommission",
    captionKey: "home.slideReferral",
    ctaKey: "home.viewTeam",
    ctaTo: "/team",
  },
];

function HomePage() {
  const qc = useQueryClient();
  const fetchHome = getHomeData;
  const claim = claimDailyLoginReward;
  const spin = spinLuckyWheel;
  const { t, isRTL, lang } = useI18n();
  const content = useLocalizedContent();

  const [slideIndex, setSlideIndex] = useState(0);

  // Quick Action Modal states
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [savingsOpen, setSavingsOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["home"],
    queryFn: () => fetchHome(),
    refetchInterval: 60_000,
  });

  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: (res: any) => {
      if (res.ok) {
        toast.success(`${t("home.claimDaily")} ${t("common.success")}`);
      } else {
        toast.error(t("home.claimedDaily"));
      }
      qc.invalidateQueries({ queryKey: ["home"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const nextSlide = () => {
    setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background pb-28 text-foreground" dir={isRTL ? "rtl" : "ltr"}>
        <AppHeader />
        <div className="flex justify-center items-center h-64">
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-[100dvh] bg-background pb-28 text-foreground" dir={isRTL ? "rtl" : "ltr"}>
        <AppHeader />
        <div className="flex justify-center items-center h-64">
          <p className="text-danger">{t("common.error")}</p>
        </div>
      </div>
    );
  }

  const prevSlide = () => {
    setSlideIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const currentSlide = HERO_SLIDES[slideIndex];
  const settings = data.settings;
  const companyInfo = settings.about_company
    ? content(settings.about_company)
    : t("home.companyDescription");
  const membersCount = settings.members_count;
  const hasMembersCount =
    membersCount !== null &&
    membersCount !== undefined &&
    String(membersCount).trim().length > 0 &&
    Number.isFinite(Number(String(membersCount).replace(/,/g, "")));

  return (
    <div
      id="home-page-container"
      className="min-h-screen bg-background text-foreground pb-24 md:pb-12 transition-colors"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* 1. App Header with Hamburger & Profile & Desktop Navigation */}
      <AppHeader
        vipLevel={data.profile.vipLevel}
        username={content(data.profile.username, { allowUserIdentifier: true })}
        balance={data.wallet.balance}
        onOpenDeposit={() => setDepositOpen(true)}
        onOpenWithdraw={() => setWithdrawalOpen(true)}
        onOpenSupport={() => setSupportOpen(true)}
      />

      <main className="mx-auto w-full max-w-7xl px-3 sm:px-6 pt-3 sm:pt-5 space-y-4 sm:space-y-6">
        {/* =========================================================================
            2. Hero Banner with Carousel Controls matching Section 3
            ========================================================================= */}
        <section
          id="home-hero-banner"
          className="relative surface-card glow-border overflow-hidden rounded-3xl min-h-[200px] sm:min-h-[240px] flex items-center shadow-xl"
        >
          {/* Background Hero Image */}
          <img
            src={heroCityImg}
            alt={t("home.heroAlt")}
            width={1280}
            height={720}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover brightness-[0.38] contrast-125 transition-all duration-700"
          />

          {/* Glowing Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-navy-deep/95 via-navy-deep/60 to-transparent" />

          {/* Slide Text Content */}
          <div className="relative z-10 w-full p-4 sm:p-6 md:p-8 flex flex-col justify-between min-h-[200px] sm:min-h-[240px] text-start">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 px-2.5 py-0.5 text-[10px] sm:text-xs font-extrabold text-gold shadow-gold-glow">
                <Sparkles className="h-3 w-3" />
                {t(currentSlide.titleKey)}
              </span>
              <h2 className="mt-1.5 text-2xl sm:text-3xl md:text-4xl font-black text-white drop-shadow-md">
                {t(currentSlide.subtitleKey)}
              </h2>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-cyan-glow drop-shadow">
                {t(currentSlide.captionKey)}
              </p>
            </div>

            {/* CTA Button and Navigation Arrows */}
            <div className="mt-4 flex items-center justify-between">
              <Link
                id="hero-cta-btn"
                to={currentSlide.ctaTo}
                className="inline-flex items-center gap-2 rounded-2xl gold-gradient px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-black text-navy-deep shadow-gold-glow hover:brightness-110 active:scale-95 transition-all"
              >
                <span>{t(currentSlide.ctaKey)}</span>
                <span className="text-sm font-black">›</span>
              </Link>

              {/* Slider Arrows */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevSlide}
                  aria-label={t("home.previousSlide")}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface/80 border border-border/70 text-foreground hover:border-cyan-glow transition-colors"
                >
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label={t("home.nextSlide")}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface/80 border border-border/70 text-foreground hover:border-cyan-glow transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. Quick Actions (4 Cards: Savings, Support, Withdraw, Deposit)
            ========================================================================= */}
        <section id="home-quick-actions-section">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
            {/* 1. صندوق التوفير (Green/Teal Gradient) */}
            <button
              id="quick-action-savings"
              type="button"
              onClick={() => setSavingsOpen(true)}
              className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#022c22] shadow-[0_4px_16px_-4px_rgba(4,120,87,0.4)] text-start transition-all duration-200 active:scale-95 hover:border-emerald-400 hover:shadow-lg"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white">
                  <Vault className="h-5 w-5" />
                </div>
                <span className="text-white/70 text-xs font-black group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                  ›
                </span>
              </div>
              <div className="mt-3 text-start">
                <span className="block text-xs sm:text-sm font-black text-white">
                  {t("home.savingsFund")}
                </span>
                <span className="block text-[10px] sm:text-[11px] text-emerald-200 font-semibold mt-0.5">
                  {t("home.savingsDesc")}
                </span>
              </div>
            </button>

            {/* 2. خدمة العملاء (Indigo/Purple Gradient) */}
            <button
              id="quick-action-support"
              type="button"
              onClick={() => setSupportOpen(true)}
              className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border border-purple-500/40 bg-gradient-to-br from-[#581c87] via-[#6b21a8] to-[#3b0764] shadow-[0_4px_16px_-4px_rgba(107,33,168,0.4)] text-start transition-all duration-200 active:scale-95 hover:border-purple-400 hover:shadow-lg"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white">
                  <Headphones className="h-5 w-5" />
                </div>
                <span className="text-white/70 text-xs font-black group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                  ›
                </span>
              </div>
              <div className="mt-3 text-start">
                <span className="block text-xs sm:text-sm font-black text-white">
                  {t("nav.support")}
                </span>
                <span className="block text-[10px] sm:text-[11px] text-purple-200 font-semibold mt-0.5">
                  {t("home.support247")}
                </span>
              </div>
            </button>

            {/* 3. السحب (Royal Blue Gradient) */}
            <button
              id="quick-action-withdraw"
              type="button"
              onClick={() => setWithdrawalOpen(true)}
              className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border border-sky-500/40 bg-gradient-to-br from-[#0c4a6e] via-[#0284c7] to-[#082f49] shadow-[0_4px_16px_-4px_rgba(2,132,199,0.4)] text-start transition-all duration-200 active:scale-95 hover:border-sky-400 hover:shadow-lg"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <span className="text-white/70 text-xs font-black group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                  ›
                </span>
              </div>
              <div className="mt-3 text-start">
                <span className="block text-xs sm:text-sm font-black text-white">
                  {t("home.withdraw")}
                </span>
                <span className="block text-[10px] sm:text-[11px] text-sky-200 font-semibold mt-0.5">
                  {t("home.minWithdraw")}
                </span>
              </div>
            </button>

            {/* 4. الإيداع (Gold/Amber Gradient) */}
            <button
              id="quick-action-deposit"
              type="button"
              onClick={() => setDepositOpen(true)}
              className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-[#78350f] via-[#b45309] to-[#451a03] shadow-[0_4px_16px_-4px_rgba(180,83,9,0.4)] text-start transition-all duration-200 active:scale-95 hover:border-amber-400 hover:shadow-lg"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
                <span className="text-white/70 text-xs font-black group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                  ›
                </span>
              </div>
              <div className="mt-3 text-start">
                <span className="block text-xs sm:text-sm font-black text-white">
                  {t("home.deposit")}
                </span>
                <span className="block text-[10px] sm:text-[11px] text-amber-200 font-semibold mt-0.5">
                  {t("home.minDeposit")}
                </span>
              </div>
            </button>
          </div>
        </section>

        {/* =========================================================================
            BENTO GRID FOR DESKTOP (12 Columns) & SEQUENTIAL ON MOBILE
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* Main Column (Wallet Status & Lucky Wheel) -> 7 cols on lg */}
          <div className="lg:col-span-7 space-y-4">
            {/* 4. Wallet Status & Daily Reward Snapshot */}
            <section id="home-wallet-snapshot" className="surface-card glow-border p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="text-start">
                  <span className="text-xs text-muted-foreground font-semibold">
                    {t("home.availableBalance")}
                  </span>
                  <p className="text-3xl sm:text-4xl font-black text-gold-gradient tracking-tight mt-0.5">
                    {money(data.wallet.balance)}
                  </p>
                </div>

                {/* Daily Login Claim Button */}
                <button
                  id="daily-login-reward-btn"
                  type="button"
                  disabled={data.dailyReward.claimed || claimMutation.isPending}
                  onClick={() => claimMutation.mutate()}
                  className={`flex items-center gap-1.5 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-extrabold transition-all shadow-md active:scale-95 ${
                    data.dailyReward.claimed
                      ? "bg-surface text-muted-foreground border border-border cursor-default"
                      : "gold-gradient text-navy-deep shadow-gold-glow animate-pulse"
                  }`}
                >
                  <Gift className="h-4 w-4" />
                  <span>
                    {data.dailyReward.claimed ? t("home.claimedDaily") : t("home.claimDaily")}
                  </span>
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2.5 pt-3.5 border-t border-border/50 text-center">
                <div className="rounded-xl bg-surface/60 border border-border/70 p-2.5">
                  <TrendingUp className="mx-auto h-4 w-4 text-cyan-glow mb-1" />
                  <span className="block text-[10px] sm:text-[11px] text-muted-foreground font-semibold">
                    {t("home.profits")}
                  </span>
                  <span className="block text-xs sm:text-sm font-bold text-foreground mt-0.5">
                    {money(data.wallet.totalEarned)}
                  </span>
                </div>
                <div className="rounded-xl bg-surface/60 border border-border/70 p-2.5">
                  <Wallet className="mx-auto h-4 w-4 text-gold mb-1" />
                  <span className="block text-[10px] sm:text-[11px] text-muted-foreground font-semibold">
                    {t("home.invested")}
                  </span>
                  <span className="block text-xs sm:text-sm font-bold text-foreground mt-0.5">
                    {money(data.wallet.investedBalance)}
                  </span>
                </div>
                <div className="rounded-xl bg-surface/60 border border-border/70 p-2.5">
                  <Users className="mx-auto h-4 w-4 text-emerald-400 mb-1" />
                  <span className="block text-[10px] sm:text-[11px] text-muted-foreground font-semibold">
                    {t("home.teamIncome")}
                  </span>
                  <span className="block text-xs sm:text-sm font-bold text-foreground mt-0.5">
                    {money(data.wallet.teamIncome)}
                  </span>
                </div>
              </div>
            </section>

            {/* 5. WHEEL OF FORTUNE (عجلة الحظ) */}
            <LuckyWheel
              prizes={data.wheel.prizes}
              spinsLeft={data.wheel.spinsLeft}
              onSpin={async () => {
                const res = await spin();
                qc.invalidateQueries({ queryKey: ["home"] });
                return res;
              }}
            />
          </div>

          {/* Secondary Column (About Company, Member Stats, VIP Shortcut) -> 5 cols on lg */}
          <div className="lg:col-span-5 space-y-4">
            {/* Card 1: نبذة عن الشركة (Madrid Spain HQ) */}
            <div className="surface-card glow-border overflow-hidden">
              <div className="relative h-36 sm:h-40 w-full">
                <img
                  src={madridHQImg}
                  alt={t("home.hqAlt")}
                  width={1000}
                  height={747}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/50 to-transparent" />
                <div className="absolute bottom-2.5 inset-x-3.5 flex items-center justify-between">
                  <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 drop-shadow">
                    <MapPin className="h-4 w-4 text-gold" />
                    {t("nav.about")}
                  </h4>
                  <span className="rounded-full bg-navy-deep/90 border border-cyan-glow/50 px-2 py-0.5 text-[10px] font-bold text-cyan-glow">
                    {t("home.madrid")}
                  </span>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 text-start">
                <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                  {companyInfo}
                </p>

                <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
                  <Link
                    to="/about"
                    className="inline-flex items-center gap-1 text-xs font-bold text-cyan-glow hover:underline"
                  >
                    <Info className="h-3.5 w-3.5" />
                    <span>{t("nav.about")}</span>
                  </Link>
                  <span className="text-[10px] text-muted-foreground font-semibold">{t("home.founded")}</span>
                </div>
              </div>
            </div>

            {/* Card 2: عدد أعضاء منصتنا */}
            {hasMembersCount && (
              <div className="surface-card p-3.5 sm:p-4 border-border/80 flex items-center justify-between gap-3 text-start">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface border border-cyan-glow/40 text-cyan-glow shadow-[0_0_12px_oklch(0.82_0.14_205/0.25)]">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground">
                    {t("team.title")}
                  </span>
                  <span className="block text-xl sm:text-2xl font-black text-foreground tracking-wide">
                    +{Number(String(membersCount).replace(/,/g, "")).toLocaleString(lang)}
                  </span>
                  <span className="block text-[10px] text-cyan-glow font-medium">
                    {t("home.activeInvestors")}
                  </span>
                </div>
              </div>

              <Link
                to="/team"
                className="shrink-0 rounded-xl brand-gradient px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-glow active:scale-95 transition-transform"
              >
                {t("nav.team")} ›
              </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Customer Service & Quick Action Modals */}
      <DepositModal
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
        addresses={{
          ERC20: settings.deposit_address_ERC20,
          BEP20: settings.deposit_address_BEP20,
          TRC20: settings.deposit_address_TRC20,
        }}
        minDeposit={Number(settings.min_deposit ?? 10)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["home"] });
          qc.invalidateQueries({ queryKey: ["financial-records"] });
          qc.invalidateQueries({ queryKey: ["account"] });
        }}
      />

      <WithdrawalModal
        isOpen={withdrawalOpen}
        onClose={() => setWithdrawalOpen(false)}
        balance={data.wallet.balance}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["home"] })}
      />

      <SavingsFundModal isOpen={savingsOpen} onClose={() => setSavingsOpen(false)} />

      <CustomerServiceModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />

      {/* 7. Bottom Navigation matching Section 2 */}
      <BottomNav />
    </div>
  );
}
