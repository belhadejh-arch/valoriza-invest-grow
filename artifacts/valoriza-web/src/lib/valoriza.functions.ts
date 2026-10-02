import { createServerFn } from "@tanstack/react-start";
import { serverBackendRequest } from "@/lib/backend-server";

export type PlatformSettings = Record<string, string>;

export const getHomeData = createServerFn({ method: "GET" }).handler(() =>
  serverBackendRequest("/api/app/home"),
);

export const claimDailyLoginReward = createServerFn({ method: "POST" }).handler(() =>
  serverBackendRequest("/api/app/daily-reward", { method: "POST" }),
);

export const spinLuckyWheel = createServerFn({ method: "POST" }).handler(() =>
  serverBackendRequest("/api/app/spin", { method: "POST" }),
);
