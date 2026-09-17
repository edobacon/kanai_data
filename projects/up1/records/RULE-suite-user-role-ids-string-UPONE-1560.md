---
id: RULE-suite-user-role-ids-string-UPONE-1560
project: up1
type: rule
module: suite
---

currentUserId (useRoleSelection), ownerId de Layout (ObjectNavBar) y los campos roleId/modRoleId/updatedById de up1_suite_app y up1_suite_app_role pasan de number/integer a string, alineando el tipo del frontend y del schema con como viajan los ids realmente (Clerk/DB ids no numericos).

**sourceRef:** 16e4091 + composables/useRoleSelection.ts:12 + objects/up1_suite_app_role.json:26,35.
