---
name: Admin multi-device sessions
description: The administrator must be able to stay signed in on four devices at once.
---

The user requires the administrator account to work simultaneously on at least four devices. Logging in or out on one device must not invalidate other devices' sessions.

**Why:** The user explicitly said the administrator account must keep working even when open on four devices.

**How to apply:** Do not enforce a one-session-per-user policy. Verify that four separately issued sessions can use protected admin routes concurrently and that logging out one token leaves the others valid. Password recovery or credential changes may still revoke sessions as documented.
