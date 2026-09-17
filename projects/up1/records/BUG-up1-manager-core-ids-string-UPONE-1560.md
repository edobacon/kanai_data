---
id: BUG-up1-manager-core-ids-string-UPONE-1560
project: up1
type: bug
module: up1-manager
---

Se corrigieron los tipos de id a String en appRoles.resolver.js, appRoles.schema.graphql, objectRoles.resolver.js, ContextTreeCreateElement.vue, useObjectValidationFields.ts y useValidationParser.ts, alineando con el cambio de esquema de ids core de Int a String/ID. Este cambio de esquema fue el origen del bug MGR-fix (e820050) donde otras queries del mod seguian tipando ids como Int! y Apollo devolvia 400.

**sourceRef:** 9a31720 + logic/appRoles.resolver.js, appRoles.schema.graphql, objectRoles.resolver.js + ContextTreeCreateElement.vue.
