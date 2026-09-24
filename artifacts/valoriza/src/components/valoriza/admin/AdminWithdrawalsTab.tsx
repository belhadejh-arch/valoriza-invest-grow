import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, XCircle, Clock, Copy, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getAdminWithdrawals, reviewWithdrawal } from "@/lib/valoriza-admin.functions";

export function AdminWithdrawalsTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const {
    data: withdrawals = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: () => getAdminWithdrawals(),
    refetchInterval: 15000,
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
      setRejectModalOpen(false);
      setRejectNote("");
      setSelectedWithdrawalId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredWithdrawals = withdrawals.filter((w: any) => {
    if (filter === "all") return true;
    return w.status === filter;
  });

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم النسخ للحافظة");
  };

  return (
    <div className="space-y-4">
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
            const count = withdrawals.filter((w: any) =>
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
          جارٍ جلب سجل طلبات السحب...
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <div className="surface-card rounded-2xl p-8 text-center text-xs text-muted-foreground">
          لا توجد طلبات سحب في هذا القسم حالياً.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWithdrawals.map((w: any) => (
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
                    rejectReason: rejectNote || "عنوان المحفظة غير صالح",
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
