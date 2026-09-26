import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { coreTranslations } from "./locales/core";
import { publicTranslations } from "./locales/public";
import { pagesTranslations } from "./locales/pages";
import { adminTranslations } from "./locales/admin";

export type LanguageCode = "ar" | "en" | "fr" | "es";

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  dir: "rtl" | "ltr";
}

export const LANGUAGES: LanguageOption[] = [
  { code: "ar", name: "العربية", nativeName: "العربية", flag: "🇸🇦", dir: "rtl" },
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", dir: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", dir: "ltr" },
];

export const translations = {
  ar: {
    // Navigation
    "nav.home": "الرئيسية",
    "nav.investment": "الاستثمار",
    "nav.team": "فريقي",
    "nav.tasks": "المهام",
    "nav.rewards": "المكافآت",
    "nav.account": "حسابي",
    "nav.admin": "لوحة الإدارة",
    "nav.support": "خدمة العملاء",
    "nav.about": "حول المنصة",
    "nav.logout": "تسجيل الخروج",
    "nav.records": "سجل المعاملات",

    // Common
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.confirm": "تأكيد",
    "common.submit": "إرسال",
    "common.retry": "إعادة المحاولة",
    "common.back": "رجوع",
    "common.loading": "جارٍ التحميل...",
    "common.error": "حدث خطأ غير متوقع",
    "common.success": "تمت العملية بنجاح",
    "common.copied": "تم النسخ بنجاح!",
    "common.copy": "نسخ",
    "common.close": "إغلاق",
    "common.filter": "تصفية",
    "common.all": "الكل",
    "common.status": "الحالة",
    "common.amount": "المبلغ",
    "common.date": "التاريخ",
    "common.network": "الشبكة",
    "common.balance": "الرصيد",
    "common.total": "الإجمالي",
    "common.details": "التفاصيل",
    "common.search": "بحث...",
    "common.theme": "المظهر",
    "common.language": "اللغة",
    "common.viewAll": "عرض الكل",
    "common.none": "لا يوجد",

    // Auth
    "auth.loginTitle": "مرحباً بعودتك",
    "auth.loginSubtitle": "سجل الدخول إلى حسابك للمتابعة",
    "auth.registerTitle": "إنشاء حساب جديد",
    "auth.registerSubtitle": "أكمل بياناتك للانضمام إلى منصة Valoriza",
    "auth.username": "اسم المستخدم",
    "auth.email": "البريد الإلكتروني",
    "auth.phone": "رقم الهاتف",
    "auth.password": "كلمة المرور",
    "auth.referral": "رمز الدعوة (اختياري)",
    "auth.loginBtn": "تسجيل الدخول ←",
    "auth.registerBtn": "إنشاء الحساب الآن ←",
    "auth.processing": "جارٍ المعالجة...",
    "auth.noAccount": "ليس لديك حساب؟",
    "auth.hasAccount": "لديك حساب بالفعل؟",
    "auth.switchRegister": "سجل الآن",
    "auth.switchLogin": "تسجيل الدخول",
    "auth.heroTitle": "منصة عالمية",
    "auth.heroSubtitle": "فرص حقيقية لربح المال",
    "auth.heroTag": "آمن - سهل - سريع",
    "auth.benefitSecurity": "أمان وحماية عالية",
    "auth.benefitSupport": "دعم فني على مدار 24 ساعة",
    "auth.benefitProfit": "أرباح يومية مضمونة",
    "auth.welcomeBack": "مرحباً بعودتك إلى Valoriza",
    "auth.accountCreated": "تم إنشاء الحساب بنجاح!",
    "auth.errInvalidCreds": "بيانات الدخول غير صحيحة، تأكد من البريد وكلمة المرور",
    "auth.errUsernameLen": "اسم المستخدم يجب ألا يقل عن 3 أحرف",
    "auth.errPasswordLen": "كلمة المرور يجب ألا تقل عن 6 أحرف",

    // Home
    "home.walletBalance": "رصيد المحفظة",
    "home.deposit": "إيداع",
    "home.withdraw": "سحب",
    "home.dailyProfit": "أرباح اليوم",
    "home.totalEarned": "إجمالي الأرباح",
    "home.investedBalance": "المبلغ المستثمر",
    "home.teamIncome": "دخل الفريق",
    "home.luckyWheel": "عجلة الحظ اليومية",
    "home.luckyWheelSubtitle": "أدر العجلة واربح جوائز نقدية فورية تصل إلى $100!",
    "home.spinNow": "أدر العجلة الآن",
    "home.savingsFunds": "صناديق التوفير الذكية",
    "home.savingsSubtitle": "عوائد يومية تصاعدية تبدأ من 5$ فقط",
    "home.investNow": "استثمر الآن",
    "home.dailyReward": "مكافأة تسجيل الدخول اليومية",
    "home.claimDaily": "استلام مكافأة اليوم ($0.11)",
    "home.claimed": "تم الاستلام اليوم",
    "home.vipStatus": "مستوى VIP الخاص بك",
    "home.trialActive": "فترة التجربة المجانية نشطة (3 أيام)",
    "home.quickServices": "الخدمات السريعة",
    "home.aboutCompany": "نبذة عن شركة Valoriza",
    "home.hqLocation": "مقر الشركة: باسيو دي لا كاستيلانا، مدريد، إسبانيا",
    "home.liveStats": "إحصائيات المنصة الحية",
    "home.activeInvestors": "مستثمر نشط",
    "home.totalPayouts": "إجمالي السحوبات المدفوعة",
    "home.recentTransactions": "أحدث العمليات",
    "home.upgradeVip": "ترقية الباقة",

    // Investment
    "invest.title": "باقات الاستثمار وصناديق التوفير",
    "invest.subtitle": "اختر الباقة المناسبة لميزانيتك واجنِ عوائد يومية مستقرة",
    "invest.vipTitle": "باقات VIP الرسمية",
    "invest.savingsTitle": "صناديق التوفير والادخار",
    "invest.price": "سعر الباقة",
    "invest.dailyProfit": "الربح اليومي",
    "invest.dailyTasks": "المهام اليومية",
    "invest.taskReward": "عائد المهمة الواحدة",
    "invest.duration": "المدة الزمنية",
    "invest.days": "يوم",
    "invest.active": "باقة نشطة",
    "invest.join": "الاشتراك في الباقة",
    "invest.upgrade": "ترقية الباقة",
    "invest.trialDesc": "الباقة التجريبية المجانية: 3 مهام يومياً بربح $1.20 لمدة 3 أيام",
    "invest.savingsDesc":
      "صندوق استثماري مرن يتيح لك جني أرباح يومية وسحب رأس المال عند انتهاء المدة",
    "invest.minDeposit": "الحد الأدنى للإيداع",

    // Investment page specific
    "investment.title": "الاستثمار و VIP",
    "investment.availableBalance": "الرصيد المتاح للاستثمار",
    "investment.activeVip": "عضويتك الحالية",
    "investment.trialBanner": "الفترة التجريبية المجانية",
    "investment.trialDesc": "جرب مهام VIP مجاناً لمدة يومين واكسب أرباحاً حقيقية",
    "investment.activateTrial": "تفعيل مجاني",
    "investment.trialActivated": "تم تفعيل الفترة التجريبية المجانية بنجاح!",
    "investment.alreadyVip": "لديك باقة VIP نشطة بالفعل",
    "investment.trialUsed": "تم استخدام الفترة التجريبية مسبقاً لهذا الحساب",
    "investment.fundsTab": "صندوق التوفير",
    "investment.vipTab": "ترقيات VIP",
    "investment.fundsSubtitle": "استثمر اليوم .. لمستقبل أفضل",
    "investment.fundsDesc":
      "فرص استثمارية آمنة مع عوائد مميزة تمنحك الاستقرار المالي والنمو المستدام",
    "investment.durationDays": "أيام",
    "investment.minAmount": "الحد الأدنى",
    "investment.investNow": "استثمر الآن",
    "investment.minNote": "الحد الأدنى للاستثمار في الصناديق التوفيرية هو 5 دولارات",
    "investment.activeInvestments": "استثماراتي النشطة",
    "investment.maturesAt": "تاريخ الاستحقاق",
    "investment.investedAmount": "المبلغ المستثمر",
    "investment.vipPackages": "باقات العضوية الاستثمارية VIP",
    "investment.vipPackagesDesc": "احصل على دخل يومي مستمر عبر إنجاز مهام مشاهدة الإعلانات اليومية",
    "investment.currentTier": "باقتك النشطة حالياً",
    "investment.locked": "مغلق حالياً",
    "investment.dailyProfit": "ربح يومي",
    "investment.tasksCount": "مهام",
    "investment.taskReward": "مكافأة المهمة الواحدة",
    "investment.price": "سعر الباقة",
    "investment.validityYear": "صلاحية الباقة: 365 يوماً",
    "investment.unavailable": "غير متاح حالياً",
    "investment.activePackage": "باقة مفعّلة",
    "investment.previouslyOwned": "مملوكة سابقاً",
    "investment.upgradeTo": "ترقية إلى",
    "investment.investIn": "الاستثمار في",
    "investment.amountLabel": "مبلغ الاستثمار (USDT)",
    "investment.allAmount": "الكل",
    "investment.fixedProfitRate": "نسبة الأرباح الثابتة",
    "investment.lockDuration": "مدة الحجز والاستثمار",
    "investment.expectedNetProfit": "الربح الصافي المتوقع",
    "investment.totalAtMaturity": "إجمالي المبلغ عند الاستحقاق",
    "investment.confirmInvestBtn": "تأكيد واستثمار الآن ✈",

    // Tasks
    "tasks.title": "المهام اليومية ومشاهدة الفيديوهات",
    "tasks.subtitle": "شاهد الفيديوهات للمدة المحددة لكل مهمة، ثم استلم عمولتك في محفظتك",
    "tasks.dailyLimit": "حد المهام اليومي",
    "tasks.remaining": "المهام المتبقية اليوم",
    "tasks.commissionPerVideo": "عمولة الفيديو",
    "tasks.watch": "مشاهدة الفيديو",
    "tasks.completed": "تمت المشاهدة",
    "tasks.completeSuccess": "تم إكمال المهمة وإضافة العمولة لرصيدك!",
    "tasks.limitReached": "لقد وصلت إلى الحد الأقصى للمهام لهذا اليوم.",
    "tasks.seconds": "ثوانٍ",
    "tasks.instruction":
      "يرجى مشاهدة الفيديو طوال المدة المحددة للمهمة لتأكيد إنجازها واستلام العمولة.",
    "tasks.allCompleted": "تهانينا! لقد أكملت جميع مهام اليوم.",
    "tasks.tabAll": "المهام",
    "tasks.tabDaily": "المهام اليومية",
    "tasks.instantGuaranteed": "عائد فوري مضمون",
    "tasks.watchInstruction":
      "قم بمشاهدة مقاطع الفيديو الترويجية لتحصيل عمولتك اليومية مباشرة في محفظتك.",
    "tasks.taskNumber": "مهمة رقم",
    "tasks.completedToday": "مكتملة اليوم",
    "tasks.exhaustedToday": "استنفدت اليوم",
    "tasks.rulesTitle": "قواعد وضوابط تحصيل العمولات",
    "tasks.rule1": "يتم تجديد المهام اليومية تلقائياً كل 24 ساعة وفق التوقيت المالي للمنصة.",
    "tasks.rule2": "الترقية لباقات VIP أعلى تزيد من عدد المهام وقيمة العمولة لكل فيديو تشاهده.",
    "tasks.rule3": "اترك صفحة الفيديو مفتوحة وظاهرة حتى ينتهي عداد المشاهدة ثم أكّد المهمة.",
    "tasks.watchProgress": "تقدم المشاهدة",
    "tasks.readyToClaim": "جاهز للاستلام",
    "tasks.earnedCommission": "العمولة المكتسبة",
    "tasks.balanceAfter": "الرصيد بعد الإكمال",
    "tasks.confirmClaimBtn": "تأكيد إكمال المهمة واستلام",

    // Team
    "team.title": "فريقي ومستويات الإحالة",
    "team.subtitle": "ادعُ أصدقاءك وابنِ شبكتك لتحصل على عمولات على 3 مستويات",
    "team.togetherWeAchieve": "معاً نحقق المزيد",
    "team.inviteCode": "رمز الدعوة الخاص بك",
    "team.inviteLink": "رابط الإحالة المباشر",
    "team.copyCode": "نسخ الرمز",
    "team.copyLink": "نسخ الرابط",
    "team.shareLink": "مشاركة الرابط",
    "team.totalMembers": "إجمالي الفريق",
    "team.teamRewards": "مكافآت الفريق",
    "team.teamIncome": "إجمالي دخل الفريق",
    "team.totalCommission": "أرباح الإحالة الإجمالية",
    "team.referralLevels": "مستويات الإحالة والعمولات",
    "team.viewAllLevels": "عرض جميع المستويات",
    "team.level1": "المستوى الأول (A)",
    "team.level1Rate": "عمولة 8% من شحن الفريق المباشر",
    "team.level2": "المستوى الثاني (B)",
    "team.level2Rate": "عمولة 4% من شحن المستوى الثاني",
    "team.level3": "المستوى الثالث (C)",
    "team.level3Rate": "عمولة 1% من شحن المستوى الثالث",
    "team.autoCalcNote":
      "تحسب العمولات تلقائياً عبر نظام المنصة الذكي عند قيام أعضاء فريقك بالاستثمار أو ترقية باقات VIP.",
    "team.level": "المستوى",
    "team.members": "الأعضاء",
    "team.earnings": "الأرباح",
    "team.teamMembers": "أعضاء الفريق",
    "team.noMembers": "لا يوجد أعضاء بعد. شارك كود الإحالة لتبدأ بناء فريقك وجني العمولات!",
    "team.noMembersInLevel": "لا يوجد أعضاء في هذا المستوى بعد.",

    // Rewards
    "rewards.title": "سجل المكافآت وعجلة الحظ",
    "rewards.subtitle": "مكافآت تسجيل الدخول اليومية وجوائز عجلة الحظ الكبرى",
    "rewards.wheelTitle": "عجلة الحظ Valoriza",
    "rewards.wheelSubtitle": "أدر العجلة واحصل على جوائز نقدية فورية في محفظتك!",
    "rewards.availableSpins": "المحاولات المتاحة",
    "rewards.spin": "تدوير العجلة",
    "rewards.spinning": "جارٍ التدوير...",
    "rewards.congrats": "تهانينا! لقد فزت بـ",
    "rewards.history": "سجل الجوائز السابقة",
    "rewards.totalEarned": "إجمالي المكافآت المحققة",
    "rewards.totalWalletBalance": "رصيد المحفظة الإجمالي",
    "rewards.claimToday": "احصل على مكافأة اليوم",
    "rewards.claimedToday": "تم استلام مكافأة اليوم",
    "rewards.filterAll": "الكل",
    "rewards.filterDaily": "اليومية",
    "rewards.filterTasks": "المهام",
    "rewards.filterWheel": "عجلة الحظ",
    "rewards.filterReferral": "الإحالة",
    "rewards.filterVip": "العضوية المميزة",
    "rewards.historyTitle": "سجل المكافآت المحققة",
    "rewards.noHistory": "لا توجد سجلات مكافآت لهذا القسم",
    "rewards.noHistoryDesc": "قم بإكمال المهام اليومية وتسجيل الدخول للمطالبة بالمكافآت.",
    "rewards.claimSuccess": "تم استلام المكافأة اليومية بنجاح 🎉",
    "rewards.alreadyClaimed": "تم الاستلام مسبقاً لهذا اليوم",

    // Deposit
    "deposit.title": "إيداع الأموال (شحن الرصيد)",
    "deposit.subtitle": "قم بشحن حسابك باستخدام عملة USDT عبر الشبكات المعتمدة",
    "deposit.network": "اختر شبكة التحويل",
    "deposit.address": "عنوان المحفظة للإيداع",
    "deposit.amount": "مبلغ الإيداع (USDT)",
    "deposit.txHash": "معرف العملية أو رقم الحوالة",
    "deposit.proof": "صورة إشعار التحويل",
    "deposit.uploadHint": "انقر لاختيار صورة إيصال التحويل أو اسحبها هنا",
    "deposit.submit": "تأكيد طلب الإيداع",
    "deposit.submitting": "جارٍ إرسال الطلب...",
    "deposit.minNotice": "الحد الأدنى للإيداع هو 10 دولارات.",
    "deposit.note": "تتم مراجعة عمليات الإيداع من قبل الإدارة وإضافة الرصيد في غضون دقائق معدودة.",
    "deposit.history": "سجل عمليات الإيداع",
    "deposit.copyAddress": "نسخ العنوان",
    "deposit.copied": "تم النسخ",
    "deposit.scanQr": "رمز الاستجابة السريعة",
    "deposit.notesTitle": "ملاحظات الإيداع",
    "deposit.aroundClock": "الإيداع متاح على مدار 24 ساعة يومياً.",
    "deposit.minAmount": "الحد الأدنى للإيداع هو 10 دولارات.",
    "deposit.afterSubmitNotice":
      "بعد الضغط على تقديم، سيتم إرسال طلب الإيداع للإدارة للتحقق والموافقة.",
    "deposit.changeScreenshot": "تغيير لقطة الشاشة",
    "deposit.removeScreenshot": "حذف الصورة",

    // Withdrawal
    "withdraw.title": "سحب الأرباح ورأس المال",
    "withdraw.subtitle": "اسحب أرباحك مباشرة إلى محفظتك الشخصية بدون أي رسوم مخفية",
    "withdraw.amount": "مبلغ السحب (USDT)",
    "withdraw.address": "عنوان محفظة السحب الرقمية",
    "withdraw.fee": "رسوم السحب",
    "withdraw.feeZero": "0.00 دولار (مجاناً)",
    "withdraw.receivable": "المبلغ الصافي الذي ستستلمه",
    "withdraw.submit": "تقديم طلب السحب",
    "withdraw.submitting": "جارٍ تقديم الطلب...",
    "withdraw.minNotice": "الحد الأدنى للسحب هو 5 دولارات.",
    "withdraw.instantNotice": "تتم معالجة السحوبات يومياً بسرعة وأمان.",
    "withdraw.history": "سجل عمليات السحب",
    "withdraw.selectNetwork": "اختر شبكة السحب",
    "withdraw.walletLocked": "مقفل ومحمي",
    "withdraw.bindingRequired": "مطلوب للربط",
    "withdraw.lockedDesc": "عنوانك مسجل ومقفل لحماية أموالك من أي محاولة تغيير غير مصرح بها.",
    "withdraw.unlockedDesc": "قم بإدخال عنوان محفظتك ثم اضغط (ربط) لحفظه بحسابك بصورة دائمة.",
    "withdraw.addressPlaceholder": "أدخل عنوان المحفظة (يبدأ بـ 0x أو T)",
    "withdraw.bindBtn": "ربط المحفظة",
    "withdraw.bindSuccess": "تم ربط وقفل عنوان السحب بحسابك بنجاح وحمايته من التغيير.",
    "withdraw.withdrawAll": "سحب الكل",
    "withdraw.requestedAmount": "المبلغ المطلوب سحبه",
    "withdraw.platformFee": "رسوم المنصة",
    "withdraw.importantNotes": "ملاحظات هامة",
    "withdraw.hoursNotice": "وقت السحب: يومياً من",
    "withdraw.recentHistory": "سجل السحوبات الأخيرة",
    "withdraw.noHistory": "لا توجد طلبات سحب سابقة.",
    "withdraw.viewAll": "عرض الكل",
    "withdraw.withdrawableBalance": "الرصيد القابل للسحب",

    // Account
    "account.title": "حسابي الشخصي",
    "account.subtitle": "إدارة الحساب، تفاصيل المحفظة، الأمان وإعدادات التطبيق",
    "account.profile": "الملف الشخصي",
    "account.security": "الأمان والحماية",
    "account.walletBind": "ربط عنوان المحفظة",
    "account.walletAddress": "عنوان USDT الخاص بك",
    "account.changePass": "تغيير كلمة المرور",
    "account.preferences": "التفضيلات والمظهر",
    "account.theme": "المظهر (ليلي / نهاري)",
    "account.language": "لغة التطبيق",
    "account.about": "عن شركة Valoriza",
    "account.support": "مركز الدعم والمساعدة",
    "account.logout": "تسجيل الخروج من الحساب",
    "account.memberSince": "تاريخ الانضمام",
    "account.trialPeriod": "فترة تجريبية",
    "account.recordsWithdrawals": "سجل السحوبات",
    "account.recordsDeposits": "سجل الإيداع",
    "account.recordsTransactions": "سجل المعاملات المالية",
    "account.recordsRewards": "سجل المكافآت",
    "account.newPassword": "كلمة المرور الجديدة",
    "account.confirmPassword": "تأكيد كلمة المرور الجديدة",
    "account.passwordMinLength": "كلمة المرور يجب أن لا تقل عن 6 أحرف",
    "account.passwordMismatch": "كلمتا المرور غير متطابقتين",
    "account.passwordChangedSuccess": "تم تغيير كلمة المرور بنجاح",
    "account.savePassword": "حفظ كلمة المرور",
    "account.saving": "جاري الحفظ...",
    "account.securityNoticeTitle": "حماية الحساب والأمان",
    "account.securityNoticeDesc":
      "احرص دائماً على عدم مشاركة بيانات تسجيل الدخول أو كلمة المرور مع أي طرف ثالث. جميع المعاملات مشفرة ومؤمنة بالكامل.",

    // Support
    "support.title": "خدمة العملاء والدعم الفني",
    "support.subtitle": "فريقنا متواجد على مدار الساعة لمساعدتك في أي استفسار",
    "support.liveChat": "المحادثة الفورية المباشرة",
    "support.telegram": "قناة تيليجرام الرسمية",
    "support.whatsapp": "دعم واتساب الفوري",
    "support.workingHours": "ساعات العمل: 24/7 دون توقف",
    "support.faqTitle": "الأسئلة الشائعة",
    "support.contactNow": "تواصل الآن",
    "support.officialChannels": "قنوات موثوقة ومعتمدة",
    "support.backToAccount": "العودة للحساب",
    "support.alwaysHere": "نحن هنا لمساعدتك دائماً",
    "support.securityNotice":
      "جميع القنوات الرسمية موثقة ومعتمدة من إدارة Valoriza، تجنب مشاركة بيانات المرور أو الرموز السرية مع أي شخص.",

    // Records
    "records.title": "سجل العمليات المالية",
    "records.statement": "كشف الحساب والعمليات",
    "records.tabTransactions": "المعاملات",
    "records.tabDeposits": "الإيداعات",
    "records.tabWithdrawals": "السحوبات",
    "records.tabRewards": "المكافآت",
    "records.emptyDeposits": "لا توجد أي عمليات إيداع مسجلة.",
    "records.emptyWithdrawals": "لا توجد أي عمليات سحب مسجلة.",
    "records.emptyTransactions": "لا توجد أي معاملات مالية حتى الآن.",
    "records.emptyRewards": "لا توجد أي مكافآت مسجلة حتى الآن.",
    "records.completed": "مكتمل ومؤكد",
    "records.rejected": "مرفوض",
    "records.pending": "قيد المراجعة",
    "records.transferred": "تم التحويل",
    "records.netReceived": "صافي المستلم",
    "records.fee": "الرسوم",
    "records.balanceAfter": "الرصيد بعد العملية",
    "records.adminNote": "ملاحظة الإدارة",

    // Admin
    "admin.title": "لوحة الإدارة المتقدمة",
    "admin.subtitle": "مراقبة وإدارة المنصة، طلبات الإيداع والسحب والمستخدمين",
    "admin.overview": "نظرة عامة",
    "admin.deposits": "طلبات الإيداع",
    "admin.withdrawals": "طلبات السحب",
    "admin.users": "المستخدمون",
    "admin.vip": "باقات VIP",
    "admin.tasks": "إدارة المهام",
    "admin.wheel": "عجلة الحظ",
    "admin.broadcast": "الإشعارات الجماعية",
    "admin.settings": "إعدادات المنصة",
    "admin.audit": "سجلات التدقيق",
    "admin.approve": "موافقة وقبول",
    "admin.reject": "رفض الطلب",
    "admin.pending": "قيد المراجعة",
    "admin.approved": "مقبول",
    "admin.rejected": "مرفوض",

    // Status
    "status.pending": "قيد المراجعة",
    "status.approved": "مكتمل ومقبول",
    "status.rejected": "مرفوض",
    "status.completed": "مكتمل",
    "status.active": "نشط",
    "status.expired": "منتهي",
    "status.not_started": "لم يبدأ بعد",

    "content.unavailable": "هذا المحتوى غير متاح باللغة المختارة.",
    "language.ar": "العربية",
    "language.en": "الإنجليزية",
    "language.fr": "الفرنسية",
    "language.es": "الإسبانية",
    "meta.title": "Valoriza — استثمر اليوم لبناء مستقبلك غداً",
    "meta.description": "منصة Valoriza للاستثمار: صناديق توفير، باقات VIP، مهام يومية ومكافآت الفريق.",
    "meta.ogTitle": "فالوريزا — استثمر اليوم لبناء مستقبلك غداً",
    "meta.ogDescription": "منصة استثمارية عالمية: فرص حقيقية لربح المال بأمان وسهولة.",
  },
  en: {} as Record<string, string>,
  fr: {} as Record<string, string>,
  es: {} as Record<string, string>,
};

const featureTranslations = {
  ar: {
    "public.wheel.noPrizesConfigured": "عجلة الحظ غير متاحة حاليًا لعدم إعداد الجوائز.",
    "admin.prizeType": "نوع الجائزة",
    "admin.passwordMinLength": "يجب ألا تقل كلمة المرور الجديدة عن 8 أحرف.",
    "admin.addVipPackage": "إضافة باقة VIP",
    "admin.deleteVipPackage": "حذف باقة VIP",
    "admin.deleteVipPackageConfirmation": "هل تريد حذف باقة VIP هذه؟ لا يمكن حذف باقة مرتبطة بمستخدمين.",
    "team.level1Rate": "عمولة 8% من شحن الفريق المباشر",
    "team.level2Rate": "عمولة 4% من شحن المستوى الثاني",
  },
  en: {
    "public.wheel.noPrizesConfigured": "The wheel is unavailable until prizes are configured.",
    "admin.prizeType": "Prize type",
    "admin.passwordMinLength": "The new password must be at least 8 characters.",
    "admin.addVipPackage": "Add VIP package",
    "admin.deleteVipPackage": "Delete VIP package",
    "admin.deleteVipPackageConfirmation": "Delete this VIP package? Packages assigned to users cannot be deleted.",
    "team.level1Rate": "8% commission on direct team deposits",
    "team.level2Rate": "4% commission on second-level deposits",
  },
  fr: {
    "public.wheel.noPrizesConfigured": "La roue n’est pas disponible tant que les prix ne sont pas configurés.",
    "admin.prizeType": "Type de récompense",
    "admin.passwordMinLength": "Le nouveau mot de passe doit contenir au moins 8 caractères.",
    "admin.addVipPackage": "Ajouter une formule VIP",
    "admin.deleteVipPackage": "Supprimer la formule VIP",
    "admin.deleteVipPackageConfirmation": "Supprimer cette formule VIP ? Les formules attribuées à des membres ne peuvent pas être supprimées.",
    "team.level1Rate": "Commission de 8 % sur les dépôts directs de l'équipe",
    "team.level2Rate": "Commission de 4 % sur les dépôts du deuxième niveau",
  },
  es: {
    "public.wheel.noPrizesConfigured": "La ruleta no está disponible hasta que se configuren los premios.",
    "admin.prizeType": "Tipo de premio",
    "admin.passwordMinLength": "La nueva contraseña debe tener al menos 8 caracteres.",
    "admin.addVipPackage": "Añadir paquete VIP",
    "admin.deleteVipPackage": "Eliminar paquete VIP",
    "admin.deleteVipPackageConfirmation": "¿Eliminar este paquete VIP? No se pueden eliminar paquetes asignados a usuarios.",
    "team.level1Rate": "Comisión del 8 % por depósitos del equipo directo",
    "team.level2Rate": "Comisión del 4 % por depósitos del segundo nivel",
  },
} as const;

const localeModules = [publicTranslations, pagesTranslations, adminTranslations] as const;
for (const lang of ["ar", "en", "fr", "es"] as const) {
  Object.assign(
    translations[lang],
    coreTranslations[lang],
    ...localeModules.map((module) => module[lang]),
    featureTranslations[lang],
  );
}

if (import.meta.env.DEV) {
  const allKeys = new Set(
    (["ar", "en", "fr", "es"] as const).flatMap((lang) =>
      Object.keys(translations[lang] as Record<string, string>),
    ),
  );
  for (const lang of ["ar", "en", "fr", "es"] as const) {
    const dictionary = translations[lang] as Record<string, string>;
    const missing = [...allKeys].filter((key) => dictionary[key] === undefined);
    if (missing.length) {
      throw new Error(`Missing ${lang} translations: ${missing.join(", ")}`);
    }
  }
}

export type TranslationKey = keyof typeof translations.ar | (string & {});

const ROUTE_METADATA: Record<string, { title: TranslationKey; description: TranslationKey }> = {
  "/": { title: "nav.home", description: "meta.description" },
  "/about": { title: "nav.about", description: "meta.description" },
  "/home": { title: "nav.home", description: "meta.description" },
  "/investment": { title: "investment.title", description: "investment.fundsDesc" },
  "/team": { title: "team.title", description: "team.subtitle" },
  "/tasks": { title: "tasks.title", description: "tasks.subtitle" },
  "/rewards": { title: "rewards.title", description: "rewards.subtitle" },
  "/account": { title: "account.title", description: "account.subtitle" },
  "/admin": { title: "admin.title", description: "admin.subtitle" },
  "/support": { title: "support.title", description: "support.subtitle" },
  "/deposit": { title: "deposit.title", description: "deposit.subtitle" },
  "/withdrawal": { title: "withdraw.title", description: "withdraw.subtitle" },
  "/records": { title: "records.title", description: "records.statement" },
};

interface I18nContextType {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: TranslationKey, fallback?: string, values?: Record<string, string | number>) => string;
  dir: "rtl" | "ltr";
  isRTL: boolean;
  currentLanguage: LanguageOption;
  languages: LanguageOption[];
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = "valoriza_language";

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === "ar" || value === "en" || value === "fr" || value === "es";
}

export function getStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") return "ar";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isLanguageCode(value) ? value : "ar";
  } catch {
    return "ar";
  }
}

function translate(
  lang: LanguageCode,
  key: TranslationKey,
  fallback?: string,
  values?: Record<string, string | number>,
): string {
  const value = (translations[lang] as Record<string, string>)[key];
  if (value === undefined) {
    if (import.meta.env.DEV) {
      throw new Error(`Missing translation for "${key}" in locale "${lang}"`);
    }
    return lang === "ar" ? fallback ?? key : key;
  }
  return value.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    values && name in values ? String(values[name]) : placeholder,
  );
}

/** Translates without requiring React context, using an explicit locale. */
export function translateForLanguage(
  lang: LanguageCode,
  key: TranslationKey,
  fallback?: string,
  values?: Record<string, string | number>,
): string {
  return translate(lang, key, fallback, values);
}

/** Translates with the currently persisted locale; safe outside LanguageProvider. */
export function translateFromStorage(
  key: TranslationKey,
  fallback?: string,
  values?: Record<string, string | number>,
): string {
  return translate(getStoredLanguage(), key, fallback, values);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(getStoredLanguage);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const currentLanguage = LANGUAGES.find((language) => language.code === lang)!;
  const dir = currentLanguage.dir;
  const isRTL = dir === "rtl";

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;

    const normalizedPath = pathname.replace(/\/+$/, "") || "/";
    const page = ROUTE_METADATA[normalizedPath] ?? ROUTE_METADATA["/"];
    const syncMetadata = () => {
      const pageTitle = translate(lang, page.title);
      const title = `${pageTitle} — Valoriza`;
      const description = translate(lang, page.description);
      if (document.title !== title) document.title = title;

      const setMetaContent = (selector: string, create: () => HTMLMetaElement, content: string) => {
        let meta = document.head.querySelector<HTMLMetaElement>(selector);
        if (!meta) {
          meta = create();
          document.head.appendChild(meta);
        }
        if (meta.content !== content) meta.content = content;
      };
      setMetaContent(
        'meta[name="description"]',
        () => {
          const meta = document.createElement("meta");
          meta.name = "description";
          return meta;
        },
        description,
      );
      setMetaContent(
        'meta[property="og:title"]',
        () => {
          const meta = document.createElement("meta");
          meta.setAttribute("property", "og:title");
          return meta;
        },
        title,
      );
      setMetaContent(
        'meta[property="og:description"]',
        () => {
          const meta = document.createElement("meta");
          meta.setAttribute("property", "og:description");
          return meta;
        },
        description,
      );
    };

    syncMetadata();
    const observer = new MutationObserver(syncMetadata);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["content"],
    });
    return () => observer.disconnect();
  }, [lang, dir, pathname]);

  const setLang = (newLang: LanguageCode) => {
    if (!isLanguageCode(newLang)) return;
    toast.dismiss();
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // ignore
    }
  };

  const t = (key: TranslationKey, fallback?: string, values?: Record<string, string | number>) =>
    translate(lang, key, fallback, values);

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang,
        t,
        dir,
        isRTL,
        currentLanguage,
        languages: LANGUAGES,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const fallbackT = (key: TranslationKey, fallback?: string, values?: Record<string, string | number>) =>
      translate("ar", key, fallback, values);
    return {
      lang: "ar" as LanguageCode,
      setLang: () => {},
      t: fallbackT,
      dir: "rtl" as const,
      isRTL: true,
      currentLanguage: LANGUAGES[0]!,
      languages: LANGUAGES,
    };
  }
  return ctx;
}
