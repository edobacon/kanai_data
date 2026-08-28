---
id: RULE-dev-006
project: up1
type: rule
module: dev
tags:
  - dev
  - git
  - merge
  - testing
  - codegen
  - generated-files
  - sp3
---

# Mergear develop a ramas de épica largas exige tests verdes + prohíbe hand-merge de archivos generados

## What

Al poner al día una rama de épica de larga vida (ej. `UPONE-1206` core, `UPONE-1038` CD) con su `develop` (`git merge origin/develop`):

1. **Correr las suites de tests ANTES de commitear el resultado del merge y antes de abrir el PR.** Como mínimo:
   - object-manager: `npm run test:unit` (~1870 tests).
   - cada mod tocado por el merge: `npm test` (uengagement-up1, curriculum-design, etc.).
2. **Verificar que el servicio LEVANTE** — los tests unit NO bastan. `up1-start.sh --om` + confirmar `:4000` arriba y un POST GraphQL responde (con `X-Tenant-ID`). Un mismatch schema↔resolver (typeDef dropeado pero resolver presente) **solo crashea al bootear**, no en unit tests.
3. **Regenerar AMBOS lados de generación, no solo uno**:
   - **Objetos**: `npm run codegen -- <tenant>` (prisma schemas + dynamic.js).
   - **Lógica de mods**: `npm run sync:logic` (mods.js/up1.js — mutations/resolvers custom de mods, ej. `recordAuditEvent`). Olvidar este paso deja el schema sin las mutations custom aunque los resolvers esten synced → crash al arrancar object-manager.
4. **No resolver conflictos de archivos GENERADOS a mano** (prisma `prisma/{T}/schema.prisma`, typeDefs `src/graphql/typeDefs/*.js`, `business/` mergeado, i18n `lang/*` synced). Resolver **regenerando** con la fuente (`codegen` / `sync`), no editando marcadores `<<<<<<<`.
5. Si por excepción se resuelve un generado a mano, **comparar el resultado contra un tenant/archivo que auto-mergeó bien** para detectar piezas perdidas.

## Why

El 3-way merge de develop a una rama larga produce **regresiones semánticas SILENCIOSAS** que ni git ni `prisma validate` marcan como conflicto. Casos reales observados en el merge-up de SP3 (2026-06-09):

- Resolución "take-ours" sobre los 3 schemas prisma en conflicto (BASEMODEL/TEST/UPU) **dropeó** los enums `ChangeLogAction/ChangeLogSource` y las back-relations `changeLogs` → schema inválido, `prisma migrate` fallaba. Los 14 tenants auto-mergeados quedaron bien.
- `instance.resolver.js` **auto-mergeó sin conflicto** pero perdió la línea `import { getBusinessContextFilter }` conservando su uso → `ReferenceError`, 6 tests de `get-version-chain` rotos. **Solo los tests lo atraparon.**
- `mods.js` (typeDef generado) **auto-mergeó colapsando hacia develop** y dropeó las mutations custom de mods (`recordAuditEvent` + `AuditEventInput/AuditEventResult`, ~330 líneas). El resolver synced (gitignored) sí estaba → object-manager **crasheaba al arrancar**: `Mutation.recordAuditEvent defined in resolvers, but not in schema`. **Los unit tests pasaron (1870 verdes); solo el arranque del servicio lo atrapó.** Fix: `npm run sync:logic`.

`prisma validate` no detecta el import faltante (es código, no schema) ni el typeDef de lógica faltante. Un merge "limpio" NO implica corrección, y **tests unit verdes NO implican que el servicio arranque**.

## Where

- Repos de workspace core con generados committeados: object-manager (prisma schemas, typeDefs, `objects/business/`), suite (`lang/*` synced), layout.
- Aplica a todo merge de `develop` (o de otra rama) hacia las ramas de épica `UPONE-{epica}` de SP3 y posteriores.

## When

- Inmediatamente después de `git merge origin/develop` y de resolver conflictos, **antes** de `git commit` final del merge / antes del PR.
- Clasificar cualquier test rojo como **introducido** (corregir antes de avanzar) vs **preexistente** (reportar). Ej.: `json-rules-engine not found` fue preexistente (dep declarada sin instalar → `npm install`); el import dropeado fue introducido (corregir).

## Source

- Merge-up de SP3 ramas UPONE-1206 / UPONE-1038 (sesión 2026-06-09).
- Ver [BUG-core-001](../../bugs/core/bug-core-001.md) (colisión Student / drift de schema surgido en el mismo merge-up).
- Relacionado: `uplanner/specs/up1/operations/database-reset.md` §7 (baseline regen headless, no `--accept-data-loss`).
