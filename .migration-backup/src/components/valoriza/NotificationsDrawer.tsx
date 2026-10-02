import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CheckCheck,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Crown,
  TrendingUp,
  Video,
  Gift,
  Users,
  Info,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  getUserNotifications,
  markNotificationAsRead,
  type AppNotification,
} from "@/lib/valoriza-tasks.functions";

interface NotificationsDrawerProps {
  open: boolean;
  onClose: () => void;
}

function getNotificationIcon(title: string, body: string) {
  const t = `${title} ${body}`.toLowerCase();
  if (t.includes("إيداع")) return <ArrowDownLeft className="h-4 w-4 text-emerald-400" />;
  if (t.includes("سحب")) return <ArrowUpRight className="h-4 w-4 text-amber-400" />;
  if (t.includes("vip") || t.includes("ترقية")) return <Crown className="h-4 w-4 text-gold" />;
  if (t.includes("استثمار") || t.includes("صندوق"))
    return <TrendingUp className="h-4 w-4 text-cyan-glow" />;
  if (t.includes("مهمة") || t.includes("فيديو"))
    return <Video className="h-4 w-4 text-purple-400" />;
  if (t.includes("إحالة") || t.includes("فريق")) return <Users className="h-4 w-4 text-primary" />;
  if (t.includes("عجلة") || t.includes("مكافأة") || t.includes("يومية"))
    return <Gift className="h-4 w-4 text-pink-400" />;
  return <Info className="h-4 w-4 text-cyan-glow" />;
}

function formatRelativeTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return "الآن";
    if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
    if (diffSec < 86400) return `منذ ${Math.floor(diffSec / 3600)} ساعة`;
    if (diffSec < 172800) return "أمس";
    return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function NotificationsDrawer({ open, onClose }: NotificationsDrawerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["user-notifications"],
    queryFn: () => getUserNotifications(),
    enabled: open,
    refetchInterval: 15000,
  });

  const markMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });

  if (!open) return null;

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      markMutation.mutate({ notificationId: notif.id });
    }
    onClose();
    if (notif.relatedPage) {
      navigate({ to: notif.relatedPage });
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    await markMutation.mutateAsync({ markAll: true });
    toast.success("تم تحديد جميع الإشعارات كمقروءة");
  };

  return (
    <div
      id="notifications-drawer-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="notifications-drawer-panel"
        className="h-full w-full max-w-sm overflow-y-auto border-r border-cyan-glow/40 bg-navy-deep p-4 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-300"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-cyan-glow/40 text-cyan-glow">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  مركز الإشعارات
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-extrabold text-white animate-pulse">
                      {unreadCount} جديد
                    </span>
                  )}
                </h2>
                <p className="text-[10px] text-muted-foreground">
                  تحديثات المعاملات والمهام والمكافآت
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted-foreground hover:text-foreground active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mark all as read action */}
          {notifications.length > 0 && unreadCount > 0 && (
            <div className="pt-2.5 pb-1 flex justify-end">
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markMutation.isPending}
                className="flex items-center gap-1 text-[11px] font-bold text-cyan-glow hover:underline active:opacity-80"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>تحديد الكل كمقروء</span>
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-0.5">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-cyan-glow border-t-transparent mb-2" />
                جارٍ تحميل الإشعارات...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface/80 border border-border/60 text-muted-foreground mb-3">
                  <Bell className="h-7 w-7 text-muted-foreground/60" />
                </div>
                <p className="text-xs font-bold text-foreground">لا توجد إشعارات جديدة</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  ستظهر هنا إشعارات إيداعاتك، مهامك، ومكافآتك اليومية.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`group relative flex cursor-pointer gap-3 rounded-2xl border p-3 transition-all duration-200 active:scale-[0.99] ${
                    n.isRead
                      ? "border-border/40 bg-surface/40 hover:bg-surface/70"
                      : "border-cyan-glow/50 bg-surface/90 shadow-[0_0_15px_oklch(0.82_0.14_205/0.12)] hover:border-cyan-glow"
                  }`}
                >
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-deep border border-border/80 group-hover:border-cyan-glow/40 transition-colors">
                    {getNotificationIcon(n.title, n.body)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h3
                        className={`text-xs font-bold truncate ${
                          n.isRead ? "text-foreground/90" : "text-cyan-glow"
                        }`}
                      >
                        {n.title}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {formatRelativeTime(n.createdAt)}
                        </span>
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-cyan-glow shadow-[0_0_8px_oklch(0.82_0.14_205/0.8)]" />
                        )}
                      </div>
                    </div>

                    <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {n.body}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 mt-2 border-t border-border/40 text-center">
          <p className="text-[10px] text-muted-foreground">
            نظام الإشعارات الآلي الفوري · Valoriza Platform
          </p>
        </div>
      </div>
    </div>
  );
}
