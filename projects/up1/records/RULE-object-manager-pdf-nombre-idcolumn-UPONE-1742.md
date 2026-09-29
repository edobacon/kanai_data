---
id: RULE-object-manager-pdf-nombre-idcolumn-UPONE-1742
project: up1
type: rule
module: object-manager
level: should
tags:
  - UPONE-1742
  - sp11
  - documentos
---

El nombre pasa de <callId>-<cuid>.pdf a <callId>-<idColumn>.pdf cuando el objeto raiz declara idColumn (UPONE-1750), y cae al instanceId cuando no lo declara (idColumn es opt-in). El valor se lee con listInstances + readField, no directo contra Prisma, para no reimplementar el mapeo objeto-modelo y respetar el RBAC de campo. resolveIdColumnValue nunca lanza: un problema al armar el nombre no debe tumbar una generacion exitosa.

sourceRef: dc43bb89 src/services/documents/documentService.js:224
