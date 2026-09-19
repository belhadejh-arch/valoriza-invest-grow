import fs from "fs";
import path from "path";

export interface VipPlan {
  level: number;
  name: string;
  price: number;
  dailyProfit: number;
  dailyTasks: number;
  taskReward: number;
  durationDays: number;
  accent: string;
  isActive: boolean;
}

export interface UserVipSubscription {
  userId: string;
  vipLevel: number;
  activatedAt: string;
  expiresAt: string;
  status: "active" | "expired";
}

export interface UserTrialInfo {
  userId: string;
  isActive: boolean;
  status: "active" | "expired" | "not_started";
  durationDays: number;
  dailyTasks: number;
  dailyProfit: number;
  startedAt: string | null;
  expiresAt: string | null;
  hasUsedTrial: boolean;
}

export interface VideoTask {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  youtubeId: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  sortOrder: number;
  isActive: boolean;
}

export interface TaskCompletionRecord {
  id: string;
  userId: string;
  taskId: string;
  completionDate: string; // YYYY-MM-DD
  startedAt: string;
  completedAt: string;
  status: "COMPLETED" | "REWARDED";
  reward: number;
  watchedSeconds: number;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userEmail?: string;
  username?: string;
  network: "USDT-ERC20" | "USDT-BEP20" | "USDT-TRC20";
  amount: number;
  depositAddress: string;
  screenshotUrl: string;
  txHash?: string;
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface UserWalletData {
  userId: string;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalEarned: number;
  investedBalance: number;
  teamIncome: number;
}

export interface ValorizaDatabase {
  vipPlans: VipPlan[];
  userVips: Record<string, UserVipSubscription>;
  userTrials: Record<string, UserTrialInfo>;
  tasks: VideoTask[];
  taskCompletions: TaskCompletionRecord[];
  deposits: DepositRequest[];
  wallets: Record<string, UserWalletData>;
}

// 9 Official Tasks specified by user
const INITIAL_9_TASKS: VideoTask[] = [
  {
    id: "task-yt-1",
    taskNumber: 1,
    title: "اكتشف أجمل الوجهات السياحية",
    description: "تعرف على أجمل الأماكن السياحية حول العالم وكيف تبني مستقبلك المالي.",
    youtubeId: "-RuSqMYcQK0",
    videoUrl: "https://www.youtube.com/embed/-RuSqMYcQK0",
    thumbnailUrl: "https://img.youtube.com/vi/-RuSqMYcQK0/hqdefault.jpg",
    durationSeconds: 10,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "task-yt-2",
    taskNumber: 2,
    title: "تطوير مهاراتك المهنية",
    description: "تعلم كيف تستثمر بذكاء وتحقق أهدافك مع فالوريزا بخطوات عملية ومدروسة.",
    youtubeId: "66Z_Rgwrh7E",
    videoUrl: "https://www.youtube.com/embed/66Z_Rgwrh7E",
    thumbnailUrl: "https://img.youtube.com/vi/66Z_Rgwrh7E/hqdefault.jpg",
    durationSeconds: 10,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "task-yt-3",
    taskNumber: 3,
    title: "مستقبل أفضل بيدك",
    description: "انضم إلى مجتمع فالوريزا وابدأ رحلتك نحو الحرية المالية اليوم.",
    youtubeId: "ELF0AM4Jrm0",
    videoUrl: "https://www.youtube.com/embed/ELF0AM4Jrm0",
    thumbnailUrl: "https://img.youtube.com/vi/ELF0AM4Jrm0/hqdefault.jpg",
    durationSeconds: 10,
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "task-yt-4",
    taskNumber: 4,
    title: "استراتيجيات الاستثمار الذكي",
    description: "قواعد تنويع الأصول وإدارة المخاطر لتحقيق عوائد سنوية ويومية مستمرة.",
    youtubeId: "SfXQw0hu73Y",
    videoUrl: "https://www.youtube.com/embed/SfXQw0hu73Y",
    thumbnailUrl: "https://img.youtube.com/vi/SfXQw0hu73Y/hqdefault.jpg",
    durationSeconds: 10,
    sortOrder: 4,
    isActive: true,
  },
  {
    id: "task-yt-5",
    taskNumber: 5,
    title: "التحول الرقمي والذكاء المالي",
    description: "كيف تواكب الاقتصاد الرقمي الحديث وتستفيد من الفرص الاستثمارية الناشئة.",
    youtubeId: "Tlnl6w8OtQs",
    videoUrl: "https://www.youtube.com/embed/Tlnl6w8OtQs",
    thumbnailUrl: "https://img.youtube.com/vi/Tlnl6w8OtQs/hqdefault.jpg",
    durationSeconds: 10,
    sortOrder: 5,
    isActive: true,
  },
  {
    id: "task-yt-6",
    taskNumber: 6,
    title: "إدارة الوقت والنمو المستدام",
    description: "خطوات تنظيم الأولويات وتحقيق التوازن المالي والشخصي لرواد الأعمال.",
    youtubeId: "ygLLiNT2AIQ",
    videoUrl: "https://www.youtube.com/embed/ygLLiNT2AIQ",
    thumbnailUrl: "https://img.youtube.com/vi/ygLLiNT2AIQ/hqdefault.jpg",
    durationSeconds: 10,
    sortOrder: 6,
    isActive: true,
  },
  {
    id: "task-yt-7",
    taskNumber: 7,
    title: "بناء المحفظة الاستثمارية المتوازنة",
    description: "كيفية توزيع المدخرات بين الصناديق لتأمين أرباح شهرية تراكمية ومضمونة.",
    youtubeId: "DhRKKs71xP8",
    videoUrl: "https://www.youtube.com/embed/DhRKKs71xP8",
    thumbnailUrl: "https://img.youtube.com/vi/DhRKKs71xP8/hqdefault.jpg",
    durationSeconds: 10,
    sortOrder: 7,
    isActive: true,
  },
  {
    id: "task-yt-8",
    taskNumber: 8,
    title: "التخطيط المالي والادخار الذكي",
    description: "أساليب الادخار التلقائي وبناء صندوق الطوارئ وتعزيز العوائد الاستثمارية.",
    youtubeId: "eaPCE8XqaRA",
    videoUrl: "https://www.youtube.com/embed/eaPCE8XqaRA",
    thumbnailUrl: "https://img.youtube.com/vi/eaPCE8XqaRA/hqdefault.jpg",
    durationSeconds: 10,
    sortOrder: 8,
    isActive: true,
  },
  {
    id: "task-yt-9",
    taskNumber: 9,
    title: "ريادة الأعمال والحرية المالية",
    description: "نصائح ملهمة للبدء في الاستثمار وبناء مصادر دخل إضافية ومستقلة.",
    youtubeId: "z4LaVLItrKc",
    videoUrl: "https://www.youtube.com/embed/z4LaVLItrKc",
    thumbnailUrl: "https://img.youtube.com/vi/z4LaVLItrKc/hqdefault.jpg",
    durationSeconds: 10,
    sortOrder: 9,
    isActive: true,
  },
];

const INITIAL_VIP_PLANS: VipPlan[] = [
  {
    level: 1,
    name: "VIP 1",
    price: 13,
    dailyProfit: 0.5,
    dailyTasks: 2,
    taskReward: 0.25,
    durationDays: 365,
    accent: "green",
    isActive: true,
  },
  {
    level: 2,
    name: "VIP 2",
    price: 27,
    dailyProfit: 1.2,
    dailyTasks: 3,
    taskReward: 0.4,
    durationDays: 365,
    accent: "blue",
    isActive: true,
  },
  {
    level: 3,
    name: "VIP 3",
    price: 61,
    dailyProfit: 2.9,
    dailyTasks: 4,
    taskReward: 0.725,
    durationDays: 365,
    accent: "purple",
    isActive: true,
  },
  {
    level: 4,
    name: "VIP 4",
    price: 131,
    dailyProfit: 6.4,
    dailyTasks: 5,
    taskReward: 1.28,
    durationDays: 365,
    accent: "gold",
    isActive: true,
  },
  {
    level: 5,
    name: "VIP 5",
    price: 273,
    dailyProfit: 13.5,
    dailyTasks: 6,
    taskReward: 2.25,
    durationDays: 365,
    accent: "pink",
    isActive: true,
  },
  {
    level: 6,
    name: "VIP 6",
    price: 569,
    dailyProfit: 28.5,
    dailyTasks: 7,
    taskReward: 4.071,
    durationDays: 365,
    accent: "emerald",
    isActive: true,
  },
  {
    level: 7,
    name: "VIP 7",
    price: 1188,
    dailyProfit: 60.0,
    dailyTasks: 8,
    taskReward: 7.5,
    durationDays: 365,
    accent: "gold",
    isActive: true,
  },
];

const DATA_DIR = path.resolve(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "valoriza_db.json");

class ValorizaStore {
  private db: ValorizaDatabase;

  constructor() {
    this.db = this.load();
  }

  private load(): ValorizaDatabase {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        return {
          vipPlans: INITIAL_VIP_PLANS, // Always enforce official VIP specifications
          userVips: parsed.userVips ?? {},
          userTrials: parsed.userTrials ?? {},
          tasks: parsed.tasks?.length ? parsed.tasks : INITIAL_9_TASKS,
          taskCompletions: parsed.taskCompletions ?? [],
          deposits: parsed.deposits ?? [],
          wallets: parsed.wallets ?? {},
        };
      }
    } catch (err) {
      console.warn("[ValorizaStore] Load warning:", err);
    }

    const initial: ValorizaDatabase = {
      vipPlans: INITIAL_VIP_PLANS,
      userVips: {},
      userTrials: {},
      tasks: INITIAL_9_TASKS,
      taskCompletions: [],
      deposits: [],
      wallets: {},
    };
    this.saveDirect(initial);
    return initial;
  }

  private saveDirect(db: ValorizaDatabase) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_PATH, JSON.stringify(db, null, 2), "utf-8");
    } catch (err) {
      console.error("[ValorizaStore] Save error:", err);
    }
  }

  private save() {
    this.saveDirect(this.db);
  }

  // --- VIP PLANS ---
  getVipPlans(): VipPlan[] {
    return this.db.vipPlans;
  }

  getVipPlan(level: number): VipPlan | undefined {
    return this.db.vipPlans.find((p) => p.level === level);
  }

  updateVipPlan(level: number, updates: Partial<VipPlan>): VipPlan | undefined {
    const idx = this.db.vipPlans.findIndex((p) => p.level === level);
    if (idx !== -1) {
      this.db.vipPlans[idx] = { ...this.db.vipPlans[idx], ...updates };
      this.save();
      return this.db.vipPlans[idx];
    }
    return undefined;
  }

  // --- USER VIP SUBSCRIPTIONS ---
  getUserVip(userId: string): UserVipSubscription | null {
    const sub = this.db.userVips[userId];
    if (!sub) return null;
    const now = new Date();
    if (new Date(sub.expiresAt) < now) {
      sub.status = "expired";
      this.save();
    }
    return sub;
  }

  setUserVip(userId: string, level: number, durationDays = 365): UserVipSubscription {
    const now = new Date();
    const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const sub: UserVipSubscription = {
      userId,
      vipLevel: level,
      activatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      status: "active",
    };
    this.db.userVips[userId] = sub;
    this.save();
    return sub;
  }

  // --- TRIAL PERIOD ---
  // Duration: 3 days. Daily tasks: 3. Daily profit: $1.2. Total trial profit: $3.6. Independent of VIP.
  getUserTrial(userId: string): UserTrialInfo {
    const trial = this.db.userTrials[userId];
    if (!trial) {
      return {
        userId,
        isActive: false,
        status: "not_started",
        durationDays: 3,
        dailyTasks: 3,
        dailyProfit: 1.2,
        startedAt: null,
        expiresAt: null,
        hasUsedTrial: false,
      };
    }
    if (trial.isActive && trial.expiresAt && new Date(trial.expiresAt) < new Date()) {
      trial.isActive = false;
      trial.status = "expired";
      this.save();
    }
    return {
      ...trial,
      status: trial.isActive ? "active" : trial.hasUsedTrial ? "expired" : "not_started",
      durationDays: 3,
      dailyTasks: 3,
      dailyProfit: 1.2,
    };
  }

  activateUserTrial(userId: string): { ok: boolean; message: string; trial: UserTrialInfo } {
    const existing = this.getUserTrial(userId);
    if (existing.hasUsedTrial) {
      return {
        ok: false,
        message: "لقد تم استخدام الفترة التجريبية لهذا الحساب مسبقاً ولا يمكن إعادة تفعيلها.",
        trial: existing,
      };
    }
    const now = new Date();
    const expires = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
    const updated: UserTrialInfo = {
      userId,
      isActive: true,
      status: "active",
      durationDays: 3,
      dailyTasks: 3,
      dailyProfit: 1.2,
      startedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      hasUsedTrial: true,
    };
    this.db.userTrials[userId] = updated;
    this.save();
    return {
      ok: true,
      message: "تم تفعيل الفترة التجريبية بنجاح لمدة 3 أيام!",
      trial: updated,
    };
  }

  // --- TASKS ---
  getTasks(): VideoTask[] {
    return this.db.tasks.filter((t) => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getAllTasks(): VideoTask[] {
    return this.db.tasks.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getTask(id: string): VideoTask | undefined {
    return this.db.tasks.find((t) => t.id === id);
  }

  saveTask(task: VideoTask): VideoTask {
    const idx = this.db.tasks.findIndex((t) => t.id === task.id);
    if (idx !== -1) {
      this.db.tasks[idx] = task;
    } else {
      this.db.tasks.push(task);
    }
    this.save();
    return task;
  }

  deleteTask(id: string): boolean {
    const prev = this.db.tasks.length;
    this.db.tasks = this.db.tasks.filter((t) => t.id !== id);
    if (this.db.tasks.length !== prev) {
      this.save();
      return true;
    }
    return false;
  }

  // --- TASK COMPLETIONS & UNIQUE DAILY CONSTRAINT ---
  getCompletionsForUserOnDate(userId: string, dateStr: string): TaskCompletionRecord[] {
    return this.db.taskCompletions.filter(
      (c) => c.userId === userId && c.completionDate === dateStr,
    );
  }

  getTaskCompletions(userId: string, dateStr?: string): TaskCompletionRecord[] {
    if (dateStr) {
      return this.getCompletionsForUserOnDate(userId, dateStr);
    }
    return this.db.taskCompletions.filter((c) => c.userId === userId);
  }

  isTaskCompletedToday(userId: string, taskId: string, dateStr: string): boolean {
    return this.db.taskCompletions.some(
      (c) => c.userId === userId && c.taskId === taskId && c.completionDate === dateStr,
    );
  }

  recordTaskCompletion(params: {
    userId: string;
    taskId: string;
    dateStr: string;
    reward: number;
    watchedSeconds: number;
    startedAt: string;
    completedAt: string;
  }): { ok: boolean; reason?: string; completion?: TaskCompletionRecord } {
    // Unique check: (userId, taskId, dateStr)
    const exists = this.isTaskCompletedToday(params.userId, params.taskId, params.dateStr);
    if (exists) {
      return { ok: false, reason: "ALREADY_COMPLETED_TODAY" };
    }

    const completion: TaskCompletionRecord = {
      id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      taskId: params.taskId,
      completionDate: params.dateStr,
      startedAt: params.startedAt,
      completedAt: params.completedAt,
      status: "REWARDED",
      reward: params.reward,
      watchedSeconds: params.watchedSeconds,
    };

    this.db.taskCompletions.push(completion);

    // Update wallet
    this.creditBalance(params.userId, params.reward, "task_reward");

    this.save();
    return { ok: true, completion };
  }

  // --- WALLETS ---
  getWallet(userId: string): UserWalletData {
    if (!this.db.wallets[userId]) {
      this.db.wallets[userId] = {
        userId,
        balance: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        totalEarned: 0,
        investedBalance: 0,
        teamIncome: 0,
      };
      this.save();
    }
    return this.db.wallets[userId];
  }

  creditBalance(
    userId: string,
    amount: number,
    type: "deposit" | "task_reward" | "trial_reward" | "referral",
  ): UserWalletData {
    const w = this.getWallet(userId);
    w.balance = Number((w.balance + amount).toFixed(4));
    if (type === "deposit") {
      w.totalDeposited = Number((w.totalDeposited + amount).toFixed(4));
    } else {
      w.totalEarned = Number((w.totalEarned + amount).toFixed(4));
    }
    this.save();
    return w;
  }

  debitBalance(userId: string, amount: number): { ok: boolean; wallet?: UserWalletData } {
    const w = this.getWallet(userId);
    if (w.balance < amount) {
      return { ok: false };
    }
    w.balance = Number((w.balance - amount).toFixed(4));
    this.save();
    return { ok: true, wallet: w };
  }

  adjustBalance(
    userId: string,
    amount: number,
    reason: string,
  ): { ok: boolean; wallet: UserWalletData } {
    const w = this.getWallet(userId);
    w.balance = Number((w.balance + amount).toFixed(4));
    if (w.balance < 0) w.balance = 0;
    if (amount > 0) {
      w.totalEarned = Number((w.totalEarned + amount).toFixed(4));
    }
    this.save();
    return { ok: true, wallet: w };
  }

  // --- DEPOSITS ---
  getDeposits(userId?: string): DepositRequest[] {
    if (userId) {
      return this.db.deposits
        .filter((d) => d.userId === userId)
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }
    return this.db.deposits.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  createDeposit(params: {
    userId: string;
    userEmail?: string;
    username?: string;
    network: "USDT-ERC20" | "USDT-BEP20" | "USDT-TRC20";
    amount: number;
    depositAddress: string;
    screenshotUrl: string;
    txHash?: string;
  }): DepositRequest {
    const dep: DepositRequest = {
      id: `dep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.userId,
      userEmail: params.userEmail,
      username: params.username,
      network: params.network,
      amount: params.amount,
      depositAddress: params.depositAddress,
      screenshotUrl: params.screenshotUrl,
      txHash: params.txHash,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    this.db.deposits.push(dep);
    this.save();
    return dep;
  }

  reviewDeposit(
    depositId: string,
    action: "approve" | "reject",
    reviewedBy: string,
    reason?: string,
  ): { ok: boolean; deposit?: DepositRequest; reason?: string } {
    const dep = this.db.deposits.find((d) => d.id === depositId);
    if (!dep) return { ok: false, reason: "DEPOSIT_NOT_FOUND" };
    if (dep.status !== "pending") return { ok: false, reason: "ALREADY_REVIEWED" };

    dep.status = action === "approve" ? "approved" : "rejected";
    dep.reviewedAt = new Date().toISOString();
    dep.reviewedBy = reviewedBy;
    if (reason) dep.rejectReason = reason;

    if (action === "approve") {
      this.creditBalance(dep.userId, dep.amount, "deposit");
    }

    this.save();
    return { ok: true, deposit: dep };
  }
}

// Global Singleton
let globalStore: ValorizaStore | null = null;

export function getValorizaStore(): ValorizaStore {
  if (!globalStore) {
    globalStore = new ValorizaStore();
  }
  return globalStore;
}
