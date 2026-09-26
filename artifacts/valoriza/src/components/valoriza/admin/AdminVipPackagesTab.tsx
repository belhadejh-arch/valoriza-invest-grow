import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Crown,
  Edit2,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteVipPackage,
  getAdminVipPackages,
  saveVipPackage,
} from "@/lib/valoriza-admin.functions";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";

export function AdminVipPackagesTab() {
  const { t } = useI18n();
  const content = useLocalizedContent();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<any | null>(null);
  const [deletingPkg, setDeletingPkg] = useState<any | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState(20);
  const [dailyProfit, setDailyProfit] = useState(0.5);
  const [dailyTasks, setDailyTasks] = useState(2);
  const [taskReward, setTaskReward] = useState(0.25);
  const [isActive, setIsActive] = useState(true);

  const {
    data: packages = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-vip-packages"],
    queryFn: () => getAdminVipPackages(),
  });

  const saveMutation = useMutation({
    mutationFn: saveVipPackage,
    onSuccess: () => {
      toast.success(t("admin.vipPackageUpdated"));
      queryClient.invalidateQueries({ queryKey: ["admin-vip-packages"] });
      queryClient.invalidateQueries({ queryKey: ["investment"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-data"] });
      setModalOpen(false);
    },
    onError: () => toast.error(t("common.error")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVipPackage,
    onSuccess: () => {
      toast.success(t("common.success"));
      queryClient.invalidateQueries({ queryKey: ["admin-vip-packages"] });
      queryClient.invalidateQueries({ queryKey: ["investment"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-data"] });
      setDeletingPkg(null);
    },
    onError: () => toast.error(t("common.error")),
  });

  const handleOpenCreate = () => {
    setEditingPkg(null);
    setName("");
    setPrice(20);
    setDailyProfit(0.5);
    setDailyTasks(2);
    setTaskReward(0.25);
    setIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (pkg: any) => {
    setEditingPkg(pkg);
    setName(pkg.name);
    setPrice(Number(pkg.price));
    setDailyProfit(Number(pkg.daily_profit));
    setDailyTasks(pkg.daily_tasks);
    setTaskReward(Number(pkg.task_reward));
    setIsActive(pkg.is_active);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-extrabold text-foreground">{t("admin.manageVipPackages")}</h2>
          <p className="text-[10px] text-muted-foreground">
            {t("admin.vipPackagesDescription")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-xl brand-gradient px-3 py-1.5 text-xs font-black text-primary-foreground shadow-glow"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t("admin.addVipPackage")}</span>
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t("admin.refresh")}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
          {t("admin.loadingVipPackages")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {packages.map((pkg: any) => (
            <div
              key={pkg.id}
              className={`rounded-2xl border p-4 transition-all ${
                pkg.is_active
                  ? "border-border/80 bg-surface/80 shadow-md"
                  : "border-border/40 bg-surface/30 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-vip/20 border border-vip/40 text-vip-soft">
                    <Crown className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-foreground">{content(pkg.name)}</h3>
                    <span className="text-[10px] font-bold text-gold">
                      {t("admin.activationPrice")}: ${Number(pkg.price).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(pkg)}
                    title={t("admin.editPackage")}
                    aria-label={t("admin.editPackage")}
                    className="rounded-lg bg-surface border border-border p-1.5 text-muted-foreground hover:text-cyan-glow hover:border-cyan-glow transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingPkg(pkg)}
                    title={t("admin.deleteVipPackage")}
                    aria-label={t("admin.deleteVipPackage")}
                    className="rounded-lg bg-surface border border-danger/40 p-1.5 text-danger hover:bg-danger/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3.5 space-y-1.5 rounded-xl bg-navy-deep p-2.5 border border-border/60 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("admin.dailyProfit")}:</span>
                  <span className="font-extrabold text-emerald-400">
                    +${Number(pkg.daily_profit).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("admin.dailyTasks")}:</span>
                  <span className="font-bold text-foreground">{pkg.daily_tasks} {t("admin.tasks")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("admin.perVideoCommission")}:</span>
                  <span className="font-bold text-cyan-glow">
                    ${Number(pkg.task_reward).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">{t("common.status")}:</span>
                {pkg.is_active ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("admin.enabled")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-bold text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5" />
                    {t("admin.closed")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit VIP Package Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-vip/40 bg-navy-deep p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-xs font-extrabold text-foreground">
                {editingPkg
                  ? `${t("admin.editPackage")}: ${content(editingPkg.name)}`
                  : t("admin.addVipPackage")}
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
                <label className="text-[10px] text-muted-foreground font-bold">{t("admin.packageNameArabicSource")}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">{t("admin.priceUsd")}</label>
                  <input
                    type="number"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">
                    {t("admin.dailyProfitUsd")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={dailyProfit}
                    onChange={(e) => setDailyProfit(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">
                    {t("admin.dailyTaskCount")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={dailyTasks}
                    onChange={(e) => setDailyTasks(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">
                    {t("admin.videoCommissionUsd")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={taskReward}
                    onChange={(e) => setTaskReward(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pkg-is-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-cyan-glow focus:ring-0"
                />
                <label htmlFor="pkg-is-active" className="text-xs font-bold text-foreground">
                  {t("admin.activatePackage")}
                </label>
              </div>

              <button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() =>
                  saveMutation.mutate({
                    ...(editingPkg ? { id: editingPkg.id } : {}),
                    name,
                    price,
                    dailyProfit,
                    dailyTasks,
                    taskReward,
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

      {deletingPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-danger/40 bg-navy-deep p-5 shadow-2xl">
            <h3 className="text-sm font-extrabold text-foreground">
              {t("admin.deleteVipPackage")}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("admin.deleteVipPackageConfirmation")}: {content(deletingPkg.name)}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingPkg(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-foreground"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: deletingPkg.id })}
                className="rounded-xl bg-danger px-4 py-2 text-xs font-black text-white disabled:opacity-50"
              >
                {deleteMutation.isPending ? t("admin.saving") : t("admin.deleteVipPackage")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
