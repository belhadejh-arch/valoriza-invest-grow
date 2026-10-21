import { createServerFn } from "@tanstack/react-start";
import { serverBackendRequest } from "@/lib/backend-server";

export interface AccountPageData {
  profile: {
    username: string;
    email: string;
    phone: string | null;
    vipLevel: number;
    referralCode: string;
    trialActive: boolean;
  } | null;
  balance: number;
  dailyReward: { amount: number; claimed: boolean };
}

export interface TeamPageData {
  referralCode?: string | null;
  userVipLevel?: number;
  maxVipLevel?: number | null;
  totalMembers?: number;
  teamIncome?: number;
  teamRewards?: number;
  rates?: { l1?: number; l2?: number; l3?: number };
  levels?: Array<{
    level: number;
    members: number;
    earnings: number;
    ratePercent?: string;
  }>;
  members?: Array<{
    id: string;
    username?: string | null;
    email?: string | null;
    level: number;
    vipLevel?: number | null;
    vipExpiresAt?: string | null;
    createdAt?: string;
  }>;
  milestones?: Array<{
    members: number;
    kind: "cash" | "vip";
    amount: number;
    vipLevel: number | null;
    claimedAt: string;
  }>;
}

export interface RewardsPageData {
  rewards: Array<{
    id: string;
    source: string;
    amount: number;
    description?: string | null;
    createdAt: string;
  }>;
  balance: number;
  totalEarned: number;
  dailyRewardClaimed: boolean;
  dailyRewardAmount: number;
}

export interface SupportLink {
  id: string;
  label: string;
  sublabel: string;
  platform: "telegram" | "whatsapp";
  url: string;
}

export interface CompanyData {
  settings: Record<string, string>;
  supportLinks: SupportLink[];
}

export interface ActionResult {
  ok: boolean;
  reason?: string;
  message?: string;
  amount?: number;
  netAmount?: number;
  level?: number;
  vipLevel?: number;
}

export interface FinancialRecord {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  network?: string;
  address?: string;
  fee?: number;
  netAmount?: number;
  description?: string;
  balanceAfter?: number;
}

async function companyData(path: string): Promise<CompanyData> {
  const response = await serverBackendRequest<{
    settings: Record<string, string>;
    links?: Array<SupportLink & { label_ar?: string; sublabel_ar?: string }>;
    supportLinks?: SupportLink[];
  }>(path);
  const settings = response.settings ?? {};
  const links = response.supportLinks ?? response.links ?? [];
  const supportLinks = links.map((link) => ({
    ...link,
    label: link.label ?? ("label_ar" in link ? String(link.label_ar ?? "") : ""),
    sublabel: link.sublabel ?? ("sublabel_ar" in link ? String(link.sublabel_ar ?? "") : ""),
  })).filter((link) => /^https:\/\//i.test(link.url));
  if (!supportLinks.length) {
    for (const [key, label, platform] of [
      ["telegram_support_url", "Telegram", "telegram"],
      ["whatsapp_support_url", "WhatsApp", "whatsapp"],
      ["telegram_group_url", "Telegram", "telegram"],
      ["whatsapp_group_url", "WhatsApp", "whatsapp"],
    ] as const) {
      if (/^https:\/\//i.test(settings[key] ?? "")) {
        supportLinks.push({ id: key, label, sublabel: "", platform, url: settings[key] });
      }
    }
  }
  return { settings, supportLinks };
}

const get = (path: string) =>
  createServerFn({ method: "GET" }).handler(() => serverBackendRequest<any>(path));
const post = <T>(path: string, fallback?: (data: T) => string) =>
  createServerFn({ method: "POST" })
    .validator((data: T) => data)
    .handler(({ data }) =>
      serverBackendRequest<ActionResult>(fallback ? fallback(data) : path, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    );

export const getInvestmentData = get("/api/app/investment");
export const activateTrial = createServerFn({ method: "POST" }).handler(() =>
  serverBackendRequest("/api/app/trial", { method: "POST" }),
);
export const purchaseVip = post<{ level?: number; packageId?: string }>("/api/app/vip/purchase");
export const investInSavingsFund = post<{ fundId: string; amount: number }>("/api/app/invest");

export const getTeamData = createServerFn({ method: "GET" }).handler(() =>
  serverBackendRequest<TeamPageData>("/api/app/team"),
);
export const settleTeamMilestones = createServerFn({ method: "POST" }).handler(() =>
  serverBackendRequest("/api/app/team/settle-milestones", { method: "POST" }),
);
export const getRewardsData = createServerFn({ method: "GET" }).handler(() =>
  serverBackendRequest<RewardsPageData>("/api/app/rewards"),
);
export const getAccountData = createServerFn({ method: "GET" }).handler(() =>
  serverBackendRequest<AccountPageData>("/api/app/account"),
);
export const getAboutData = createServerFn({ method: "GET" }).handler(() =>
  companyData("/api/public/about"),
);
export const getCompanySettingsAndSupport = createServerFn({ method: "GET" }).handler(() =>
  companyData("/api/app/settings"),
);
export const getWithdrawalInfo = get("/api/app/withdrawal");
export const getUserFinancialRecords = createServerFn({ method: "GET" }).handler(() =>
  serverBackendRequest<{
    transactions: FinancialRecord[];
    deposits: FinancialRecord[];
    withdrawals: Array<FinancialRecord & { netAmount: number; fee: number }>;
    rewards: FinancialRecord[];
  }>("/api/app/records"),
);

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

export const changeUserPassword = post<{
  newPassword: string;
  currentPassword?: string;
}>("/api/auth/change-password");
