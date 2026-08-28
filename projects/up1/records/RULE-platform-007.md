---
id: RULE-platform-007
project: up1
type: rule
module: platform
tags:
  - codegen
  - prisma
  - relations
  - versioning
  - convention
---

# Relaciones FK se consumen en lowercase (codegen `replace(/Id$/,'').toLowerCase()`)

## What

El codegen genera el nombre de la **relación singular de un FK** como `fkField.replace(/Id$/, '').toLowerCase()` (`generatePrismaSchema.js:381`). Por lo tanto, al consumir esa relación vía Prisma `include` / `select` / acceso a propiedad, **se usa el nombre en minúsculas**, NO camelCase:

| FK field | Relación generada (correcta) | Incorrecta (rompe en runtime) |
|----------|------------------------------|-------------------------------|
| `currentStatusId` | `currentstatus` | ~~`currentStatus`~~ |
| `previousVersionId` | `previousversion` | ~~`previousVersion`~~ |
| `sourceSectionId` / `targetSectionId` | `sourcesection` / `targetsection` | ~~`sourceSection`~~ |
| `initialStatusId` | `initialstatus` | ~~`initialStatus`~~ |
| `workflowId`, `categoryId`, `parentId` (single-word) | `workflow`, `category`, `parent` | (idéntico — no aplica) |

Single-word FKs no se ven afectados (lowercase == la palabra). Solo los **multi-palabra** se "manglean" a all-lowercase (~28 relaciones por tenant).

## Why

Usar el casing equivocado (camelCase) en un `include` tira `Unknown field 'currentStatus' for include statement on model 'X'` **en runtime contra DB real**, ANTES de cualquier validación. Los unit tests con Prisma **mockeado NO lo detectan** (no validan nombres de campo del include) → el bug queda latente hasta el E2E vivo. Caso real: `version-from-source.js` (UPONE-1209) usaba `currentStatus` (camelCase) y crear-v2 de Activity **nunca funcionó contra DB real** hasta UPONE-1214 S7.

El comportamiento lowercase **no es idiomático** (Prisma convención = camelCase) pero es **consistente y ya es la convención de facto del codebase**: `getInitialStatus.js` (mod + synced) consume `initialstatus` (lowercase) correctamente. Normalizarlo a camelCase sería transversal (codegen + 28 relaciones × tenants + todos los consumers + regeneración) sin beneficio funcional → housekeeping opcional/cosmético, no urgente. Mientras el codegen lowercasee, **se consume lowercase**.

## Where

- `object-manager/src/graphql/resolvers/**` (resolvers + helpers que hacen `include`/`select`/acceso a relaciones)
- `mods/*/logic/**` (resolvers de mods)
- Cualquier código que use el Prisma client generado y acceda relaciones FK por nombre

**Referencias canónicas (consumo correcto)**: `getInitialStatus.js` (`initialstatus`), `version-from-source.js` (`currentstatus`, corregido en UPONE-1214 S7).

## When

Aplica **siempre** que se consuma una relación FK por nombre (include/select/property). Heurística rápida: si el FK es multi-palabra (`xxxYyyId`), la relación es `xxxyyy` (todo minúsculas), no `xxxYyy`. Ante la duda, verificar el nombre real en el `@relation` del `schema.prisma` generado del tenant — no asumir camelCase.

## Cómo verificar

- `grep '@relation' prisma/{tenant}/schema.prisma` para ver el nombre real de la relación.
- Un `include` con casing equivocado solo se cacha contra DB real (E2E vivo), no con mocks → para features que tocan relaciones, correr E2E vivo, no solo unit con prisma mockeado.

## Origen

Promovida desde el learn L6 de TICKET-043 (UPONE-1214). Bug preexistente de UPONE-1209 destapado por el E2E vivo de HU-8; fix acotado en `version-from-source.js`. Decisión: consumir lowercase (alinear al codegen + precedente `getInitialStatus`), NO cambiar el codegen (transversal, sin beneficio funcional).
