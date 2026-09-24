import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Search,
  ExternalLink,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { getAdminDeposits, reviewDeposit } from "@/lib/valoriza-admin.functions";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";

export function AdminDepositsTab() {
  const { t, lang } = useI18n();
  const content = useLocalizedContent();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<string | null>(null);

  const {
    data: deposits = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-deposits"],
    queryFn: () => getAdminDeposits(),
    refetchInterval: 15000,
  });

  const reviewMutation = useMutation({
    mutationFn: reviewDeposit,
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === "approve"
          ? t("admin.depositApprovedToast")
          : t("admin.depositRejectedToast"),
      );
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setRejectModalOpen(false);
      setRejectNote("");
      setSelectedDepositId(null);
    },
    onError: () => toast.error(t("common.error")),
  });

  const filteredDeposits = deposits.filter((d: any) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("admin.copiedToClipboard"));
  };

  return (
    <div className="space-y-4">
      {/* Tabs bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: "pending", label: t("admin.awaitingReview") },
              { id: "approved", label: t("admin.approved") },
              { id: "rejected", label: t("admin.rejected") },
              { id: "all", label: t("admin.allDeposits") },
            ] as const
          ).map((tab) => {
            const count = deposits.filter((d: any) =>
              tab.id === "all" ? true : d.status === tab.id,
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
          <span>{t("admin.refresh")}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
          {t("admin.loadingDeposits")}
        </div>
      ) : filteredDeposits.length === 0 ? (
        <div className="surface-card rounded-2xl p-8 text-center text-xs text-muted-foreground">
          {t("admin.noDeposits")}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeposits.map((dep: any) => (
            <div
              key={dep.id}
              className={`rounded-2xl border p-4 transition-all ${
                dep.status === "pending"
                  ? "border-amber-500/50 bg-surface/90 shadow-md"
                  : dep.status === "approved"
                    ? "border-emerald-500/30 bg-surface/50"
                    : "border-border/50 bg-surface/40 opacity-80"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black">
                    <ArrowDownLeft className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-foreground">
                      {content(dep.username || "", { allowUserIdentifier: true })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {content(dep.email || "", { allowUserIdentifier: true })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-surface border border-border px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-glow">
                    {content(dep.network || "", { allowLanguageNeutral: true })}
                  </span>
                  <span className="text-base font-black text-emerald-400">
                    +${dep.amount.toFixed(2)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      dep.status === "pending"
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        : dep.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-danger/15 text-danger border border-danger/30"
                    }`}
                  >
                    {dep.status === "pending"
                      ? t("status.pending")
                      : dep.status === "approved"
                        ? t("admin.approvedAndCredited")
                        : t("status.rejected")}
                  </span>
                </div>
              </div>

              {/* Deposit Details */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {dep.txHash && (
                  <div className="flex items-center justify-between rounded-xl bg-navy-deep p-2 border border-border/80">
                    <span className="text-muted-foreground">{t("admin.transactionId")}</span>
                    <button
                      type="button"
                      onClick={() => copyText(dep.txHash)}
                      className="flex items-center gap-1 font-mono text-cyan-glow hover:underline truncate max-w-[180px]"
                    >
                      <Copy className="h-3 w-3 shrink-0" />
                      <span className="truncate">{content(dep.txHash, { allowLanguageNeutral: true })}</span>
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl bg-navy-deep p-2 border border-border/80">
                  <span className="text-muted-foreground">{t("admin.requestDate")}</span>
                  <span className="text-foreground">
                    {new Date(dep.createdAt).toLocaleString(lang, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Screenshot Display if available */}
              {dep.screenshotUrl && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#071730] p-2.5 border border-[#00d2ff]/30">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPreviewScreenshotUrl(dep.screenshotUrl)}
                      className="relative h-12 w-12 rounded-lg overflow-hidden border border-[#00d2ff]/50 hover:scale-105 transition-transform shrink-0"
                    >
                      <img
                        src={dep.screenshotUrl}
                        alt={t("admin.transferScreenshot")}
                        className="h-full w-full object-cover"
                      />
                    </button>
                    <div>
                      <p className="text-xs font-bold text-white">{t("admin.transferScreenshot")}</p>
                      <p className="text-[10px] text-gray-400">{t("admin.clickPreviewFullImage")}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewScreenshotUrl(dep.screenshotUrl)}
                    className="flex items-center gap-1 text-xs font-bold text-[#00d2ff] bg-[#0c2850] px-2.5 py-1.5 rounded-lg border border-[#00d2ff]/30 hover:bg-[#00d2ff] hover:text-[#071328] transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>{t("admin.previewImage")}</span>
                  </button>
                </div>
              )}

              {dep.adminNote && (
                <p className="mt-2 text-[10px] text-muted-foreground bg-surface/80 p-2 rounded-lg border border-border/50">
                  {t("admin.adminNote")}: {content(dep.adminNote)}
                </p>
              )}

              {/* Action Buttons if Pending */}
              {dep.status === "pending" && (
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() => {
                      setSelectedDepositId(dep.id);
                      setRejectModalOpen(true);
                    }}
                    className="flex items-center gap-1 rounded-xl border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/20"
                  >
                    <XCircle className="h-4 w-4" />
                    {t("admin.rejectRequest")}
                  </button>

                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({
                        depositId: dep.id,
                        action: "approve",
                      })
                    }
                    className="flex items-center gap-1 rounded-xl brand-gradient px-4 py-1.5 text-xs font-black text-primary-foreground shadow-glow hover:opacity-95 active:scale-95"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t("admin.approveAndCredit")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selectedDepositId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-danger/40 bg-navy-deep p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-xs font-extrabold text-foreground">{t("admin.rejectDeposit")}</h3>
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
                {t("admin.rejectReasonPrompt")}
              </p>
              <textarea
                rows={3}
                placeholder={t("admin.depositRejectPlaceholder")}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground focus:border-danger focus:outline-none"
              />

              <button
                type="button"
                disabled={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate({
                    depositId: selectedDepositId,
                    action: "reject",
                    rejectReason: rejectNote || t("admin.depositDataMismatch"),
                  })
                }
                className="w-full rounded-xl bg-danger py-2.5 text-xs font-black text-white shadow-md hover:bg-danger/90 disabled:opacity-50"
              >
                {reviewMutation.isPending ? t("admin.rejecting") : t("admin.confirmRejection")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Preview Modal */}
      {previewScreenshotUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center bg-[#071730] border border-[#00d2ff]/40 rounded-3xl p-4 overflow-hidden">
            <div className="flex items-center justify-between w-full pb-3 border-b border-[#14325e]">
              <span className="text-sm font-bold text-white">{t("admin.previewTransferScreenshot")}</span>
              <button
                type="button"
                onClick={() => setPreviewScreenshotUrl(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0c2448] text-white hover:bg-red-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3 w-full flex-1 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img
                src={previewScreenshotUrl}
                alt={t("admin.depositProof")}
                className="max-w-full max-h-[72vh] object-contain rounded-xl border border-[#14325e]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
