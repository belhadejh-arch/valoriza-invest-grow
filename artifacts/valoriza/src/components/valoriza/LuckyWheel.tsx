import { useState, useRef, useEffect } from "react";
import {
  Banknote,
  Coins,
  Crown,
  Gift,
  RotateCw,
  Smartphone,
  Smile,
  Sparkles,
  Ticket,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";

export type PrizeItem = {
  id: string;
  label: string;
  prizeType: string;
  prizeValue: number;
  icon: string | null;
  accent: string;
};

export type LuckyWheelSpinResult =
  | {
      ok: true;
      id: string;
      label: string;
      prizeType: string;
      prizeValue: number;
      spinsLeft: number;
    }
  | { ok: false; reason?: string; spinsLeft?: number };

interface LuckyWheelProps {
  prizes: PrizeItem[];
  spinsLeft: number;
  onSpin: () => Promise<LuckyWheelSpinResult>;
  disabled?: boolean;
}

// 9 prize layout sequence (clockwise perimeter, then center)
const PERIMETER_ORDER = [0, 1, 2, 5, 8, 7, 6, 3, 4];

export function LuckyWheel({ prizes, spinsLeft, onSpin, disabled }: LuckyWheelProps) {
  const { t, dir, lang } = useI18n();
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [serverSpinsLeft, setServerSpinsLeft] = useState(() =>
    Number.isFinite(spinsLeft) ? Math.max(0, spinsLeft) : 0,
  );
  const [winModal, setWinModal] = useState<{
    label: string;
    value: number;
    prizeType: string;
  } | null>(null);
  const content = useLocalizedContent();
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setServerSpinsLeft(Number.isFinite(spinsLeft) ? Math.max(0, spinsLeft) : 0);
  }, [spinsLeft]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  const gridPrizes = Array.isArray(prizes) ? prizes : [];
  const hasPrizes = gridPrizes.length > 0;
  const displayPrizeLabel = (label: string, prizeType?: string, value?: number) => {
    const translated: Record<string, string> = {
      "50 دولار": t("public.wheel.prize50"),
      "0.5 دولار": t("public.wheel.prize05"),
      "حظ سعيد": t("public.wheel.luck"),
      "2 دولار": t("public.wheel.prize2"),
      "هاتف نقال": t("public.wheel.phone"),
      "80 دولار": t("public.wheel.prize80"),
      "1 دولار": t("public.wheel.prize1"),
      "ترقيات VIP": t("public.wheel.vip"),
    };
    if (translated[label]) return translated[label];
    if (Object.values(translated).includes(label)) return label;
    if (prizeType === "cash" && value !== undefined) {
      const locale =
        lang === "ar" ? "ar-SA" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-US";
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(value);
    }
    return content(label);
  };

  const getBoxStyle = (p: PrizeItem, isLit: boolean) => {
    const base =
      "relative flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-150 select-none text-center ";
    const glow = isLit
      ? "scale-[1.04] ring-2 ring-yellow-400 border-yellow-300 shadow-[0_0_20px_#ffd700] z-10 "
      : "hover:brightness-105 ";

    switch (p.accent) {
      case "gold":
        return (
          base +
          glow +
          "bg-gradient-to-b from-[#e5a823] to-[#b37d0c] border-[#ffd700]/70 text-navy-deep font-extrabold"
        );
      case "green":
        return (
          base +
          glow +
          "bg-gradient-to-b from-[#10b981] to-[#047857] border-[#34d399]/70 text-white font-extrabold"
        );
      case "purple":
        return (
          base +
          glow +
          "bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] border-[#c084fc]/70 text-white font-extrabold"
        );
      case "red":
        return (
          base +
          glow +
          "bg-gradient-to-b from-[#ef4444] to-[#b91c1c] border-[#f87171]/70 text-white font-extrabold"
        );
      case "blue":
      default:
        return (
          base +
          glow +
          "bg-gradient-to-b from-[#0284c7] to-[#0369a1] border-[#38bdf8]/70 text-white font-extrabold"
        );
    }
  };

  const renderIcon = (p: PrizeItem) => {
    switch (p.icon) {
      case "banknote":
      case "money-bag":
        return <Banknote className="h-5 w-5 mb-0.5" />;
      case "coin":
      case "coins":
        return <Coins className="h-5 w-5 mb-0.5" />;
      case "smartphone":
        return <Smartphone className="h-5 w-5 mb-0.5" />;
      case "crown":
        return <Crown className="h-5 w-5 mb-0.5" />;
      case "smile":
      default:
        return <Smile className="h-5 w-5 mb-0.5" />;
    }
  };

  const handleStartSpin = async () => {
    if (isSpinning || disabled) return;
    if (serverSpinsLeft <= 0) {
      toast.error(t("public.wheel.noSpins"));
      return;
    }

    setIsSpinning(true);

    try {
      // The server alone authorizes the spin and supplies the prize and remaining chances.
      const result = await onSpin();
      if (typeof result.spinsLeft === "number" && Number.isFinite(result.spinsLeft)) {
        setServerSpinsLeft(Math.max(0, result.spinsLeft));
      }
      if (!result.ok) {
        setIsSpinning(false);
        setHighlightedIndex(null);
        toast.error(
          result.reason === "NO_SPINS_LEFT"
            ? t("public.wheel.noSpinsToday")
            : result.reason === "NO_PRIZES_CONFIGURED"
              ? t("public.wheel.noPrizesConfigured")
              : t("public.wheel.error"),
        );
        return;
      }

      let step = 0;
      let intervalMs = 60;
      const wait = (duration: number) =>
        new Promise<void>((resolve) => {
          spinTimerRef.current = setTimeout(() => {
            spinTimerRef.current = null;
            resolve();
          }, duration);
        });

      const startTime = Date.now();
      while (Date.now() - startTime < 2000) {
        setHighlightedIndex(PERIMETER_ORDER[step % PERIMETER_ORDER.length]);
        step += 1;
        await wait(intervalMs);
      }

      let targetIndex = result.id
        ? gridPrizes.findIndex((prize) => prize.id === result.id)
        : -1;
      if (targetIndex < 0 && result.prizeType !== undefined && result.prizeValue !== undefined) {
        targetIndex = gridPrizes.findIndex(
          (prize) =>
            prize.prizeType === result.prizeType &&
            Number(prize.prizeValue) === Number(result.prizeValue),
        );
      }
      if (targetIndex < 0 && result.label) {
        targetIndex = gridPrizes.findIndex((prize) => prize.label === result.label);
      }
      if (targetIndex < 0) targetIndex = 0;

      let currentIndex = -1;
      do {
        currentIndex = PERIMETER_ORDER[step % PERIMETER_ORDER.length];
        setHighlightedIndex(currentIndex);
        step += 1;
        intervalMs += 25;
        if (intervalMs <= 280 || currentIndex !== targetIndex) {
          await wait(intervalMs);
        }
      } while (intervalMs <= 280 || currentIndex !== targetIndex);

      setHighlightedIndex(targetIndex);
      setWinModal({
        label: result.label ?? gridPrizes[targetIndex].label,
        value: Number(result.prizeValue ?? gridPrizes[targetIndex].prizeValue),
        prizeType: result.prizeType ?? gridPrizes[targetIndex].prizeType,
      });
      setIsSpinning(false);
    } catch {
      setIsSpinning(false);
      setHighlightedIndex(null);
      toast.error(t("public.wheel.errorUnexpected"));
    }
  };

  return (
    <section id="lucky-wheel-section" className="mt-4 surface-card glow-border p-4 relative">
      {/* Banner Header matching Page 2 */}
      <div className="text-center pb-3">
        <div className="flex items-center justify-center gap-2">
          <Gift className="h-6 w-6 text-gold animate-bounce" />
          <h3 className="text-2xl font-black text-gold-gradient tracking-wide">
            {t("public.wheel.title")}
          </h3>
        </div>
        <p className="mt-1 text-xs font-semibold text-foreground/90">{t("public.wheel.subtitle")}</p>
      </div>

      {/* Main Grid + Action Panel matching Page 2 */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
        {/* 3x3 Prize Grid (col-span-8) */}
        {hasPrizes ? (
          <div className="md:col-span-8 grid grid-cols-3 gap-2">
            {gridPrizes.map((prize, idx) => {
              const isLit = highlightedIndex === idx;
              return (
                <div
                  key={prize.id}
                  id={`wheel-prize-box-${idx}`}
                  onClick={serverSpinsLeft > 0 && !disabled ? handleStartSpin : undefined}
                  className={`${getBoxStyle(prize, isLit)} h-20 sm:h-22 ${
                    serverSpinsLeft > 0 && !disabled
                      ? "cursor-pointer active:scale-95"
                      : "cursor-default"
                  }`}
                >
                  {renderIcon(prize)}
                  <span className="w-full truncate text-[11px] font-black leading-tight sm:text-xs">
                    {displayPrizeLabel(prize.label, prize.prizeType, prize.prizeValue)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="surface-card border-border/80 p-6 text-center md:col-span-8 flex min-h-48 items-center justify-center"
            role="status"
          >
            <p className="text-sm font-semibold text-muted-foreground">
              {t("public.wheel.noPrizesConfigured")}
            </p>
          </div>
        )}

        {/* Right Info Panel matching Page 2 (col-span-4) */}
        <div className="md:col-span-4 surface-card border-border/80 p-3.5 flex flex-col justify-between items-center text-center">
          <div className="flex flex-col items-center">
            <Ticket className="h-7 w-7 text-gold mb-1" />
            <span className="text-xs font-bold text-foreground">{t("public.wheel.spinsLeftLabel")}</span>
            <div
              id="wheel-spins-left-counter"
              className="mt-1 text-4xl font-extrabold text-foreground"
            >
              {serverSpinsLeft}
            </div>
          </div>

          <div className="w-full mt-3">
            <button
              id="start-wheel-spin-btn"
              type="button"
              disabled={isSpinning || serverSpinsLeft <= 0 || !hasPrizes || disabled}
              onClick={handleStartSpin}
              className="w-full rounded-2xl gold-gradient py-3 px-4 text-xs sm:text-sm font-black text-navy-deep shadow-gold-glow flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <RotateCw className={`h-4 w-4 ${isSpinning ? "animate-spin" : ""}`} />
              <span>{isSpinning ? t("public.wheel.spinning") : t("public.wheel.spin")}</span>
            </button>
            {hasPrizes && (
              <p className="mt-2 text-[10px] font-medium text-muted-foreground">
                {serverSpinsLeft <= 0 ? t("public.wheel.noSpins") : t("public.wheel.spinCost")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Win Celebration Modal */}
      {winModal && (
        <div
          id="wheel-win-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setWinModal(null)}
        >
          <div
            className="surface-card glow-gold max-w-sm w-full p-6 text-center animate-in zoom-in-90 duration-300"
            onClick={(e) => e.stopPropagation()}
            dir={dir}
          >
            <div className="flex justify-center mb-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl gold-gradient shadow-gold-glow">
                {winModal.prizeType === "cash" ? (
                  <Trophy className="h-9 w-9 text-navy-deep" />
                ) : (
                  <Sparkles className="h-9 w-9 text-navy-deep" />
                )}
              </div>
            </div>

            <h4 className="text-xl font-black text-gold-gradient">
              {winModal.prizeType === "cash"
                ? t("public.wheel.congrats")
                : t("public.wheel.result")}
            </h4>

            <p className="mt-2 text-sm text-foreground">
              {t("public.wheel.received")}{" "}
              <strong className="text-gold font-bold">
                {displayPrizeLabel(winModal.label, winModal.prizeType, winModal.value)}
              </strong>
            </p>

            {winModal.prizeType === "cash" && (
              <p className="mt-1 text-xs text-success font-semibold">
                {t("public.wheel.credited").replace(
                  "{prize}",
                  displayPrizeLabel(winModal.label, winModal.prizeType, winModal.value),
                )}
              </p>
            )}

            <button
              type="button"
              onClick={() => setWinModal(null)}
              className="mt-5 w-full rounded-2xl gold-gradient py-2.5 text-xs font-black text-navy-deep shadow-gold-glow"
            >
              {t("public.wheel.claim")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
