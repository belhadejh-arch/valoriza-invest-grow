import { backendRequest } from "@/lib/backend-client";

export type PlatformSettings = Record<string, string>;

export const getHomeData = () => backendRequest("/api/app/home");
export const claimDailyLoginReward = () => backendRequest("/api/app/daily-reward", { method: "POST" });
export const spinLuckyWheel = () => backendRequest("/api/app/spin", { method: "POST" });
