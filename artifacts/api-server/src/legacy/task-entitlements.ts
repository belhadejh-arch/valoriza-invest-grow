export type TaskProfile = {
  vip_level: number;
  vip_expires_at: Date | null;
  trial_active: boolean;
  trial_expires_at: Date | null;
  task_reward: string | null;
  daily_tasks: number | null;
};

export function taskEntitlement(profile: TaskProfile | undefined) {
  const now = Date.now();
  const level = Number(profile?.vip_level ?? 0);
  // Admin-granted VIP has no expiry; paid VIP must still be in its term.
  const vipActive =
    level > 0 &&
    profile?.task_reward != null &&
    (profile.vip_expires_at == null || new Date(profile.vip_expires_at).getTime() > now);
  const trialActive =
    !vipActive &&
    Boolean(profile?.trial_active) &&
    profile?.trial_expires_at != null &&
    new Date(profile.trial_expires_at).getTime() > now;

  return {
    vipLevel: vipActive ? level : 0,
    isTrial: trialActive,
    reward: vipActive ? Number(profile.task_reward) : trialActive ? 0.5 : 0,
    limit: vipActive ? Number(profile.daily_tasks ?? 0) : trialActive ? 3 : 0,
  };
}