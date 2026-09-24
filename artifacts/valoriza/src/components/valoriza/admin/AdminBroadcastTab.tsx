import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Bell, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { broadcastNotification } from "@/lib/valoriza-admin.functions";
import { useI18n } from "@/lib/i18n";

export function AdminBroadcastTab() {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"system" | "promo" | "alert">("system");
  const [actionUrl, setActionUrl] = useState("");

  const broadcastMutation = useMutation({
    mutationFn: broadcastNotification,
    onSuccess: (res) => {
      toast.success(`${t("admin.broadcastSentTo")} ${res.sentCount} ${t("admin.users")} 🎉`);
      setTitle("");
      setMessage("");
      setActionUrl("");
    },
    onError: () => toast.error(t("common.error")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error(t("admin.enterTitleAndMessage"));
      return;
    }
    broadcastMutation.mutate({
      title,
      message,
      type,
      actionUrl: actionUrl || undefined,
    });
  };

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
          <Bell className="h-4 w-4 text-cyan-glow" />
          <span>{t("admin.broadcastHeading")}</span>
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {t("admin.broadcastDescription")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-surface/70 p-5 space-y-3.5 shadow-md"
      >
        <div>
          <label className="text-[10px] text-muted-foreground font-bold">{t("admin.notificationType")}</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {[
              { id: "system", label: t("admin.systemUpdate"), icon: Bell },
              { id: "promo", label: t("admin.rewardOffer"), icon: Sparkles },
              { id: "alert", label: t("admin.importantAlert"), icon: AlertTriangle },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id as any)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                    type === t.id
                      ? "border-cyan-glow bg-cyan-glow/15 text-cyan-glow shadow-glow"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground font-bold">{t("admin.notificationTitle")}</label>
          <input
            type="text"
            value={title}
            placeholder={t("admin.notificationTitlePlaceholder")}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground font-bold">{t("admin.fullNotificationText")}</label>
          <textarea
            rows={4}
            value={message}
            placeholder={t("admin.notificationMessagePlaceholder")}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground font-bold">{t("admin.buttonLinkOptional")}</label>
          <input
            type="text"
            value={actionUrl}
            placeholder={t("admin.buttonLinkPlaceholder")}
            onChange={(e) => setActionUrl(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono text-[11px]"
          />
        </div>

        <button
          type="submit"
          disabled={!title || !message || broadcastMutation.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-2xl brand-gradient py-3 text-xs font-black text-primary-foreground shadow-glow hover:opacity-95 active:scale-95 disabled:opacity-50"
        >
          {broadcastMutation.isPending ? (
            <span>{t("admin.sendingToAllUsers")}</span>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>{t("admin.sendBroadcastNow")}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
