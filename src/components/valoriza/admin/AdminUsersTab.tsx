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
  Eye,
  Gift,
  Coins,
  Check,
  Sparkles,
  Link as LinkIcon,
  Phone,
  Mail,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminUsers,
  toggleUserBlock,
  updateUserVipLevel,
  manualBalanceAdjustment,
  updateUserWithdrawalAddress,
  toggleUserWithdrawalStatus,
  grantFreeWheelSpin,
} from "@/lib/valoriza-admin.functions";

export function AdminUsersTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Modals state
  const [previewUserModalOpen, setPreviewUserModalOpen] = useState(false);
  const [adjustBalanceOpen, setAdjustBalanceOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [isCredit, setIsCredit] = useState(true);

  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [targetVipLevel, setTargetVipLevel] = useState(1);

  // Edit withdrawal address state
  const [editAddressOpen, setEditAddressOpen] = useState(false);
  const [newWithdrawAddress, setNewWithdrawAddress] = useState("");
  const [newWithdrawNetwork, setNewWithdrawNetwork] = useState<"TRC20" | "BEP20" | "ERC20">(
    "TRC20",
  );

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
    onSuccess: () => {
      toast.success("تم تعديل رصيد المستخدم بنجاح وتوثيق العملية");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setAdjustBalanceOpen(false);
      setAdjustAmount("");
      setAdjustReason("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const withdrawalStatusMutation = useMutation({
    mutationFn: toggleUserWithdrawalStatus,
    onSuccess: (res, vars) => {
      toast.success(
        vars.canWithdraw
          ? "تم تفعيل ميزة السحب للمستخدم (ON) بنجاح"
          : "تم إيقاف ميزة السحب لهذا المستخدم (OFF) بنجاح",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (selectedUser && selectedUser.id === vars.userId) {
        setSelectedUser((prev: any) => (prev ? { ...prev, canWithdraw: vars.canWithdraw } : prev));
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const withdrawalAddressMutation = useMutation({
    mutationFn: updateUserWithdrawalAddress,
    onSuccess: (res, vars) => {
      toast.success("تم تعديل عنوان السحب وحفظه مباشرة في PostgreSQL بنجاح ✅");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (selectedUser && selectedUser.id === vars.userId) {
        setSelectedUser((prev: any) =>
          prev
            ? { ...prev, withdrawalAddress: vars.address, withdrawalNetwork: vars.network }
            : prev,
        );
      }
      setEditAddressOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const grantSpinMutation = useMutation({
    mutationFn: grantFreeWheelSpin,
    onSuccess: (res, vars) => {
      toast.success(`تمت إضافة فرصة مجانية في عجلة الحظ بنجاح وحفظها في قاعدة البيانات 🎁`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      if (selectedUser && selectedUser.id === vars.userId) {
        setSelectedUser((prev: any) =>
          prev
            ? { ...prev, wheelSpinsAvailable: (prev.wheelSpinsAvailable || 0) + vars.count }
            : prev,
        );
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.referralCode?.toLowerCase().includes(q)
    );
  });

  const handleOpenPreview = (user: any) => {
    setSelectedUser(user);
    setNewWithdrawAddress(user.withdrawalAddress || "");
    setNewWithdrawNetwork(user.withdrawalNetwork || "TRC20");
    setEditAddressOpen(false);
    setPreviewUserModalOpen(true);
  };

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
                <th className="p-3 text-center">سحب المستخدم</th>
                <th className="p-3 text-center">فرص العجلة</th>
                <th className="p-3">إجمالي الإيداع</th>
                <th className="p-3">إجمالي السحب</th>
                <th className="p-3">أعضاء الفريق</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredUsers.map((user) => (
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

                  {/* Per-user withdrawal toggle ON/OFF */}
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      disabled={withdrawalStatusMutation.isPending}
                      onClick={() =>
                        withdrawalStatusMutation.mutate({
                          userId: user.id,
                          canWithdraw: !user.canWithdraw,
                        })
                      }
                      title={
                        user.canWithdraw
                          ? "السحب متاح لهذا المستخدم - انقر للتعطيل"
                          : "السحب معطل لهذا المستخدم - انقر للتفعيل"
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black transition-all ${
                        user.canWithdraw
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                          : "bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30"
                      }`}
                    >
                      {user.canWithdraw ? "ON مفعل" : "OFF معطل"}
                    </button>
                  </td>

                  {/* Wheel Spins with +1 grant button */}
                  <td className="p-3 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="font-black text-gold text-xs">
                        {user.wheelSpinsAvailable || 0}
                      </span>
                      <button
                        type="button"
                        disabled={grantSpinMutation.isPending}
                        onClick={() => grantSpinMutation.mutate({ userId: user.id, count: 1 })}
                        title="منح فرصة مجانية واحدة"
                        className="rounded-lg bg-surface border border-gold/40 px-1.5 py-0.5 text-[10px] font-bold text-gold hover:bg-gold/15"
                      >
                        + فرصة
                      </button>
                    </div>
                  </td>

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
                      {/* Preview User Account Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(user)}
                        title="معاينة حساب المستخدم"
                        className="rounded-lg bg-surface border border-cyan-glow/40 p-1.5 text-cyan-glow hover:bg-cyan-glow/10"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

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

      {/* User Account Preview Modal */}
      {previewUserModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-cyan-glow/50 bg-navy-deep p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-glow/20 text-cyan-glow">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    معاينة حساب المستخدم: {selectedUser.username}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewUserModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Profile Overview Bento */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-xl border border-border bg-surface p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">رتبة VIP</p>
                  <p className="font-black text-gold mt-0.5">VIP {selectedUser.vipLevel}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">الرصيد المتاح</p>
                  <p className="font-black text-cyan-glow mt-0.5">
                    ${selectedUser.balance.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">إجمالي الإيداع</p>
                  <p className="font-black text-emerald-400 mt-0.5">
                    ${selectedUser.totalDeposited.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">إجمالي السحب</p>
                  <p className="font-black text-amber-400 mt-0.5">
                    ${selectedUser.totalWithdrawn.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Referral & Team */}
              <div className="rounded-2xl border border-border bg-surface/60 p-3 space-y-1.5">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>كود الإحالة:</span>
                  <span className="font-mono font-bold text-cyan-glow">
                    {selectedUser.referralCode}
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>أعضاء الفريق:</span>
                  <span className="font-bold text-foreground">{selectedUser.teamCount} عضو</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>دخل الفريق:</span>
                  <span className="font-bold text-gold">
                    ${(selectedUser.teamIncome || 0).toFixed(2)}
                  </span>
                </div>
                {selectedUser.phone && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>الهاتف:</span>
                    <span className="font-mono text-foreground">{selectedUser.phone}</span>
                  </div>
                )}
              </div>

              {/* SECTION: User Withdrawal ON/OFF (Requirement 4) */}
              <div className="rounded-2xl border border-border bg-surface/80 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-cyan-glow" />
                      <span>مفتاح السحب الخاص بهذا المستخدم</span>
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      السحب لا يعمل إلا إذا كان السحب العام ON وسحب المستخدم ON.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={withdrawalStatusMutation.isPending}
                    onClick={() =>
                      withdrawalStatusMutation.mutate({
                        userId: selectedUser.id,
                        canWithdraw: !selectedUser.canWithdraw,
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm ${
                      selectedUser.canWithdraw
                        ? "bg-emerald-500 text-white shadow-glow"
                        : "bg-danger text-white shadow-sm"
                    }`}
                  >
                    {selectedUser.canWithdraw ? "مفعل (ON)" : "معطل (OFF)"}
                  </button>
                </div>
              </div>

              {/* SECTION: Withdrawal Address & Edit (Requirement 3) */}
              <div className="rounded-2xl border border-border bg-surface/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-foreground flex items-center gap-1.5">
                      <Wallet className="h-4 w-4 text-gold" />
                      <span>عنوان السحب الحالي للمستخدم</span>
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      يتم حفظ أي تعديل مباشرة في PostgreSQL.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditAddressOpen(!editAddressOpen)}
                    className="flex items-center gap-1 rounded-xl bg-surface border border-gold/40 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold/15"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>{editAddressOpen ? "إلغاء التعديل" : "تغيير / تعديل عنوان السحب"}</span>
                  </button>
                </div>

                {!editAddressOpen ? (
                  <div className="rounded-xl border border-border bg-surface p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        الشبكة: {selectedUser.withdrawalNetwork || "TRC20"}
                      </p>
                      <p className="font-mono text-xs font-bold text-foreground break-all mt-0.5">
                        {selectedUser.withdrawalAddress || "لم يقم المستخدم بربط عنوان سحب بعد"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-cyan-glow/40 bg-surface p-3 space-y-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">
                        اختر الشبكة:
                      </label>
                      <div className="mt-1 flex gap-2">
                        {(["TRC20", "BEP20", "ERC20"] as const).map((net) => (
                          <button
                            key={net}
                            type="button"
                            onClick={() => setNewWithdrawNetwork(net)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              newWithdrawNetwork === net
                                ? "border-cyan-glow bg-cyan-glow/20 text-cyan-glow font-black"
                                : "border-border bg-surface text-muted-foreground"
                            }`}
                          >
                            {net}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">
                        عنوان محفظة السحب الجديد:
                      </label>
                      <input
                        type="text"
                        placeholder="أدخل عنوان المحفظة الجديد (مثال: TQn9...)"
                        value={newWithdrawAddress}
                        onChange={(e) => setNewWithdrawAddress(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-border bg-navy-deep px-3 py-2 text-xs font-mono text-foreground focus:border-cyan-glow focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!newWithdrawAddress.trim() || withdrawalAddressMutation.isPending}
                      onClick={() =>
                        withdrawalAddressMutation.mutate({
                          userId: selectedUser.id,
                          network: newWithdrawNetwork,
                          address: newWithdrawAddress.trim(),
                        })
                      }
                      className="w-full rounded-xl brand-gradient py-2 text-xs font-black text-primary-foreground shadow-glow disabled:opacity-50"
                    >
                      {withdrawalAddressMutation.isPending
                        ? "جارٍ حفظ العنوان في PostgreSQL..."
                        : "تأكيد وحفظ عنوان السحب في قاعدة البيانات"}
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION: Lucky Wheel Free Spin (Requirement 2) */}
              <div className="rounded-2xl border border-border bg-surface/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-foreground flex items-center gap-1.5">
                      <Gift className="h-4 w-4 text-gold" />
                      <span>فرص عجلة الحظ للمستخدم</span>
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      الفرص المتاحة حالياً:{" "}
                      <strong className="text-gold font-bold">
                        {selectedUser.wheelSpinsAvailable || 0} فرصة
                      </strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={grantSpinMutation.isPending}
                    onClick={() => grantSpinMutation.mutate({ userId: selectedUser.id, count: 1 })}
                    className="flex items-center gap-1.5 rounded-xl brand-gradient px-3 py-2 text-xs font-black text-primary-foreground shadow-glow active:scale-95 disabled:opacity-50"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>إضافة فرصة مجانية (+1)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border/60 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewUserModalOpen(false)}
                className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
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
                    amount: Number(adjustAmount),
                    reason: adjustReason,
                    isCredit,
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
