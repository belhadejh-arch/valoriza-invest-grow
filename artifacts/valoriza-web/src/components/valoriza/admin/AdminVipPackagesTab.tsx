import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Edit2, CheckCircle2, XCircle, X, RefreshCw, Video, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { getAdminVipPackages, saveVipPackage } from "@/lib/valoriza-admin.functions";

export function AdminVipPackagesTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<any | null>(null);

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
      toast.success("تم تحديث باقة VIP بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin-vip-packages"] });
      queryClient.invalidateQueries({ queryKey: ["investment-data"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-data"] });
      setModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

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
          <h2 className="text-xs font-extrabold text-foreground">إدارة وتعديل باقات VIP</h2>
          <p className="text-[10px] text-muted-foreground">
            تحديد أسعار الترقية، الأرباح اليومية، وعدد المهام لكل مستوى.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>تحديث</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
          جارٍ جلب باقات VIP...
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
                    <h3 className="text-xs font-black text-foreground">{pkg.name}</h3>
                    <span className="text-[10px] font-bold text-gold">
                      سعر التفعيل: ${Number(pkg.price).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(pkg)}
                  className="rounded-lg bg-surface border border-border p-1.5 text-muted-foreground hover:text-cyan-glow hover:border-cyan-glow transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3.5 space-y-1.5 rounded-xl bg-navy-deep p-2.5 border border-border/60 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الربح اليومي:</span>
                  <span className="font-extrabold text-emerald-400">
                    +${Number(pkg.daily_profit).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">المهام اليومية:</span>
                  <span className="font-bold text-foreground">{pkg.daily_tasks} مهام</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">عمولة الفيديو الواحد:</span>
                  <span className="font-bold text-cyan-glow">
                    ${Number(pkg.task_reward).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">الحالة:</span>
                {pkg.is_active ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    مفعلة
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-bold text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5" />
                    مغلقة
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit VIP Package Modal */}
      {modalOpen && editingPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-vip/40 bg-navy-deep p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-xs font-extrabold text-foreground">
                تعديل باقة: {editingPkg.name}
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
                <label className="text-[10px] text-muted-foreground font-bold">اسم الباقة</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">السعر ($)</label>
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
                    الربح اليومي ($)
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
                    عدد المهام اليومية
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
                    عمولة الفيديو ($)
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
                  تفعيل الباقة والسماح بالترقية إليها
                </label>
              </div>

              <button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() =>
                  saveMutation.mutate({
                    id: editingPkg.id,
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
                {saveMutation.isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
