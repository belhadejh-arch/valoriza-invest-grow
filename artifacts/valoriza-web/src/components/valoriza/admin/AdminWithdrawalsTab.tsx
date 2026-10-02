import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  X,
  RefreshCw,
  ShieldCheck,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminWithdrawals,
  reviewWithdrawal,
  getAdminSettings,
  saveAdminSettings,
} from "@/lib/valoriza-admin.functions";

export function AdminWithdrawalsTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const {
    data: settings,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    error: settingsError,
  } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => getAdminSettings(),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });

  const toggleGlobalWithdrawals = useMutation({
    mutationFn: (newVal: boolean) =>
      saveAdminSettings({ withdrawals_enabled: newVal ? "true" : "false" }),
    onSuccess: (_, newVal) => {
      toast.success(
        newVal
          ? "تم تفعيل السحب لجميع المستخدمين بنجاح ✅"
          : "تم إيقاف وتعطيل السحب لجميع المستخدمين ⛔",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawal-info"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const isGlobalWithdrawalsEnabled = settings?.["withdrawals_enabled"] === "true";
  const isSettingsReady =
    !isLoadingSettings &&
    !isSettingsError &&
    typeof settings?.["withdrawals_enabled"] === "string";

  const {
    data: withdrawals = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: () => getAdminWithdrawals(),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });

  const reviewMutation = useMutation({
    mutationFn: reviewWithdrawal,
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === "approve"
          ? "تمت الموافقة على طلب السحب وتحويله بنجاح 🎉"
          : "تم رفض طلب السحب وإعادة الرصيد بالكامل إلى محفظة المستخدم",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setRejectModalOpen(false);
      setRejectNote("");
      setSelectedWithdrawalId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (filter === "all") return true;
    return w.status === filter;
  });

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ للحافظة");
  };

  return (
    <div className="space-y-4">
      {/* Global Withdrawal Control Switch */}
      <div
        className={`rounded-2xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          !isSettingsReady
            ? "border-amber-500/40 bg-amber-500/10"
            : isGlobalWithdrawalsEnabled
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-danger/40 bg-danger/10"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              !isSettingsReady
                ? "bg-amber-500/20 text-amber-300"
                : isGlobalWithdrawalsEnabled
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-danger/20 text-danger"
            }`}
          >
            <Power className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-foreground flex items-center gap-2">
              <span>مفتاح السحب العام (لجميع المستخدمين):</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  !isSettingsReady
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : isGlobalWithdrawalsEnabled
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-danger/20 text-danger border border-danger/30"
                }`}
              >
                {!isSettingsReady
                  ? "جارٍ جلب الحالة"
                  : isGlobalWithdrawalsEnabled
                    ? "مفعّل (ON) 🟢"
                    : "معطّل ومغلق (OFF) 🔴"}
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {!isSettingsReady
                ? "يتم جلب الحالة الحالية من الخادم وقاعدة البيانات."
                : isGlobalWithdrawalsEnabled
                ? "السحب متاح للمستخدمين الذين تم تفعيل السحب في حساباتهم الفردية."
                : "السحب متوقف ومغلق حالياً لجميع المستخدمين، وتظهر لهم رسالة توضيحية."}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={
            toggleGlobalWithdrawals.isPending ||
            isLoadingSettings ||
            isSettingsError ||
            settings?.["withdrawals_enabled"] === undefined
          }
          onClick={() => toggleGlobalWithdrawals.mutate(!isGlobalWithdrawalsEnabled)}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all active:scale-95 disabled:opacity-50 ${
            isGlobalWithdrawalsEnabled
              ? "bg-danger text-white hover:bg-danger/90 shadow-md"
              : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-md"
          }`}
        >
          <Power className="h-4 w-4" />
          <span>
            {isLoadingSettings
              ? "جارٍ تحميل الإعداد..."
              : isSettingsError || settings?.["withdrawals_enabled"] === undefined
                ? "تعذر جلب إعداد السحب"
                : isGlobalWithdrawalsEnabled
                  ? "تعطيل السحب العام (OFF)"
                  : "تفعيل السحب العام (ON)"}
          </span>
        </button>
      </div>
      {isSettingsError && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          تعذر جلب إعداد السحب من الخادم:{" "}
          {settingsError instanceof Error ? settingsError.message : "تحقق من اتصال قاعدة البيانات."}
        </p>
      )}

      {/* Tabs bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: "pending", label: "بانتظار الصرف" },
              { id: "approved", label: "المدفوعة" },
              { id: "rejected", label: "المرفوضة" },
              { id: "all", label: "جميع السحوبات" },
            ] as const
          ).map((tab) => {
            const count = withdrawals.filter((w) =>
              tab.id === "all" ? true : w.status === tab.id,
            ).length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  filter === tab.id
                    ? "brand-gradient text-primary-foreground shadow-glow"
                    : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span className="rounded-full bg-black/30 px-1.5 py-0.2 text-[10px] font-extrabold">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold ${
              isError
                ? "border-danger/40 bg-danger/10 text-danger"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isError ? "bg-danger" : "bg-emerald-400 animate-pulse"
              }`}
            />
            {isError ? "تعذر الاتصال؛ إعادة المحاولة تلقائياً" : "تحديث تلقائي من PostgreSQL (5ث)"}
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground active:scale-95"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-cyan-glow" : ""}`}
            />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
          جارٍ جلب سجل طلبات السحب...
        </div>
      ) : isError && withdrawals.length === 0 ? (
        <div className="surface-card rounded-2xl border border-danger/40 p-6 text-center">
          <p className="text-sm font-bold text-danger">
            تعذر جلب السحوبات من الخادم وقاعدة البيانات.
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
      ) : filteredWithdrawals.length === 0 ? (
        <div className="surface-card rounded-2xl p-8 text-center text-xs text-muted-foreground">
          لا توجد طلبات سحب في هذا القسم حالياً.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWithdrawals.map((w) => (
            <div
              key={w.id}
              className={`rounded-2xl border p-4 transition-all ${
                w.status === "pending"
                  ? "border-amber-500/50 bg-surface/90 shadow-md"
                  : w.status === "approved"
                    ? "border-emerald-500/30 bg-surface/50"
                    : "border-border/50 bg-surface/40 opacity-80"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-black">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-foreground">{w.username}</p>
                    <p className="text-[10px] text-muted-foreground">{w.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-surface border border-border px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-glow">
                    {w.network}
                  </span>
                  <div className="text-left">
                    <span className="text-base font-black text-amber-400">
                      ${w.netAmount.toFixed(2)}
                    </span>
                    <span className="block text-[9px] text-muted-foreground">
                      (إجمالي: ${w.amount.toFixed(2)} | رسوم: ${w.fee.toFixed(2)})
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      w.status === "pending"
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        : w.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-danger/15 text-danger border border-danger/30"
                    }`}
                  >
                    {w.status === "pending"
                      ? "معلق"
                      : w.status === "approved"
                        ? "تم التحويل"
                        : "مرفوض ومسترجع"}
                  </span>
                </div>
              </div>

              {/* Destination Address */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center justify-between rounded-xl bg-navy-deep p-2 border border-border/80">
                  <span className="text-muted-foreground">عنوان المحفظة المستلمة:</span>
                  <button
                    type="button"
                    onClick={() => copyText(w.address)}
                    className="flex items-center gap-1 font-mono text-cyan-glow hover:underline truncate max-w-[200px]"
                  >
                    <Copy className="h-3 w-3 shrink-0" />
                    <span className="truncate">{w.address}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-navy-deep p-2 border border-border/80">
                  <span className="text-muted-foreground">تاريخ الطلب:</span>
                  <span className="text-foreground">
                    {new Date(w.createdAt).toLocaleString("ar-SA", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {w.adminNote && (
                <p className="mt-2 text-[10px] text-muted-foreground bg-surface/80 p-2 rounded-lg border border-border/50">
                  ملاحظة المشرف: {w.adminNote}
                </p>
              )}

              {/* Action buttons if Pending */}
              {w.status === "pending" && (
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() => {
                      setSelectedWithdrawalId(w.id);
                      setRejectModalOpen(true);
                    }}
                    className="flex items-center gap-1 rounded-xl border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/20"
                  >
                    <XCircle className="h-4 w-4" />
                    رفض واسترجاع الرصيد
                  </button>

                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({
                        withdrawalId: w.id,
                        action: "approve",
                        adminNote: "تمت معالجة الحوالة والتحويل إلى العنوان بنجاح",
                      })
                    }
                    className="flex items-center gap-1 rounded-xl brand-gradient px-4 py-1.5 text-xs font-black text-primary-foreground shadow-glow hover:opacity-95 active:scale-95"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    تأكيد التحويل والصرف
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selectedWithdrawalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-danger/40 bg-navy-deep p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-xs font-extrabold text-foreground">رفض طلب السحب</h3>
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <p className="text-[11px] text-muted-foreground">
                سيتم استرجاع المبلغ بالكامل إلى محفظة المستخدم فوراً. يرجى توضيح السبب:
              </p>
              <textarea
                rows={3}
                placeholder="مثال: عنوان المحفظة غير متطابق مع الشبكة المختارة، أو هناك اشتباه في الحساب."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground focus:border-danger focus:outline-none"
              />

              <button
                type="button"
                disabled={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate({
                    withdrawalId: selectedWithdrawalId,
                    action: "reject",
                    adminNote: rejectNote || "عنوان المحفظة غير صالح",
                  })
                }
                className="w-full rounded-xl bg-danger py-2.5 text-xs font-black text-white shadow-md hover:bg-danger/90 disabled:opacity-50"
              >
                {reviewMutation.isPending ? "جارٍ الاسترجاع..." : "تأكيد الرفض والاسترجاع"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
