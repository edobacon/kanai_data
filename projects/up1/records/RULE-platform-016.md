---
id: RULE-platform-016
project: up1
type: rule
module: platform
tags:
  - object-manager
  - codegen
  - common-field
  - stale-schema
  - incremental-sync
  - regen
  - reset-tenant
  - plat-12
---

# Un common field nuevo NO se propaga a business objects existentes via sync incremental — requiere regen completo

## What

Agregar un campo a `objects/business/common.json` (common field, ej. `updatedById` de PLAT-12) NO lo materializa como columna en los business objects YA existentes mediante un `sync` / `codegen` incremental. El codegen mergea sobre el `schema.prisma` existente y **preserva los cuerpos de modelos ya presentes** (insertion-point), asi que el common field nuevo solo lo reciben: (a) objetos nuevos, (b) los tenant-Base (cuyo schema de tenant se regenera fresco), y (c) cualquier objeto tras un **regen/reset completo** (`tenant:create --recreate`), que reconstruye el schema desde cero. Consecuencia del gap: un resolver que inyecta el common field de forma incondicional (como `auditUpdatedBy` de PLAT-12 en create/update) rompe con `Unknown argument <campo>` / friendly "Valor invalido — <Campo>" en TODO business object existente cuya tabla no recibio la columna.

## Why

TICKET-079: tras mergear develop (PLAT-12 / UPONE-1194) en la rama UPONE-1261, editar un Curriculum fallaba con "Valor invalido — UpdatedById". `updatedById` estaba en `common.json` y el resolver lo inyectaba en todo write autenticado, pero `grep -c updatedById` daba 17 en `prisma/UPU/schema.prisma` (solo tenant-Base) y **0 en BASEMODEL** (ningun business object). Re-correr `codegen --schema-only` NO lo agregaba (preservaba los cuerpos viejos). Solo `tenant:create --recreate` (regen limpio) lo materializo: UPU 17->70, BASEMODEL 0->53, columna fisica `updatedById integer` en `uplanner_upu.Curriculum`. No habia bug de codigo, mod ni seed — era schema local stale. Hipotesis previas (gap del codegen, declarar la property en el mod, escalar a PLAT-12) quedaron descartadas: declarar la property habria registrado el campo en `core_FieldDefinition` (editable/settable por cliente), divergiendo del diseno system-managed (el common field se emite como columna escalar sin FieldDefinition, mismo rail que `createdAt`/`updatedAt`).

## Where

object-manager/ — `src/services/codegen/generatePrismaSchema.js` (`generateBaseModel` emite los common fields; el ensamblado del schema mergea sobre el archivo existente preservando cuerpos). Afecta a todos los business objects de `objects/business/Base/*` y a los mods que los editan via el resolver generico (curriculum-design: Curriculum, AcademicProgram, Offering, CurricularSection, etc.). Propagacion (DET-16): cada tenant local (demos, ucpln, uceng, ucasmt) y cada entorno (staging/prod) necesita su propio regen/reset completo al desplegar un common field nuevo.

## When

Siempre que se agregue o cambie un campo en `objects/business/common.json` (o cualquier mecanismo de common/audit field), y mas aun si un resolver lo inyecta incondicionalmente. NO confiar en `npm run sync` / `npm run codegen` incremental para propagarlo a objetos existentes: ejecutar un regen completo por tenant (`tenant:create --recreate`, que ademas exige `pgvector` disponible en el Postgres destino) y verificar la columna fisica antes de dar por propagado el cambio. Relacionada con [[rule-platform-015]] (tras el regen, el object-manager requiere cold restart para servir el schema nuevo).

## Verification

`grep -c "<campo>" object-manager/prisma/BASEMODEL/schema.prisma` y `.../prisma/<TENANT>/schema.prisma` → debe cubrir los business objects esperados (no solo los tenant-Base). En la DB: `psql -d uplanner_<tenant> -c "select count(distinct table_name) from information_schema.columns where column_name='<campo>';"`. Smoke del resolver: editar un business object existente por la UI/mutation no debe arrojar "Valor invalido — <Campo>".

## Source

- **Discovered in**: TICKET-079
