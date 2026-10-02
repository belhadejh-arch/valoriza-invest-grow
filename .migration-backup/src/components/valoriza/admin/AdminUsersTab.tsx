import { useEffect, useState } from "react";
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
  Ticket,
  Power,
  Link as LinkIcon,
  Check,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminUsers,
  toggleUserBlock,
  updateUserVipLevel,
  manualBalanceAdjustment,
  toggleUserWithdrawal,
  updateUserWithdrawalAddress,
  addFreeWheelSpin,
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

  const [addSpinModalOpen, setAddSpinModalOpen] = useState(false);
  const [spinCountInput, setSpinCountInput] = useState(1);

  // Edit withdrawal address state
  const [editingAddressOpen, setEditingAddressOpen] = useState(false);
  const [targetAddress, setTargetAddress] = useState("");
  const [targetNetwork, setTargetNetwork] = useState("TRC20");

  const {
    data: users = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getAdminUsers(),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });

  const selectedUserId = selectedUser?.id;
  useEffect(() => {
    if (!selectedUserId) return;
    const latestUser = users.find((user) => user.id === selectedUserId);
    if (latestUser) setSelectedUser(latestUser);
  }, [users, selectedUserId]);

  const blockMutation = useMutation({
    mutationFn: toggleUserBlock,
    onSuccess: () => {
      toast.success("تم تحديث حالة حظر المستخدم بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const withdrawalToggleMutation = useMutation({
    mutationFn: toggleUserWithdrawal,
    onSuccess: (_, vars) => {
      toast.success(
        vars.canWithdraw
          ? "تم تفعيل ميزة السحب للمستخدم بنجاح (ON) ✅"
          : "تم تعطيل ميزة السحب للمستخدم (OFF) ⛔",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (selectedUser && selectedUser.id === vars.userId) {
        setSelectedUser((prev: any) => ({ ...prev, canWithdraw: vars.canWithdraw }));
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateAddressMutation = useMutation({
    mutationFn: updateUserWithdrawalAddress,
    onSuccess: (_, vars) => {
      toast.success("تم تحديث وحفظ عنوان السحب للمستخدم في قاعدة البيانات بنجاح 🎉");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (selectedUser && selectedUser.id === vars.userId) {
        setSelectedUser((prev: any) => ({
          ...prev,
          withdrawalAddress: vars.address,
          withdrawalNetwork: vars.network || prev.withdrawalNetwork,
        }));
      }
      setEditingAddressOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addSpinMutation = useMutation({
    mutationFn: addFreeWheelSpin,
    onSuccess: (res, vars) => {
      toast.success(`تمت إضافة ${vars.count || 1} فرصة مجانية لعجلة الحظ للمستخدم بنجاح 🎟️`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (selectedUser && selectedUser.id === vars.userId) {
        setSelectedUser((prev: any) => ({
          ...prev,
          wheelSpins: (prev.wheelSpins || 0) + (vars.count || 1),
        }));
      }
      setAddSpinModalOpen(false);
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
    setTargetAddress(user.withdrawalAddress || "");
    setTargetNetwork(user.withdrawalNetwork || "TRC20");
    setEditingAddressOpen(false);
    setPreviewUserModalOpen(true);
  };

  const handleOpenAddSpin = (user: any) => {
    setSelectedUser(user);
    setSpinCountInput(1);
    setAddSpinModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="البحث باسم المستخدم، البريد، أو كود الإحالة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface pr-9 pl-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-cyan-glow focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold ${
              isError
                ? "border-danger/40 bg-danger/10 text-danger"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isError ? "bg-danger" : "bg-emerald-400 animate-pulse"
              }`}
            />
            {isError
              ? "تعذر الاتصال؛ ستتم إعادة المحاولة تلقائياً"
              : isFetching
                ? "جارٍ جلب أحدث البيانات..."
                : "تحديث تلقائي من PostgreSQL (5 ثوانٍ)"}
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-cyan-glow" : ""}`}
            />
            <span>تحديث ({filteredUsers.length})</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
          جارٍ جلب حسابات المستخدمين...
        </div>
      ) : isError && users.length === 0 ? (
        <div className="surface-card rounded-2xl border border-danger/40 p-6 text-center">
          <p className="text-sm font-bold text-danger">
            تعذر جلب قائمة المستخدمين وبيانات الفريق من الخادم وقاعدة البيانات.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {error instanceof Error ? error.message : "تحقق من اتصال الخادم بقاعدة البيانات."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            إعادة المحاولة
          </button>
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
                <th className="p-3">VIP</th>
                <th className="p-3">الرصيد</th>
                <th className="p-3">أعضاء الفريق (VIP1-7)</th>
                <th className="p-3">إجمالي سحب الفريق</th>
                <th className="p-3">سحب المستخدم</th>
                <th className="p-3">إجمالي الإيداع</th>
                <th className="p-3">سحب شخصي</th>
                <th className="p-3">فرص العجلة</th>
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

                  {/* Requirement 3: Team VIP Members Count (VIP1 - VIP7 only) */}
                  <td className="p-3">
                    <span
                      title="عدد أعضاء الفريق الحاصلين على VIP1 إلى VIP7 فقط"
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black border transition-all ${
                        (user.teamVipCount ?? user.teamCount ?? 0) > 0
                          ? "bg-cyan-glow/15 border-cyan-glow/40 text-cyan-glow"
                          : "bg-surface border-border/80 text-muted-foreground"
                      }`}
                    >
                      <Users className="h-3 w-3" />
                      <span>{user.teamVipCount ?? user.teamCount ?? 0}</span>
                      <span className="text-[9px] font-normal opacity-75">عضو VIP</span>
                    </span>
                  </td>

                  {/* Requirement 4: Team Members Total Approved Withdrawals */}
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-black text-amber-400 text-xs">
                        ${(user.teamWithdrawn ?? 0).toFixed(2)}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-semibold">
                        سحوبات مقبولة
                      </span>
                    </div>
                  </td>

                  {/* User Withdrawal Switch (ON/OFF) */}
                  <td className="p-3">
                    <button
                      type="button"
                      disabled={withdrawalToggleMutation.isPending}
                      onClick={() =>
                        withdrawalToggleMutation.mutate({
                          userId: user.id,
                          canWithdraw: !user.canWithdraw,
                        })
                      }
                      title={
                        user.canWithdraw
                          ? "مسموح بالسحب (انقر للتعطيل)"
                          : "السحب معطل (انقر للتفعيل)"
                      }
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer ${
                        user.canWithdraw
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25"
                          : "bg-danger/15 border-danger/40 text-danger hover:bg-danger/25"
                      }`}
                    >
                      <Power className="h-2.5 w-2.5" />
                      <span>{user.canWithdraw ? "ON مفعّل" : "OFF معطّل"}</span>
                    </button>
                  </td>

                  <td className="p-3 font-bold text-emerald-400">
                    ${user.totalDeposited.toFixed(2)}
                  </td>
                  <td className="p-3 font-bold text-amber-400/90 text-xs">
                    ${(user.userWithdrawn ?? user.totalWithdrawn ?? 0).toFixed(2)}
                  </td>

                  {/* Wheel Spins with Quick Add Button */}
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-foreground">{user.wheelSpins}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenAddSpin(user)}
                        title="إضافة فرصة مجانية لعجلة الحظ"
                        className="rounded-lg bg-gold/15 text-gold border border-gold/30 p-1 hover:bg-gold/25 transition-all"
                      >
                        <Ticket className="h-3 w-3" />
                      </button>
                    </div>
                  </td>

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
                    <div className="flex items-center justify-center gap-1">
                      {/* Preview User Account Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(user)}
                        title="معاينة حساب المستخدم وتعديل عنوان السحب"
                        className="rounded-lg bg-surface border border-cyan-glow/40 p-1.5 text-cyan-glow hover:bg-cyan-glow/10"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {/* Add Free Spin Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenAddSpin(user)}
                        title="إضافة فرصة مجانية"
                        className="rounded-lg bg-surface border border-gold/40 p-1.5 text-gold hover:bg-gold/10"
                      >
                        <Ticket className="h-3.5 w-3.5" />
                      </button>

                      {/* Adjust Balance Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setAdjustBalanceOpen(true);
                        }}
                        title="تعديل الرصيد يدوياً"
                        className="rounded-lg bg-surface border border-border p-1.5 text-muted-foreground hover:text-foreground"
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

      {/* USER ACCOUNT PREVIEW MODAL (معاينة حساب المستخدم) */}
      {previewUserModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-cyan-glow/40 bg-navy-deep p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl brand-gradient text-primary-foreground font-black">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">معاينة حساب المستخدم</h3>
                  <p className="text-[11px] text-muted-foreground">{selectedUser.email}</p>
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

            <div className="mt-4 space-y-4">
              {/* User Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border bg-surface p-2.5">
                  <p className="text-[10px] text-muted-foreground font-bold">اسم المستخدم</p>
                  <p className="text-xs font-black text-foreground truncate mt-0.5">
                    {selectedUser.username || "بدون"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface p-2.5">
                  <p className="text-[10px] text-muted-foreground font-bold">كود الإحالة</p>
                  <p className="text-xs font-black font-mono text-cyan-glow mt-0.5">
                    {selectedUser.referralCode}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface p-2.5">
                  <p className="text-[10px] text-muted-foreground font-bold">مستوى VIP</p>
                  <p className="text-xs font-black text-gold mt-0.5">VIP {selectedUser.vipLevel}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface p-2.5">
                  <p className="text-[10px] text-muted-foreground font-bold">الرصيد المتاح</p>
                  <p className="text-xs font-black text-gold mt-0.5">
                    ${selectedUser.balance.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-glow/40 bg-cyan-glow/10 p-2.5">
                  <p className="text-[10px] text-cyan-glow font-bold">أعضاء الفريق (VIP1-7)</p>
                  <p className="text-xs font-black text-cyan-glow mt-0.5 flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{selectedUser.teamVipCount ?? selectedUser.teamCount ?? 0} عضو VIP</span>
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5">
                  <p className="text-[10px] text-amber-400 font-bold">إجمالي سحب الفريق</p>
                  <p className="text-xs font-black text-amber-400 mt-0.5">
                    ${(selectedUser.teamWithdrawn ?? 0).toFixed(2)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">مقبولة فقط</p>
                </div>
              </div>

              {/* Requirement 4: User Independent Withdrawal Switch */}
              <div className="rounded-2xl border border-border bg-surface/80 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Power
                      className={`h-4 w-4 ${selectedUser.canWithdraw ? "text-emerald-400" : "text-danger"}`}
                    />
                    <div>
                      <p className="text-xs font-extrabold text-foreground">
                        مفتاح سحب المستخدم (مستقل)
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedUser.canWithdraw
                          ? "السحب مفعّل ومسموح لهذا المستخدم طالما السحب العام ON."
                          : "السحب معطّل ومحظور لهذا المستخدم، وستظهر له رسالة توضيحية."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={withdrawalToggleMutation.isPending}
                    onClick={() =>
                      withdrawalToggleMutation.mutate({
                        userId: selectedUser.id,
                        canWithdraw: !selectedUser.canWithdraw,
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all active:scale-95 ${
                      selectedUser.canWithdraw
                        ? "bg-emerald-500 text-white border-emerald-400 shadow-md"
                        : "bg-danger text-white border-danger shadow-md"
                    }`}
                  >
                    {selectedUser.canWithdraw ? "ON مفعّل" : "OFF معطّل"}
                  </button>
                </div>
              </div>

              {/* Requirement 3: User Withdrawal Address Modification */}
              <div className="rounded-2xl border border-cyan-glow/30 bg-surface/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-cyan-glow" />
                    <div>
                      <p className="text-xs font-extrabold text-foreground">
                        عنوان السحب الخاص بالمستخدم
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        يتم حفظ التعديل مباشرة في PostgreSQL
                      </p>
                    </div>
                  </div>
                  {!editingAddressOpen && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetAddress(selectedUser.withdrawalAddress || "");
                        setTargetNetwork(selectedUser.withdrawalNetwork || "TRC20");
                        setEditingAddressOpen(true);
                      }}
                      className="flex items-center gap-1 rounded-xl brand-gradient px-3 py-1.5 text-xs font-bold text-primary-foreground shadow"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>تعديل عنوان السحب</span>
                    </button>
                  )}
                </div>

                {!editingAddressOpen ? (
                  <div className="rounded-xl border border-border bg-background p-3 text-start">
                    {selectedUser.withdrawalAddress ? (
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-muted-foreground">الشبكة:</span>
                          <span className="font-extrabold text-cyan-glow">
                            {selectedUser.withdrawalNetwork || "TRC20"}
                          </span>
                        </div>
                        <p className="font-mono text-xs font-bold text-foreground break-all select-all">
                          {selectedUser.withdrawalAddress}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic text-center">
                        لم يقم المستخدم بربط عنوان سحب حتى الآن. يمكنك تعيين عنوان له بالضغط على زر
                        "تعديل عنوان السحب".
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-cyan-glow/50 bg-background p-3 animate-in fade-in">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">الشبكة</label>
                      <select
                        value={targetNetwork}
                        onChange={(e) => setTargetNetwork(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                      >
                        <option value="TRC20">TRC20 (Tron Network)</option>
                        <option value="BEP20">BEP20 (BNB Smart Chain)</option>
                        <option value="ERC20">ERC20 (Ethereum)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">
                        عنوان المحفظة الجديد (Address)
                      </label>
                      <input
                        type="text"
                        placeholder="أدخل عنوان المحفظة الجديد..."
                        value={targetAddress}
                        onChange={(e) => setTargetAddress(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground font-mono focus:border-cyan-glow focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={updateAddressMutation.isPending || !targetAddress.trim()}
                        onClick={() =>
                          updateAddressMutation.mutate({
                            userId: selectedUser.id,
                            address: targetAddress.trim(),
                            network: targetNetwork,
                          })
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl brand-gradient py-2 text-xs font-black text-primary-foreground shadow-glow disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>
                          {updateAddressMutation.isPending
                            ? "جارٍ الحفظ في PostgreSQL..."
                            : "حفظ العنوان الجديد"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAddressOpen(false)}
                        className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Requirement 2: Lucky Wheel Free Chance */}
              <div className="rounded-2xl border border-gold/30 bg-surface/80 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-gold" />
                    <div>
                      <p className="text-xs font-extrabold text-foreground">
                        فرص عجلة الحظ المتاحة
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        العدد الحالي المسجل في قاعدة البيانات:{" "}
                        <strong className="text-gold font-bold">
                          {selectedUser.wheelSpins || 0}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSpinCountInput(1);
                      setAddSpinModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl gold-gradient px-3 py-1.5 text-xs font-black text-navy-deep shadow-gold-glow active:scale-95"
                  >
                    <Ticket className="h-3.5 w-3.5" />
                    <span>إضافة فرصة مجانية</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border/60 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewUserModalOpen(false)}
                className="rounded-xl border border-border bg-surface px-5 py-2 text-xs font-bold text-foreground hover:bg-surface/80"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD FREE WHEEL SPIN MODAL (إضافة فرصة مجانية لمستخدم محدد) */}
      {addSpinModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-gold/40 bg-navy-deep p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-gold" />
                <h3 className="text-xs font-extrabold text-foreground">
                  إضافة فرصة مجانية: {selectedUser.username}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddSpinModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-[11px] text-muted-foreground">
                الفرص الحالية للمستخدم:{" "}
                <span className="font-extrabold text-gold">
                  {selectedUser.wheelSpins || 0} فرصة
                </span>
              </p>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold">
                  عدد الفرص المجانية المراد منحها
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={spinCountInput}
                    onChange={(e) => setSpinCountInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-gold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setSpinCountInput(1)}
                    className="shrink-0 rounded-xl border border-border bg-surface px-2.5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpinCountInput(3)}
                    className="shrink-0 rounded-xl border border-border bg-surface px-2.5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    +3
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={addSpinMutation.isPending || spinCountInput < 1}
                onClick={() =>
                  addSpinMutation.mutate({
                    userId: selectedUser.id,
                    count: spinCountInput,
                  })
                }
                className="w-full mt-3 rounded-xl gold-gradient py-2.5 text-xs font-black text-navy-deep shadow-gold-glow disabled:opacity-50"
              >
                {addSpinMutation.isPending
                  ? "جارٍ الحفظ في قاعدة البيانات..."
                  : `تأكيد منح ${spinCountInput} فرصة مجانية`}
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
