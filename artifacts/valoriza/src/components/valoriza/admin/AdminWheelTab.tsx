import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getAdminWheelPrizes, saveWheelPrize } from "@/lib/valoriza-admin.functions";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";

type WheelPrize = {
  id: string;
  label_ar: string;
  prize_type: string;
  prize_value: number | string;
  probability: number | string;
  icon: string | null;
  accent: string;
  is_active: boolean;
};

const accents = {
  gold: "#e5a823",
  green: "#10b981",
  blue: "#0284c7",
  purple: "#8b5cf6",
  red: "#ef4444",
};

export function AdminWheelTab() {
  const { t } = useI18n();
  const content = useLocalizedContent();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<WheelPrize | null>(null);

  const [label, setLabel] = useState("");
  const [prizeType, setPrizeType] = useState("cash");
  const [amount, setAmount] = useState("0.5");
  const [probability, setProbability] = useState("20");
  const [accent, setAccent] = useState("blue");
  const [isActive, setIsActive] = useState(true);

  const {
    data: prizes = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-wheel-prizes"],
    queryFn: () => getAdminWheelPrizes() as Promise<WheelPrize[]>,
  });

  const saveMutation = useMutation({
    mutationFn: saveWheelPrize,
    onSuccess: () => {
      toast.success(t("admin.wheelPrizeUpdated"));
      queryClient.invalidateQueries({ queryKey: ["admin-wheel-prizes"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      setModalOpen(false);
    },
    onError: () => toast.error(t("common.error")),
  });

  const totalWeight = prizes.reduce(
    (sum: number, prize) =>
      sum + (prize.is_active ? Math.max(0, Number(prize.probability) || 0) : 0),
    0,
  );

  const handleOpenEdit = (prize: WheelPrize) => {
    setEditingPrize(prize);
    setLabel(prize.label_ar || "");
    setPrizeType(prize.prize_type || "cash");
    setAmount(String(prize.prize_value ?? 0));
    setProbability(String(prize.probability ?? 0));
    setAccent(prize.accent || "blue");
    setIsActive(prize.is_active);
    setModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingPrize(null);
    setLabel("");
    setPrizeType("cash");
    setAmount("0.5");
    setProbability("10");
    setAccent("blue");
    setIsActive(true);
    setModalOpen(true);
  };
  const amountValue = prizeType === "none" ? 0 : Number(amount);
  const probabilityValue = Number(probability);
  const canSave =
    label.trim().length > 0 &&
    Number.isFinite(probabilityValue) &&
    probabilityValue > 0 &&
    Number.isFinite(amountValue) &&
    amountValue >= 0 &&
    (prizeType === "none" || amountValue > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-extrabold text-foreground">{t("admin.manageWheelPrizes")}</h2>
          <p className="text-[10px] text-muted-foreground">
            {t("admin.wheelPrizeDescription")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-xl brand-gradient px-3 py-1.5 text-xs font-black text-primary-foreground shadow-glow"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t("admin.addNewPrize")}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
          {t("admin.loadingWheelPrizes")}
        </div>
      ) : prizes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/50 p-8 text-center text-xs text-muted-foreground">
          {t("common.none")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {prizes.map((prize) => {
            const chance =
              totalWeight > 0
                ? ((Number(prize.probability) / totalWeight) * 100).toFixed(1)
                : "0";
            return (
              <div
                key={prize.id}
                className={`rounded-2xl border p-4 transition-all ${
                  prize.is_active
                    ? "border-border/80 bg-surface/80 shadow-md"
                    : "border-border/40 bg-surface/30 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border border-white/20 shadow-sm"
                      style={{
                        backgroundColor:
                          accents[prize.accent as keyof typeof accents] || accents.blue,
                      }}
                    />
                    <h3 className="text-xs font-black text-foreground">{content(prize.label_ar)}</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(prize)}
                    title={t("admin.editPrize")}
                    aria-label={t("admin.editPrize")}
                    className="rounded-lg bg-surface border border-border p-1 text-muted-foreground hover:text-cyan-glow hover:border-cyan-glow"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>

                <div className="mt-3 text-center">
                  <p className="text-xl font-black text-gold">
                    {prize.prize_type === "cash"
                      ? `$${Number(prize.prize_value).toFixed(2)}`
                      : content(prize.label_ar)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {t("admin.probability")}: {chance}% ({Number(prize.probability)} {t("admin.points")})
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{t("common.status")}:</span>
                  {prize.is_active ? (
                    <span className="font-bold text-emerald-400">{t("admin.activeOnWheel")}</span>
                  ) : (
                    <span className="font-bold text-muted-foreground">{t("admin.disabled")}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-cyan-glow/40 bg-navy-deep p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-xs font-extrabold text-foreground">
                {editingPrize
                  ? `${t("admin.editPrize")}: ${content(editingPrize.label_ar)}`
                  : t("admin.addPrizeSegment")}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label={t("common.close")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground font-bold">
                  {t("admin.prizeLabelArabicSource")}
                </label>
                <input
                  type="text"
                  required
                  value={label}
                  placeholder={t("admin.arabicPrizeLabelPlaceholder")}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold">
                  {t("admin.prizeType")}
                </label>
                <select
                  value={prizeType}
                  onChange={(event) => setPrizeType(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                >
                  <option value="cash">{t("admin.cashPrize")}</option>
                  <option value="none">{t("common.none")}</option>
                  {prizeType !== "cash" && prizeType !== "none" && (
                    <option value={prizeType}>{prizeType}</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">{t("admin.amountUsd")}</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    disabled={prizeType === "none"}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">
                    {t("admin.probabilityWeight")}
                  </label>
                  <input
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    required
                    value={probability}
                    onChange={(e) => setProbability(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold">
                  {t("admin.wheelSegmentColor")}
                </label>
                <div className="mt-2 flex items-center gap-2">
                  {Object.entries(accents).map(([name, swatch]) => (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      aria-label={name}
                      aria-pressed={accent === name}
                      onClick={() => setAccent(name)}
                      className={`h-7 w-7 rounded-full border-2 ${
                        accent === name ? "border-foreground ring-2 ring-cyan-glow" : "border-white/20"
                      }`}
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="prize-is-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-cyan-glow focus:ring-0"
                />
                <label htmlFor="prize-is-active" className="text-xs font-bold text-foreground">
                  {t("admin.activatePrize")}
                </label>
              </div>

              <button
                type="button"
                disabled={!canSave || saveMutation.isPending}
                onClick={() =>
                  saveMutation.mutate({
                    ...(editingPrize ? { id: editingPrize.id } : {}),
                    label,
                    prizeType,
                    prizeValue: amountValue,
                    probability: probabilityValue,
                    icon: editingPrize?.icon ?? null,
                    accent,
                    isActive,
                  })
                }
                className="w-full mt-3 rounded-xl brand-gradient py-2.5 text-xs font-black text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {saveMutation.isPending ? t("admin.saving") : t("admin.saveChanges")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
