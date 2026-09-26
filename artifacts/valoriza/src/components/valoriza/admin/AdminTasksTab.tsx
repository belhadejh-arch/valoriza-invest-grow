import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Video,
  Plus,
  Edit2,
  X,
  RefreshCw,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { getAdminTasks, saveAdminTask } from "@/lib/valoriza-admin.functions";
import { useI18n } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";

type AdminTask = {
  id: string;
  task_number: number;
  title: string;
  description: string;
  youtube_id: string;
  duration_seconds: number;
  sort_order: number;
  is_active: boolean;
};

type TaskSaveInput = {
  id?: string;
  taskNumber: number;
  title: string;
  description: string;
  youtubeId: string;
  durationSeconds: number;
  sortOrder: number;
  isActive: boolean;
};

const getYouTubeId = (input: string) => {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      id =
        url.searchParams.get("v") ??
        url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ??
        null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
};

export function AdminTasksTab() {
  const { t } = useI18n();
  const content = useLocalizedContent();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(10);
  const [taskNumber, setTaskNumber] = useState(1);
  const [sortOrder, setSortOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [validationError, setValidationError] = useState("");

  const {
    data: tasks = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AdminTask[]>({
    queryKey: ["admin-tasks"],
    queryFn: () => getAdminTasks(),
  });

  const saveMutation = useMutation({
    mutationFn: (input: TaskSaveInput) => saveAdminTask(input),
    onSuccess: () => {
      toast.success(t("admin.taskSaved"));
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-data"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (saveError: Error) => {
      toast.error(saveError.message || t("common.error"));
    },
  });

  const resetForm = () => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setYoutubeInput("");
    setDurationSeconds(10);
    const nextNumber =
      tasks.reduce((max, task) => Math.max(max, Number(task.task_number) || 0), 0) + 1;
    const nextOrder =
      tasks.reduce((max, task) => Math.max(max, Number(task.sort_order) || 0), 0) + 1;
    setTaskNumber(nextNumber);
    setSortOrder(nextOrder);
    setIsActive(true);
    setValidationError("");
    saveMutation.reset();
  };

  const handleOpenEdit = (task: AdminTask) => {
    setEditingTask(task);
    setTitle(task.title ?? "");
    setDescription(task.description ?? "");
    setYoutubeInput(task.youtube_id ?? "");
    setDurationSeconds(Number(task.duration_seconds) || 10);
    setTaskNumber(Number(task.task_number) || 1);
    setSortOrder(Number(task.sort_order) || 0);
    setIsActive(Boolean(task.is_active));
    setValidationError("");
    saveMutation.reset();
    setModalOpen(true);
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const submitTask = () => {
    const youtubeId = getYouTubeId(youtubeInput);
    if (!title.trim()) {
      setValidationError("Enter a task title / أدخل عنوان المهمة");
      return;
    }
    if (!description.trim()) {
      setValidationError("Enter a task description / أدخل وصف المهمة");
      return;
    }
    if (!youtubeId) {
      setValidationError("Enter a valid YouTube URL or 11-character ID / أدخل رابط يوتيوب أو معرّفًا صحيحًا من 11 حرفًا");
      return;
    }
    if (!Number.isInteger(taskNumber) || taskNumber < 1) {
      setValidationError("Task number must be a positive whole number / رقم المهمة يجب أن يكون عددًا صحيحًا موجبًا");
      return;
    }
    if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 3600) {
      setValidationError("Duration must be 1–3600 seconds / يجب أن تكون المدة بين 1 و3600 ثانية");
      return;
    }
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setValidationError("Sort order must be zero or greater / ترتيب العرض يجب أن يكون صفرًا أو أكبر");
      return;
    }

    setValidationError("");
    const input: TaskSaveInput = {
      ...(editingTask ? { id: editingTask.id } : {}),
      taskNumber,
      title: title.trim(),
      description: description.trim(),
      youtubeId,
      durationSeconds,
      sortOrder,
      isActive,
    };
    saveMutation.mutate(input);
  };

  const listError =
    error instanceof Error ? error.message : "Could not load tasks / تعذر تحميل المهام";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-extrabold text-foreground">{t("admin.manageVideoTasks")}</h2>
          <p className="text-[10px] text-muted-foreground">
            {t("admin.taskManagementDescription")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-xl brand-gradient px-3 py-1.5 text-xs font-black text-primary-foreground shadow-glow"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t("admin.addVideoTask")}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <RefreshCw className="mx-auto mb-2 h-7 w-7 animate-spin text-cyan-glow" />
          {t("admin.loadingTasks")}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/40 bg-surface/70 p-6 text-center">
          <p className="text-xs text-destructive">{listError}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground"
          >
            {t("common.retry")}
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-surface/40 py-12 text-center">
          <Video className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-xs font-bold text-foreground">No tasks yet / لا توجد مهام بعد</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Add a task to get started / أضف مهمة للبدء
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {tasks.map((task) => {
            const thumbnailId = getYouTubeId(task.youtube_id ?? "");
            return (
              <div
                key={task.id}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  task.is_active
                    ? "border-border/80 bg-surface/80 shadow-md"
                    : "border-border/40 bg-surface/30 opacity-70"
                }`}
              >
                <div className="relative h-32 w-full bg-navy-deep">
                  {thumbnailId ? (
                    <img
                      src={`https://img.youtube.com/vi/${thumbnailId}/hqdefault.jpg`}
                      alt={content(task.title)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Video className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                  <span className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[9px] font-bold text-white">
                    {t("admin.taskNumber")} {task.task_number}
                  </span>
                  <div className="absolute inset-x-2 bottom-2 flex items-center justify-between text-[10px] text-white">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-cyan-glow" />
                      {task.duration_seconds} {t("admin.seconds")}
                    </span>
                    <span className="font-bold">
                      {task.is_active ? t("admin.enabled") : t("admin.disabled")}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="truncate text-xs font-black text-foreground">
                    {content(task.title)}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                    {content(task.description)}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
                    <span className="text-[10px] text-muted-foreground">
                      Sort: {task.sort_order}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(task)}
                      className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-[10px] font-bold text-foreground hover:border-cyan-glow hover:text-cyan-glow"
                    >
                      <Edit2 className="h-3 w-3" />
                      {t("admin.edit")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/80 p-4 backdrop-blur-sm fade-in">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-cyan-glow/40 bg-navy-deep p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-xs font-extrabold text-foreground">
                {editingTask
                  ? `${t("admin.editTask")}: ${content(editingTask.title)}`
                  : t("admin.addNewVideoTask")}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground">
                  {t("admin.taskTitleArabic")}
                </label>
                <input
                  type="text"
                  value={title}
                  placeholder={t("admin.taskTitleArabicPlaceholder")}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground">
                  {t("admin.taskDescriptionArabic")}
                </label>
                <textarea
                  value={description}
                  placeholder={t("admin.taskDescriptionArabicPlaceholder")}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  className="mt-1 w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground">
                  YouTube URL or 11-character video ID / رابط يوتيوب أو معرّف الفيديو (11 حرفًا)
                </label>
                <input
                  type="text"
                  value={youtubeInput}
                  onChange={(event) => setYoutubeInput(event.target.value)}
                  placeholder="https://youtu.be/xxxxxxxxxxx"
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-[11px] text-foreground focus:border-cyan-glow focus:outline-none"
                />
                {getYouTubeId(youtubeInput) && (
                  <img
                    src={`https://img.youtube.com/vi/${getYouTubeId(youtubeInput)}/hqdefault.jpg`}
                    alt="YouTube thumbnail preview"
                    className="mt-2 h-24 w-full rounded-lg object-cover"
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground">
                    {t("admin.taskNumber")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={taskNumber}
                    onChange={(event) => setTaskNumber(Number(event.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground">
                    {t("admin.durationSeconds")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3600"
                    step="1"
                    value={durationSeconds}
                    onChange={(event) => setDurationSeconds(Number(event.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground">
                    Sort order / ترتيب العرض
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(Number(event.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="task-is-active"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 rounded border-border text-cyan-glow focus:ring-0"
                />
                <label htmlFor="task-is-active" className="text-xs font-bold text-foreground">
                  {t("admin.activateTask")}
                </label>
              </div>

              <p className="rounded-lg bg-surface/60 p-2 text-[10px] leading-relaxed text-muted-foreground">
                Task reward and daily limit are set by each VIP plan; they are not configured on
                individual tasks. / مكافأة المهمة والحد اليومي يحددهما مستوى VIP، ولا يتم ضبطهما
                لكل مهمة.
              </p>

              {(validationError || saveMutation.isError) && (
                <p role="alert" className="text-[10px] text-destructive">
                  {validationError ||
                    (saveMutation.error instanceof Error
                      ? saveMutation.error.message
                      : t("common.error"))}
                </p>
              )}

              <button
                type="button"
                disabled={saveMutation.isPending}
                onClick={submitTask}
                className="mt-3 w-full rounded-xl brand-gradient py-2.5 text-xs font-black text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {saveMutation.isPending ? t("admin.saving") : t("admin.saveTask")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}