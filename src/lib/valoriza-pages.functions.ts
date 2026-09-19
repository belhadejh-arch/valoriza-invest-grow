import { createServerFn } from "@tanstack/react-start";
import { serverBackendRequest } from "@/lib/backend-server";

const get = (path: string) =>
  createServerFn({ method: "GET" }).handler(() => serverBackendRequest(path));
const post = <T>(path: string, fallback?: (data: T) => string) =>
  createServerFn({ method: "POST" })
    .validator((data: T) => data)
    .handler(({ data }) =>
      serverBackendRequest(fallback ? fallback(data) : path, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    );

export const getInvestmentData = get("/api/app/investment");
export const activateTrial = createServerFn({ method: "POST" }).handler(() =>
  backendRequest("/api/app/trial", { method: "POST" }),
);
export const purchaseVip = post<{ level: number }>("/api/app/vip/purchase");
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
