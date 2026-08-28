---
id: BUG-platform-024
project: up1
type: bug
module: platform
tags:
  - object-manager
  - prisma
  - codegen
  - startup
  - docker
  - multi-tenant
---

# La imagen de object-manager no reconstruia el schema Prisma de todos los tenants; el pase BASEMODEL antes de `prisma generate` faltaba en el startup

## Symptom

Un tenant podia correr en produccion con un cliente Prisma generado desde un `prisma/<tenant>/schema.prisma` **desactualizado** (el snapshot commiteado en git), aunque el codegen de otro tenant si se hubiera ejecutado. Caso concreto citado en el propio fix: la imagen llego a servir un cliente para CONTINENTAL que seguia declarando `Scenario.termId`, campo ya retirado por UPONE-1523.

## Expected behavior

La imagen de object-manager deberia reconstruir el schema Prisma de todos los tenants desplegados en cada build/arranque, respetando el orden BASEMODEL antes de `prisma generate`, para que ningun tenant sirva un cliente Prisma con campos ya retirados.

## Root cause

File: `object-manager/Dockerfile` (stage de build)
Cause: el codegen sin argumento de tenant (`npm run codegen`) solo regenera **BASEMODEL** (`!tenantId` se trata como BASEMODEL internamente); sin un loop explicito sobre `prisma/*/schema.prisma`, cada schema por-tenant quedaba en lo que estuviera commiteado en git, y el stage de build de la imagen generaba el cliente Prisma a partir de ese archivo stale.

File: `object-manager/src/services/applyChanges.js`
Cause secundaria: el pipeline de arranque (`runPendingPipeline`) no incluia un pase de regeneracion de BASEMODEL antes de correr `prisma generate` para el resto de los tenants, incumpliendo el orden que el propio CLAUDE.md del proyecto ya documentaba ("BASEMODEL codegen antes de prisma generate"), y el loop de startup solo reconstruia el schema del tenant actual, no de todos los tenants desplegados.

## Fix

Dockerfile: se agrega un loop de build que recorre `./prisma/*/schema.prisma` (excluyendo `BASEMODEL` y `placeholderTenantID`) y corre `generatePrismaSchema.js "$dir" --skip-shared --schema-only` por cada tenant, regenerando el schema real antes de que el stage de build genere los clientes. Comentario del propio Dockerfile documenta el porque (`RUN for schema in ./prisma/*/schema.prisma; do ...`).

`applyChanges.js`: se agrega un pase explicito de BASEMODEL (codegen + `prisma generate` contra `prisma/BASEMODEL/schema.prisma`) antes del loop de startup sobre tenants (`runPendingPipeline`, alrededor de la linea 347-364), y el loop de startup pasa a iterar sobre todos los tenants resueltos (`resolveDeployedTenants`), no solo el actual.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Build de imagen | Cada `prisma/<tenant>/schema.prisma` quedaba en el snapshot commiteado en git | Se regenera por tenant en el stage de build, `--schema-only` (sin BD requerida) |
| Startup del pod | BASEMODEL no se recontruia antes de `prisma generate`; solo el tenant actual se reconstruia | BASEMODEL se regenera primero; el loop de startup cubre todos los tenants desplegados |
| Riesgo eliminado | Un tenant podia servir un cliente Prisma con campos ya retirados en el schema de origen (caso CONTINENTAL / `Scenario.termId`) | El cliente en runtime queda alineado con el schema real del objeto |

## Reproduction

### Steps
1. Retirar un campo de un objeto compartido entre tenants (ej. `Scenario.termId`).
2. Construir la imagen de object-manager sin regenerar el schema por-tenant.
3. Desplegar y verificar que el tenant sigue sirviendo un cliente Prisma que declara el campo ya retirado.
