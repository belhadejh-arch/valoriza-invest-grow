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

export const Route = createFileRoute("/_authenticated/tasks")({
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"tasks" | "daily">("tasks");

  // Video Watching Modal State
  const [activeWatchTask, setActiveWatchTask] = useState<TaskItem | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const [watchedSeconds, setWatchedSeconds] = useState(0);

  const { data, isLoading, refetch } = useQuery<TasksPageData>({
    queryKey: ["tasks-data"],
    queryFn: () => getTasksData(),
    staleTime: 5000,
  });

  const completeMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`تهانينا! حصلت على عمولة +$${result.reward.toFixed(2)} بنجاح 🎉`, {
          duration: 4000,
        });
        queryClient.invalidateQueries({ queryKey: ["tasks-data"] });
        queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
        queryClient.invalidateQueries({ queryKey: ["investment-data"] });
        queryClient.invalidateQueries({ queryKey: ["account-data"] });
        setActiveWatchTask(null);
      } else {
        if (result.reason === "DAILY_LIMIT_REACHED") {
          toast.error("لقد استنفدت جميع المهام المتاحة لباقة عضويتك اليوم!");
        } else if (result.reason === "ALREADY_COMPLETED_TODAY") {
          toast.error("لقد قمت بإكمال هذه المهمة مسبقاً اليوم!");
        } else if (result.reason === "INSUFFICIENT_WATCH_TIME") {
          toast.error("يرجى إكمال مشاهدة الفيديو بالكامل للحصول على العمولة!");
        } else {
          toast.error("تعذر إكمال المهمة، يرجى المحاولة لاحقاً.");
        }
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "حدث خطأ أثناء معالجة المهمة");
    },
  });

  // Start watch modal
  const handleStartTask = (task: TaskItem) => {
    if (task.isCompletedToday) {
      toast.info("هذه المهمة مكتملة بالفعل لليوم");
      return;
    }
    if ((data?.remainingTasks ?? 0) <= 0) {
      toast.error("لقد أكملت جميع المهام المتاحة لباقة عضويتك اليوم!");
      return;
    }

    const duration = task.durationSeconds || 10;
    setActiveWatchTask(task);
    setSecondsRemaining(duration);
    setWatchedSeconds(0);
  };

  // Video timer effect - automatically counts down when modal opens
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
      toast.warning(`يرجى الانتظار حتى انتهاء الفيديو (${secondsRemaining} ثوانٍ متبقية)`);
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
    <div className="min-h-screen bg-navy-night pb-24 text-foreground" dir="rtl">
      <AppHeader vipLevel={vipLevel} balance={data?.userBalance} showAbout={true} />

      <main className="mx-auto max-w-lg px-4 pt-4">
        {/* Screen Switcher Tabs (المهام / المهام اليومية) */}
        <div className="flex items-center rounded-2xl bg-surface/80 p-1 border border-border/80 mb-4 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
              activeTab === "tasks"
                ? "brand-gradient text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Video className="h-4 w-4" />
            <span>المهام</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("daily")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
              activeTab === "daily"
                ? "brand-gradient text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>المهام اليومية</span>
          </button>
        </div>

        {/* Page Main Header Banner */}
        <div className="relative overflow-hidden rounded-3xl brand-gradient p-5 text-white shadow-xl mb-4 border border-cyan-glow/30">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold text-cyan-glow border border-cyan-glow/40">
                <Crown className="h-3.5 w-3.5 text-gold" />
                {data?.vipName || `VIP ${vipLevel}`}
              </span>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/90">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                <span>عائد فوري مضمون</span>
              </div>
            </div>

            <h1 className="mt-3 text-xl font-black tracking-tight text-white drop-shadow-sm">
              شاهد الفيديوهات واكسب عمولتك
            </h1>
            <p className="mt-1 text-xs text-white/85 leading-relaxed">
              قم بمشاهدة مقاطع الفيديو الترويجية لمدة {durationSec} ثوانٍ لتحصيل عمولتك اليومية
              مباشرة في محفظتك.
            </p>

            {/* Core Metrics Grid matching reference specification */}
            <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-black/35 backdrop-blur-md p-3 border border-white/10 text-center">
              <div>
                <p className="text-[10px] text-white/70 font-semibold">VIP Level</p>
                <p className="mt-0.5 text-xs font-black text-gold">VIP {vipLevel}</p>
              </div>
              <div className="border-r border-white/10">
                <p className="text-[10px] text-white/70 font-semibold">عمولة الفيديو</p>
                <p className="mt-0.5 text-xs font-black text-cyan-glow">${commission.toFixed(2)}</p>
              </div>
              <div className="border-r border-white/10">
                <p className="text-[10px] text-white/70 font-semibold">المهام المتبقية</p>
                <p className="mt-0.5 text-xs font-black text-white">
                  {remaining}/{dailyLimit}
                </p>
              </div>
              <div className="border-r border-white/10">
                <p className="text-[10px] text-white/70 font-semibold">مدة الفيديو</p>
                <p className="mt-0.5 text-xs font-black text-white">{durationSec} ثوانٍ</p>
              </div>
            </div>
          </div>

          {/* Abstract Glow circles */}
          <div className="absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-cyan-glow/20 blur-2xl" />
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/30 blur-2xl" />
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-foreground">
              {activeTab === "tasks" ? "قائمة المهام المتاحة" : "قائمة المهام اليومية"}
            </h2>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-cyan-glow border border-border">
              {tasksList.length} مقاطع
            </span>
          </div>

          <Link
            to="/rewards"
            className="flex items-center gap-1 text-[11px] font-bold text-cyan-glow hover:underline"
          >
            <Gift className="h-3.5 w-3.5" />
            <span>سجل الأرباح</span>
          </Link>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-3 py-6 text-center">
            <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow" />
            <p className="text-xs text-muted-foreground">جارٍ تحميل المهام والتحقق من العمولة...</p>
          </div>
        )}

        {/* Task Cards List */}
        {!isLoading && (
          <div className="space-y-3.5">
            {tasksList.map((task) => (
              <div
                key={task.id}
                id={`task-card-${task.id}`}
                className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                  task.isCompletedToday
                    ? "border-emerald-500/30 bg-surface/40 opacity-80"
                    : "border-border/80 bg-surface/90 hover:border-cyan-glow/60 shadow-lg shadow-black/20"
                }`}
              >
                {/* Thumbnail & Badges Container */}
                <div className="relative h-44 w-full overflow-hidden bg-navy-deep">
                  <img
                    src={task.thumbnailUrl}
                    alt={task.title}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Play Icon Center Button */}
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
                          : "bg-cyan-glow/90 text-navy-deep hover:bg-cyan-glow hover:scale-110 shadow-[0_0_20px_oklch(0.82_0.14_205/0.8)]"
                    }`}
                  >
                    {task.isCompletedToday ? (
                      <CheckCircle2 className="h-7 w-7 text-white" />
                    ) : (
                      <Play className="h-7 w-7 fill-current translate-x-[-1px]" />
                    )}
                  </button>

                  {/* Top Task Badges */}
                  <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
                    <span className="rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-white border border-white/20">
                      مهمة رقم {task.taskNumber}
                    </span>

                    <span className="flex items-center gap-1 rounded-full bg-vip/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-extrabold text-white border border-vip/50 shadow-sm">
                      <Crown className="h-3 w-3 text-gold" />
                      {task.vipRequirement}
                    </span>
                  </div>

                  {/* Bottom Duration & Reward overlay on thumbnail */}
                  <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1 rounded-lg bg-black/70 backdrop-blur-md px-2 py-1 text-[10px] font-bold text-white/90">
                      <Clock className="h-3 w-3 text-cyan-glow" />
                      {task.durationSeconds} ثوانٍ
                    </span>

                    <span className="flex items-center gap-1 rounded-lg bg-emerald-500/90 backdrop-blur-md px-2.5 py-1 text-xs font-black text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                      +${commission.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  <h3 className="text-sm font-extrabold text-foreground leading-snug">
                    {task.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {task.description}
                  </p>

                  {/* Action Button */}
                  <div className="mt-3.5 pt-3 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                      <span>العمولة:</span>
                      <span className="text-emerald-400 font-extrabold">
                        +${commission.toFixed(2)}
                      </span>
                    </div>

                    {task.isCompletedToday ? (
                      <span className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1.5 text-xs font-extrabold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        مكتملة اليوم
                      </span>
                    ) : remaining <= 0 ? (
                      <span className="flex items-center gap-1 rounded-xl bg-surface border border-border px-3.5 py-1.5 text-xs font-bold text-muted-foreground">
                        استنفدت اليوم
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartTask(task)}
                        className="flex items-center gap-1.5 rounded-xl brand-gradient px-4 py-1.5 text-xs font-black text-primary-foreground shadow-glow hover:opacity-95 active:scale-95 transition-all"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>مشاهدة الفيديو</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Helpful Tips Section */}
        <div className="mt-6 rounded-2xl bg-surface/60 border border-border/70 p-4 text-xs">
          <h4 className="font-extrabold text-foreground flex items-center gap-1.5 text-cyan-glow">
            <ShieldCheck className="h-4 w-4" />
            قواعد وضوابط تحصيل العمولات
          </h4>
          <ul className="mt-2 space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
            <li>• يتم تجديد المهام اليومية تلقائياً كل 24 ساعة وفق التوقيت المالي للمنصة.</li>
            <li>• الترقية لباقات VIP أعلى تزيد من عدد المهام وقيمة العمولة لكل فيديو تشاهده.</li>
            <li>
              • يجب تشغيل الفيديو حتى نهاية مدة العد التنازلي ({durationSec} ثوانٍ) لاحتساب العمولة.
            </li>
          </ul>
        </div>
      </main>

      {/* Video Watch & Validation Modal */}
      {activeWatchTask && (
        <div
          id="task-watch-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in"
          dir="rtl"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-glow/50 bg-navy-deep p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-glow/20 text-cyan-glow">
                  <Video className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-xs font-extrabold text-foreground truncate max-w-[220px]">
                    {activeWatchTask.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    مهمة رقم {activeWatchTask.taskNumber} · مدة المشاهدة{" "}
                    {activeWatchTask.durationSeconds} ثوانٍ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveWatchTask(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Video Player Box with YouTube iframe (Instruction 8: playsinline, no external navigation) */}
            <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-2xl bg-black border border-border">
              <iframe
                src={getYouTubeEmbedUrl(activeWatchTask.videoUrl)}
                title={activeWatchTask.title}
                className="h-full w-full object-cover border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />

              {/* Live Overlay Timer */}
              <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-md px-3 py-1 border border-cyan-glow/40 shadow-lg">
                <Clock className="h-3.5 w-3.5 text-cyan-glow animate-spin" />
                <span className="text-xs font-black text-white">
                  {secondsRemaining > 0 ? `${secondsRemaining} ثانية` : "اكتملت المشاهدة!"}
                </span>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                <span className="text-muted-foreground">تقدم المشاهدة</span>
                <span className={secondsRemaining === 0 ? "text-emerald-400" : "text-cyan-glow"}>
                  {secondsRemaining === 0
                    ? "100% جاهز للاستلام"
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
            <div className="mt-3.5 flex items-center justify-between rounded-2xl bg-surface/90 border border-border/80 p-3">
              <div>
                <p className="text-[10px] text-muted-foreground">العمولة المكتسبة</p>
                <p className="text-base font-black text-emerald-400">+${commission.toFixed(2)}</p>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground">الرصيد بعد الإكمال</p>
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
                className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black transition-all ${
                  secondsRemaining === 0
                    ? "brand-gradient text-primary-foreground shadow-glow hover:opacity-95 active:scale-95 animate-pulse"
                    : "bg-surface text-muted-foreground border border-border cursor-not-allowed"
                }`}
              >
                {completeMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جارٍ تأكيد العمولة وإضافتها للرصيد...</span>
                  </>
                ) : secondsRemaining > 0 ? (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>شاهد {secondsRemaining} ثوانٍ متبقية لفتح المكافأة</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-white" />
                    <span>تأكيد إكمال المهمة واستلام +${commission.toFixed(2)}</span>
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
