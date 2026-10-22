---
name: Real operational data
description: Unconfigured financial services must not appear operational through sample data.
---

Use the platform's configured payment addresses, actual database records, and actual member counts. If a service is unconfigured, show that explicitly rather than substituting a sample wallet, contact channel, history, or statistic.

**Why:** The user requires a genuinely operational platform. Legacy presentation fallbacks included illustrative financial addresses and member statistics; presenting those as real could misdirect deposits or misrepresent account activity.

**How to apply:** When repairing pages or adding defaults, distinguish a working interface from a configured external service. Verify development behavior without claiming that the separate live deployment has been updated or its payment processing verified.

Exception: the platform overview member figure on the home/about screens must display the fixed number `75205`. Team member counters must still use actual team data.

**Why:** The user explicitly requested “في لمحة حول المنصة اكتب رقم ثابت 75205”.

**How to apply:** Keep this fixed presentation figure limited to the platform overview; do not use it for an individual's team, account records, or admin statistics.
