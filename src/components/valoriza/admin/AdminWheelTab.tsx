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
  Gift,
  User,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminWheelPrizes,
  saveWheelPrize,
  getAdminUsers,
  grantFreeWheelSpin,
} from "@/lib/valoriza-admin.functions";

export function AdminWheelTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<any | null>(null);

  // Grant spin state
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>("");
  const [spinCountToGrant, setSpinCountToGrant] = useState<number>(1);

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

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getAdminUsers(),
  });

  const grantSpinMutation = useMutation({
    mutationFn: grantFreeWheelSpin,
    onSuccess: (res, vars) => {
      toast.success(`تم منح ${vars.count} فرصة مجانية للمستخدم بنجاح وحفظها في PostgreSQL 🎁`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: any) => toast.error(err.message),
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

  const totalWeight = prizes.reduce(
    (sum: number, p: any) =>
      sum + (p.is_active ? p.probability_weight || Number(p.probability) || 0 : 0),
    0,
  );

  const handleOpenEdit = (prize: any) => {
    setEditingPrize(prize);
    setLabel(prize.label || prize.label_ar);
    setAmount(Number(prize.amount || prize.prize_value || 0));
    setProbabilityWeight(prize.probability_weight || Number(prize.probability) || 0);
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

  const targetUserObj = users.find((u: any) => u.id === selectedTargetUserId);

  return (
    <div className="space-y-4">
      {/* SECTION: Grant Free Spin to Specific User (Requirement 2) */}
      <div className="surface-card glow-border p-4 rounded-2xl bg-surface/90 space-y-3">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2">
          <Gift className="h-4 w-4 text-gold" />
          <h3 className="text-xs font-black text-foreground">منح فرصة مجانية لمستخدم محدد</h3>
          <span className="text-[10px] text-muted-foreground">
            (الأدمن يمنح الفرصة للمستخدم وتُحفظ مباشرة في PostgreSQL)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <label className="text-[10px] text-muted-foreground font-bold">اختر المستخدم:</label>
            <select
              value={selectedTargetUserId}
              onChange={(e) => setSelectedTargetUserId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
            >
              <option value="">-- حدد مستخدم من القائمة --</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.email}) - الرصيد: ${u.balance.toFixed(2)} [فرص:{" "}
                  {u.wheelSpinsAvailable || 0}]
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="text-[10px] text-muted-foreground font-bold">عدد الفرص:</label>
            <input
              type="number"
              min="1"
              max="50"
              value={spinCountToGrant}
              onChange={(e) => setSpinCountToGrant(Math.max(1, parseInt(e.target.value) || 1))}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none text-center font-bold"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="button"
              disabled={!selectedTargetUserId || grantSpinMutation.isPending}
              onClick={() =>
                grantSpinMutation.mutate({
                  userId: selectedTargetUserId,
                  count: spinCountToGrant,
                })
              }
              className="w-full flex items-center justify-center gap-1.5 rounded-xl brand-gradient px-4 py-2 text-xs font-black text-primary-foreground shadow-glow active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{grantSpinMutation.isPending ? "جارٍ الحفظ..." : "إضافة فرصة مجانية"}</span>
            </button>
          </div>
        </div>

        {targetUserObj && (
          <div className="p-2.5 rounded-xl bg-black/20 border border-border/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">المستخدم المختار:</span>
              <strong className="text-foreground">{targetUserObj.username}</strong>
              <span className="text-muted-foreground text-[10px]">({targetUserObj.email})</span>
            </div>
            <div className="text-gold font-bold">
              الفرص الحالية: {targetUserObj.wheelSpinsAvailable || 0} فرصة
            </div>
          </div>
        )}
      </div>

      {/* Weights and Rules Notice Banner */}
      <div className="rounded-2xl border border-gold/40 bg-gold/10 p-3.5 text-xs text-foreground flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-gold shrink-0" />
          <div>
            <p className="font-black text-gold">
              الأوزان المحددة للعجلة: {totalWeight.toFixed(0)}% (مجموع ثابت 85%)
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              حظ سعيد (25%) + حظ سعيد (25%) + 0.5$ (10%) + 1$ (10%) + 2$ (5%) = 85%. باقي الجوائز
              بنسبة 0%. ممنوع اختراع جوائز إضافية.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-surface border border-gold/40 px-2.5 py-1 text-[11px] font-black text-gold shrink-0">
          المجموع: {totalWeight.toFixed(0)}%
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-extrabold text-foreground">إدارة قطاعات وجوائز عجلة الحظ</h2>
          <p className="text-[10px] text-muted-foreground">
            تعديل مبالغ الجوائز ونسب احتمالية الفوز (Weights).
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
                    <h3 className="text-xs font-black text-foreground">{prize.label}</h3>
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
                    الاحتمالية: {chance}% ({prize.probability_weight} نقاط)
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">الحالة:</span>
                  {prize.is_active ? (
                    <span className="font-bold text-emerald-400">نشطة في العجلة</span>
                  ) : (
                    <span className="font-bold text-muted-foreground">معطلة</span>
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
                {editingPrize ? `تعديل جائزة: ${editingPrize.label}` : "إضافة قطاع جائزة"}
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
                  اسم / نص الجائزة
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">المبلغ ($)</label>
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
                    وزن الاحتمالية (Weight)
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
                {saveMutation.isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
