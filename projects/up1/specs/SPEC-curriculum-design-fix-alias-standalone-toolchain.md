---
id: SPEC-curriculum-design-fix-alias-standalone-toolchain
project: up1
ticket: TICKET-118
status: done
---

# Fix: los alias del boundary no resuelven en el toolchain standalone del mod (tests/typecheck/storybook)

# Fix: los alias del boundary no resuelven en el toolchain standalone del mod (tests/typecheck/storybook)

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle vive en Requirements, Fix scope y Tasks.*

**Que se quiere**: la cascada coordinada tooling + module boundary migro los imports relativos del mod `curriculum-design` a alias del boundary (`@atoms`, `@molecules`, `@composables/useRbacPermissions`, `@mods/CurriculumMesh/*`). Las definiciones de esos alias viven en `layout` (`vite.config.ts` + `tsconfig.json`) y el build despachado (post-sync a `layout/src/modsComponents` + suite) resuelve bien. Pero el toolchain STANDALONE del mod (`npm test` = vitest, `npm run typecheck` = vue-tsc, `npm run build-storybook`) lee los configs PROPIOS del mod, que no declaran esos alias. El PR del mod (#35) migro los imports pero no toco ningun config. Resultado medido contra develop integrado: vitest 10 archivos fallan / 124 tests no corren; typecheck +31 `TS2307`; storybook 6010 no resuelve.

**Alcance**: config-only, cero cambio de runtime. Se cablean los alias en las 3 superficies de config del mod + se alinea un `vi.mock` huerfano que quedo apuntando al path relativo viejo.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Cablear alias en config del mod (no agregar `paths` a `tsconfig.json`) | Un `paths` en tsconfig arrastraria errores TS transitivos del source de layout (deuda ajena, ~130 errores baseline). El shim `layout-shims.d.ts` mantiene la intencion: no typechequear el source de layout, solo declarar los modulos (ver header del shim, UPONE-1038) |
| 2 | `@atoms`/`@molecules` → stubs de test en vitest, pero → dirs reales de layout en storybook | En vitest los componentes de layout se stubean (`tests/stubs/{atoms,molecules}.ts`); en storybook se renderizan de verdad. Los alias resuelven a targets distintos por superficie — por eso el wiring es por-config, no un unico mapa |
| 3 | El fix aplica solo a curriculum-design; curriculum-mapping (#5) verificado NO afectado | curriculum-mapping no usa alias del boundary (0 matches), sin symlinks ni stubs. No requiere wiring |

**Riesgos principales y mitigacion**:

- **Subpath `@atoms/Badge`** (T1): el alias string `@atoms` reescribe tambien `@atoms/Badge`. En vitest (stub = archivo) el subpath rompe; en storybook (alias = dir) resuelve. Mitigacion: verificar empiricamente si algun archivo colectado por vitest importa el subpath; si lo hace, normalizar a barrel (`import { Badge } from '@atoms'`) o mapear el subpath explicito. El unico match hoy vive en una `.stories.ts` (la resuelve storybook, no vitest).
- **`vi.mock` huerfano** (T4): quedo en el path relativo viejo → mock silencioso. Se realinea al alias nuevo para que el mock vuelva a aplicar.

## Purpose

Corregir el toolchain standalone del mod `curriculum-design` tras la cascada tooling + boundary: dejar verde `npm test` + `npm run typecheck` + `npm run build-storybook` cableando los alias del boundary en los configs propios del mod. Referencia: UPONE-1529. Sin este fix, la suite del mod (124 tests) y el Storybook 6010 quedan rotos, sin gate duro que lo bloquee (el mod no tiene `bitbucket-pipelines.yml`; el pre-push es warn-only).

## Diagnostico

- **Sintoma** (medido contra develop integrado, 2026-08-04): `npm test` → 10 archivos fallan / 70 pasan (80 total), 1318 tests pasan, 124 no corren con `Failed to resolve import "@atoms"` (ej. `modsComponents/CompositeSectionTree/CompositeSectionForm.ts:3`).
- **Causa raiz**: los configs propios del mod no declaran los alias del boundary. `vitest.config.ts` solo aliasa `../../components/*` (relativo); `types/layout-shims.d.ts` declara `*/components/atoms` (wildcard relativo, no `@atoms` bare); `.storybook/main.ts` solo `@` y `@/composables/useApolloClient`. El codemod de #35 introdujo `@atoms`/`@molecules`/`@composables`/`@mods` y ningun config ni PR hermano los cablea.
- **Hipotesis** (del triage del ticket, revalidadas): H1 "los alias no resuelven en ningun lado" ✗ descartada (layout develop ya los declara; post-sync + suite resuelven). H2 "el gap esta en el toolchain standalone" ✓ confirmada. H3 "el codemod introdujo alias que ningun config del mod cablea" ✓ confirmada.
- **Impacto**: solo el toolchain standalone del mod. Cero runtime (el build despachado resuelve). No afecta produccion ni post-sync.

## Requirements

### REQ-FIX-01: El toolchain standalone del mod resuelve los alias del boundary

> **Que cambia**: los 3 configs propios del mod declaran los alias `@atoms`, `@molecules`, `@composables`, `@mods` (y el subpath `@atoms/Badge` donde aplique).
> **Por que**: sin ellos vitest/vue-tsc/storybook fallan al resolver los imports que el codemod #35 migro.

El sistema MUST resolver los alias del boundary en las tres superficies del toolchain standalone del mod.

<details>
<summary>Scenarios</summary>

- GIVEN el mod en develop integrado WHEN se corre `npm test` THEN los 80 archivos colectan y los 1442 tests corren (== baseline develop pre-codemod).
- GIVEN el mod WHEN se corre `npm run typecheck` THEN no aparecen los 31 `TS2307` de los alias del boundary (baseline preexistente ajeno no cuenta).
- GIVEN el mod WHEN se corre `npm run build-storybook` THEN el build resuelve sin error de modulo `@atoms`/`@molecules`/`@composables`/`@mods`.
</details>

### REQ-REGRESSION-01: El fix no altera runtime ni el resto de la suite

> **Que cambia**: nada de runtime; solo config + un `vi.mock` realineado.
> **Por que**: el cambio debe ser revert de config puro y no debe alterar el comportamiento de los 1318 tests que ya pasaban ni el build despachado.

El sistema MUST mantener verde el conjunto de tests que ya pasaba y no introducir cambios de comportamiento en runtime.

<details>
<summary>Scenarios</summary>

- GIVEN los 1318 tests que pasaban WHEN se aplica el fix THEN siguen verdes (delta solo positivo: +124 recuperados).
- GIVEN el `vi.mock` de `RequirementTreeNode.spec.ts` WHEN se realinea al alias nuevo THEN el mock vuelve a aplicar (no queda silencioso) y el spec sigue verde.
</details>

## Fix scope

### Antes (comportamiento actual)
Los configs del mod no declaran los alias del boundary. `npm test` falla al colectar 10 archivos; `npm run typecheck` suma 31 `TS2307`; `npm run build-storybook` no resuelve `@atoms`/`@mods`. El `vi.mock` de `RequirementTreeNode.spec.ts:25` apunta al path relativo viejo (`../../components/molecules`) mientras el import migro a `@molecules` → mock silencioso.

### Despues (comportamiento esperado)
Los 3 configs declaran los alias. `npm test` vuelve a 80 archivos / 1442 tests verde; `npm run typecheck` sin los 31 `TS2307`; `npm run build-storybook` resuelve. El `vi.mock` se realinea a `@molecules` y vuelve a aplicar.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `vitest.config.ts` | Agregar 4 alias a `resolve.alias` (`@atoms`/`@molecules` → stubs; `@composables` → layout/src/composables; `@mods` → modsComponents) | Desbloquea los 124 tests. Cero consumers fuera del toolchain de test |
| `types/layout-shims.d.ts` | Agregar declaraciones `declare module` bare que espejen las wildcard existentes | Elimina los 31 `TS2307`. Solo afecta typecheck |
| `.storybook/main.ts` | Agregar 4 alias en `viteFinal` `cfg.resolve.alias` antes del `@` generico | Desbloquea build-storybook 6010. Solo afecta storybook |
| `modsComponents/ReglaUnificadaView/RequirementTreeNode.spec.ts` | Cambiar `vi.mock('../../components/molecules', ...)` → `vi.mock('@molecules', ...)` | Realinea el mock al import nuevo. Solo afecta ese spec |
| `modsComponents/ActivityStatusBadge/ActivityStatusBadge.stories.ts` (condicional) | Normalizar `import Badge from '@atoms/Badge'` a barrel si vitest lo colecta | Solo si el subpath rompe en vitest; verificacion empirica en T1 |

## Constraints

- Config-only. Cero cambio de logica de runtime.
- No agregar `paths` a `tsconfig.json` (arrastraria errores TS transitivos del source de layout — ver header del shim, UPONE-1038).
- Cada fase deja el sistema evaluable y es revert de config puro (rollback trivial).

## Dependencies

- Precondicion SATISFECHA (verificada 2026-08-03 via API Bitbucket + revalidada 2026-08-04 contra develop): los 5 PRs de la cascada MERGED a develop — layout #323, up1 core #110, suite #213, curriculum-design #35, curriculum-mapping #5. El fix parte del develop integrado del mod.

## Risks and mitigations

| Riesgo | Donde | Mitigacion |
|--------|-------|------------|
| Subpath `@atoms/Badge` rompe en vitest | `tests/**` colectados | Verificacion empirica en T1; normalizar a barrel o mapear explicito si aplica |
| Alias en storybook resuelve a target equivocado | `.storybook/main.ts` | `@atoms`/`@molecules` → dirs reales de layout (no stubs); orden ANTES del `@` generico |
| `vi.mock` sigue silencioso | `RequirementTreeNode.spec.ts` | T4 realinea al alias; validar que el spec sigue verde con el mock aplicado |

## Tasks

### Session 2 — Typecheck del mod a 0 (scope expandido por el dev) [tipo: auto] [tier: T3]

> Expansion de alcance confirmada por el dev (2026-08-04): llevar `npm run typecheck` del mod a **0 errores**, no solo los `TS2307` de alias. Cubre la deuda de tipos preexistente (implicit-any, tipos de test) + la friccion de tipos destapada al resolver los alias en S1. Toca codigo fuente del mod (no solo config). Nuevo requirement:

**REQ-FIX-02**: `npm run typecheck` del mod retorna **0 errores** (no solo 0 `TS2307` de alias).

- **S2.T1** — `RequirementEditor/RequirementEditorElement.vue`: anotar los 9 handlers de template `@update:model-value="(v) => ..."` con tipo explicito (implicit-any preexistente, TS7006). Type-only, cero runtime.
  - source_ref: REQ-FIX-02
  - agent: developer
  - validation: los 9 TS7006 de ese archivo desaparecen
  - rollback: git revert del archivo
- **S2.T2** — `tests/unit/weightedSum.parity.test.ts`: alinear los tipos del helper `sortedKeys` y `weightOf` con las firmas reales de front/back (TS2322/TS2345).
  - source_ref: REQ-FIX-02
  - agent: developer
  - validation: los 2 errores de ese test desaparecen; el test sigue verde en `npm test`
  - rollback: git revert del archivo
- **S2.T3** — `ReglaUnificadaView/RequirementTreeNode.spec.ts`: resolver los 5 errores de `mount`/`.props`/`.vm` (WrapperLike) destapados al resolver `@molecules`.
  - source_ref: REQ-FIX-02
  - agent: developer
  - validation: los 5 errores desaparecen; el spec sigue verde
  - rollback: git revert del archivo
- **S2.T4** — Stories (`ActivityStatusBadge.stories.ts`, `CurriculumMesh.stories.ts`) + shim: resolver los 6 errores CSF (TS2321/TS2322) destapados; tighten el shim `@atoms/*` para no inducir el `Excessive stack depth`.
  - source_ref: REQ-FIX-02
  - agent: developer
  - validation: los 6 errores desaparecen; `build-storybook` sigue OK
  - rollback: git revert de los archivos
- **S2.GATE** — dual-judge T3 + `npm run typecheck` == 0 + regresion `npm test` 1442 verde + `build-storybook` OK + commits + gate decision.

**Acceptance S2**: `npm run typecheck` → **0 errores**; `npm test` → 80/1442 verde (sin regresion); `npm run build-storybook` → OK.

### Session 1 — Cablear alias en las 3 superficies + realinear vi.mock [tipo: auto] [tier: T3]

- **S1.T1** — `vitest.config.ts`: agregar alias `@atoms`/`@molecules` → `tests/stubs/{atoms,molecules}.ts`, `@composables` → `../../layout/src/composables`, `@mods` → `modsComponents`. Verificar empiricamente el subpath `@atoms/Badge` (normalizar a barrel solo si vitest lo colecta).
  - source_ref: REQ-FIX-01
  - agent: developer
  - validation: `npm test` → 80 archivos / 1442 tests verde
  - rollback: git revert del archivo
  - rules: [DET-40]
- **S1.T2** — `types/layout-shims.d.ts`: agregar `declare module` bare para `@atoms`, `@atoms/*`, `@molecules`, `@composables/useRbacPermissions`, `@mods/CurriculumMesh/*` espejando las wildcard existentes.
  - source_ref: REQ-FIX-01
  - agent: developer
  - validation: `npm run typecheck` → sin los 31 `TS2307` de alias (baseline preexistente no cuenta)
  - rollback: git revert del archivo
- **S1.T3** — `.storybook/main.ts`: agregar alias en `viteFinal` `cfg.resolve.alias` (`@atoms`/`@molecules` → dirs reales de layout, `@composables` → layout/src/composables, `@mods` → modsComponents) ANTES del `@` generico. Mantener `@/composables/useApolloClient` → stub primero.
  - source_ref: REQ-FIX-01
  - agent: developer
  - validation: `npm run build-storybook` resuelve sin error de modulo
  - rollback: git revert del archivo
- **S1.T4** — `RequirementTreeNode.spec.ts:25`: `vi.mock('../../components/molecules', ...)` → `vi.mock('@molecules', ...)`.
  - source_ref: REQ-REGRESSION-01
  - agent: developer
  - depends_on: S1.T1
  - validation: el spec sigue verde con el mock aplicado (no silencioso)
  - rollback: git revert de la linea
  - rules: [DET-40]
- **S1.GATE** — quality review (dual-judge T3, reviewer delegado a codex) + regresion completa + commits + gate decision.

> **Particion (DET-20)**: fix config-only autocontenido, single-session. Tier T3 por la validacion de regresion completa (80 archivos / 1442 tests) + superficie storybook.

## Open questions

Ninguna. Diagnostico confirmado y precondicion satisfecha.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: alias de LAYOUT via shim, no `paths` en tsconfig
Para `@atoms`/`@molecules`/`@composables` (apuntan a source de layout): un `paths` en `tsconfig.json` typechequearia el source de layout y arrastraria ~130 errores TS transitivos ajenos. Se usa el shim `layout-shims.d.ts` con `declare module` bare (`@atoms`/`@molecules` reexportan las wildcard existentes; `@composables/useRbacPermissions` tipado con lo que consume el mod). Mantiene la intencion (declarar modulos sin typechequear su source). Consistente con UPONE-1038.

### DEC-LOCAL-03: `@mods` via `paths` de tsconfig (excepcion a DEC-LOCAL-01) — desviacion del plan original
El plan inicial (ticket, linea 211) preveia shimear `@mods/CurriculumMesh/*` con `declare module ... export = unknown`. Durante execute se descarto: los imports de `@mods` son **nombrados y de tipo** (`import { AddEntryModal }`, `import type { CategoryOption }`) y apuntan a los `modsComponents/` del **propio mod** (codigo propio, NO source de layout). Un `export = unknown` romperia esos named/type imports; y como es codigo propio, typechequearlo con `paths` es correcto y NO arrastra los errores transitivos de layout que motivan DEC-LOCAL-01. Por eso `@mods/*` se resuelve via `paths` en `tsconfig.json` a `./modsComponents/*` (tipos reales), mientras los alias de layout siguen en el shim. Verificado: 0 `TS2307` de alias, sin errores nuevos atribuibles a esta eleccion. Detectado por el reviewer B del gate S1 (dual-judge) como desviacion no documentada; documentado aqui.

### DEC-LOCAL-04: storybook necesita los alias INTERNOS de layout
El `build-storybook` compila los componentes reales de layout (barrels de atoms/molecules), que a su vez usan `@shared`/`@utils`/`@organisms`/`@layouts`. Por eso `.storybook/main.ts` espeja tambien esos alias internos de layout (→ `layout/src/*`), ademas de `@atoms`/`@molecules`/`@composables`/`@mods`. `@mods` NO se espeja de layout (apunta a los modsComponents del propio mod; los layout-internos no lo usan). Ademas se agrega `storybook-static/` a `.gitignore` (artefacto de build no ignorado, gap preexistente destapado al validar la superficie).

### DEC-LOCAL-02: alcance solo curriculum-design
curriculum-mapping (#5) verificado no-afectado (0 usos de alias del boundary, sin symlinks ni stubs). academic-scheduling / report-builder / up1-manager quedan como propagacion DET-16 (priority could) en el backlog del ticket — no son precondicion ni dependencia de este fix.

### DEC-LOCAL-05: alinear `vue` en el typecheck del mod (`paths` en tsconfig) — S2
El mod tiene una copia anidada `vue@3.5.28` mientras el root del monorepo hoistea `vue@3.5.38`. En el typecheck standalone, el shim resolvia `import('vue').Component` contra la 3.5.28 y `@storybook/vue3-vite` (root) contra la 3.5.38 → dos `Component`/`@vue/runtime-core` estructuralmente distintos → stack depth + CSF errors en las stories (y, verificado, vue-tsc puede fallar duro con "two different types with this name exist"). Se agrega `paths: { "vue": ["../../node_modules/vue"] }` en `tsconfig.json` para que el typecheck use una sola vue (la del root). Es el mismo criterio que `vitest.config.ts` ya aplica para runtime (alias `vue` → root, documentado ahi por "Missing ref owner context" / doble copia). El `dependencies.vue: ^3.5.28` del mod cubre 3.5.38, asi que no hay divergencia real entre lo typecheckeado y lo instalado. Detectado por el dual-judge de S2 como decision sin registro; documentado aqui.

## Acceptance checkpoints

- `npm test` (mod): 80 archivos / 1442 tests verde (== baseline develop pre-codemod).
- `npm run typecheck` (mod): 0 errores `TS2307` de los alias del boundary (baseline preexistente no cuenta).
- `npm run build-storybook` (mod): build sin error de resolucion.
</content>
</invoke>
