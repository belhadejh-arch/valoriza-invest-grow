---
name: Legacy account repair on authenticated requests
description: Why the authenticated API retains a low-cost repair path for missing financial rows.
---

Keep a repair path for existing users whose wallet or wheel-chance rows may be missing, even while reducing the work performed per authenticated request. Do not remove the repair solely because new registrations create the required rows.

**Why:** Development was empty during performance work, and the separately hosted live database was not inspected or migrated. Removing repair based on fresh-account tests would risk breaking older accounts after deployment. A combined database round trip is a safer interim optimization.

**How to apply:** Only retire request-time repair after verifying the target live database has been backfilled and that all account-creation paths enforce the required rows. Keep production-data checks read-only unless migration has been explicitly authorized.