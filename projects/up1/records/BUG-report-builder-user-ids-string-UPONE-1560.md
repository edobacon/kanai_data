---
id: BUG-report-builder-user-ids-string-UPONE-1560
project: up1
type: bug
module: report-builder
---

createdById/updatedById de Report se tipaban como enteros (Int en el schema GraphQL, integer en objects/Report.json, comparacion via Number.parseInt en reportVisibility.js) mientras el resto del sistema maneja el id de usuario como string. Fix: (1) normalizeUserId en logic/reportVisibility.js normaliza a string (o null), y resolveCurrentUserRoleNames dejo de exigir un entero valido; (2) el schema (reportData.schema.graphql) y objects/Report.json tipan createdById/updatedById como ID/string.

**sourceRef:** fee7231 logic/reportVisibility.js:24-25, :83, objects/Report.json:120-122; a4cde22 logic/reportData.schema.graphql:62-63, :222-223.
