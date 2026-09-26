import { backendRequest } from "@/lib/backend-client";

export type PlatformSettings = Record<string, string>;

export type LuckyWheelSpinResult =
  | {
      ok: true;
      id: string;
      label: string;
      prizeType: string;
      prizeValue: number;
      spinsLeft: number;
    }
  | { ok: false; reason: string; spinsLeft?: number };

export const getHomeData = () => backendRequest("/api/app/home");
export const claimDailyLoginReward = () => backendRequest("/api/app/daily-reward", { method: "POST" });
export const spinLuckyWheel = () =>
  backendRequest<LuckyWheelSpinResult>("/api/app/spin", { method: "POST" });
