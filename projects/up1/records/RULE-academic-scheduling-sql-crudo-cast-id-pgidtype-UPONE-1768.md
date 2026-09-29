---
id: RULE-academic-scheduling-sql-crudo-cast-id-pgidtype-UPONE-1768
project: up1
type: rule
module: academic-scheduling
level: must
tags:
  - UPONE-1768
  - UPONE-1560
  - sp11
  - uuid-migration
  - sql
---

Desde la fase 2 de UPONE-1560 los ids son uuidv7 nativo en tenants migrados (Continental) y siguen siendo texto cuid en los no migrados. Prisma tipa los binds de $queryRawUnsafe/$executeRawUnsafe como text, asi que un WHERE id = $1 crudo falla con 42883 (operator does not exist: uuid = text) en un tenant migrado. pgIdType.js resuelve el tipo real de la columna con pg_attribute una vez por cliente Prisma, lo cachea en un WeakMap y devuelve el cast (::uuid o ::text) a agregar a cada bind de id.

sourceRef: c5228fd logic/schedule/pgIdType.js:22, logic/schedule/breRanker.js (cohortWhereSql, cohortRowsSql)
