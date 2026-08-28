---
id: TICKET-139
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1707
module: object-manager
autopilot: manual
---

# NavTab.labelKey falta en object-manager rompe el sidebar de apps (gap de sync de UPONE-1645)

## Request

Tras el ultimo pull de develop, el sidebar de apps queda vacio para cualquier usuario: nadie puede entrar a ningun modulo tras loguearse. Bloquea el entorno local completo.

Causa raiz (verificada en codigo, repos en /Users/edobacon/Workspace/uplanner/up1):
- suite/develop pide NavTab.labelKey en GET_APPLICATIONS_QUERY (suite/composables/useObjectManager.ts:111). Committeado y mergeado a develop (HEAD 1cc0173, "Merged in UPONE-1645 (pull request #239)").
- object-manager/develop NO define labelKey en el typeDef NavTab (object-manager/src/graphql/typeDefs/up1.js). Verificado: HEAD de object-manager es 8dc9227 (UPONE-1619); `git show HEAD:src/graphql/typeDefs/up1.js | grep labelKey` vacio; `git log -S labelKey` sobre ese archivo no encuentra ningun commit que lo haya introducido.
- Resultado: GraphQL rechaza la query completa -> GRAPHQL_VALIDATION_FAILED: Cannot query field "labelKey" on type "NavTab" -> availableApplications vacio -> sidebar sin iconos de app para todo usuario.

Origen del gap: el lado object-manager del fix de UPONE-1645 quedo como cambios LOCALES sin pushear en la maquina donde corrio el spike (git status: M src/graphql/typeDefs/up1.js, M objects/up1/suite/up1_suite_app.json) y nunca llego a origin/develop. Klaus Molt comento "Aprobado el fix" en UPONE-1645 el 2026-08-24, pero ese fix (lado backend) no esta en origin/develop de object-manager.

Matiz clave para la ejecucion: el resolver object-manager/src/graphql/resolvers/up1/suite/app.resolver.js (normalizeTab) es archivo GITIGNORED / salida de sync:logic (confirmado con git check-ignore + git ls-files: no trackeado). NO se commitea; se regenera localmente via sync desde las fuentes de suite + config del mod. Presentarlo como "archivo a editar y commitear" es incorrecto.

Fix real esperado: dejar en origin/develop de object-manager el typeDef NavTab con labelKey (src/graphql/typeDefs/up1.js, tracked) y el JSON objects/up1/suite/up1_suite_app.json (tracked); el resolver normalizeTab se regenera por sync. Validacion: sidebar de apps se puebla tras login (tenant UPU), sin GRAPHQL_VALIDATION_FAILED en la consola de red.

Ticket base en Jira: UPONE-1707 (Error, Bloqueadora, is caused by UPONE-1645).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | Schema GraphQL (typeDef + objeto sync) faltante en develop |
| Modulo principal | object-manager |
| Modulos afectados | object-manager (backend), suite (consumidor, ya en develop) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | suite/develop pide NavTab.labelKey | confirmed | HEAD suite `1cc0173` (PR #239); useObjectManager.ts:111 pide `navTabs { ... labelKey }`; fuente `suite/logic/app.schema.graphql` con NavTab+labelKey committeada |
| H2 | object-manager/develop no declara el bloque NavTab | confirmed | `git show origin/develop:src/graphql/typeDefs/up1.js` no tiene `type NavTab`/`navTabs`/`labelKey` (linea 635 solo el comentario "App Queries"); origin/develop=`679bd241` |
| H3 | El runtime sirve el up1.js committeado (no regenera al boot) | confirmed | `typeDefsIndex.js:4` importa estaticamente `up1TypeDefs`; scripts `dev`/`start` sin predev/prestart sync |
| H4 | El resolver es gitignored / salida de sync (no se commitea) | confirmed | `git check-ignore` matchea `src/graphql/resolvers/up1/suite/app.resolver.js`; copiado de `suite/logic/app.resolver.js` |
| H5 | El churn local de OM no es el fix de 1645, es sync mezclado | confirmed | `git diff` local traia report-builder (isPublic/visibleToRoles/dataSourceFields), prisma y ~35 objetos nuevos ajenos al bug |

### Context found

- Fuente de verdad del app-schema: `suite/logic/app.schema.graphql` (+ `app.resolver.js`), que el sync concatena en `object-manager/src/graphql/typeDefs/up1.js` via `scripts/sync/logicSync.js` (glob `{project}/logic/*.schema`).
- object-manager/develop esta stale (13 commits atras localmente; y aun origin/develop carece del bloque NavTab entero, no solo labelKey).
- Runtime de OM importa el typeDef committeado (`typeDefsIndex.js`), asi que commitear el bloque en `up1.js` resuelve la validacion en runtime.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | UPONE-1707 (object-manager) |
| Base branch | origin/develop (`679bd241`) |
| DB state | n/a (fix de typeDef estatico, sin migracion) |
| Services | n/a para validacion (parse + unit tests) |
| Test data | n/a |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### S1 — 2026-08-24 — Fix del typeDef NavTab

**Objetivo:** desbloquear el sidebar de apps agregando el bloque NavTab (con labelKey) al typeDef committeado de object-manager.

**Decision de diseno (scope):** `sync:logic` regenera `up1.js` desde TODAS las fuentes (`suite`, `layout`, `report-builder`), produciendo un diff mezclado de multiples tickets ajenos (report-builder, prisma, ~35 objetos). Para un fix acotado al bug se inserto el bloque app-schema **verbatim** desde la fuente canonica `suite/logic/app.schema.graphql`. El resync completo de OM/develop (stale) queda como problema aparte.

**Alternativas descartadas:**
- Full resync (commitear el up1.js regenerado completo): conflaciona muchos tickets bajo un bug, mayor riesgo. Descartada.
- Incluir el hunk de `up1_suite_app.json` (labelKey en config): el base de origin/develop tiene ese JSON en estado inconsistente (su `defaultObjects` ni soporta la forma `{object,layouts}`); derivar el target canonico ampliaria scope. Diferido (UPONE-1707 lo marca no bloqueante).

**Cambio:** `src/graphql/typeDefs/up1.js` (+38/-1). Commit `354dc2d` en rama `UPONE-1707`.

**Tasks completadas:**
- [x] S1.T1 — Insertar bloque `type NavTab` + `extend type up1_suite_app { navTabs, navScoped }` (verbatim de la fuente)
- [x] S1.T2 — Validar parse del typeDef y del merge completo; verificar unicidad de NavTab
- [x] S1.T3 — Correr unit tests de schema (regresion)

**Progreso:** rama `UPONE-1707` pusheada a origin (object-manager); comentario de estado publicado en Jira UPONE-1707 (comment 101349).

**Smoke runtime (DET-36) — parcial, entorno local:** OM levantado en la rama, DB uplanner_upu. Confirmado en el schema **servido** (introspection): `NavTab` expone `kind/object/layouts/dashboards/labelKey` y `up1_suite_app` expone `navTabs/navScoped`. El error `Cannot query field "labelKey" on type "NavTab"` desaparece. PERO el sidebar no renderiza end-to-end en este entorno: `GET_APPLICATIONS_QUERY` tambien pide `homescreen`, ausente del `dynamic.js` committeado (origin/develop tampoco lo trae; sale del codegen contra la DB). Al regenerar (codegen) aparecio `homescreen` pero surgio otra inconsistencia de entorno (`Unknown type "Shift"`, objetos nuevos en DB no emitidos). Conclusion: el fix de labelKey es correcto y necesario (verificado en runtime), pero NO suficiente por si solo en un develop limpio: la plataforma necesita ademas el schema dinamico al dia (resync/codegen). Esa es la deuda de OM stale, no este bug. Evidencia runtime del bug de labelKey: resuelto. Sidebar poblado: no reproducible en este entorno sin resync completo.

**Smoke runtime (DET-36) — completo, tras reset:** el dev corrio `setup:reset` (rebuild DB + regen schema desde la fuente). Se levanto OM en la rama (requirio `sync:logic` extra para reconciliar mods↔resolvers, `scenarioCandidateSections`) y suite. Login real Admin/UPU. Resultado: **sidebar poblado (5 apps), `GET_APPLICATIONS_QUERY` 200, sin `GRAPHQL_VALIDATION_FAILED`**. Bug resuelto end-to-end.

**Cierre:** ticket cerrado por decision del dev con evidencia runtime. PR `UPONE-1707` -> develop pendiente de crear en Bitbucket (manual, sin credenciales). Deuda de resync de OM declarada como ticket propio (ver Summary).

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| Sidebar no rompe por schema (NavTab.labelKey servido) | TC1, TC2, TC3 | schema/unit | pass |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC1 | typeDef up1.js parsea con el bloque agregado | R1 | unit | rama UPONE-1707 | `import up1TypeDefs` + `print()` | parsea, NavTab.labelKey presente | parse OK, NavTab.labelKey=true, navTabs=true | node one-liner (S1) | pass |
| TC2 | Merge completo de typeDefs coherente | R1 | unit | idem | `import typeDefs` de typeDefsIndex + `print()` | 1 sola def de NavTab, base up1_suite_app presente | NavTab=1, base=1, len 206967 | node one-liner (S1) | pass |
| TC3 | Suite de schema de OM sin regresion | R1 | unit | idem | `vitest run` schemaHotSwap + schemaTransformations | verde | 18/18 passed | vitest (S1) | pass |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| (existentes) tests/unit/services/schemaHotSwap.test.js, tests/unit/resolvers/schemaTransformations.test.js | unit | — (reuso) | parse/merge de schema | vitest |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| schema unit (subset) | `npx vitest run tests/unit/services/schemaHotSwap.test.js tests/unit/resolvers/schemaTransformations.test.js` | — | 18/18 pass | sin regresion |

## Summary

Fix acotado (1 archivo) del gap de sync de UPONE-1645: object-manager/develop no declaraba el tipo `NavTab` (ni `labelKey`) que el frontend de suite ya consume, rompiendo la query de apps y dejando el sidebar vacio. Se agrego el bloque app-schema verbatim desde la fuente canonica `suite/logic/app.schema.graphql`.

**Estado al cierre:**
- Codigo: commit `354dc2d` en rama `UPONE-1707`, pusheada a origin (object-manager). PR a develop pendiente de crear (no automatizable sin credenciales de Bitbucket).
- Validacion: schema parsea, merge parsea, 18/18 schema unit tests.
- Runtime (DET-36): smoke end-to-end verde tras reset del entorno — sidebar poblado (5 apps), `GET_APPLICATIONS_QUERY` 200, sin `GRAPHQL_VALIDATION_FAILED`. Login real Admin/UPU.
- Jira: comentario de estado publicado (comment 101349).
- teachings.close: done (`TICKET-139.teach/teach-close.md`).
- Learns raw: 0 (nada que refinar, DET-39 satisfecho).

**Cierre honesto:** el fix es correcto y verificado, pero el smoke confirmo que el mecanismo real que sana la plataforma es el sync/reset (regenera el schema desde la fuente). El parche cubre a quien no corre sync completo; no deja develop al dia en el resto.

**Deuda declarada (ticket propio, fuera de alcance):** resync de object-manager a develop — su `dynamic.js` committeado esta stale respecto de la DB y las fuentes (`homescreen`, objetos nuevos como `Shift`). Cierre robusto a nivel equipo.
