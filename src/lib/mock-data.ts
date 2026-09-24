// Local fallback mock data generator for offline/preview environments to ensure zero "fetch failed" crashes.

export function getMockHomeData() {
  return {
    profile: {
      id: "user-default-1",
      username: "مستثمر Valoriza",
      email: "user@valoriza.com",
      vipLevel: 1,
      referralCode: "VALORIZA2025",
      trialActive: false,
      trialExpiresAt: null,
    },
    wallet: {
      balance: 150.0,
      totalEarned: 45.8,
      investedBalance: 60.0,
      teamIncome: 18.5,
    },
    dailyReward: {
      claimed: false,
      amount: 0.11,
    },
    wheel: {
      spinsLeft: 3,
      prizes: [
        {
          id: "1",
          label_ar: "$0.50",
          prize_type: "cash",
          prize_value: 0.5,
          icon: "coins",
          accent: "gold",
        },
        {
          id: "2",
          label_ar: "$1.00",
          prize_type: "cash",
          prize_value: 1.0,
          icon: "coins",
          accent: "cyan",
        },
        {
          id: "3",
          label_ar: "فرصة إضافية",
          prize_type: "spin",
          prize_value: 1,
          icon: "gift",
          accent: "purple",
        },
        {
          id: "4",
          label_ar: "$2.00",
          prize_type: "cash",
          prize_value: 2.0,
          icon: "coins",
          accent: "emerald",
        },
        {
          id: "5",
          label_ar: "$5.00",
          prize_type: "cash",
          prize_value: 5.0,
          icon: "coins",
          accent: "gold",
        },
        {
          id: "6",
          label_ar: "حظ أوفر",
          prize_type: "none",
          prize_value: 0,
          icon: "info",
          accent: "blue",
        },
      ],
    },
    settings: {
      about_company:
        "تأسست شركة Valoriza للاستثمار في عام 2018 في العاصمة، ويقع مقرها الرئيسي في مدريد، إسبانيا. تعمل على توفير فرص استثمارية مبتكرة وآمنة لعملائنا حول العالم.",
      members_count: "75,420",
      min_deposit: "10",
      min_withdrawal: "6",
      withdrawal_fee_percent: "10",
      withdrawal_start_hour: "09:00",
      withdrawal_end_hour: "16:00",
      telegram_support: "https://t.me/valoriza_support",
      whatsapp_support: "+34600123456",
    },
  };
}

export function getMockInvestmentData() {
  return {
    vipPackages: [
      {
        id: "vip-1",
        level: 1,
        nameAr: "VIP 1",
        nameEn: "Starter",
        price: 20,
        dailyIncome: 1.2,
        dailyTasks: 3,
        validityDays: 365,
        active: true,
      },
      {
        id: "vip-2",
        level: 2,
        nameAr: "VIP 2",
        nameEn: "Bronze",
        price: 60,
        dailyIncome: 3.8,
        dailyTasks: 5,
        validityDays: 365,
        active: true,
      },
      {
        id: "vip-3",
        level: 3,
        nameAr: "VIP 3",
        nameEn: "Silver",
        price: 180,
        dailyIncome: 11.5,
        dailyTasks: 8,
        validityDays: 365,
        active: true,
      },
      {
        id: "vip-4",
        level: 4,
        nameAr: "VIP 4",
        nameEn: "Gold",
        price: 500,
        dailyIncome: 35.0,
        dailyTasks: 10,
        validityDays: 365,
        active: true,
      },
      {
        id: "vip-5",
        level: 5,
        nameAr: "VIP 5",
        nameEn: "Platinum",
        price: 1500,
        dailyIncome: 110.0,
        dailyTasks: 12,
        validityDays: 365,
        active: true,
      },
      {
        id: "vip-6",
        level: 6,
        nameAr: "VIP 6",
        nameEn: "Diamond",
        price: 3500,
        dailyIncome: 270.0,
        dailyTasks: 15,
        validityDays: 365,
        active: true,
      },
      {
        id: "vip-7",
        level: 7,
        nameAr: "VIP 7",
        nameEn: "Crown",
        price: 8000,
        dailyIncome: 650.0,
        dailyTasks: 20,
        validityDays: 365,
        active: true,
      },
    ],
    funds: [
      {
        id: "fund-1",
        code: "MUMBAI",
        titleAr: "صندوق مومباي الذكي",
        titleEn: "Mumbai Smart Fund",
        descriptionAr: "أرباح يومية تراكمية ومخاطر منخفضة",
        dailyReturnPercent: 8.5,
        durationDays: 30,
        minAmount: 10,
        maxAmount: 500,
        colorScheme: "gold",
        riskLevel: 1,
      },
      {
        id: "fund-2",
        code: "NBL",
        titleAr: "صندوق NBL المستدام",
        titleEn: "NBL Growth Fund",
        descriptionAr: "عائد متميز على المدى المتوسط",
        dailyReturnPercent: 10.8,
        durationDays: 45,
        minAmount: 50,
        maxAmount: 2000,
        colorScheme: "emerald",
        riskLevel: 2,
      },
      {
        id: "fund-3",
        code: "GXR",
        titleAr: "صندوق GXR للتكنولوجيا",
        titleEn: "GXR Tech Fund",
        descriptionAr: "استثمار عالي النمو في أسواق الذكاء الاصطناعي",
        dailyReturnPercent: 12.4,
        durationDays: 60,
        minAmount: 100,
        maxAmount: 5000,
        colorScheme: "purple",
        riskLevel: 3,
      },
      {
        id: "fund-4",
        code: "MEXICO",
        titleAr: "صندوق نيو مكسيكو",
        titleEn: "New Mexico Fund",
        descriptionAr: "أعلى معدل أرباح يومية للخطط المتقدمة",
        dailyReturnPercent: 15.0,
        durationDays: 90,
        minAmount: 200,
        maxAmount: 10000,
        colorScheme: "cyan",
        riskLevel: 4,
      },
    ],
    userInvestments: [
      {
        id: "inv-1",
        fundTitle: "صندوق مومباي الذكي",
        amount: 50,
        dailyProfit: 4.25,
        daysLeft: 22,
        status: "active",
      },
    ],
    trialActive: false,
    trialExpiresAt: null,
    wallet: {
      balance: 150.0,
      investedBalance: 60.0,
    },
  };
}

export function getMockTasksData() {
  return {
    vipLevel: 1,
    vipName: "VIP 1 - Starter",
    isTrial: false,
    trialExpiresAt: null,
    videoCommission: 0.4,
    dailyLimit: 3,
    completedCount: 1,
    remainingTasks: 2,
    videoDuration: 15,
    userBalance: 150.0,
    allDailyTasksCompleted: false,
    tasks: [
      {
        id: "task-1",
        taskNumber: 1,
        title: "مشاهدة إعلان ترويجي — منصة Valoriza",
        description: "شاهد الفيديو الترويجي لمدة 15 ثانية للحصول على المكافأة",
        youtubeId: "dQw4w9WgXcQ",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80",
        durationSeconds: 15,
        vipRequirement: "VIP 1",
        reward: 0.4,
        isCompletedToday: true,
        status: "COMPLETED" as const,
      },
      {
        id: "task-2",
        taskNumber: 2,
        title: "تقييم أداء المحفظة الاستثمارية",
        description: "شاهد التحليل المالي السريع لمدة 15 ثانية واكسب مكافأتك",
        youtubeId: "dQw4w9WgXcQ",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnailUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&q=80",
        durationSeconds: 15,
        vipRequirement: "VIP 1",
        reward: 0.4,
        isCompletedToday: false,
        status: "AVAILABLE" as const,
      },
      {
        id: "task-3",
        taskNumber: 3,
        title: "جولة في مقر Valoriza بمدريد",
        description: "تعرف على مقر وفريق عمل الشركة واكسب عمولتك فوراً",
        youtubeId: "dQw4w9WgXcQ",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnailUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80",
        durationSeconds: 15,
        vipRequirement: "VIP 1",
        reward: 0.4,
        isCompletedToday: false,
        status: "AVAILABLE" as const,
      },
    ],
  };
}

export function getMockTeamData() {
  return {
    referralCode: "VALORIZA2025",
    referralLink:
      typeof window !== "undefined"
        ? `${window.location.origin}/?ref=VALORIZA2025`
        : "https://valoriza.com/?ref=VALORIZA2025",
    totalMembers: 12,
    teamIncome: 35.8,
    teamRewards: 18.5,
    levels: [
      { level: 1, percent: 10, count: 6, income: 24.5 },
      { level: 2, percent: 5, count: 4, income: 8.3 },
      { level: 3, percent: 2, count: 2, income: 3.0 },
    ],
    members: [
      {
        id: "m-1",
        username: "احمد_علي",
        email: "ahmed@example.com",
        level: 1,
        vipLevel: 2,
        deposit: 60,
        commission: 6.0,
        date: "2025-05-10",
      },
      {
        id: "m-2",
        username: "خالد_العربي",
        email: "khaled@example.com",
        level: 1,
        vipLevel: 1,
        deposit: 20,
        commission: 2.0,
        date: "2025-05-11",
      },
      {
        id: "m-3",
        username: "سارة_محمد",
        email: "sara@example.com",
        level: 2,
        vipLevel: 1,
        deposit: 20,
        commission: 1.0,
        date: "2025-05-12",
      },
    ],
  };
}

export function getMockRewardsData() {
  return {
    totalRewards: 45.8,
    balance: 150.0,
    dailyRewardClaimed: false,
    dailyRewardAmount: 0.11,
    wheelSpinsLeft: 3,
    rewardsHistory: [
      {
        id: "rw-1",
        source: "daily_login",
        amount: 0.11,
        description: "مكافأة تسجيل الدخول اليومية",
        date: "2025-05-12",
      },
      {
        id: "rw-2",
        source: "task_completed",
        amount: 0.4,
        description: "مكافأة إكمال المهمة رقم 1",
        date: "2025-05-12",
      },
      {
        id: "rw-3",
        source: "lucky_wheel",
        amount: 1.0,
        description: "مكافأة عجلة الحظ",
        date: "2025-05-11",
      },
    ],
  };
}

export function getMockAccountData() {
  return {
    profile: {
      username: "مستثمر Valoriza",
      email: "user@valoriza.com",
      phone: "+966500000000",
      vipLevel: 1,
      referralCode: "VALORIZA2025",
      trialActive: false,
    },
    balance: 150.0,
    dailyReward: {
      amount: 0.11,
      claimed: false,
    },
  };
}

export function getMockWithdrawalData() {
  return {
    balance: 150.0,
    minWithdrawal: 6,
    feePercent: 10,
    startHour: "09:00",
    endHour: "16:00",
    isWithdrawalOpen: true,
    boundAddress: {
      network: "TRC20" as const,
      address: "TYDzsxdczEfD1zgq6vs5jJ6u8P6L8Trc20",
    },
  };
}

export function getMockRecordsData() {
  return {
    deposits: [
      {
        id: "dep-1",
        amount: 50,
        network: "USDT-TRC20",
        status: "approved",
        txHash: "0xabc...123",
        createdAt: "2025-05-10",
      },
    ],
    withdrawals: [
      {
        id: "wth-1",
        amount: 15,
        fee: 1.5,
        netAmount: 13.5,
        network: "TRC20",
        address: "TYDzsxdczEfD1zgq6vs5jJ6u8P6L8Trc20",
        status: "completed",
        createdAt: "2025-05-11",
      },
    ],
    earnings: [
      {
        id: "ern-1",
        amount: 0.4,
        type: "task_reward",
        description: "مهمة إعلانية VIP 1",
        createdAt: "2025-05-12",
      },
      {
        id: "ern-2",
        amount: 4.25,
        type: "fund_dividend",
        description: "أرباح صندوق مومباي اليومية",
        createdAt: "2025-05-12",
      },
      {
        id: "ern-3",
        amount: 0.11,
        type: "daily_login",
        description: "تسجيل دخول يومي",
        createdAt: "2025-05-12",
      },
    ],
  };
}

export function getMockAboutData() {
  return {
    title: "عن شركة Valoriza",
    establishedYear: "2018",
    hqLocation: "مدريد، إسبانيا",
    licenseNumber: "ES-B87654321",
    aboutText:
      "تأسست شركة Valoriza للاستثمار في عام 2018 في العاصمة مدريد بإسبانيا. تعد واحدة من أسرع المنصات نمواً في مجال إدارة الأصول الرقمية والحلول الاستثمارية الذكية. نعمل وفق أعلى معايير الشفافية والأمان لنمنح المستثمرين تجربة رائدة وموثوقة.",
    activeMembers: "75,420+",
    totalInvested: "$12,850,000+",
  };
}

export function getMockSettingsData() {
  return {
    about_company:
      "تأسست شركة Valoriza للاستثمار في عام 2018 في العاصمة، ويقع مقرها الرئيسي في مدريد، إسبانيا. تعمل على توفير فرص استثمارية مبتكرة وآمنة لعملائنا حول العالم.",
    members_count: "75,420",
    min_deposit: "10",
    min_withdrawal: "6",
    withdrawal_fee_percent: "10",
    withdrawal_start_hour: "09:00",
    withdrawal_end_hour: "16:00",
    telegram_support: "https://t.me/valoriza_support",
    whatsapp_support: "+34600123456",
  };
}

export function getMockAdminOverview() {
  return {
    stats: {
      totalUsers: 1420,
      activeUsers: 890,
      totalDeposited: 125400,
      totalWithdrawn: 48200,
      pendingDeposits: 3,
      pendingWithdrawals: 2,
      platformBalance: 77200,
    },
    recentUsers: [
      {
        id: "u-101",
        username: "سالم_المنصور",
        email: "salem@example.com",
        vipLevel: 2,
        balance: 120.5,
        createdAt: "2025-05-12",
      },
      {
        id: "u-102",
        username: "منى_الغامدي",
        email: "mona@example.com",
        vipLevel: 1,
        balance: 45.0,
        createdAt: "2025-05-12",
      },
    ],
  };
}

export function getMockAdminUsers() {
  return {
    users: [
      {
        id: "u-1",
        username: "Admin Valoriza",
        email: "admin@valoriza.com",
        role: "admin",
        vipLevel: 7,
        balance: 1000.0,
        isBlocked: false,
        createdAt: "2025-01-01",
      },
      {
        id: "u-2",
        username: "مستثمر تجريبي",
        email: "user@valoriza.com",
        role: "user",
        vipLevel: 1,
        balance: 150.0,
        isBlocked: false,
        createdAt: "2025-05-01",
      },
      {
        id: "u-3",
        username: "محمد_الشمري",
        email: "mohamed@example.com",
        role: "user",
        vipLevel: 3,
        balance: 320.0,
        isBlocked: false,
        createdAt: "2025-05-05",
      },
    ],
  };
}

export function getMockAdminDeposits() {
  return {
    deposits: [
      {
        id: "dep-1",
        userId: "u-2",
        username: "مستثمر تجريبي",
        amount: 100,
        network: "USDT-TRC20",
        txHash: "0x123...abc",
        screenshotUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400",
        status: "pending",
        createdAt: "2025-05-12",
      },
    ],
  };
}

export function getMockAdminWithdrawals() {
  return {
    withdrawals: [
      {
        id: "wth-1",
        userId: "u-2",
        username: "مستثمر تجريبي",
        amount: 50,
        fee: 5.0,
        netAmount: 45.0,
        network: "TRC20",
        address: "TYDzsxdczEfD1zgq6vs5jJ6u8P6L8Trc20",
        status: "pending",
        createdAt: "2025-05-12",
      },
    ],
  };
}

export function getMockAdminFunds() {
  return {
    funds: [
      {
        id: "f-1",
        code: "MUMBAI",
        titleAr: "صندوق مومباي الذكي",
        titleEn: "Mumbai Smart Fund",
        dailyReturnPercent: 8.5,
        durationDays: 30,
        minAmount: 10,
        isActive: true,
      },
      {
        id: "f-2",
        code: "NBL",
        titleAr: "صندوق NBL المستدام",
        titleEn: "NBL Growth Fund",
        dailyReturnPercent: 10.8,
        durationDays: 45,
        minAmount: 50,
        isActive: true,
      },
    ],
  };
}

export function getMockAdminVipPackages() {
  return {
    packages: [
      {
        id: "vip-1",
        level: 1,
        nameAr: "VIP 1",
        price: 20,
        dailyIncome: 1.2,
        dailyTasks: 3,
        isActive: true,
      },
      {
        id: "vip-2",
        level: 2,
        nameAr: "VIP 2",
        price: 60,
        dailyIncome: 3.8,
        dailyTasks: 5,
        isActive: true,
      },
      {
        id: "vip-3",
        level: 3,
        nameAr: "VIP 3",
        price: 180,
        dailyIncome: 11.5,
        dailyTasks: 8,
        isActive: true,
      },
    ],
  };
}

export function getMockAdminTasks() {
  return {
    tasks: [
      {
        id: "t-1",
        taskNumber: 1,
        title: "مشاهدة إعلان ترويجي",
        reward: 0.4,
        durationSeconds: 15,
        vipLevel: 1,
        isActive: true,
      },
      {
        id: "t-2",
        taskNumber: 2,
        title: "تقييم أداء المحفظة",
        reward: 0.4,
        durationSeconds: 15,
        vipLevel: 1,
        isActive: true,
      },
    ],
  };
}

export function getMockAdminWheel() {
  return {
    prizes: [
      {
        id: "1",
        label_ar: "$0.50",
        prize_type: "cash",
        prize_value: 0.5,
        icon: "coins",
        accent: "gold",
        sort_order: 1,
        is_active: true,
      },
      {
        id: "2",
        label_ar: "$1.00",
        prize_type: "cash",
        prize_value: 1.0,
        icon: "coins",
        accent: "cyan",
        sort_order: 2,
        is_active: true,
      },
      {
        id: "3",
        label_ar: "فرصة إضافية",
        prize_type: "spin",
        prize_value: 1,
        icon: "gift",
        accent: "purple",
        sort_order: 3,
        is_active: true,
      },
      {
        id: "4",
        label_ar: "$2.00",
        prize_type: "cash",
        prize_value: 2.0,
        icon: "coins",
        accent: "emerald",
        sort_order: 4,
        is_active: true,
      },
    ],
  };
}

export function getMockAdminSettings() {
  return {
    settings: {
      about_company: "تأسست شركة Valoriza للاستثمار في عام 2018 بمدريد، إسبانيا.",
      members_count: "75,420",
      min_deposit: "10",
      min_withdrawal: "6",
      withdrawal_fee_percent: "10",
      withdrawal_start_hour: "09:00",
      withdrawal_end_hour: "16:00",
      daily_spins: "3",
      daily_login_reward: "0.11",
      telegram_support: "https://t.me/valoriza_support",
      whatsapp_support: "+34600123456",
    },
  };
}

export function getMockAdminAuditLogs() {
  return {
    logs: [
      {
        id: "log-1",
        adminUsername: "Admin Valoriza",
        action: "UPDATE_VIP",
        details: "ترقية المستخدم سالم إلى VIP 2",
        createdAt: "2025-05-12",
      },
      {
        id: "log-2",
        adminUsername: "Admin Valoriza",
        action: "APPROVE_DEPOSIT",
        details: "الموافقة على إيداع بقيمة $100",
        createdAt: "2025-05-12",
      },
    ],
  };
}

export function routeFallbackResponse(path: string, _init: RequestInit = {}): unknown {
  const p = path.toLowerCase();
  if (p.includes("/api/app/home")) return getMockHomeData();
  if (p.includes("/api/app/investment") || p.includes("/api/app/vip-plans"))
    return getMockInvestmentData();
  if (p.includes("/api/app/tasks/complete"))
    return { ok: true, reward: 0.4, message: "تم إكمال المهمة بنجاح" };
  if (p.includes("/api/app/tasks")) return getMockTasksData();
  if (p.includes("/api/app/team")) return getMockTeamData();
  if (p.includes("/api/app/rewards")) return getMockRewardsData();
  if (p.includes("/api/app/account")) return getMockAccountData();
  if (p.includes("/api/app/withdrawal/address"))
    return { ok: true, message: "تم ربط عنوان السحب بنجاح" };
  if (p.includes("/api/app/withdrawal")) return getMockWithdrawalData();
  if (p.includes("/api/app/records")) return getMockRecordsData();
  if (p.includes("/api/app/daily-reward")) return { ok: true, amount: 0.11 };
  if (p.includes("/api/app/spin"))
    return {
      ok: true,
      prize: { label_ar: "$1.00", prize_value: 1.0, prize_type: "cash" },
      spinsLeft: 2,
    };
  if (p.includes("/api/app/trial"))
    return { ok: true, message: "تم تفعيل فترة التجربة المجانية بنجاح" };
  if (p.includes("/api/app/vip/purchase")) return { ok: true, message: "تمت ترقية باقة VIP بنجاح" };
  if (p.includes("/api/app/invest")) return { ok: true, message: "تم الاستثمار في الصندوق بنجاح" };
  if (p.includes("/api/app/deposit")) return { ok: true, message: "تم تقديم طلب الإيداع بنجاح" };
  if (p.includes("/api/app/settings")) return getMockSettingsData();
  if (p.includes("/api/public/about")) return getMockAboutData();
  if (p.includes("/api/admin/overview")) return getMockAdminOverview();
  if (
    p.includes("/api/admin/users/block") ||
    p.includes("/api/admin/users/vip") ||
    p.includes("/api/admin/users/balance")
  )
    return { ok: true };
  if (p.includes("/api/admin/users")) return getMockAdminUsers();
  if (p.includes("/api/admin/deposits/review")) return { ok: true };
  if (p.includes("/api/admin/deposits")) return getMockAdminDeposits();
  if (p.includes("/api/admin/withdrawals/review")) return { ok: true };
  if (p.includes("/api/admin/withdrawals")) return getMockAdminWithdrawals();
  if (p.includes("/api/admin/funds")) return getMockAdminFunds();
  if (p.includes("/api/admin/vip-packages")) return getMockAdminVipPackages();
  if (p.includes("/api/admin/tasks")) return getMockAdminTasks();
  if (p.includes("/api/admin/wheel")) return getMockAdminWheel();
  if (p.includes("/api/admin/settings")) return getMockAdminSettings();
  if (p.includes("/api/admin/audit-logs")) return getMockAdminAuditLogs();

  return { ok: true };
}
