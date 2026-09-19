import { supabaseAdmin } from "../src/integrations/supabase/client.server";

async function main() {
  console.log("Creating/Verifying accounts in Supabase...");

  const adminEmail = "admin@valoriza.com";
  const adminPassword = "AdminValoriza2025!";
  const userEmail = "user@valoriza.com";
  const userPassword = "UserValoriza2025!";

  // 1. Check or Create Admin Account
  try {
    const { data: adminUser, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        username: "admin",
        full_name: "مدير النظام الرئيسي",
      },
    });

    let adminId = adminUser?.user?.id;
    if (adminErr) {
      console.log("Admin user creation result:", adminErr.message);
      // Retrieve existing
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const existingAdmin = users?.users?.find((u) => u.email === adminEmail);
      if (existingAdmin) {
        adminId = existingAdmin.id;
        // Update password to ensure it matches
        await supabaseAdmin.auth.admin.updateUserById(adminId, {
          password: adminPassword,
          email_confirm: true,
        });
        console.log("Updated existing admin user password.");
      }
    } else {
      console.log("Admin account created successfully:", adminId);
    }

    if (adminId) {
      // Upsert profile
      await supabaseAdmin.from("profiles").upsert({
        id: adminId,
        email: adminEmail,
        username: "admin",
        full_name: "مدير النظام الرئيسي",
        vip_level: 7,
      });

      // Grant admin role
      await supabaseAdmin.from("user_roles").upsert({
        user_id: adminId,
        role: "admin",
      });
      console.log("Admin profile and role granted.");
    }
  } catch (err) {
    console.error("Error setting up admin account:", err);
  }

  // 2. Check or Create Regular User Account
  try {
    const { data: regularUser, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        username: "user_valoriza",
        full_name: "مستخدم تجريبي",
      },
    });

    let userId = regularUser?.user?.id;
    if (userErr) {
      console.log("Regular user creation result:", userErr.message);
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users?.users?.find((u) => u.email === userEmail);
      if (existingUser) {
        userId = existingUser.id;
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: userPassword,
          email_confirm: true,
        });
        console.log("Updated existing regular user password.");
      }
    } else {
      console.log("Regular user created successfully:", userId);
    }

    if (userId) {
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email: userEmail,
        username: "user_valoriza",
        full_name: "مستخدم تجريبي",
        vip_level: 1,
      });
      console.log("Regular user profile upserted.");
    }
  } catch (err) {
    console.error("Error setting up regular account:", err);
  }

  console.log("\n==========================================");
  console.log("ACCOUNTS READY:");
  console.log("Admin Email:", adminEmail);
  console.log("Admin Password:", adminPassword);
  console.log("User Email:", userEmail);
  console.log("User Password:", userPassword);
  console.log("==========================================");
}

main().catch(console.error);
