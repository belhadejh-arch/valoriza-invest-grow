import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
  Percent,
  Ticket,
  Users,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminWheelPrizes,
  saveWheelPrize,
  getAdminUsers,
  addFreeWheelSpin,
} from "@/lib/valoriza-admin.functions";

export function AdminWheelTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<any | null>(null);

  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState(0.5);
  const [probabilityWeight, setProbabilityWeight] = useState(20);
  const [color, setColor] = useState("#00E5FF");
  const [isActive, setIsActive] = useState(true);

  // Grant Free Spin Section State
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [spinsToGrant, setSpinsToGrant] = useState<number>(1);

  const {
    data: prizes = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-wheel-prizes"],
    queryFn: () => getAdminWheelPrizes(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getAdminUsers(),
  });

  const saveMutation = useMutation({
    mutationFn: saveWheelPrize,
    onSuccess: () => {
      toast.success("تم تحديث جائزة عجلة الحظ بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin-wheel-prizes"] });
      queryClient.invalidateQueries({ queryKey: ["wheel-prizes"] });
      setModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const grantSpinMutation = useMutation({
    mutationFn: addFreeWheelSpin,
    onSuccess: (_, vars) => {
      toast.success(`تم منح ${vars.count || 1} فرصة مجانية للمستخدم بنجاح 🎟️`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSpinsToGrant(1);
    },
    onError: (err: any) => toast.error(err.message),
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
    setLabel("جائزة نقدية");
    setAmount(1.0);
    setProbabilityWeight(10);
    setColor("#FFD700");
    setIsActive(true);
    setModalOpen(true);
  };

  const handleSavePrize = () => {
    if (probabilityWeight < 0) {
      toast.error("نسبة احتمالية الجائزة لا يمكن أن تكون سالبة");
      return;
    }

    const currentOtherWeights = prizes
      .filter((p: any) => p.id !== editingPrize?.id)
      .reduce((sum: number, p: any) => sum + (p.is_active ? p.probability_weight : 0), 0);

    const projectedWeight = currentOtherWeights + (isActive ? probabilityWeight : 0);
    if (projectedWeight > 100) {
      toast.error(
        `مجموع الأوزان الكلي سيتجاوز 100% (${projectedWeight.toFixed(1)}%). يرجى تصحيح الأوزان.`,
      );
      return;
    }

    saveMutation.mutate({
      id: editingPrize?.id,
      label,
      amount,
      probabilityWeight,
      color,
      isActive,
    });
  };

  const handleGrantSpin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error("يرجى اختيار المستخدم أولاً");
      return;
    }
    if (spinsToGrant < 1) {
      toast.error("يرجى إدخال عدد فرص صالح (1 أو أكثر)");
      return;
    }
    grantSpinMutation.mutate({
      userId: selectedUserId,
      count: spinsToGrant,
    });
  };

  return (
    <div className="space-y-5">
      {/* Requirement 2: Grant Free Opportunity to Specific User */}
      <div className="rounded-2xl border border-gold/40 bg-surface/80 p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-gold" />
            <div>
              <h3 className="text-xs font-black text-foreground">
                منح فرصة مجانية في عجلة الحظ لمستخدم محدد
              </h3>
              <p className="text-[10px] text-muted-foreground">
                يتم حفظ الفرص الممنوحة مباشرة في PostgreSQL ويستطيع المستخدم استهلاكها فوراً
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleGrantSpin}
          className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
        >
          <div className="sm:col-span-6">
            <label className="text-[10px] text-muted-foreground font-bold">
              اختر المستخدم المراد منحه فرصة مجانية
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-gold focus:outline-none"
            >
              <option value="">-- اضغط للاختيار من المستخدمين ({users.length}) --</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.username || "مستخدم"} ({u.email}) - الرصيد: ${u.balance.toFixed(2)} - الفرص:{" "}
                  {u.wheelSpins || 0}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="text-[10px] text-muted-foreground font-bold">
              عدد الفرص المجانية
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={spinsToGrant}
              onChange={(e) => setSpinsToGrant(Math.max(1, parseInt(e.target.value) || 1))}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-gold focus:outline-none font-bold"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={grantSpinMutation.isPending || !selectedUserId}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl gold-gradient py-2 px-3 text-xs font-black text-navy-deep shadow-gold-glow hover:opacity-95 active:scale-95 disabled:opacity-50"
            >
              <Ticket className="h-4 w-4" />
              <span>{grantSpinMutation.isPending ? "جارٍ الحفظ..." : "إضافة فرصة مجانية"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Header and Total Weights Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-cyan-glow" />
            <span>إدارة قطاعات وجوائز عجلة الحظ</span>
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            مجموع الأوزان النشطة حالياً:{" "}
            <strong className={`font-bold ${totalWeight <= 85 ? "text-emerald-400" : "text-gold"}`}>
              {totalWeight.toFixed(1)}%
            </strong>{" "}
            (المواصفة: 85% بدون اختراع نسبة متبقية)
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-xl brand-gradient px-3 py-1.5 text-xs font-black text-primary-foreground shadow-glow"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>إضافة جائزة جديدة</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
          جارٍ جلب جوائز العجلة...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                    <span className="text-2xl select-none">{prize.icon || "🎁"}</span>
                    <div>
                      <h4 className="text-xs font-extrabold text-foreground leading-snug">
                        {prize.label}
                      </h4>
                      <p className="text-[11px] font-mono text-cyan-glow font-bold mt-0.5">
                        {Number(prize.amount) > 0
                          ? `$${Number(prize.amount).toFixed(2)}`
                          : "لا توجد جائزة"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(prize)}
                    className="rounded-lg bg-surface border border-border p-1 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Percent className="h-3 w-3 text-gold" />
                    <span>الوزن: {prize.probability_weight}%</span>
                  </div>
                  <span className="font-bold text-foreground">الاحتمال: {chance}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Prize Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-cyan-glow/40 bg-navy-deep p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-xs font-extrabold text-foreground">
                {editingPrize ? "تعديل جائزة عجلة الحظ" : "إضافة جائزة جديدة"}
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
                <label className="text-[10px] text-muted-foreground font-bold">اسم الجائزة</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">القيمة ($)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">
                    الوزن % (Weight)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={probabilityWeight}
                    onChange={(e) => setProbabilityWeight(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold">
                  لون القطاع في العجلة
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
                  تفعيل الجائزة في العجلة
                </label>
              </div>

              <button
                type="button"
                disabled={saveMutation.isPending}
                onClick={handleSavePrize}
                className="w-full mt-3 rounded-xl brand-gradient py-2.5 text-xs font-black text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {saveMutation.isPending ? "جارٍ التحقق والحفظ..." : "حفظ التعديلات"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
