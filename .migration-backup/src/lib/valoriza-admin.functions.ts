import { createServerFn } from "@tanstack/react-start";
import { serverBackendRequest } from "@/lib/backend-server";

const adminGet = (path: string) =>
  createServerFn({ method: "GET" }).handler(() => serverBackendRequest(path));
const adminPost = <T>(path: string) =>
  createServerFn({ method: "POST" })
    .validator((data: T) => data)
    .handler(({ data }) =>
      serverBackendRequest(path, { method: "POST", body: JSON.stringify(data) }),
    );

export const getAdminOverview = adminGet("/api/admin/overview");
export const getAdminUsers = adminGet("/api/admin/users");
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
export const getAdminVipPackages = adminGet("/api/admin/vip-packages");
export const saveVipPackage = adminPost<Record<string, unknown>>("/api/admin/vip-packages/save");
export const getAdminTasks = adminGet("/api/admin/tasks");
export const saveAdminTask = adminPost<Record<string, unknown>>("/api/admin/tasks/save");
export const toggleTaskStatus = adminPost<{ taskId: string; isActive: boolean }>(
  "/api/admin/tasks/status",
);
export const getAdminWheelPrizes = adminGet("/api/admin/wheel");
export const saveWheelPrize = adminPost<Record<string, unknown>>("/api/admin/wheel/save");
export const getAdminSettings = adminGet("/api/admin/settings");
export const saveAdminSettings = adminPost<Record<string, unknown>>("/api/admin/settings/save");
export const broadcastNotification = adminPost<Record<string, unknown>>("/api/admin/notifications");
export const getAdminAuditLogs = adminGet("/api/admin/audit-logs");
