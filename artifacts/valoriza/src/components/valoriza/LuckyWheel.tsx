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

interface LuckyWheelProps {
  prizes: PrizeItem[];
  spinsLeft: number;
  onSpin: () => Promise<{
    ok: boolean;
    prizeId?: string;
    label?: string;
    value?: number;
    cash?: boolean;
    spinsLeft?: number;
    reason?: string;
  }>;
  disabled?: boolean;
}

// 9 prize layout sequence (clockwise perimeter, then center)
const PERIMETER_ORDER = [0, 1, 2, 5, 8, 7, 6, 3, 4];

export function LuckyWheel({ prizes, spinsLeft, onSpin, disabled }: LuckyWheelProps) {
  const { t, dir, lang } = useI18n();
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winModal, setWinModal] = useState<{
    label: string;
    value: number;
    cash: boolean;
    prizeType: string;
  } | null>(null);
  const content = useLocalizedContent();
  const spinTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearInterval(spinTimerRef.current);
    };
  }, []);

  // Standard 9 visual boxes matching PDF Page 2
  const default9Boxes: PrizeItem[] = [
    {
      id: "w-50",
      label: t("public.wheel.prize50"),
      prizeType: "cash",
      prizeValue: 50,
      icon: "banknote",
      accent: "gold",
    },
    {
      id: "w-05",
      label: t("public.wheel.prize05"),
      prizeType: "cash",
      prizeValue: 0.5,
      icon: "coin",
      accent: "green",
    },
    {
      id: "w-luck1",
      label: t("public.wheel.luck"),
      prizeType: "none",
      prizeValue: 0,
      icon: "smile",
      accent: "blue",
    },
    {
      id: "w-2",
      label: t("public.wheel.prize2"),
      prizeType: "cash",
      prizeValue: 2,
      icon: "coins",
      accent: "purple",
    },
    {
      id: "w-phone",
      label: t("public.wheel.phone"),
      prizeType: "item",
      prizeValue: 0,
      icon: "smartphone",
      accent: "red",
    },
    {
      id: "w-luck2",
      label: t("public.wheel.luck"),
      prizeType: "none",
      prizeValue: 0,
      icon: "smile",
      accent: "blue",
    },
    {
      id: "w-80",
      label: t("public.wheel.prize80"),
      prizeType: "cash",
      prizeValue: 80,
      icon: "money-bag",
      accent: "gold",
    },
    {
      id: "w-1",
      label: t("public.wheel.prize1"),
      prizeType: "cash",
      prizeValue: 1,
      icon: "coin",
      accent: "green",
    },
    {
      id: "w-vip",
      label: t("public.wheel.vip"),
      prizeType: "vip",
      prizeValue: 0,
      icon: "crown",
      accent: "purple",
    },
  ];

  const gridPrizes = prizes && prizes.length === 9 ? prizes : default9Boxes;
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
    if (spinsLeft <= 0) {
      toast.error(t("public.wheel.noSpins"));
      return;
    }

    setIsSpinning(true);

    try {
      // 1. Call server function to get authoritative result
      const resPromise = onSpin();

      // 2. Start fast cycling animation
      let step = 0;
      let intervalMs = 60;
      const startTime = Date.now();

      const runCycle = async () => {
        const currentPerimeterIdx = step % PERIMETER_ORDER.length;
        const boxIdx = PERIMETER_ORDER[currentPerimeterIdx];
        setHighlightedIndex(boxIdx);
        step++;

        const elapsed = Date.now() - startTime;
        if (elapsed < 2000) {
          spinTimerRef.current = setTimeout(runCycle, intervalMs);
        } else {
          // Await server resolution
          const res = await resPromise;
          if (!res.ok) {
            setIsSpinning(false);
            setHighlightedIndex(null);
            toast.error(
              res.reason === "NO_SPINS_LEFT"
                ? t("public.wheel.noSpinsToday")
                : t("public.wheel.error"),
            );
            return;
          }

          // Find index of winning prize
          let targetIndex = gridPrizes.findIndex(
            (p) =>
              p.id === res.prizeId ||
              p.label === res.label ||
              (res.label?.includes("0.5") && p.label.includes("0.5")) ||
              (res.label?.includes("1") && p.label.includes("1")) ||
              (res.label?.includes("2") && p.label.includes("2")),
          );
          if (targetIndex === -1) targetIndex = 2; // default to luck

          // Deceleration phase until targetIndex is reached
          const decelerate = () => {
            const currIdx = PERIMETER_ORDER[step % PERIMETER_ORDER.length];
            setHighlightedIndex(currIdx);
            step++;
            intervalMs += 25;

            if (intervalMs > 280 && currIdx === targetIndex) {
              // Landed on target!
              setIsSpinning(false);
              setHighlightedIndex(targetIndex);
              setWinModal({
                label: res.label || gridPrizes[targetIndex].label,
                value: res.value ?? gridPrizes[targetIndex].prizeValue,
                cash: Boolean(res.cash),
                prizeType: gridPrizes[targetIndex].prizeType,
              });
            } else {
              spinTimerRef.current = setTimeout(decelerate, intervalMs);
            }
          };

          decelerate();
        }
      };

      runCycle();
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
        <div className="md:col-span-8 grid grid-cols-3 gap-2">
          {gridPrizes.map((prize, idx) => {
            const isLit = highlightedIndex === idx;
            return (
              <div
                key={idx}
                id={`wheel-prize-box-${idx}`}
                onClick={handleStartSpin}
                className={`${getBoxStyle(prize, isLit)} h-20 sm:h-22 cursor-pointer active:scale-95`}
              >
                {renderIcon(prize)}
                <span className="text-[11px] sm:text-xs font-black leading-tight truncate w-full">
                  {displayPrizeLabel(prize.label, prize.prizeType, prize.prizeValue)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Info Panel matching Page 2 (col-span-4) */}
        <div className="md:col-span-4 surface-card border-border/80 p-3.5 flex flex-col justify-between items-center text-center">
          <div className="flex flex-col items-center">
            <Ticket className="h-7 w-7 text-gold mb-1" />
            <span className="text-xs font-bold text-foreground">{t("public.wheel.spinsLeftLabel")}</span>
            <div
              id="wheel-spins-left-counter"
              className="mt-1 text-4xl font-extrabold text-foreground"
            >
              {spinsLeft}
            </div>
          </div>

          <div className="w-full mt-3">
            <button
              id="start-wheel-spin-btn"
              type="button"
              disabled={isSpinning || spinsLeft <= 0 || disabled}
              onClick={handleStartSpin}
              className="w-full rounded-2xl gold-gradient py-3 px-4 text-xs sm:text-sm font-black text-navy-deep shadow-gold-glow flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <RotateCw className={`h-4 w-4 ${isSpinning ? "animate-spin" : ""}`} />
              <span>{isSpinning ? t("public.wheel.spinning") : t("public.wheel.spin")}</span>
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground font-medium">
              {t("public.wheel.spinCost")}
            </p>
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
                {winModal.cash ? (
                  <Trophy className="h-9 w-9 text-navy-deep" />
                ) : (
                  <Sparkles className="h-9 w-9 text-navy-deep" />
                )}
              </div>
            </div>

            <h4 className="text-xl font-black text-gold-gradient">
              {winModal.cash ? t("public.wheel.congrats") : t("public.wheel.result")}
            </h4>

            <p className="mt-2 text-sm text-foreground">
              {t("public.wheel.received")}{" "}
              <strong className="text-gold font-bold">
                {displayPrizeLabel(winModal.label, winModal.prizeType, winModal.value)}
              </strong>
            </p>

            {winModal.cash && (
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
