import { backendRequest } from "@/lib/backend-client";

export type TaskStatus = "LOCKED" | "AVAILABLE" | "WATCHING" | "COMPLETED" | "REWARDED";
export type TaskItem = {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  youtubeId: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  vipRequirement: string;
  reward: number;
  isCompletedToday: boolean;
  status: TaskStatus;
};
export type TasksPageData = {
  vipLevel: number;
  vipName: string;
  isTrial: boolean;
  trialExpiresAt: string | null;
  videoCommission: number;
  dailyLimit: number;
  completedCount: number;
  remainingTasks: number;
  videoDuration: number;
  tasks: TaskItem[];
  userBalance: number;
  allDailyTasksCompleted: boolean;
};

export const getTasksData = () => backendRequest<TasksPageData>("/api/app/tasks");

export type TaskStartResult =
  | { ok: true; sessionId: string; startedAt: string; durationSeconds: number }
  | { ok: false; reason: string };

export type TaskCompleteResult =
  | { ok: true; reward: number }
  | { ok: false; reason: string };

export const startTask = (taskId: string) =>
  backendRequest<TaskStartResult>("/api/app/tasks/start", {
    method: "POST",
    body: JSON.stringify({ taskId }),
  });

export const completeTask = (data: { taskId: string; sessionId: string; watchedSeconds: number }) =>
  backendRequest<TaskCompleteResult>("/api/app/tasks/complete", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const activateTrialPeriod = () =>
  backendRequest("/api/app/trial", { method: "POST" });

export const activateVipPlan = (data: { level: number }) =>
  backendRequest("/api/app/vip/purchase", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getVipPlansData = () => backendRequest("/api/app/vip-plans");

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  relatedPage?: string;
}

export const getUserNotifications = () =>
  backendRequest<{ notifications: AppNotification[]; unreadCount: number }>("/api/app/notifications");

export const markNotificationAsRead = (data: { notificationId?: string; markAll?: boolean }) =>
  backendRequest("/api/app/notifications/read", {
    method: "POST",
    body: JSON.stringify(data),
  });
