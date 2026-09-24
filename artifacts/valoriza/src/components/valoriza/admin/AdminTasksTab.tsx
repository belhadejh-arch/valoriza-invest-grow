import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Video,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
  Play,
  Clock,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { getAdminTasks, saveAdminTask } from "@/lib/valoriza-admin.functions";

export function AdminTasksTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(10);
  const [rewardAmount, setRewardAmount] = useState(0.4);
  const [minVipLevel, setMinVipLevel] = useState(1);
  const [taskNumber, setTaskNumber] = useState(1);
  const [isActive, setIsActive] = useState(true);

  const {
    data: tasks = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: () => getAdminTasks(),
  });

  const saveMutation = useMutation({
    mutationFn: saveAdminTask,
    onSuccess: () => {
      toast.success("تم حفظ المهمة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-data"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setVideoUrl(
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    );
    setThumbnailUrl(
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=60",
    );
    setDurationSeconds(10);
    setRewardAmount(0.4);
    setMinVipLevel(1);
    setTaskNumber(tasks.length + 1);
    setIsActive(true);
  };

  const handleOpenEdit = (task: any) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setVideoUrl(task.video_url);
    setThumbnailUrl(task.thumbnail_url);
    setDurationSeconds(task.duration_seconds);
    setRewardAmount(Number(task.reward_amount));
    setMinVipLevel(task.min_vip_level);
    setTaskNumber(task.task_number);
    setIsActive(task.is_active);
    setModalOpen(true);
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-extrabold text-foreground">إدارة مهام المشاهدة والعمولات</h2>
          <p className="text-[10px] text-muted-foreground">
            إضافة فيديوهات جديدة، تعديل مدة المشاهدة، وتعيين متطلبات VIP.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-xl brand-gradient px-3 py-1.5 text-xs font-black text-primary-foreground shadow-glow"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>إضافة مهمة فيديو</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-cyan-glow mb-2" />
          جارٍ جلب المهام...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {tasks.map((task: any) => (
            <div
              key={task.id}
              className={`rounded-2xl border overflow-hidden transition-all ${
                task.is_active
                  ? "border-border/80 bg-surface/80 shadow-md"
                  : "border-border/40 bg-surface/30 opacity-70"
              }`}
            >
              <div className="relative h-32 w-full bg-navy-deep">
                <img
                  src={task.thumbnail_url}
                  alt={task.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

                <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-bold text-white border border-white/20">
                  مهمة {task.task_number}
                </span>

                <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-vip/80 px-2 py-0.5 text-[9px] font-bold text-white">
                  <Crown className="h-2.5 w-2.5 text-gold" />
                  VIP {task.min_vip_level}
                </span>

                <div className="absolute bottom-2 inset-x-2 flex items-center justify-between text-[10px] text-white">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-cyan-glow" />
                    {task.duration_seconds} ثوانٍ
                  </span>
                  <span className="font-black text-emerald-400">
                    +${Number(task.reward_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="p-3">
                <h3 className="text-xs font-black text-foreground truncate">{task.title}</h3>
                <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {task.description}
                </p>

                <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {task.is_active ? "نشطة" : "معطلة"}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(task)}
                    className="flex items-center gap-1 rounded-lg bg-surface border border-border px-2.5 py-1 text-[10px] font-bold text-foreground hover:text-cyan-glow hover:border-cyan-glow"
                  >
                    <Edit2 className="h-3 w-3" />
                    تعديل
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add Task Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-cyan-glow/40 bg-navy-deep p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-xs font-extrabold text-foreground">
                {editingTask ? `تعديل مهمة: ${editingTask.title}` : "إضافة مهمة فيديو جديدة"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground font-bold">عنوان المهمة</label>
                <input
                  type="text"
                  value={title}
                  placeholder="مثال: اكتشف أجمل الوجهات السياحية"
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold">الوصف</label>
                <input
                  type="text"
                  value={description}
                  placeholder="شاهد مقطعاً تعريفياً عن استثمارات السياحة والخدمات الفندقية."
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold">
                  رابط الفيديو (MP4)
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold">
                  رابط صورة الغلاف (Thumbnail)
                </label>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">رقم المهمة</label>
                  <input
                    type="number"
                    min="1"
                    value={taskNumber}
                    onChange={(e) => setTaskNumber(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">
                    المدة (ثوانٍ)
                  </label>
                  <input
                    type="number"
                    min="5"
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold">
                    أقل رتبة VIP
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    value={minVipLevel}
                    onChange={(e) => setMinVipLevel(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-cyan-glow focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="task-is-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-cyan-glow focus:ring-0"
                />
                <label htmlFor="task-is-active" className="text-xs font-bold text-foreground">
                  تفعيل المهمة للمستخدمين
                </label>
              </div>

              <button
                type="button"
                disabled={!title || !videoUrl || saveMutation.isPending}
                onClick={() =>
                  saveMutation.mutate({
                    id: editingTask?.id,
                    title,
                    description,
                    videoUrl,
                    thumbnailUrl,
                    durationSeconds,
                    rewardAmount,
                    minVipLevel,
                    taskNumber,
                    isActive,
                  })
                }
                className="w-full mt-3 rounded-xl brand-gradient py-2.5 text-xs font-black text-primary-foreground shadow-glow disabled:opacity-50"
              >
                {saveMutation.isPending ? "جارٍ الحفظ..." : "حفظ المهمة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
