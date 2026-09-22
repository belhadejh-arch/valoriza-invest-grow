import "dotenv/config";
import fs from "fs";
import path from "path";
import { runMigrations } from "../backend/src/migrate.js";
import { seedDatabase } from "../backend/src/seed.js";
import { closeDb } from "../backend/src/db.js";

async function run() {
  console.log("==================================================");
  console.log("🚀 تهيئة وربط حساب الأدمن الأساسي لمنصة Valoriza");
  console.log("==================================================");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@valoriza.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "AdminValoriza2026!";
  const adminUsername = "admin";

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (dbUrl) {
    console.log("📡 الاتصال بقاعدة بيانات PostgreSQL الرئيسية...");
    try {
      console.log("1️⃣ فحص وتطبيق جداول قاعدة البيانات (Migrations)...");
      await runMigrations();
      console.log("✅ تم تطبيق جداول قاعدة البيانات بنجاح.");

      console.log("2️⃣ إنشاء وتأكيد حساب الأدمن وصناديق الاستثمار وباقات VIP...");
      await seedDatabase({ adminEmail, adminPassword });
      console.log("✅ تم ربط وتفعيل حساب الأدمن في قاعدة بيانات PostgreSQL بنجاح!");
      await closeDb();
    } catch (dbErr: any) {
      console.warn("⚠️ تنبيه أثناء الاتصال بقاعدة البيانات:", dbErr?.message || dbErr);
    }
  } else {
    console.log("ℹ️ لم يتم تحديد DATABASE_URL أو POSTGRES_URL في البيئة الحالية.");
    console.log("ℹ️ يمكنك تحديد DATABASE_URL لربطه تلقائياً بقاعدة بيانات Render PostgreSQL.");
  }

  // تحديث وتثبيت الأدمن في النسخة الاحتياطية المحلية (.data/valoriza_db.json)
  try {
    const dataDir = path.resolve(process.cwd(), ".data");
    const storePath = path.join(dataDir, "valoriza_db.json");

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    let dbData: any = {};
    if (fs.existsSync(storePath)) {
      try {
        dbData = JSON.parse(fs.readFileSync(storePath, "utf-8"));
      } catch (parseErr) {
        console.warn("Could not parse existing DB, initializing new:", parseErr);
      }
    }

    if (!dbData.wallets) dbData.wallets = {};
    if (!dbData.userVips) dbData.userVips = {};

    const localAdminId = "admin-primary-001";
    dbData.wallets[localAdminId] = {
      userId: localAdminId,
      balance: 1000.0,
      totalDeposited: 1000.0,
      totalWithdrawn: 0.0,
      totalEarned: 0.0,
      investedBalance: 0.0,
      teamIncome: 0.0,
    };

    dbData.userVips[localAdminId] = {
      userId: localAdminId,
      vipLevel: 7,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      status: "active",
    };

    fs.writeFileSync(storePath, JSON.stringify(dbData, null, 2), "utf-8");
  } catch (localErr) {
    // Ignore local store error
  }

  console.log("\n==================================================");
  console.log("🎉 بيانات حساب الأدمن الأساسي (Super Admin) لمنصة Valoriza:");
  console.log(`📧 البريد الإلكتروني:  ${adminEmail}`);
  console.log(`🔑 كلمة المرور:       ${adminPassword}`);
  console.log(`👤 اسم المستخدم:      ${adminUsername}`);
  console.log(`👑 الصلاحية:          مدير النظام الكامل (Full Super Admin)`);
  console.log(`⭐ مستوى VIP:         VIP 7 (أعلى مستوى)`);
  console.log(`🔗 مسار لوحة التحكم:  /admin`);
  console.log("==================================================");
}

run().catch((err) => {
  console.error("خطأ عام:", err);
  process.exit(1);
});
