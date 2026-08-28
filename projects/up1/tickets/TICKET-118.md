---
id: TICKET-118
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1529
module: mods/curriculum-design
autopilot: autonomous
---

# Mods | Wiring de alias del boundary en el toolchain standalone (tests/typecheck/storybook) tras la cascada tooling+boundary

## Request

Contexto: el plan coordinado de tooling + module boundary (Fase 0/1 de layout/docs/guides/quality-and-dx-plan.md) migra imports relativos a alias del boundary (@atoms, @molecules, @composables, @mods, ...). Las definiciones de esos alias viven en los PRs de core/layout (verificado: layout origin/develop ya los declara en vite.config.ts:77-83 y tsconfig.json:24-33) y el set de ~10 PRs hermanos se mergea junto. El build despachado (post-sync a layout/src/modsComponents + suite via nuxt.config.ts) RESUELVE bien.

Problema (verificado empiricamente, no inferido): el toolchain STANDALONE del mod curriculum-design (npm test = vitest run, npm run typecheck = vue-tsc --noEmit, npm run storybook/build-storybook puerto 6010) lee los configs PROPIOS del mod, no los de layout. Esos configs no declaran los alias nuevos y el PR del mod (curriculum-design #35) no toca ningun config. Resultado medido contra el head del PR: typecheck +31 TS2307 introducidos; vitest pasa de 80 archivos/1442 tests (develop) a 10 archivos fallando / 124 tests que no corren (Failed to resolve import "@atoms"). Ningun PR hermano toca los configs del mod. El propio plan (linea 194) pide wirear "curriculum-design's Storybook" pero ese cambio no vino, y su lista de "cuatro superficies" omite ademas el vitest.config.ts y el tsconfig.json del mod.

No hay gate duro que lo bloquee (el mod no tiene bitbucket-pipelines.yml; el pre-push es warn-only), por eso no salta solo, pero deja rota la suite del mod (124 tests) y el Storybook 6010.

Alias exactos a cablear (del diff de #35): @atoms (+ subpath @atoms/Badge), @molecules, @composables/useRbacPermissions, @mods/CurriculumMesh/*. Alcance: config-only, cero cambio de runtime.

Objetivo del ticket: tras el merge de la cascada, dejar verde npm test + npm run typecheck + build-storybook del mod agregando el wiring de alias en las 3 superficies de config del mod (vitest.config.ts, .storybook/main.ts, types/layout-shims.d.ts) + alinear el vi.mock huerfano.

Nota de alcance verificada: curriculum-mapping (PR #5) fue revisado y NO tiene este gap (su PR solo hace el rename @storybook/vue3-vite + inline de config + bump eslint 8->9; cero uso de alias del boundary en su codigo, sin symlinks ni tests/stubs). Pendiente de verificar (propagacion DET-16, priority could): academic-scheduling, report-builder, up1-manager, que tambien recibieron el codemod y podrian tener el mismo gap standalone.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | — |
| Modulo principal | mods/curriculum-design |
| Modulos afectados | — |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| 1 | Los alias del boundary no resuelven en ningun lado y rompen produccion/post-sync | descartada | layout origin/develop YA declara los alias en vite.config.ts:77-83 y tsconfig.json:24-33; post-sync (layout/src/modsComponents) y suite (nuxt.config.ts) resuelven. La lectura previa que dio "no existen" fue stale (pre-merge) — gate de frescura |
| 2 | El gap real esta en el toolchain STANDALONE del mod, cuyos configs propios no declaran los alias | confirmada | tsconfig.json del mod sin paths/extends; vitest.config.ts:39-63 solo aliasa `../../components/*` (relativo), no `@atoms`; .storybook/main.ts:76-89 solo `@` y `@/composables/useApolloClient`; el shim types/layout-shims.d.ts declara `*/components/atoms` (matchea el relativo, no `@atoms` bare) |
| 3 | El codemod introdujo alias que ningun config del mod ni PR hermano cablea | confirmada | Reejecucion fresca del head 130143a: vue-tsc +31 TS2307; vitest 10 archivos fallan / 70 pasan (develop 80/80), 124 tests no corren. curriculum-design tiene solo #35 en el set; #35 toca 0 configs |

### Context found

- **Alias exactos introducidos por curriculum-design #35** (del diff): `@atoms` (15) + `@atoms/Badge` (1, subpath), `@molecules` (7), `@mods/CurriculumMesh/*` (7: curriculumMeshFilters, AddEntryModal, prereqCheck, curriculumMesh, PrereqBlockModal), `@composables/useRbacPermissions` (1). Todo cambio de import, cero logica.
- **Targets verificados en el mod** (`~/Workspace/uplanner/up1/mods/curriculum-design`): symlinks `components -> ../../layout/src/components` y `composables -> ../../layout/src/composables`; `modsComponents/CurriculumMesh/AddEntryModal.ts` existe (target de `@mods/CurriculumMesh/*`); `layout/src/composables/useRbacPermissions.ts` existe; stubs de test en `tests/stubs/{atoms,molecules}.ts`.
- **Scripts del mod**: `test` = `vitest run`; `typecheck` = `vue-tsc --noEmit`; `storybook` = `storybook dev -p 6010`; `build-storybook` = `storybook build`.
- **Sin gate duro**: el mod no tiene `bitbucket-pipelines.yml`; `.husky/pre-push` corre typecheck/lint warn-only (baseline typecheck ya rojo ~130 errores por deuda de componentes symlinkeados de layout, ajena a este ticket).
- **curriculum-mapping (PR #5) — verificado NO afectado**: su PR solo hace `@storybook/vue3 -> @storybook/vue3-vite` en 2 stories + inline de `LEVEL_COLUMN_DEFS` (el sync reubica la story) + bump `eslint 8->9`. Grep de alias del boundary en todo el mod = 0; sus componentes importan `@/composables/useApolloClient`, `@vueform/vueform`, `i18next-vue`. Sin symlinks ni `tests/stubs/`. No requiere wiring de alias.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | por crear (fix/curriculum-design-alias-standalone) tras el merge de la cascada |
| Base branch | develop (mod curriculum-design, con el set integrado ya mergeado) |
| DB state | n/a (config-only, cero runtime) |
| Services | Storybook mod puerto 6010 para validar T3 |
| Test data | n/a |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-08-04T13:34:00Z | open → super + teach skip + codex on | dev trigger 'super autopilot skip teach codex on' | proximo gate |

### Plan de sessions (preplanificacion)

| Session | Objetivo | Tasks | Tier | Tipo |
|---------|----------|-------|------|------|
| S1 | Cablear alias del boundary en las 3 superficies de config del mod + realinear vi.mock huerfano | S1.T1–S1.T4 + S1.GATE | T3 | auto |

### Session 1 — 2026-08-04 — Cablear alias en las 3 superficies + realinear vi.mock [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T3 (regresion completa: 80 archivos / 1442 tests + build-storybook)

**Objetivo**: cablear los alias del boundary (`@atoms`/`@molecules`/`@composables`/`@mods`) en `vitest.config.ts`, `types/layout-shims.d.ts` y `.storybook/main.ts`, y realinear el `vi.mock` huerfano de `RequirementTreeNode.spec.ts`, para dejar verde `npm test` + `npm run typecheck` + `npm run build-storybook` del mod tras la cascada tooling+boundary.

**Tasks completadas**:
- [x] S1.T1 — vitest.config.ts: alias @atoms/@molecules/@composables/@mods (+ caveat @atoms/Badge empirico)
- [x] S1.T2 — types/layout-shims.d.ts: declare module bare para los alias
- [x] S1.T3 — .storybook/main.ts: alias en viteFinal antes del @ generico
- [x] S1.T4 — RequirementTreeNode.spec.ts: realinear vi.mock a @molecules
- [x] S1.GATE — dual-judge T3 (reviewer delegado a codex) + regresion + commits + gate decision

**Validacion del tier (T3)**:
- `npm test`: 80 archivos / 1442 tests verde (== baseline develop pre-codemod)
- `npm run typecheck`: 0 `TS2307` de alias del boundary (antes 31). Quedan 22 no-alias (12 preexistentes de develop + 10 destapados al resolver alias) → abordados en S2 (scope typecheck 0, decision del dev)
- `npm run build-storybook`: built in 8.36s, resuelve todos los alias

**Quality review (DET-23)** — dual-judge T3, reviewers locales (codex CLI no instalado en la maquina → delegacion `codex on` degradada a orquestador local, HOR-130):

| Finding | Judge A | Judge B | Severity | Status |
|---------|---------|---------|----------|--------|
| Wiring de alias correcto en las 3 superficies (empirico verde) | approve | correctness OK | info | confirmed-ok |
| scope-drift: tsconfig.json + .gitignore fuera de execute_scope | — | iterate | warning | confirmed → execute_scope ampliado |
| plan-deviation: @mods via paths (no shim) sin actualizar decision log | — | iterate | warning | confirmed → DEC-LOCAL-03 documentada |
| typecheck destapa 5 errores no-alias en stories | — | info | info | conocido → S2 |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 2 (scope typecheck 0 total, expandido por dev)
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Reviewer**: dual-judge (2 sub-agentes aislados, backend local)
**Tier de revision**: T3
**Resultado global**: APPROVED — el codigo lo aprueban ambos jueces (wiring correcto, verificado empirico). Los 2 warnings de Judge B eran de proceso (scope + decision-log), no de correctitud de codigo: resueltos ampliando `execute_scope` y documentando DEC-LOCAL-03/04, sin iterate de codigo. Contradiccion A↔B verificable directamente (A no negaba los hechos de B, solo no los reporto) → no se gasto adjudicador reasoning.

Trigger-rules: diff pequeno (~56 lineas), path config/tooling no sensible → sin bump; tier T3 fijado en design por la regresion completa. Aplicado.

**Commit DET-27**: `0760b1b` fix(curriculum-design): UPONE-1529 wire module boundary aliases in standalone toolchain

```dkc:gate-telemetry
session: S1
work_type: fix
tier: T3
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 2600
est_tokens: 700
span_seconds: 900
```

### Session 2 — 2026-08-04 — Typecheck del mod a 0 (scope expandido por el dev) [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T3 (typecheck 0 + regresion completa + build-storybook)

**Objetivo**: llevar `npm run typecheck` del mod a 0 errores — deuda preexistente (implicit-any en RequirementEditorElement.vue, tipos en weightedSum.test) + friccion de tipos destapada al resolver los alias en S1 (spec + stories). Sin regresion en tests ni storybook. Scope expandido por decision del dev (2026-08-04).

**Tasks completadas**:
- [x] S2.T1 — RequirementEditorElement.vue: anotar 9 handlers implicit-any (TS7006)
- [x] S2.T2 — weightedSum.parity.test.ts: alinear tipos helper/weightOf (TS2322/2345)
- [x] S2.T3 — RequirementTreeNode.spec.ts: resolver mount/props/vm (5 errores)
- [x] S2.T4 — stories + shim: resolver 6 errores CSF + tighten @atoms/*
- [x] S2.GATE — dual-judge T3 + typecheck 0 + regresion 1442 + build-storybook + commits + gate decision

**Validacion del tier (T3)**:
- `npm run typecheck`: **0 errores** (antes 43: 31 de alias resueltos en S1 + 12 preexistentes + 10 destapados, resueltos en S2)
- `npm test`: 80 archivos / 1442 tests verde (sin regresion)
- `npm run build-storybook`: built OK (7.90s)

**Quality review (DET-23)** — dual-judge T3, reviewers locales (codex CLI ausente → delegacion degradada, HOR-130):

| Finding | Judge A | Judge B | Severity | Status |
|---------|---------|---------|----------|--------|
| Cambios type-only, cero runtime (9 handlers, weightOf, casts) | approve | approve (verificado) | info | confirmed-ok |
| paths `vue` en tsconfig sin DEC-LOCAL (trazabilidad) | warning | info | warning | confirmed → DEC-LOCAL-05 documentada |
| sortedKeys `.map(String)` podria enmascarar divergencia str/num | — | theoretical | theoretical | no bloquea (assert siguiente `be.get(id)` la caza igual; datos son string) |
| divergencia teorica vue typecheck vs build-storybook standalone | theoretical | — | theoretical | no bloquea (3.5.28↔3.5.38, patch; runtime alineado por vitest) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Todas las tasks done; listo para request-close
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Reviewer**: dual-judge (2 sub-agentes aislados, backend local)
**Tier de revision**: T3
**Resultado global**: APPROVED — ambos jueces aprueban. Cambios verificados type-only (0 diff de runtime): typecheck 0, test 1442 verde, build-storybook OK. Unico finding confirmado (paths vue sin registro) resuelto con DEC-LOCAL-05; los theoretical no se disparan con el codigo/datos vigentes. Sin CRITICAL ni real WARNING de codigo. Jueces balanced (A+B); sin contradiccion de fondo → sin adjudicador reasoning.

**Commit DET-27**: `a50d574` fix(curriculum-design): UPONE-1529 drive standalone typecheck to zero

```dkc:gate-telemetry
session: S2
work_type: fix
tier: T3
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 3400
est_tokens: 920
span_seconds: 2400
```

## Plan de arreglo (tasks)

Config-only, cero runtime. Ejecutar sobre `develop` del mod **ya con el set de la cascada mergeado**. Cada fase deja el sistema evaluable y es revert de config puro (rollback trivial).

### Precondicion — PRs que deben estar mergeados (check antes de ejecutar)

Solo dependen de este fix los PRs de **core** (definen los alias que el fix asume) y los **propios de los dos mods en alcance**. Los PRs de los otros mods de la cascada (up1-manager #20, report-builder #49, academic-scheduling #53, retention-wellbeing #84, hello-world-mod #16) **NO influyen** en este ticket y no son precondicion.

Core (dependencia dura):

- [x] **layout** #323 — https://bitbucket.org/uplanner/layout/pull-requests/323 (declara los alias en `vite.config.ts` + `tsconfig.json`) — **MERGED a develop 2026-08-03**
- [x] **up1 core** #110 — https://bitbucket.org/uplanner/up1/pull-requests/110 (lado core del boundary) — **MERGED a develop 2026-08-03**
- [x] **suite** #213 — https://bitbucket.org/uplanner/suite/pull-requests/213 (alias en `nuxt.config.ts`) — **MERGED a develop 2026-08-03**

Mods en alcance:

- [x] **curriculum-design** #35 — https://bitbucket.org/uplanner/curriculum-design/pull-requests/35 (los imports migrados del mod que este ticket completa) — **MERGED a develop 2026-08-03**
- [x] **curriculum-mapping** #5 — https://bitbucket.org/uplanner/curriculum-mapping/pull-requests/5 (mod en alcance; verificado no-afectado) — **MERGED a develop 2026-08-03**

**Precondicion SATISFECHA (verificado 2026-08-03 via API de Bitbucket): los 5 PRs estan MERGED a `develop`.** El fix se puede ejecutar. Antes de abrir la rama de trabajo: `git -C <repo> fetch origin develop` en curriculum-design (y layout, que provee las definiciones que el mod consume por symlink) para partir del develop integrado.

### T1 — `vitest.config.ts` (desbloquea los 124 tests)

Agregar al bloque `resolve.alias` (junto a los `../../components/*` existentes):

```ts
'@atoms':       resolve(__dirname, 'tests/stubs/atoms.ts'),
'@molecules':   resolve(__dirname, 'tests/stubs/molecules.ts'),
'@composables': resolve(__dirname, '../../layout/src/composables'),
'@mods':        resolve(__dirname, 'modsComponents'),
```

Caveat `@atoms/Badge` (subpath): el alias string `@atoms` reescribe tambien `@atoms/Badge` -> `tests/stubs/atoms.ts/Badge` (roto). Salida recomendada: normalizar ese unico import a barrel (`import { Badge } from '@atoms'`); alternativa: mapeo explicito `'@atoms/Badge'` al stub.

Validacion: `npm test` -> volver a 80 archivos / 1442 tests verde (baseline develop).

### T2 — `types/layout-shims.d.ts` (typecheck)

Agregar declaraciones bare que espejen las wildcard existentes (mantiene la intencion del shim: no typechequear el source de layout; por eso shim y NO `paths` en tsconfig, que arrastraria errores TS transitivos de layout — ver header del shim, UPONE-1038):

```ts
declare module '@atoms'    { /* mismos exports que '*/components/atoms'    */ }
declare module '@atoms/*'  { const c: import('vue').Component; export default c }
declare module '@molecules'{ /* mismos exports que '*/components/molecules'*/ }
declare module '@composables/useRbacPermissions' { export function useRbacPermissions(): unknown }
declare module '@mods/CurriculumMesh/*' { const m: unknown; export = m }
```

Validacion: `npm run typecheck` -> los +31 TS2307 de alias desaparecen (queda baseline preexistente, fuera de alcance).

### T3 — `.storybook/main.ts` (Storybook 6010 — superficie que el plan linea 194 ya pedia)

En `viteFinal`, dentro de `cfg.resolve.alias`, **antes** del `@` generico:

```ts
'@atoms':       pathMod.resolve(here, '../../../layout/src/components/atoms'),
'@molecules':   pathMod.resolve(here, '../../../layout/src/components/molecules'),
'@composables': pathMod.resolve(here, '../../../layout/src/composables'),
'@mods':        pathMod.resolve(here, '../modsComponents'),
```

(Mantener `@/composables/useApolloClient` -> stub primero, como ya esta.)

Validacion: `npm run build-storybook` resuelve sin 404 de modulo.

### T4 — Alinear el `vi.mock` huerfano

`modsComponents/ReglaUnificadaView/RequirementTreeNode.spec.ts:25`: cambiar `vi.mock('../../components/molecules', ...)` por `vi.mock('@molecules', ...)` para que matchee el import nuevo (`:39` importa de `@molecules`). Como T1 mapea `@molecules` al mismo `tests/stubs/molecules.ts`, el mock vuelve a aplicar. (Si se deja en el path viejo, queda mock silencioso.)

### Acceptance

- `npm test` (mod): 80 archivos / 1442 tests verde (== baseline develop pre-codemod).
- `npm run typecheck` (mod): 0 errores `TS2307` de los alias del boundary (baseline preexistente no cuenta).
- `npm run build-storybook` (mod): build sin error de resolucion.
- CI verde sobre el **set integrado** de la cascada (no sobre este PR aislado).

### Backlog / propagacion (DET-16, priority could)

- **Fuera del alcance de este ticket** (los otros mods no influyen aqui): si algun dia se ejecuta el codemod en **academic-scheduling**, **report-builder** o **up1-manager**, cada uno necesitaria su propio chequeo de gap standalone en ticket aparte (extraer sus alias con `bb.sh diff` y replicar T1-T3 si aplica). No es precondicion ni dependencia de este fix.
- Menor (curriculum-mapping #5): `LEVEL_COLUMN_DEFS` quedo inlineado con "mantener en sync a mano" (riesgo de drift vs `default_LevelScheme_edit.json`); y el bump `eslint 8->9` exige que su config sea flat-config (lint warn-only). No bloquea; vigilar.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before (head #35) | After (esperado) | Delta |
|-------|---------|--------|-------|-------|
| vitest mod | `npm test` | 10 archivos fallan / 70 pasan (124 tests no corren) | 80 archivos / 1442 tests verde | +10 archivos, +124 tests recuperados |
| typecheck mod | `npm run typecheck` | +31 TS2307 (alias) sobre baseline | baseline sin los TS2307 de alias | -31 errores introducidos |
| storybook mod | `npm run build-storybook` | falla resolucion `@atoms`/`@mods` | build OK | resuelto |

> Baseline de referencia: develop del mod (pre-codemod) = 80 archivos / 1442 tests verde.

## Summary

### What was requested
Tras la cascada tooling + module boundary, dejar verde el toolchain standalone del mod curriculum-design (`npm test`, `npm run typecheck`, `npm run build-storybook`) cableando los alias del boundary (`@atoms`/`@molecules`/`@composables`/`@mods`) en los configs propios del mod + realinear un `vi.mock` huerfano. Durante la ejecucion el dev expandio el alcance a **typecheck 0 total**.

### What was done
- **S1** (config-only): alias del boundary en `vitest.config.ts`, `types/layout-shims.d.ts` (+ `tsconfig.json paths` para `@mods`), `.storybook/main.ts` (incluyendo los internos de layout `@shared`/`@utils`/`@organisms`/`@layouts` que los barrels reales requieren); `.gitignore` de `storybook-static/`; `vi.mock` realineado a `@molecules`.
- **S2** (scope expandido): typecheck a 0 — 9 handlers implicit-any en `RequirementEditorElement.vue`, tipos en `weightedSum.parity.test.ts`, `findComponent` por nombre en `RequirementTreeNode.spec.ts`, `component: Badge as ConcreteComponent` en la story, y el fix raiz: `paths` de `vue` en tsconfig (alinea el typecheck a la vue del root, como vitest ya hacia para runtime).

### Evidence
- `npm test`: 80 archivos / 1442 tests verde (== baseline develop pre-codemod).
- `npm run typecheck`: **0 errores** (antes 43).
- `npm run build-storybook`: build OK.
- Commits repo del mod: `0760b1b` (S1), `a50d574` (S2).
- PR: https://bitbucket.org/uplanner/curriculum-design/pull-requests/37 (→ develop).

### What was learned
Sin learns raw pendientes (DET-39: none-pending). Aprendizajes clave quedaron como decisiones del spec: DEC-LOCAL-03 (`@mods` via tsconfig paths, no shim), DEC-LOCAL-04 (storybook necesita los alias internos de layout), DEC-LOCAL-05 (alinear `vue` en el typecheck — doble copia 3.5.28/3.5.38).

### Pendiente (no bloquea cierre)
- Propagacion DET-16 (`could`): verificar el mismo gap standalone en academic-scheduling / report-builder / up1-manager si reciben el codemod.
- `codex on` registrado pero CLI ausente → reviews corrieron con dual-judge local (HOR-130 degradacion).

### Cierra
Acceptance verde en las 3 superficies, dual-judge approved en ambos gates, PR abierto. teach-close omitido por `teach_policy: skip`.
