import { backendRequest } from "@/lib/backend-client";

const adminGet = <T = any>(path: string) => () => backendRequest<T>(path);
const adminPost = <T = any, R = any>(path: string) => (data: T) =>
  backendRequest<R>(path, { method: "POST", body: JSON.stringify(data) });

export const getAdminOverview = adminGet("/api/admin/overview");
export type AdminUsersResponse = {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
};
export const getAdminUsers = ({ page, search }: { page: number; search: string }) =>
  backendRequest<AdminUsersResponse>(
    `/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`,
  );
export const toggleUserBlock = adminPost<{ userId: string; isBlocked: boolean }>(
  "/api/admin/users/block",
);
export const updateUserVipLevel = adminPost<{ targetUserId: string; vipLevel: number }>(
  "/api/admin/users/vip",
);
export const manualBalanceAdjustment = adminPost<{
  targetUserId: string;
  amount: number;
  reason: string;
}>("/api/admin/users/balance");
export const getAdminDeposits = adminGet("/api/admin/deposits");
export const reviewDeposit = adminPost<{
  depositId: string;
  action: "approve" | "reject";
  rejectReason?: string;
}>("/api/admin/deposits/review");
export const getAdminWithdrawals = adminGet("/api/admin/withdrawals");
export const reviewWithdrawal = adminPost<{
  withdrawalId: string;
  action: "approve" | "reject";
  rejectReason?: string;
}>("/api/admin/withdrawals/review");
export const getAdminFunds = adminGet("/api/admin/funds");
export const saveInvestmentFund = adminPost<Record<string, unknown>>("/api/admin/funds/save");
export const updateFundProfitRate = adminPost<{ id: string; profitPercent: number }>(
  "/api/admin/funds/profit-rate",
);
export const getAdminVipPackages = adminGet("/api/admin/vip-packages");
export type VipPackageSaveInput = {
  id?: string;
  level?: number;
  name: string;
  price: number;
  dailyProfit: number;
  dailyTasks: number;
  taskReward: number;
  isActive: boolean;
};
export const saveVipPackage = adminPost<VipPackageSaveInput>("/api/admin/vip-packages/save");
export const deleteVipPackage = adminPost<{ id: string }>("/api/admin/vip-packages/delete");
export const getAdminTasks = adminGet("/api/admin/tasks");
export const saveAdminTask = adminPost<Record<string, unknown>>("/api/admin/tasks/save");
export const toggleTaskStatus = adminPost<{ taskId: string; isActive: boolean }>(
  "/api/admin/tasks/status",
);
export const getAdminWheelPrizes = adminGet("/api/admin/wheel");
export const saveWheelPrize = adminPost<Record<string, unknown>>("/api/admin/wheel/save");
export const getAdminSettings = adminGet("/api/admin/settings");
export const saveAdminSettings = adminPost<Record<string, unknown>>("/api/admin/settings/save");
export const changeAdminPassword = adminPost<{
  currentPassword: string;
  newPassword: string;
}>("/api/admin/auth/password");
export const broadcastNotification = adminPost<Record<string, unknown>>("/api/admin/notifications");
export const getAdminAuditLogs = adminGet("/api/admin/audit-logs");
