import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

async function run() {
  console.log("==================================================");
  console.log("🚀 تهيئة وربط حساب الأدمن الأساسي لمنصة Valoriza");
  console.log("==================================================");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@valoriza.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "AdminValoriza2026!";
  const adminUsername = "admin";
  const adminFullName = "مدير النظام الرئيسي (Super Admin)";

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let createdInSupabase = false;

  // 1. محاولة الإنشاء والربط في Supabase إذا كانت المتغيرات متوفرة
  if (supabaseUrl && serviceRoleKey && !supabaseUrl.includes("placeholder")) {
    try {
      console.log(`📡 جاري الاتصال بقاعدة بيانات Supabase: ${supabaseUrl}`);
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // البحث عن المستخدم أو إنشاؤه
      let adminId: string | null = null;
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const existing = userList?.users?.find(
        (u) => u.email?.toLowerCase() === adminEmail.toLowerCase(),
      );

      if (existing) {
        adminId = existing.id;
        console.log(
          `✅ تم العثور على حساب الأدمن مسبقاً (ID: ${adminId})، جاري تحديث كلمة المرور والصلاحيات...`,
        );
        await supabaseAdmin.auth.admin.updateUserById(adminId, {
          password: adminPassword,
          email_confirm: true,
          user_metadata: {
            username: adminUsername,
            full_name: adminFullName,
          },
        });
      } else {
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
          user_metadata: {
            username: adminUsername,
            full_name: adminFullName,
          },
        });

        if (createErr) {
          console.warn("⚠️ خطأ أثناء إنشاء المستخدم في Supabase Auth:", createErr.message);
        } else if (newUser?.user) {
          adminId = newUser.user.id;
          console.log(`✅ تم إنشاء حساب الأدمن في Supabase Auth بنجاح (ID: ${adminId})`);
        }
      }

      if (adminId) {
        // تحديث الملف الشخصي في profiles
        await supabaseAdmin.from("profiles").upsert({
          id: adminId,
          email: adminEmail,
          username: adminUsername,
          full_name: adminFullName,
          vip_level: 7,
          trial_active: false,
        });
        console.log("✅ تم تحديث ملف المدير (profiles) مع باقة VIP 7.");

        // إسناد رتبة الأدمن في user_roles
        await supabaseAdmin.from("user_roles").upsert(
          {
            user_id: adminId,
            role: "admin",
          },
          { onConflict: "user_id,role" },
        );
        console.log("👑 تم منح صلاحيات الأدمن الكاملة (user_roles).");

        // تهيئة محفظة الأدمن في wallets
        await supabaseAdmin.from("wallets").upsert({
          user_id: adminId,
          balance: 1000.0,
          total_earned: 0.0,
          invested_balance: 0.0,
          team_income: 0.0,
        });
        console.log("💰 تم ربط رصيد المحفظة الإدارية (wallets).");

        createdInSupabase = true;
      }
    } catch (err: any) {
      console.warn("⚠️ تعذر الاتصال بـ Supabase:", err?.message || err);
    }
  } else {
    console.log("ℹ️ لم يتم تحديد SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في البيئة الحالية.");
    console.log(
      "ℹ️ سيتم تفعيل حساب الأدمن في قاعدة البيانات المحلية (.data/valoriza_db.json) وتقديم ملف SQL.",
    );
  }

  // 2. تحديث وتثبيت الأدمن في قاعدة البيانات المحلية (.data/valoriza_db.json)
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
    console.log(
      "✅ تم حفظ وتأكيد بيانات الأدمن في قاعدة البيانات المحلية (.data/valoriza_db.json)",
    );
  } catch (localErr) {
    console.warn("خطأ في تحديث قاعدة البيانات المحلية:", localErr);
  }

  console.log("\n==================================================");
  console.log("🎉 بيانات حساب الأدمن الأساسي (Super Admin) الجاهز للاستخدام:");
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
