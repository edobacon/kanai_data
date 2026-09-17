---
id: BUG-uengagement-up1-createserviceoffering-maxcapacity-int-UPONE-1560
project: up1
type: bug
module: uengagement-up1
---

Un campo de layout declarado number es normalizado por core a elemento de texto, asi que formData produce string y el customEndpoint lo reenvia sin castear; con el argumento tipado Int, Apollo rechazaba la coercion antes del resolver (400 sin mensaje). El resolver ya casteaba con Number(), solo faltaba ajustar el tipo del schema.

**sourceRef:** 98ab676 + logic (schema.graphql de createServiceOffering).
