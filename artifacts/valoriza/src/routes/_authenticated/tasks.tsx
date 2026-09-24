import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Video,
  Play,
  CheckCircle2,
  Clock,
  Crown,
  Sparkles,
  ShieldCheck,
  X,
  Gift,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/valoriza/AppHeader";
import { BottomNav } from "@/components/valoriza/BottomNav";
import {
  getTasksData,
  completeTask,
  type TaskItem,
  type TasksPageData,
} from "@/lib/valoriza-tasks.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "المهام — Valoriza" },
      { name: "description", content: "شاهد الفيديوهات الترويجية واكسب عمولتك اليومية فوراً." },
      { property: "og:title", content: "المهام — Valoriza" },
      { property: "og:description", content: "المهام اليومية وعمولات المشاهدة." },
    ],
  }),
  component: TasksPage,
});

function getYouTubeEmbedUrl(url: string): string {
  const match = url?.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );
  const id = match ? match[1] : "kYJvM9l_83w";
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&controls=1&rel=0&modestbranding=1`;
}

function TasksPage() {
  const { t, isRTL } = useI18n();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"tasks" | "daily">("tasks");

  // Video Watching Modal State
  const [activeWatchTask, setActiveWatchTask] = useState<TaskItem | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const [watchedSeconds, setWatchedSeconds] = useState(0);

  const { data, isLoading, isError } = useQuery<TasksPageData>({
    queryKey: ["tasks-data"],
    queryFn: () => getTasksData(),
  });

  const completeMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: (result: any) => {
      if (result.ok) {
        toast.success(t("tasks.completeSuccess"));
        queryClient.invalidateQueries({ queryKey: ["tasks-data"] });
        queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
        queryClient.invalidateQueries({ queryKey: ["investment-data"] });
        queryClient.invalidateQueries({ queryKey: ["account-data"] });
        setActiveWatchTask(null);
      } else {
        if (result.reason === "DAILY_LIMIT_REACHED") {
          toast.error(t("tasks.limitReached"));
        } else if (result.reason === "ALREADY_COMPLETED_TODAY") {
          toast.error(t("tasks.completedToday"));
        } else {
          toast.error(result.message || t("common.error"));
        }
      }
    },
    onError: () => toast.error(t("common.error")),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-28 md:pb-12 text-foreground" dir={isRTL ? "rtl" : "ltr"}>
        <AppHeader />
        <div className="flex justify-center items-center h-64">
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background pb-28 md:pb-12 text-foreground" dir={isRTL ? "rtl" : "ltr"}>
        <AppHeader />
        <div className="flex justify-center items-center h-64">
          <p className="text-danger">{t("common.error")}</p>
        </div>
      </div>
    );
  }

  const handleStartTask = (task: TaskItem) => {
    if (task.isCompletedToday) {
      toast.info(t("tasks.completedToday"));
      return;
    }
    if ((data?.remainingTasks ?? 0) <= 0) {
      toast.error(t("tasks.limitReached"));
      return;
    }

    const duration = task.durationSeconds || 10;
    setActiveWatchTask(task);
    setSecondsRemaining(duration);
    setWatchedSeconds(0);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeWatchTask && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval!);
            return 0;
          }
          return prev - 1;
        });
        setWatchedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeWatchTask, secondsRemaining]);

  const handleClaimReward = async () => {
    if (!activeWatchTask) return;
    if (secondsRemaining > 0) {
      return;
    }
    await completeMutation.mutateAsync({
      taskId: activeWatchTask.id,
      watchedSeconds: Math.max(watchedSeconds, 10),
    });
  };

  const tasksList = data?.tasks ?? [];
  const vipLevel = data?.vipLevel ?? 2;
  const commission = data?.videoCommission ?? 0.4;
  const remaining = data?.remainingTasks ?? 3;
  const dailyLimit = data?.dailyLimit ?? 3;
  const durationSec = data?.videoDuration ?? 10;

  return (
    <div
      className="min-h-screen bg-background pb-28 md:pb-12 text-foreground"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AppHeader vipLevel={vipLevel} balance={data?.userBalance} showAbout={true} />

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Screen Switcher Tabs & History Link */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center rounded-2xl surface-card p-1 border border-border w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`flex-1 sm:flex-initial px-5 py-2.5 flex items-center justify-center gap-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "tasks"
                  ? "brand-gradient text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Video className="h-4 w-4" />
              <span>{t("tasks.tabAll")}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("daily")}
              className={`flex-1 sm:flex-initial px-5 py-2.5 flex items-center justify-center gap-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "daily"
                  ? "brand-gradient text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>{t("tasks.tabDaily")}</span>
            </button>
          </div>

          <Link
            to="/rewards"
            className="flex items-center gap-2 text-xs font-bold text-cyan-glow hover:underline self-end sm:self-center"
          >
            <Gift className="h-4 w-4" />
            <span>{t("rewards.historyTitle")}</span>
          </Link>
        </div>

        {/* Page Main Header Banner (Responsive 2-column or wide card) */}
        <div className="relative overflow-hidden rounded-3xl brand-gradient p-6 sm:p-8 text-primary-foreground shadow-2xl border border-cyan-glow/30">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3 text-start">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-md px-3 py-1 text-xs font-black text-cyan-glow border border-cyan-glow/40">
                  <Crown className="h-3.5 w-3.5 text-gold" />
                  {data?.vipName || `VIP ${vipLevel}`}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-primary-foreground/90">
                  <Sparkles className="h-3.5 w-3.5 text-gold" />
                  <span>{t("tasks.instantGuaranteed")}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{t("tasks.title")}</h1>
              <p className="text-xs sm:text-sm text-primary-foreground/85 leading-relaxed max-w-xl">
                {t("tasks.watchInstruction")}
              </p>
            </div>

            {/* Core Metrics Grid */}
            <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 rounded-2xl bg-black/30 backdrop-blur-md p-4 border border-white/10 text-center">
              <div className="p-2 rounded-xl bg-black/20">
                <p className="text-[10px] text-primary-foreground/70 font-semibold">
                  {t("home.vipStatus")}
                </p>
                <p className="mt-0.5 text-sm font-black text-gold">VIP {vipLevel}</p>
              </div>
              <div className="p-2 rounded-xl bg-black/20">
                <p className="text-[10px] text-primary-foreground/70 font-semibold">
                  {t("tasks.commissionPerVideo")}
                </p>
                <p className="mt-0.5 text-sm font-black text-cyan-glow">${commission.toFixed(2)}</p>
              </div>
              <div className="p-2 rounded-xl bg-black/20">
                <p className="text-[10px] text-primary-foreground/70 font-semibold">
                  {t("tasks.remaining")}
                </p>
                <p className="mt-0.5 text-sm font-black text-primary-foreground">
                  {remaining}/{dailyLimit}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-black/20">
                <p className="text-[10px] text-primary-foreground/70 font-semibold">
                  {t("invest.duration")}
                </p>
                <p className="mt-0.5 text-sm font-black text-primary-foreground">
                  {durationSec} ثوانٍ
                </p>
              </div>
            </div>
          </div>

          <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-cyan-glow/20 blur-3xl pointer-events-none" />
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
        </div>

        {/* Task Cards List (Bento-Grid 1-3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {tasksList.map((task) => (
              <div
                key={task.id}
                id={`task-card-${task.id}`}
                className={`relative overflow-hidden rounded-3xl surface-card glow-border transition-all duration-300 flex flex-col justify-between ${
                  task.isCompletedToday ? "opacity-75" : "hover:border-cyan-glow/60"
                }`}
              >
                {/* Video Preview */}
                <div>
                  <div className="relative h-48 w-full overflow-hidden bg-surface">
                    <img
                      src={task.thumbnailUrl}
                      alt={task.title}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Play Button */}
                    <button
                      type="button"
                      onClick={() => handleStartTask(task)}
                      disabled={task.isCompletedToday || remaining <= 0}
                      aria-label={`مشاهدة ${task.title}`}
                      className={`absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 active:scale-95 ${
                        task.isCompletedToday
                          ? "bg-emerald-500/80 text-white cursor-default"
                          : remaining <= 0
                            ? "bg-black/50 text-white/50 cursor-not-allowed"
                            : "bg-cyan-glow/90 text-navy-deep hover:bg-cyan-glow hover:scale-110 shadow-lg cursor-pointer"
                      }`}
                    >
                      {task.isCompletedToday ? (
                        <CheckCircle2 className="h-7 w-7 text-white" />
                      ) : (
                        <Play className="h-7 w-7 fill-current translate-x-[-1px] rtl:translate-x-[1px]" />
                      )}
                    </button>

                    {/* Badges */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                      <span className="rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-white border border-white/20">
                        {t("tasks.taskNumber")} {task.taskNumber}
                      </span>
                      <span className="rounded-full bg-surface/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-gold border border-gold/40">
                        {task.vipRequirement}
                      </span>
                    </div>

                    <div className="absolute bottom-3 inset-x-3 flex items-center justify-between">
                      <span className="flex items-center gap-1 rounded-lg bg-black/70 backdrop-blur-md px-2 py-1 text-[10px] font-bold text-white/90">
                        <Clock className="h-3 w-3 text-cyan-glow" />
                        {task.durationSeconds} ثانية
                      </span>
                      <span className="flex items-center gap-1 rounded-lg bg-emerald-500/90 backdrop-blur-md px-2.5 py-1 text-xs font-black text-white shadow">
                        +${commission.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-1.5 text-start">
                    <h3 className="text-sm font-black text-foreground leading-snug">
                      {task.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 pt-0">
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                      <span>{t("tasks.commissionPerVideo")}:</span>
                      <span className="text-emerald-400 font-black">+${commission.toFixed(2)}</span>
                    </div>

                    {task.isCompletedToday ? (
                      <span className="flex items-center gap-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-black text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("tasks.completedToday")}
                      </span>
                    ) : remaining <= 0 ? (
                      <span className="rounded-xl bg-surface border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground">
                        {t("tasks.exhaustedToday")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartTask(task)}
                        className="flex items-center gap-1.5 rounded-xl brand-gradient px-4 py-1.5 text-xs font-black text-primary-foreground shadow-glow hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>{t("tasks.watch")}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

        {/* Helpful Rules Section */}
        <div className="rounded-3xl surface-card glow-border p-5 text-start text-xs space-y-2">
          <h4 className="font-black text-foreground flex items-center gap-2 text-cyan-glow text-sm">
            <ShieldCheck className="h-4 w-4" />
            <span>{t("tasks.rulesTitle")}</span>
          </h4>
          <ul className="space-y-1 text-muted-foreground text-xs leading-relaxed">
            <li>• {t("tasks.rule1")}</li>
            <li>• {t("tasks.rule2")}</li>
            <li>• {t("tasks.rule3")}</li>
          </ul>
        </div>
      </main>

      {/* Video Watch & Validation Modal */}
      {activeWatchTask && (
        <div
          id="task-watch-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-glow/50 surface-card p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5 min-w-0 flex-1 text-start">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-glow/20 text-cyan-glow">
                  <Video className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-black text-foreground truncate">
                    {activeWatchTask.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {t("tasks.taskNumber")} {activeWatchTask.taskNumber} ·{" "}
                    {activeWatchTask.durationSeconds}s
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveWatchTask(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Video Player Box with YouTube iframe */}
            <div className="relative mt-3.5 aspect-video w-full overflow-hidden rounded-2xl bg-black border border-border">
              <iframe
                src={getYouTubeEmbedUrl(activeWatchTask.videoUrl)}
                title={activeWatchTask.title}
                className="h-full w-full object-cover border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />

              {/* Live Overlay Timer */}
              <div className="absolute top-2.5 right-2.5 rtl:right-auto rtl:left-2.5 z-10 flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-md px-3 py-1 border border-cyan-glow/40 shadow-lg">
                <Clock className="h-3.5 w-3.5 text-cyan-glow animate-spin" />
                <span className="text-xs font-black text-white">
                  {secondsRemaining > 0 ? `${secondsRemaining} ${isRTL ? "ثوانٍ" : "s"}` : t("tasks.completed")}
                </span>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="mt-3 text-start">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-muted-foreground">{t("tasks.watchProgress")}</span>
                <span className={secondsRemaining === 0 ? "text-emerald-400" : "text-cyan-glow"}>
                  {secondsRemaining === 0
                    ? `100% ${t("tasks.readyToClaim")}`
                    : `${Math.round(((10 - secondsRemaining) / 10) * 100)}%`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface border border-border">
                <div
                  className="h-full bg-cyan-glow transition-all duration-1000 shadow-[0_0_10px_oklch(0.82_0.14_205)]"
                  style={{ width: `${((10 - secondsRemaining) / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Reward Box */}
            <div className="mt-3.5 flex items-center justify-between rounded-2xl bg-surface border border-border p-3">
              <div className="text-start">
                <p className="text-[10px] text-muted-foreground font-semibold">
                  {t("tasks.earnedCommission")}
                </p>
                <p className="text-base font-black text-emerald-400">+${commission.toFixed(2)}</p>
              </div>
              <div className="text-end">
                <p className="text-[10px] text-muted-foreground font-semibold">
                  {t("tasks.balanceAfter")}
                </p>
                <p className="text-xs font-extrabold text-gold">
                  ${((data?.userBalance ?? 0) + commission).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Claim Reward Button */}
            <div className="mt-4">
              <button
                type="button"
                id="task-claim-reward-btn"
                onClick={handleClaimReward}
                disabled={secondsRemaining > 0 || completeMutation.isPending}
                className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-black transition-all cursor-pointer ${
                  secondsRemaining === 0
                    ? "brand-gradient text-primary-foreground shadow-glow hover:opacity-95 active:scale-95 animate-pulse"
                    : "bg-surface text-muted-foreground border border-border cursor-not-allowed"
                }`}
              >
                {completeMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{t("common.loading")}</span>
                  </>
                ) : secondsRemaining > 0 ? (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>{secondsRemaining}s</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                    <span>
                      {t("tasks.confirmClaimBtn")} (+${commission.toFixed(2)})
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
