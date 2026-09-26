import { backendRequest } from "@/lib/backend-client";

const get = <T = any>(path: string) => () => backendRequest<T>(path);
const post = <T = any, R = any>(path: string, fallback?: (data: T) => string) => (data: T) =>
  backendRequest<R>(fallback ? fallback(data) : path, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getInvestmentData = get("/api/app/investment");
export type TrialActivationResult =
  | { ok: true; trialExpiresAt: string }
  | { ok: false; reason: string };
export type VipPurchaseResult =
  | { ok: true; vipLevel: number; newBalance: number }
  | { ok: false; reason: string };

export const activateTrial = () =>
  backendRequest<TrialActivationResult>("/api/app/trial", { method: "POST" });
export const purchaseVip = post<
  { level: number; packageId?: string },
  VipPurchaseResult
>("/api/app/vip/purchase");
export const investInSavingsFund = post<{ fundId: string; amount: number }>("/api/app/invest");

export const getTeamData = get("/api/app/team");
export const getRewardsData = get("/api/app/rewards");
export const getAccountData = get("/api/app/account");
export const getAboutData = get("/api/public/about");
export const getCompanySettingsAndSupport = get("/api/app/settings");
export const getWithdrawalInfo = get("/api/app/withdrawal");
export const getUserFinancialRecords = get("/api/app/records");

export const bindWithdrawalAddress = post<{
  network: "ERC20" | "BEP20" | "TRC20";
  address: string;
}>("/api/app/withdrawal/address");

export const requestWithdrawal = post<{
  network: "ERC20" | "BEP20" | "TRC20";
  address: string;
  amount: number;
}>("/api/app/withdrawal");

export const createDepositRequest = post<{
  network: "USDT-ERC20" | "USDT-BEP20" | "USDT-TRC20";
  amount: number;
  screenshotUrl: string;
  txHash?: string;
}>("/api/app/deposit");
