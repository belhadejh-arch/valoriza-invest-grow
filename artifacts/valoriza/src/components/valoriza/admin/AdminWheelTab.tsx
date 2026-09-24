import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Plus, Edit2, CheckCircle2, XCircle, X, RefreshCw, Percent } from "lucide-react";
import { toast } from "sonner";
import { getAdminWheelPrizes, saveWheelPrize } from "@/lib/valoriza-admin.functions";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";

export function AdminWheelTab() {
  const { t } = useI18n();
  const content = useLocalizedContent();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<any | null>(null);

  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState(0.5);
  const [probabilityWeight, setProbabilityWeight] = useState(20);
  const [color, setColor] = useState("#00E5FF");
  const [isActive, setIsActive] = useState(true);

  const {
    data: prizes = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-wheel-prizes"],
    queryFn: () => getAdminWheelPrizes(),
  });

  const saveMutation = useMutation({
    mutationFn: saveWheelPrize,
    onSuccess: () => {
      toast.success(t("admin.wheelPrizeUpdated"));
      queryClient.invalidateQueries({ queryKey: ["admin-wheel-prizes"] });
      queryClient.invalidateQueries({ queryKey: ["wheel-prizes"] });
      setModalOpen(false);
    },
    onError: () => toast.error(t("common.error")),
  });

  const totalWeight = prizes.reduce(
    (sum: number, p: any) => sum + (p.is_active ? p.probability_weight : 0),
    0,
  );

  const handleOpenEdit = (prize: any) => {
    setEditingPrize(prize);
    setLabel(prize.label);
    setAmount(Number(prize.amount));
    setProbabilityWeight(prize.probability_weight);
    setColor(prize.color || "#00E5FF");
    setIsActive(prize.is_active);
    setModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingPrize(null);
    setLabel("");
    setAmount(1.0);
    setProbabilityWeight(10);
    setColor("#FFD700");
    setIsActive(true);
    setModalOpen(true);
  };

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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {prizes.map((prize: any) => {
            const chance =
              totalWeight > 0 ? ((prize.probability_weight / totalWeight) * 100).toFixed(1) : "0";
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
                      style={{ backgroundColor: prize.color || "#00E5FF" }}
                    />
                    <h3 className="text-xs font-black text-foreground">{content(prize.label)}</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(prize)}
                    className="rounded-lg bg-surface border border-border p-1 text-muted-foreground hover:text-cyan-glow hover:border-cyan-glow"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>

                <div className="mt-3 text-center">
                  <p className="text-xl font-black text-gold">${Number(prize.amount).toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {t("admin.probability")}: {chance}% ({prize.probability_weight} {t("admin.points")})
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
                  ? `${t("admin.editPrize")}: ${content(editingPrize.label)}`
                  : t("admin.addPrizeSegment")}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
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
                  value={label}
                  placeholder={t("admin.arabicPrizeLabelPlaceholder")}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">{t("admin.amountUsd")}</label>
                  <input
                    type="number"
                    step="0.05"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">
                    {t("admin.probabilityWeight")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={probabilityWeight}
                    onChange={(e) => setProbabilityWeight(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold">
                  {t("admin.wheelSegmentColor")}
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer border border-border bg-transparent"
                  />
                  <span className="font-mono text-xs text-muted-foreground">{color}</span>
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
                disabled={saveMutation.isPending}
                onClick={() =>
                  saveMutation.mutate({
                    id: editingPrize?.id,
                    label,
                    amount,
                    probabilityWeight,
                    color,
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
