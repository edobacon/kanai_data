---
id: RULE-object-manager-findfirst-unico-nullable-UPONE-1882
project: up1
type: rule
module: object-manager
level: must
tags:
  - UPONE-1882
  - sp11
  - prisma
  - report-builder
---

Desde que el codegen emite las claves unicas nullable como @@index (decision NULLS NOT DISTINCT de UPONE-1882), Prisma ya no las reconoce como WhereUniqueInput y findUnique las rechaza. Todo lookup por ese campo debe usar findFirst. Se rompio y se corrigio con el mismo patron en tres lugares: core_User.clerkUserId y up1_document_template.callId en object-manager, y Report.code en report-builder.

sourceRef: f9778f2d src/graphql/resolvers/user.resolver.js:65 (object-manager), 0df82700 src/services/documents/documentService.js:69 (object-manager), 32e2501 logic/reportData.resolver.js:797 (report-builder)
