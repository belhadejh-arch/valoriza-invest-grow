import { createServerFn } from "@tanstack/react-start";
import { serverBackendRequest } from "@/lib/backend-server";

export type PlatformSettings = Record<string, string>;

export interface HomePageData {
  profile: { username: string; vipLevel: number } | null;
  wallet: {
    balance: number;
    totalEarned: number;
    investedBalance: number;
    teamIncome: number;
  };
  settings: PlatformSettings;
  wheel: {
    prizes: Array<{
      id: string;
      label: string;
      prizeType: string;
      prizeValue: number;
      icon: string | null;
      accent: string;
    }>;
    spinsLeft: number;
  };
  dailyReward: { amount: number; claimed: boolean };
}

export interface DailyRewardClaimResult {
  ok: boolean;
  amount: number;
}

export interface LuckyWheelSpinResult {
  ok: boolean;
  prizeId?: string;
  id?: string;
  label?: string;
  value?: number;
  cash?: boolean;
  spinsLeft?: number;
  reason?: string;
  message?: string;
}

export const getHomeData = createServerFn({ method: "GET" }).handler(() =>
  serverBackendRequest<HomePageData>("/api/app/home"),
);

export const claimDailyLoginReward = createServerFn({ method: "POST" }).handler(() =>
  serverBackendRequest<DailyRewardClaimResult>("/api/app/daily-reward", { method: "POST" }),
);

export const spinLuckyWheel = createServerFn({ method: "POST" }).handler(() =>
  serverBackendRequest<LuckyWheelSpinResult>("/api/app/spin", { method: "POST" }),
);
