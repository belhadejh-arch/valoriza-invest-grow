import { useState, useRef, useEffect } from "react";
import { RotateCw, Sparkles, Ticket, Trophy, Gift } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

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
    id?: string;
    label?: string;
    value?: number;
    cash?: boolean;
    spinsLeft?: number;
    reason?: string;
    message?: string;
  }>;
  disabled?: boolean;
}

// 9 prize clockwise perimeter order, center is index 4
const PERIMETER_ORDER = [0, 1, 2, 5, 8, 7, 6, 3, 4];

// Utility: Forces English digits (1234) instead of Eastern Arabic (١٢٣٤)
export function toEnglishDigits(value: string | number): string {
  const str = String(value ?? "");
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return str.replace(/[٠-٩]/g, (w) => String(arabicNumerals.indexOf(w)));
}

// Single emoji per prize mapping
const DEFAULT_PRIZE_EMOJIS: Record<number, string> = {
  0: "🍀", // حظ سعيد
  1: "🎯", // حظ سعيد
  2: "💵", // 0.5 دولار
  3: "💰", // 1 دولار
  4: "🪙", // 2 دولار
  5: "📱", // هاتف نقال
  6: "💎", // 48 دولار
  7: "🎁", // 4 دولار
  8: "👑", // مستوى VIP
};

export function LuckyWheel({ prizes, spinsLeft, onSpin, disabled }: LuckyWheelProps) {
  const { t } = useI18n();
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winModal, setWinModal] = useState<{ label: string; value: number; cash: boolean } | null>(
    null,
  );
  const spinTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearInterval(spinTimerRef.current);
    };
  }, []);

  // Exactly 9 items matching user specifications with English digits and exactly 1 emoji each
  const default9Boxes: PrizeItem[] = [
    {
      id: "w-luck1",
      label: "حظ سعيد",
      prizeType: "none",
      prizeValue: 0,
      icon: "🍀",
      accent: "blue",
    },
    {
      id: "w-luck2",
      label: "حظ سعيد",
      prizeType: "none",
      prizeValue: 0,
      icon: "🎯",
      accent: "blue",
    },
    {
      id: "w-05",
      label: "0.5 دولار",
      prizeType: "cash",
      prizeValue: 0.5,
      icon: "💵",
      accent: "green",
    },
    {
      id: "w-1",
      label: "1 دولار",
      prizeType: "cash",
      prizeValue: 1.0,
      icon: "💰",
      accent: "green",
    },
    {
      id: "w-2",
      label: "2 دولار",
      prizeType: "cash",
      prizeValue: 2.0,
      icon: "🪙",
      accent: "purple",
    },
    {
      id: "w-phone",
      label: "هاتف نقال",
      prizeType: "item",
      prizeValue: 0,
      icon: "📱",
      accent: "red",
    },
    {
      id: "w-48",
      label: "48 دولار",
      prizeType: "cash",
      prizeValue: 48.0,
      icon: "💎",
      accent: "gold",
    },
    {
      id: "w-4",
      label: "4 دولار",
      prizeType: "cash",
      prizeValue: 4.0,
      icon: "🎁",
      accent: "purple",
    },
    {
      id: "w-vip",
      label: "مستوى VIP",
      prizeType: "vip",
      prizeValue: 0,
      icon: "👑",
      accent: "gold",
    },
  ];

  const gridPrizes = prizes && prizes.length === 9 ? prizes : default9Boxes;

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

  // Requirement 10: Exactly ONE single Emoji per slot, no repeats and no extra emojis
  const renderSingleEmoji = (p: PrizeItem, index: number) => {
    // If icon is already an emoji, use it. Otherwise fallback to unique mapping
    const raw =
      p.icon && /[\p{Emoji}]/u.test(p.icon) ? p.icon : DEFAULT_PRIZE_EMOJIS[index] || "🎁";
    // Extract first emoji character only
    const singleEmoji = Array.from(raw)[0] || "🎁";
    return <span className="text-2xl mb-1 select-none leading-none">{singleEmoji}</span>;
  };

  const handleStartSpin = async () => {
    if (isSpinning || disabled) return;
    if (spinsLeft <= 0) {
      toast.error(t("wheel.noSpins"));
      return;
    }

    setIsSpinning(true);
    let step = 0;
    let intervalMs = 60;
    let totalLaps = 0;

    try {
      // Step 1: Call Backend to get authoritative result and decrement chances in PostgreSQL
      const res = await onSpin();

      if (!res.ok) {
        setIsSpinning(false);
        setHighlightedIndex(null);
        toast.error(res.message || "لا توجد فرص متاحة أو حدث خطأ أثناء تشغيل العجلة");
        return;
      }

      // Step 2: Spinning animation with high speed laps
      const runCycle = () => {
        const currIdx = PERIMETER_ORDER[step % PERIMETER_ORDER.length];
        setHighlightedIndex(currIdx);
        step++;

        if (step % PERIMETER_ORDER.length === 0) totalLaps++;

        if (totalLaps < 3) {
          spinTimerRef.current = setTimeout(runCycle, intervalMs);
        } else {
          // Identify the target box index in gridPrizes
          let targetIndex = gridPrizes.findIndex(
            (p) =>
              (res.prizeId && p.id === res.prizeId) ||
              (res.id && p.id === res.id) ||
              (res.label && p.label.trim() === res.label.trim()),
          );
          if (targetIndex === -1 && res.label) {
            targetIndex = gridPrizes.findIndex((p) => p.label.includes(res.label || ""));
          }
          if (targetIndex === -1) targetIndex = 0;

          // Deceleration phase until targetIndex is reached
          const decelerate = () => {
            const currentPerimeterIndex = PERIMETER_ORDER[step % PERIMETER_ORDER.length];
            setHighlightedIndex(currentPerimeterIndex);
            step++;
            intervalMs += 28;

            if (intervalMs > 280 && currentPerimeterIndex === targetIndex) {
              // Landed on target!
              setIsSpinning(false);
              setHighlightedIndex(targetIndex);
              const finalLabel = toEnglishDigits(res.label || gridPrizes[targetIndex].label);
              setWinModal({
                label: finalLabel,
                value: res.value || 0,
                cash: Boolean(res.cash),
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
      toast.error("حدث خطأ في تشغيل العجلة");
    }
  };

  return (
    <section id="lucky-wheel-section" className="mt-4 surface-card glow-border p-4 relative">
      {/* Banner Header */}
      <div className="text-center pb-3">
        <div className="flex items-center justify-center gap-2">
          <Gift className="h-6 w-6 text-gold animate-bounce" />
          <h3 className="text-2xl font-black text-gold-gradient tracking-wide">
            {t("wheel.title")}
          </h3>
        </div>
        <p className="mt-1 text-xs font-semibold text-foreground/90">{t("wheel.subtitle")}</p>
      </div>

      {/* Main Grid + Action Panel */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
        {/* 3x3 Prize Grid (col-span-8) */}
        <div className="md:col-span-8 grid grid-cols-3 gap-2">
          {gridPrizes.map((prize, idx) => {
            const isLit = highlightedIndex === idx;
            // Requirement 9: Regular English digits (1234)
            const cleanLabel = toEnglishDigits(prize.label);
            return (
              <div
                key={idx}
                id={`wheel-prize-box-${idx}`}
                onClick={handleStartSpin}
                className={`${getBoxStyle(prize, isLit)} h-20 sm:h-22 cursor-pointer active:scale-95`}
              >
                {/* Requirement 10: Exactly ONE single emoji */}
                {renderSingleEmoji(prize, idx)}
                <span className="text-[11px] sm:text-xs font-black leading-tight truncate w-full font-sans">
                  {cleanLabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Info Panel (col-span-4) */}
        <div className="md:col-span-4 surface-card border-border/80 p-3.5 flex flex-col justify-between items-center text-center">
          <div className="flex flex-col items-center">
            <Ticket className="h-7 w-7 text-gold mb-1" />
            <span className="text-xs font-bold text-foreground">{t("wheel.spinsLeft")}</span>
            <div
              id="wheel-spins-left-counter"
              className="mt-1 text-4xl font-extrabold text-foreground font-sans tracking-tight"
            >
              {/* Requirement 9: English numbers 1234 */}
              {toEnglishDigits(spinsLeft)}
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
              <span>{isSpinning ? t("wheel.spinning") : t("wheel.spinBtn")}</span>
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground font-medium">
              {t("wheel.spinsCost")}
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
            dir="rtl"
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
              {winModal.cash ? "تهانينا! فوز رائع 🎉" : "نتيجة السحب 🎯"}
            </h4>

            <p className="mt-2 text-sm text-foreground">
              لقد حصلت على: <strong className="text-gold font-bold">{winModal.label}</strong>
            </p>

            {winModal.cash && (
              <p className="mt-1 text-xs text-success font-semibold">
                تم إضافة {winModal.label} مباشرةً إلى رصيد محفظتك وسجل المعاملات في قاعدة البيانات!
              </p>
            )}

            <button
              type="button"
              onClick={() => setWinModal(null)}
              className="mt-5 w-full rounded-2xl gold-gradient py-2.5 text-xs font-black text-navy-deep shadow-gold-glow"
            >
              استلام ومتابعة
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
