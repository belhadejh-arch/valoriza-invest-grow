import { createServerFn } from "@tanstack/react-start";
import { serverBackendRequest } from "@/lib/backend-server";

const adminGet = <T = any[]>(path: string) => () => serverBackendRequest<T>(path);
// Both React Query mutations (plain input) and server-function callers ({data})
// are used by the existing admin screens.
const adminPost = <T>(path: string) => {
  function request(input: { data: T }): Promise<any>;
  function request(input: T): Promise<any>;
  function request(input: T | { data: T }): Promise<any> {
    const data = input && typeof input === "object" && "data" in input ? input.data : input;
    return serverBackendRequest<any>(path, { method: "POST", body: JSON.stringify(data) });
  }
  return request;
};

export interface AdminOverviewData {
  usersCount: number;
  totalUsers: number;
  totalBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  pendingDepositsCount: number;
  pendingDepositsAmount: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
  approvedWithdrawalsCount: number;
  approvedWithdrawalsAmount: number;
  activeInvestmentsCount: number;
  activeInvestmentsVolume: number;
  taskCompletionsCount: number;
  totalTasksCompleted: number;
}

export const getAdminOverview = createServerFn({ method: "GET" }).handler(() =>
  serverBackendRequest<AdminOverviewData>("/api/admin/overview"),
);
export const getAdminUsers = adminGet("/api/admin/users");
export const resetUserPassword = adminPost<{ userId: string; newPassword: string }>(
  "/api/admin/users/password",
);
export const toggleUserBlock = adminPost<{ userId: string; isBlocked: boolean }>(
  "/api/admin/users/block",
);
export const toggleUserWithdrawal = adminPost<{ userId: string; canWithdraw: boolean }>(
  "/api/admin/users/toggle-withdrawal",
);
export const updateUserWithdrawalAddress = adminPost<{
  userId: string;
  address: string;
  network?: string;
}>("/api/admin/users/withdrawal-address");
export const addFreeWheelSpin = adminPost<{
  userId: string;
  count?: number;
}>("/api/admin/users/add-wheel-spin");
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
  adminNote?: string;
}>("/api/admin/deposits/review");
export const getAdminWithdrawals = adminGet("/api/admin/withdrawals");
export const reviewWithdrawal = adminPost<{
  withdrawalId: string;
  action: "approve" | "reject";
  rejectReason?: string;
  adminNote?: string;
}>("/api/admin/withdrawals/review");
export const getAdminFunds = adminGet("/api/admin/funds");
export const saveInvestmentFund = adminPost<Record<string, unknown>>("/api/admin/funds/save");
export const getAdminVipPackages = adminGet("/api/admin/vip-packages");
export const saveVipPackage = adminPost<Record<string, unknown>>("/api/admin/vip-packages/save");
export const getAdminTasks = adminGet("/api/admin/tasks");
export const saveAdminTask = adminPost<Record<string, unknown>>("/api/admin/tasks/save");
export const toggleTaskStatus = adminPost<{ taskId: string; isActive: boolean }>(
  "/api/admin/tasks/status",
);
export const getAdminWheelPrizes = adminGet("/api/admin/wheel");
export const saveWheelPrize = adminPost<Record<string, unknown>>("/api/admin/wheel/save");
export const getAdminSettings = adminGet<Record<string, any>>("/api/admin/settings");
export const saveAdminSettings = adminPost<Record<string, unknown>>("/api/admin/settings/save");
export const broadcastNotification = adminPost<Record<string, unknown>>("/api/admin/notifications");
export const getAdminAuditLogs = adminGet("/api/admin/audit-logs");
