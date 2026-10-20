---
name: Team milestone rewards
description: Confirmed wallet payouts and VIP promotion behavior for team milestones.
---

Each cash milestone pays its listed amount once: 3 members = $1, 6 = $1.50, 10 = $2, 25 = $5, 50 = $12, and 100 = $25. At 250 qualifying VIP members, grant the next available VIP level. Existing teams that already meet a threshold are eligible for a one-time backfill.

**Why:** The user explicitly approved automatic wallet credit, automatic promotion to the next VIP level at 250, and a one-time payout for milestones already reached before activation.

**How to apply:** Keep milestone claims idempotent and cash ledger/wallet updates atomic. Do not change payout values, eligibility, or backfill behavior without checking with the user.
