---
name: Arabic-only authored content
description: How to handle platform content that lacks translated database variants
---

When switching the Valoriza interface to a non-Arabic language, do not silently fall back to Arabic for administrator-authored database copy. Show an explicit unavailable-in-this-language message until a translated variant is supplied. Keep actual identifiers, amounts, technical codes, and user names visible regardless of locale.

**Why:** Most authored platform content is stored only in Arabic, and silent fallbacks recreate the mixed-language interface the user specifically asked to eliminate. Inventing translations at display time would misrepresent financial and support content.

**How to apply:** For new authored content or admin editors, add explicit language variants and select the active variant. Do not mistake an absence of mixed-language text for completed translation of the underlying records.