import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Search,
  ShieldAlert,
  ShieldCheck,
  Crown,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Lock,
  Unlock,
  PlusCircle,
  MinusCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminUsers,
  toggleUserBlock,
  updateUserVipLevel,
  manualBalanceAdjustment,
} from "@/lib/valoriza-admin.functions";

export function AdminUsersTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Modals state
  const [adjustBalanceOpen, setAdjustBalanceOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [isCredit, setIsCredit] = useState(true);

  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [targetVipLevel, setTargetVipLevel] = useState(1);

  const {
    data: users = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getAdminUsers(),
  });

  const blockMutation = useMutation({
    mutationFn: toggleUserBlock,
    onSuccess: () => {
      toast.success("تم تحديث حالة المستخدم بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const vipMutation = useMutation({
    mutationFn: updateUserVipLevel,
    onSuccess: () => {
      toast.success("تم تحديث مستوى VIP بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setVipModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const balanceMutation = useMutation({
    mutationFn: manualBalanceAdjustment,
    onSuccess: (res) => {
      toast.success("تم تعديل رصيد المستخدم بنجاح وتوثيق العملية");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setAdjustBalanceOpen(false);
      setAdjustAmount("");
      setAdjustReason("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredUsers = users.filter((u: any) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.referralCode?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="البحث باسم المستخدم، البريد، أو كود الإحالة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface pr-9 pl-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>تحديث ({filteredUsers.length})</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
          جارٍ جلب حسابات المستخدمين...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="surface-card rounded-2xl p-8 text-center text-xs text-muted-foreground">
          لم يتم العثور على أي مستخدم مطابق للبحث.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-border/80 bg-surface/80 text-[11px] font-bold text-muted-foreground">
              <tr>
                <th className="p-3">المستخدم</th>
                <th className="p-3">كود الإحالة</th>
                <th className="p-3">رتبة VIP</th>
                <th className="p-3">الرصيد المتاح</th>
                <th className="p-3">إجمالي الإيداع</th>
                <th className="p-3">إجمالي السحب</th>
                <th className="p-3">أعضاء الفريق</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredUsers.map((user: any) => (
                <tr key={user.id} className="hover:bg-surface/80 transition-colors">
                  <td className="p-3">
                    <p className="font-extrabold text-foreground">{user.username || "بدون اسم"}</p>
                    <p className="text-[10px] text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="p-3 font-mono font-bold text-cyan-glow">{user.referralCode}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-vip/40 bg-vip/10 px-2 py-0.5 text-[10px] font-extrabold text-vip-soft">
                      <Crown className="h-3 w-3 text-gold" />
                      VIP {user.vipLevel}
                    </span>
                  </td>
                  <td className="p-3 font-extrabold text-gold">${user.balance.toFixed(2)}</td>
                  <td className="p-3 font-bold text-emerald-400">
                    ${user.totalDeposited.toFixed(2)}
                  </td>
                  <td className="p-3 font-bold text-amber-400">
                    ${user.totalWithdrawn.toFixed(2)}
                  </td>
                  <td className="p-3 font-bold text-foreground">{user.teamCount}</td>
                  <td className="p-3">
                    {user.isBlocked ? (
                      <span className="rounded-md bg-danger/15 px-2 py-0.5 text-[10px] font-bold text-danger border border-danger/30">
                        محظور
                      </span>
                    ) : (
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                        نشط
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Adjust Balance Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setAdjustBalanceOpen(true);
                        }}
                        title="تعديل الرصيد يدوياً"
                        className="rounded-lg bg-surface border border-gold/40 p-1.5 text-gold hover:bg-gold/10"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                      </button>

                      {/* VIP upgrade button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setTargetVipLevel(user.vipLevel);
                          setVipModalOpen(true);
                        }}
                        title="تغيير مستوى VIP"
                        className="rounded-lg bg-surface border border-vip/40 p-1.5 text-vip-soft hover:bg-vip/10"
                      >
                        <Crown className="h-3.5 w-3.5" />
                      </button>

                      {/* Block/Unblock Button */}
                      <button
                        type="button"
                        onClick={() =>
                          blockMutation.mutate({
                            userId: user.id,
                            isBlocked: !user.isBlocked,
                          })
                        }
                        title={user.isBlocked ? "إلغاء الحظر" : "حظر المستخدم"}
                        className={`rounded-lg border p-1.5 ${
                          user.isBlocked
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-danger/10 border-danger/40 text-danger hover:bg-danger/20"
                        }`}
                      >
                        {user.isBlocked ? (
                          <Unlock className="h-3.5 w-3.5" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {adjustBalanceOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-cyan-glow/40 bg-navy-deep p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-xs font-extrabold text-foreground">
                تعديل رصيد: {selectedUser.username}
              </h3>
              <button
                type="button"
                onClick={() => setAdjustBalanceOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <p className="text-[11px] text-muted-foreground">
                  الرصيد الحالي: ${selectedUser.balance.toFixed(2)}
                </p>
                <div className="mt-2 flex rounded-xl bg-surface p-1 border border-border">
                  <button
                    type="button"
                    onClick={() => setIsCredit(true)}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                      isCredit ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    إيداع (زيادة)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCredit(false)}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                      !isCredit ? "bg-danger text-white shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <MinusCircle className="h-3.5 w-3.5" />
                    خصم (إنقاص)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold">المبلغ ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold">سبب التعديل</label>
                <input
                  type="text"
                  placeholder="مثال: تصحيح إيداع، مكافأة تشجيعية، إلخ..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={
                  !adjustAmount ||
                  Number(adjustAmount) <= 0 ||
                  !adjustReason ||
                  balanceMutation.isPending
                }
                onClick={() =>
                  balanceMutation.mutate({
                    targetUserId: selectedUser.id,
                    amount: isCredit ? Number(adjustAmount) : -Math.abs(Number(adjustAmount)),
                    reason: adjustReason,
                  })
                }
                className="w-full mt-2 rounded-xl brand-gradient py-2.5 text-xs font-black text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {balanceMutation.isPending ? "جارٍ الحفظ والتوثيق..." : "تأكيد تعديل الرصيد"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change VIP Modal */}
      {vipModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-vip/40 bg-navy-deep p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-xs font-extrabold text-foreground">
                ترقية VIP للمستخدم: {selectedUser.username}
              </h3>
              <button
                type="button"
                onClick={() => setVipModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <p className="text-[11px] text-muted-foreground">اختر مستوى VIP الجديد:</p>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setTargetVipLevel(lvl)}
                    className={`rounded-xl border py-2 text-xs font-extrabold transition-all ${
                      targetVipLevel === lvl
                        ? "border-vip bg-vip text-white shadow-glow"
                        : "border-border bg-surface text-foreground hover:border-vip/50"
                    }`}
                  >
                    {lvl === 0 ? "عادي" : `VIP ${lvl}`}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={vipMutation.isPending}
                onClick={() =>
                  vipMutation.mutate({
                    targetUserId: selectedUser.id,
                    vipLevel: targetVipLevel,
                  })
                }
                className="w-full mt-3 rounded-xl brand-gradient py-2.5 text-xs font-black text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {vipMutation.isPending ? "جارٍ التحديث..." : "حفظ الترقية"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
