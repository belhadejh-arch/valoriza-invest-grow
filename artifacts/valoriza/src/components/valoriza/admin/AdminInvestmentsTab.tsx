import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
  Percent,
  Calendar,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { getAdminFunds, saveInvestmentFund } from "@/lib/valoriza-admin.functions";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";

export function AdminInvestmentsTab() {
  const { t } = useI18n();
  const content = useLocalizedContent();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<any | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [taglineAr, setTaglineAr] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  const [profitPercent, setProfitPercent] = useState(15);
  const [minAmount, setMinAmount] = useState(50);
  const [isActive, setIsActive] = useState(true);

  const {
    data: funds = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-funds"],
    queryFn: () => getAdminFunds(),
  });

  const saveMutation = useMutation({
    mutationFn: saveInvestmentFund,
    onSuccess: () => {
      toast.success(t("admin.fundSaved"));
      queryClient.invalidateQueries({ queryKey: ["admin-funds"] });
      queryClient.invalidateQueries({ queryKey: ["investment-data"] });
      setModalOpen(false);
      resetForm();
    },
    onError: () => toast.error(t("common.error")),
  });

  const resetForm = () => {
    setEditingFund(null);
    setCode("");
    setNameAr("");
    setNameEn("");
    setTaglineAr("");
    setDurationDays(7);
    setProfitPercent(15);
    setMinAmount(50);
    setIsActive(true);
  };

  const handleOpenEdit = (fund: any) => {
    setEditingFund(fund);
    setCode(fund.code);
    setNameAr(fund.name_ar);
    setNameEn(fund.name_en || "");
    setTaglineAr(fund.tagline_ar || "");
    setDurationDays(fund.duration_days);
    setProfitPercent(Number(fund.profit_percent));
    setMinAmount(Number(fund.min_amount));
    setIsActive(fund.is_active);
    setModalOpen(true);
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-extrabold text-foreground">
            {t("admin.manageInvestmentFunds")}
          </h2>
          <p className="text-[10px] text-muted-foreground">
            {t("admin.fundManagementDescription")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-xl brand-gradient px-3 py-1.5 text-xs font-black text-primary-foreground shadow-glow"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t("admin.addFund")}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
          {t("admin.loadingFunds")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {funds.map((fund: any) => (
            <div
              key={fund.id}
              className={`rounded-2xl border p-4 transition-all ${
                fund.is_active
                  ? "border-border/80 bg-surface/80"
                  : "border-border/40 bg-surface/30 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                   <span className="rounded-md bg-cyan-glow/10 border border-cyan-glow/30 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-glow">
                    {content(fund.code, { allowLanguageNeutral: true })}
                  </span>
                  <h3 className="mt-1.5 text-sm font-extrabold text-foreground">
                    {content({ ar: fund.name_ar, en: fund.name_en, fr: fund.name_fr, es: fund.name_es })}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">{content(fund.tagline_ar || "")}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(fund)}
                  className="rounded-lg bg-surface border border-border p-1.5 text-muted-foreground hover:text-cyan-glow hover:border-cyan-glow transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-navy-deep p-2.5 border border-border/60 text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground">{t("admin.return")}</span>
                  <p className="font-extrabold text-emerald-400">+{fund.profit_percent}%</p>
                </div>
                <div className="border-r border-border/40">
                  <span className="text-[10px] text-muted-foreground">{t("admin.duration")}</span>
                  <p className="font-bold text-foreground">{fund.duration_days} {t("admin.days")}</p>
                </div>
                <div className="border-r border-border/40">
                  <span className="text-[10px] text-muted-foreground">{t("admin.minimum")}</span>
                  <p className="font-bold text-gold">${fund.min_amount}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">{t("common.status")}:</span>
                {fund.is_active ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("admin.availableForInvestment")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-bold text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5" />
                    {t("admin.disabled")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Fund Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-cyan-glow/40 bg-navy-deep p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-xs font-extrabold text-foreground">
                {editingFund
                  ? `${t("admin.editFund")}: ${content({ ar: editingFund.name_ar, en: editingFund.name_en, fr: editingFund.name_fr, es: editingFund.name_es })}`
                  : t("admin.addInvestmentFund")}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">{t("admin.fundCode")}</label>
                  <input
                    type="text"
                    value={code}
                    placeholder="MUMBAI"
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">
                    {t("admin.fundNameArabic")}
                  </label>
                  <input
                    type="text"
                    value={nameAr}
                    placeholder={t("admin.fundNameArabicPlaceholder")}
                    onChange={(e) => setNameAr(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold">
                    {t("admin.promotionalDescriptionArabic")}
                </label>
                <input
                  type="text"
                  value={taglineAr}
                  placeholder={t("admin.fundDescriptionArabicPlaceholder")}
                  onChange={(e) => setTaglineAr(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">
                    {t("admin.profitRate")}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={profitPercent}
                    onChange={(e) => setProfitPercent(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">
                    {t("admin.durationDays")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">
                    {t("admin.minimumUsd")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minAmount}
                    onChange={(e) => setMinAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="fund-is-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-cyan-glow focus:ring-0"
                />
                <label htmlFor="fund-is-active" className="text-xs font-bold text-foreground">
                  {t("admin.activateFund")}
                </label>
              </div>

              <button
                type="button"
                disabled={!code || !nameAr || saveMutation.isPending}
                onClick={() =>
                  saveMutation.mutate({
                    id: editingFund?.id,
                    code,
                    nameAr,
                    nameEn: nameEn || code,
                    taglineAr,
                    durationDays,
                    profitPercent,
                    minAmount,
                    isActive,
                  })
                }
                className="w-full mt-3 rounded-xl brand-gradient py-2.5 text-xs font-black text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {saveMutation.isPending ? t("admin.saving") : t("admin.saveFund")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
