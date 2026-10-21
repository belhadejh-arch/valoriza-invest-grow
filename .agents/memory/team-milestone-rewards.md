---
name: Team milestone rewards
description: Confirmed wallet payouts and VIP promotion behavior for team milestones.
---

Each cash milestone pays its listed amount once: 3 members = $1, 6 = $1.50, 10 = $2, 25 = $5, 50 = $12, and 100 = $25. At 250 qualifying VIP members, grant the next available VIP level. Existing teams that already meet a threshold are eligible for a one-time backfill.

**Why:** The user explicitly approved automatic wallet credit, automatic promotion to the next VIP level at 250, and a one-time payout for milestones already reached before activation.

**How to apply:** Keep milestone claims idempotent and cash ledger/wallet updates atomic. Do not change payout values, eligibility, or backfill behavior without checking with the user.

The rewards page counts direct invitees with activated, unexpired VIP1–VIP7 membership; indirect referrals and trial-only accounts do not qualify for these milestones.

**Why:** The user requested the supplied rewards design, whose heading explicitly identifies direct invitees who activated VIP.

**How to apply:** Keep the displayed progress and the server's milestone payout eligibility consistent. The admin's total-team VIP counter can include all three referral levels.
