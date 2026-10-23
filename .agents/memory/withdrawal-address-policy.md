---
name: Withdrawal address reuse
description: A customer binds the withdrawal destination once and reuses it across future withdrawals and sessions.
---

The user requires: «يتربط مرة واحدة و نستعمل نفس العنوان في كل السحوبات القادمة».

**Why:** Customers were being asked to bind their withdrawal address again for subsequent requests.

**How to apply:** Persist the address and network on the account, restore them after navigation and sign-in, and derive withdrawal destinations from the saved binding rather than requiring repeated entry. Repeated binding of the same destination is safe; a locked destination must not be silently replaced by a later request.
