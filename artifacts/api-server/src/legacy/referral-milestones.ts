import type { PoolClient } from "pg";
import { query } from "./db.js";

export const REFERRAL_MILESTONES = [
  { threshold: 3, amount: 1, type: "cash" },
  { threshold: 6, amount: 1.5, type: "cash" },
  { threshold: 10, amount: 2, type: "cash" },
  { threshold: 25, amount: 5, type: "cash" },
  { threshold: 50, amount: 12, type: "cash" },
  { threshold: 100, amount: 25, type: "cash" },
  { threshold: 250, amount: null, type: "vip" },
] as const;

type CreditBalance = (
  client: PoolClient,
  userId: string,
  amount: number,
  type: string,
  description: string,
  referenceId: string,
) => Promise<number>;

// A member qualifies once a directly invited account has purchased a VIP
// package or received an admin VIP grant. Counting activation cumulatively
// means an expired or later downgraded plan cannot revoke earned milestones.
export async function qualifiedReferralCount(client: PoolClient, userId: string) {
  const result = await client.query<{ total: number }>(
    `SELECT count(*)::int AS total FROM referrals r
     WHERE r.referrer_id=$1 AND r.level=1
       AND (
         EXISTS (SELECT 1 FROM user_vip v WHERE v.user_id=r.referred_id)
         OR EXISTS (SELECT 1 FROM vip_admin_activations a WHERE a.user_id=r.referred_id)
       )`,
    [userId],
  );
  return result.rows[0]?.total ?? 0;
}

export async function evaluateReferralMilestones(
  client: PoolClient,
  userId: string,
  creditBalance: CreditBalance,
): Promise<number> {
  // Serializes concurrent purchases for invitees of the same referrer.
  const owner = await client.query(
    `SELECT p.id FROM profiles p WHERE p.id=$1 AND NOT p.is_blocked
       AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=p.id AND ur.role='admin')
     FOR UPDATE OF p`,
    [userId],
  );
  if (!owner.rowCount) return 0;

  const count = await qualifiedReferralCount(client, userId);
  let upgraded = false;
  for (const milestone of REFERRAL_MILESTONES) {
    if (count < milestone.threshold) break;

    if (milestone.type === "cash") {
      const award = await client.query<{ id: string }>(
        `INSERT INTO referral_milestone_awards (user_id,threshold,reward_amount)
         VALUES ($1,$2,$3) ON CONFLICT (user_id,threshold) DO NOTHING RETURNING id`,
        [userId, milestone.threshold, milestone.amount],
      );
      if (!award.rowCount) continue;
      const description = `مكافأة دعوة ${milestone.threshold} أعضاء مؤهلين`;
      await client.query(
        "INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
        [userId],
      );
      await creditBalance(
        client,
        userId,
        milestone.amount,
        "referral_milestone",
        description,
        award.rows[0].id,
      );
      await client.query(
        `INSERT INTO rewards (user_id,source,amount,description_ar,reference_id)
         VALUES ($1,'referral_milestone',$2,$3,$4)`,
        [userId, milestone.amount, description, award.rows[0].id],
      );
    } else {
      const profile = await client.query<{ vip_level: number; vip_expires_at: Date | null }>(
        "SELECT vip_level,vip_expires_at FROM profiles WHERE id=$1",
        [userId],
      );
      const currentExpiry = profile.rows[0]?.vip_expires_at;
      const currentLevel = Number(profile.rows[0].vip_level);
      const hasIndefiniteVip = currentLevel > 0 && currentExpiry == null;
      const activeTerm = currentExpiry != null && new Date(currentExpiry).getTime() > Date.now();
      const nextLevel = currentLevel + 1;
      const plan = await client.query<{ id: string; duration_days: number }>(
        "SELECT id,duration_days FROM vip_packages WHERE level=$1 AND is_active=true",
        [nextLevel],
      );
      // Do not mark the milestone granted if no usable next VIP tier exists yet.
      if (!plan.rowCount) continue;
      const award = await client.query<{ id: string }>(
        `INSERT INTO referral_milestone_awards (user_id,threshold,vip_level_granted)
         VALUES ($1,$2,$3) ON CONFLICT (user_id,threshold) DO NOTHING RETURNING id`,
        [userId, milestone.threshold, nextLevel],
      );
      if (!award.rowCount) continue;
      const packageExpiry = new Date(Date.now() + plan.rows[0].duration_days * 86400000);
      // Keep an administrator's indefinite VIP indefinite. user_vip requires
      // an expiry, so its plan term ends without shortening the profile grant.
      const profileExpiry = hasIndefiniteVip ? null : activeTerm ? currentExpiry : packageExpiry;
      await client.query(
        "INSERT INTO user_vip (user_id,vip_package_id,expires_at) VALUES ($1,$2,$3)",
        [userId, plan.rows[0].id, profileExpiry ?? packageExpiry],
      );
      await client.query(
        "UPDATE profiles SET vip_level=$1,vip_expires_at=$2,updated_at=now() WHERE id=$3",
        [nextLevel, profileExpiry, userId],
      );
      await client.query(
        `INSERT INTO rewards (user_id,source,amount,description_ar,reference_id)
         VALUES ($1,'vip_upgrade',0,$2,$3)`,
        [userId, `ترقية VIP إلى المستوى ${nextLevel} لمكافأة 250 عضوًا مؤهلًا`, award.rows[0].id],
      );
      upgraded = true;
    }
  }
  if (upgraded) {
    const parent = await client.query<{ referrer_id: string }>(
      "SELECT referrer_id FROM referrals WHERE referred_id=$1 AND level=1",
      [userId],
    );
    if (parent.rows[0]) {
      await evaluateReferralMilestones(client, parent.rows[0].referrer_id, creditBalance);
    }
  }
  return count;
}

export async function getReferralMilestones(userId: string, qualifiedMembers: number) {
  const result = await query<{ threshold: number }>(
    "SELECT threshold FROM referral_milestone_awards WHERE user_id=$1",
    [userId],
  );
  const awarded = new Set(result.rows.map((row) => row.threshold));
  return REFERRAL_MILESTONES.map((milestone) => ({
    threshold: milestone.threshold,
    amount: milestone.amount,
    type: milestone.type,
    awarded: awarded.has(milestone.threshold),
    achieved: qualifiedMembers >= milestone.threshold,
  }));
}