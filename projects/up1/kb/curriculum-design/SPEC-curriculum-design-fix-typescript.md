---
id: SPEC-curriculum-design-fix-typescript
project: up1
module: curriculum-design
status: done
ticket: TICKET-014
external: UPONE-1038
meta_specs: []
created: '2026-05-07'
updated: '2026-05-07'
tags:
  - typescript
  - tooling
  - typing
  - vueform
  - fix
depends_on:
  - SPEC-curriculum-design-improve-eslint
---

# Resolver 84 errores TS en mod curriculum-design (defineElement opaque + paths sin tsconfig)

## Purpose

Resolver los 84 errores TS detectados en el mod `curriculum-design` durante el cierre de TICKET-013, normalizando el typing del modulo. El mod no tenia tsconfig.json propio y `defineElement` de Vueform es `any` upstream — los SFCs custom Vueform reportan `Property X does not exist on type {}` en cada acceso del template, y los helpers TS reportan paths sin resolver. Devs y herramientas (Volar, vue-tsc) ven el modulo con typing roto pese a que runtime y vitest funcionan correctamente.

## Diagnostico (POC ejecutado en design-fix)

POC con 3 iteraciones empíricas confirmando approach A (declaration merge):

| Iteracion | Cambios | Errores TS |
|-----------|---------|------------|
| Inicial (sin nada) | mod sin tsconfig | 84 |
| + tsconfig + declaration merge basico | paths `@/*` → layout/src, `defineElement<P,S>` con generics | 17 |
| + Options API en defineElement + vite/client types | `computed/mounted/methods/watch/...` en types, ImportMeta.env | 10 |
| Estado actual del POC limpio | (POC removido para arrancar execute con repo limpio) | — |

**Causa raiz por categoria** (84 errores totales):
1. **TS2339 (~70)** — `defineElement: any` en `node_modules/@vueform/vueform/types/index.d.ts:82`. El componente exportado es `any`, Volar/vue-tsc usan `{}` para bindings del template. Cubre todos los accesos en `<template>` a setup return + props (`modalState`, `viewState`, `tree`, `loading`, `$t`, `el$`, etc.).
2. **TS2307 (~5)** — Mod sin `tsconfig.json` propio. Imports `@/composables/...` (alias del layout) y `../../components/atoms|molecules` (relativos validos solo post-sync, cuando el SFC vive en `layout/src/modsComponents/`) no resuelven en typecheck local.
3. **TS7006 (~1)** — `setup(props)` sin tipo en CompositeSectionTreeElement.vue:227. defineElement no propaga `Props` tipado al callback.
4. **TS2339 residual (~2)** — `'element' does not exist on slot type` en `<template #element>` — el ElementLayout default slots type upstream no incluye `element`.
5. **TS2322 (~1)** — `saveError: ref<string | null>(null)` pasado como prop a un componente que espera `string | undefined`.
6. **TS7006 (~1)** — callback inline `(v) => { if (!v) closeModal() }` con parametro implicit any.

## Requirements

### REQ-FIX-01: `npm run typecheck` ejecutable

El mod MUST proveer comando `npm run typecheck` que ejecuta `vue-tsc --noEmit` con el tsconfig del mod sin error de configuracion.

**Actor**: developer
**Layers**: tooling

#### Scenario: typecheck runnable
- **GIVEN** mod con tsconfig.json + types/vueform.d.ts + scripts en package.json
- **WHEN** `npm run typecheck` desde el root del mod
- **THEN** comando ejecuta sin error de config y reporta 0 errores

#### Test scenarios
| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| 1 | TC-01 typecheck runnable | tsconfig + d.ts + scripts | `npm run typecheck` | exit 0 sin error de config |

### REQ-FIX-02: 0 errores TS post-fix

El mod MUST tener 0 errores TS al ejecutar `npm run typecheck`.

**Actor**: reviewer
**Layers**: tooling

#### Scenario: typecheck clean
- **GIVEN** todas las tareas del spec ejecutadas
- **WHEN** `npm run typecheck`
- **THEN** "Found 0 errors", exit 0

**Contrast**: 84 → 0 errores.

### REQ-PRESERVE-01: vitest sin regresion

El mod MUST mantener `npm test` (vitest) reportando 399/399 passed, identico a baseline TICKET-013.

#### Scenario: vitest baseline
- **GIVEN** todas las tareas del spec ejecutadas
- **WHEN** `npm test` desde el mod
- **THEN** 18 files / 399 tests / 0 failed (mismo conteo que TICKET-013 close)

### REQ-PRESERVE-02: lint sin regresion

El mod MUST mantener `npm run lint` reportando "0 problems".

### REQ-PRESERVE-03: sync sin regresion

`npm run sync` desde monorepo root MUST ejecutar sin error (3/3 success).

### REQ-PRESERVE-04: runtime de SFCs sin regresion

Los 2 SFCs custom Vueform (CompositeSectionTreeElement, RichTextRendererElement) DEBEN seguir renderizando correctamente post-sync. Validacion: smoke manual en suite o test integration que monte el SFC.

## Artifacts

### Added — `up1/mods/curriculum-design/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "strict": true,
    "noFallthroughCasesInSwitch": true,
    "paths": { "@/*": ["../../layout/src/*"] },
    "types": ["node", "vite/client"],
    "allowJs": true,
    "noEmit": true
  },
  "include": [
    "modsComponents/**/*.ts",
    "modsComponents/**/*.vue",
    "modsComponents/**/*.d.ts",
    "tests/**/*.ts",
    "types/**/*.d.ts"
  ],
  "exclude": ["node_modules", "dist", "coverage"]
}
```

### Added — `up1/mods/curriculum-design/types/vueform.d.ts`

Declaration merge sobre `@vueform/vueform`:

- Aumentar `defineElement<Props, SetupReturn>(...)` con generics para propagar tipos al template
- Soporte para Options API (data, computed, methods, watch, mounted, etc.) — Vueform admite ambos estilos
- Extender los slots de `ElementLayout` para incluir `element` (cubre `<template #element>`)

### Modified — `up1/mods/curriculum-design/package.json`

Agregar script `typecheck`:

```json
"scripts": {
  "typecheck": "../../node_modules/.bin/vue-tsc --noEmit"
}
```

### Modified — Migrar imports relativos a alias

5 archivos del mod cambian `../../components/atoms|molecules` por `@/components/atoms|molecules`:

| Archivo | Linea(s) |
|---------|----------|
| `modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue` | 159, 160 |
| `modsComponents/CompositeSectionTree/CompositeSectionForm.ts` | 13 |
| `modsComponents/CompositeSectionTree/CompositeSectionNode.ts` | 18 |
| `modsComponents/CompositeSectionTree/CompositeSectionView.ts` | 13 |
| `modsComponents/RichTextRenderer/RichTextRendererElement.vue` | 38 |

Equivalencia post-sync: `@/components/atoms` resuelve a `layout/src/components/atoms` (verificado en `layout/vite.config.ts` — alias `@` mapea a `src/`).

### Modified — Fixes puntuales descubiertos por TS

- `CompositeSectionTreeElement.vue:227` — `setup(props: SetupProps)` con interface derivada de los props (resuelve TS7006)
- `CompositeSectionTreeElement.vue:111` — callback `(v: boolean) => { if (!v) closeModal() }` (resuelve TS7006)
- `CompositeSectionTreeElement.vue` (saveError) — cambiar `ref<string | null>(null)` a `ref<string | undefined>(undefined)`, ajustar setters de `.value = null` a `.value = undefined` (resuelve TS2322). Verificar consumers (CompositeSectionForm prop saveError).

### Modified — `.ai/PATTERNS.md`

Agregar seccion "Typecheck del mod (UPONE-1038)":
- Como correr (`npm run typecheck`)
- Approach del typing: declaration merge sobre `@vueform/vueform`
- tsconfig paths estrategia (`@/*` → `../../layout/src/*` para simular post-sync)
- Convencion de imports (usar `@/components/...`, no relativos `../../components/...`)
- Limitacion: typecheck local NO valida el codigo post-sync exactamente — los SFCs viven en `layout/src/modsComponents/` post-sync

## Tasks

### Session 1 — Infra typing del mod [tipo: auto] [tier: T2]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S1.T1 | Capturar baseline TS errors (84 esperados) + vitest baseline | researcher | — | (read-only) | DET-1, DET-2, DET-11 | conteo + categoria por TS code documentado | done | 1 |
| S1.T2 | Crear `tsconfig.json` del mod | developer | S1.T1 | `tsconfig.json` (new) | DET-5, DET-8, DET-10, DET-11 | parseable por vue-tsc, paths definidos correctamente | done | 1 |
| S1.T3 | Crear `types/vueform.d.ts` con declaration merge | developer | S1.T2 | `types/vueform.d.ts` (new) | DET-5, DET-8, DET-10 | declaration aplicada — TS2339 baja de ~70 a ~2 (los del slot `element`) | done | 1 |
| S1.T3b | Crear `types/layout-shims.d.ts` con shims de modulos `@/components/*` y `@/composables/*` (decoupling del codigo source del layout) | developer | S1.T3 | `types/layout-shims.d.ts` (new) | typecheck NO procesa codigo source del layout (resuelve transitivos como TableCell.vue:17 fuera de scope) | done | 1 |
| S1.T4 | Agregar script `typecheck` a `package.json` | developer | S1.T3 | `package.json` | DET-5, DET-8, DET-10 | `npm run typecheck` ejecuta sin error de config | done | 1 |
| S1.T5 | Migrar imports `../../components/*` a `@/components/*` en 5 archivos | developer | S1.T4 | 5 archivos del mod | DET-5, DET-8, DET-10, RULE-mods-014 | TS2307 baja a 0. Vitest sin regresion | done | 1 |
| **S1.GATE** | Validar typecheck post-infra (esperado: ~3-4 errores residuales que van en S2) | reviewer | S1.T1..T5 | typecheck output | DET-13, DET-14, DET-20 | 4 errores residuales: TS2339 x2 (slot 'element'), TS7006 x1 (:111), TS2322 x1 (:125). Plan S2 ajustado: agregar T7b (suprimir slot 'element' con @ts-expect-error) | done | 1 |

### Session 2 — Fixes de bugs reales descubiertos por TS [tipo: auto] [tier: T2]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S2.T6 | Tipar `setup(props)` en CompositeSectionTreeElement.vue:227 — final: NO requiere anotacion explicita, declaration merge de defineElement infiere correctamente | developer | S1.GATE | `CompositeSectionTreeElement.vue` | DET-5, DET-8, DET-10 | TS7006 baja. Vitest sin regresion | done | 2 |
| S2.T7 | Fix callback `(v: boolean) => ...` en `CompositeSectionTreeElement.vue:111` (TS7006) | developer | S2.T6 | `CompositeSectionTreeElement.vue` | DET-5, DET-8, DET-10 | TS7006 :111 baja | done | 2 |
| S2.T7b | Suprimir TS2339 del slot 'element' con `@vue-expect-error` en los 2 SFCs (registrado en F1) | developer | S2.T7 | 2 SFCs | DET-5, DET-8, DET-10 | TS2339 baja a 0. Documentado en PATTERNS.md como limitacion conocida | done | 2 |
| S2.T8 | Fix `saveError` type: `ref<string \| null>` → `ref<string \| undefined>` + 6 setters ajustados (TS2322) | developer | S2.T7 | `CompositeSectionTreeElement.vue` | DET-5, DET-8, DET-10 | TS2322 baja, vitest sin regresion (consumers compatibles, prop type del Form admite null) | done | 2 |
| S2.T8b | Refinar shims sin `any`: `import('vue').Component` para atoms/molecules + Apollo response shape `{ data, errors? }` | developer | S2.T8 | `types/layout-shims.d.ts` | DET-5, DET-8, DET-10 | typecheck sigue 0 errores. Mejor expresividad y intencion sin `any` ciego | done | 2 |
| S2.T8c | **Revertir** migracion de imports `@/components/...` a relativos `../../components/...` (rompia runtime suite Nuxt — F4 documentado). Cambiar shims a wildcards `*/components/atoms` (matchea relativos) | developer | S2.T8b | 5 SFCs/TS + `types/layout-shims.d.ts` + `vitest.config.ts` | DET-5, DET-8, DET-10 | typecheck 0, vitest 399/399, sync 3/3, runtime suite no rompe | done | 2 |
| S2.T9 | Validacion final regression | reviewer | S2.T8c | (read-only) | DET-5, DET-7, DET-13, DET-14 | typecheck 0, vitest 399/399, lint 0 problems, sync 3/3 success — todos confirmados | done | 2 |
| S2.T10 | Documentar approach en `.ai/PATTERNS.md` seccion "Typecheck del mod (UPONE-1038)" | developer | S2.T9 | `.ai/PATTERNS.md` | DET-2, DET-13 | seccion agregada con como correr, arquitectura del typing (3 archivos), convencion de imports, limitaciones, mantenimiento | done | 2 |
| **S2.GATE** | Aceptacion final + decision continue | reviewer | S2.T6..T10 | ticket+spec | DET-13, DET-14, DET-19, DET-20 | matriz REQ→TC completa: REQ-FIX-01/02 passed, REQ-PRESERVE-01/02/03/04 passed. Decision: continue → request-close | done | 2 |

## Constraints

- **RULE-mods-014** — atoms del layout-library: la migracion de imports a alias `@/components/...` no cambia que los SFCs sigan usando atoms intencionales (justifica el approach).
- **RULE-platform-001** — CSS inline en SFCs Vueform: NO se modifica CSS en este ticket.
- **RULE-platform-003** — helpers >15 LOC extraidos: el mod ya cumple, no se introduce typing TS-specific en helpers existentes.
- **DET-19** — branch/commits usan `UPONE-1038` (external del ticket). Records DKC usan TICKET-014.
- **DEC-LOCAL-01**: approach A (declaration merge) > B (helper) > C (script setup). Validado empíricamente.
- **DEC-LOCAL-02**: migrar imports relativos a alias `@/components/...`.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `vue-tsc` en `up1/node_modules/.bin/` | internal | binario typecheck | Si actualiza version, validar declaration merge sigue funcionando |
| `@vueform/vueform` upstream | external | declaration merge depende de la firma actual (`defineElement: any`) | Si Vueform tipa correctamente upstream en futuro update, declaration merge sigue siendo compatible (mas restrictivo, no rompe) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Migracion `../../components/*` → `@/components/*` rompe runtime post-sync | low | high | `@` resuelve a `src/` en layout vite config (verificado). Validar con `npm run sync` + smoke en suite (S2.T9) |
| Declaration merge no funciona en vue-tsc 3.x | low | medium | POC empirico confirmo: TS2339 bajo de ~70 a 2 |
| Extender ElementLayout slots interfiere con tipos upstream | low | low | declaration merge es additivo. Si rompe, fix puntual |
| Typecheck pre-sync no cubre el codigo post-sync exactamente | medium | low | typecheck pre-sync valida el source — suficiente para CI/dev. Documentar limitacion en PATTERNS.md |
| `setup(props: SetupProps)` desincronizado de `props: { ... }` | low | low | TS detecta divergencia. Documentar mantenimiento en PATTERNS.md |
| Cambio de `saveError: null` → `undefined` rompe consumer (CompositeSectionForm) | medium | medium | Verificar prop type del consumer en S2.T8. Si espera `string \| null`, alinear ambos |

## Open questions

Ninguna. POC respondio las dudas de viabilidad.

## Decisions

### DEC-LOCAL-01: Approach A (declaration merge) sobre B (helper) y C (script setup)
- **Contexto**: 3 approaches viables para resolver TS2339 (defineElement opaque)
- **Drivers**: cero refactor de SFCs, viabilidad upstream (no toca @vueform/vueform), validacion empirica
- **Opcion elegida**: declaration merge en `types/vueform.d.ts` con generics
- **Alternativas**:
  - B (helper `defineUpElement<P,S>`): rechazada — requiere cambiar `defineElement` por `defineUpElement` en cada SFC, mas refactor
  - C (`<script setup lang="ts">`): rechazada — incierto si Vueform soporta para custom elements (su patron canonico es `export default defineElement({...})`)
- **Consecuencias**:
  - Gana: cambio acotado, escalable a futuros SFCs Vueform en el mod
  - Pierde: maintenance si Vueform actualiza upstream (declaration merge se mantiene compatible salvo cambios disruptivos)
- **Session**: 1 (design-fix, POC)

### DEC-LOCAL-02: Migrar imports relativos a alias `@/components/...`
- **Contexto**: TS2307 ~5 errores por imports `../../components/atoms|molecules`
- **Drivers**: simplicidad (no crear stubs), alineamiento con post-sync, idempotencia entre pre y post sync
- **Opcion elegida**: migrar 5 archivos a `@/components/...`
- **Alternativas**:
  - Stubs locales `mods/curriculum-design/components/atoms/index.ts` re-exportando: rechazada — agrega archivos que sync mecanismo podria interpretar
  - `// @ts-ignore` masivo: rechazada — oculta sin resolver
- **Consecuencias**:
  - Gana: typecheck local pasa con paths del tsconfig del mod, runtime post-sync sigue funcionando (vite alias `@` apunta a `src/`)
  - Pierde: ninguna — cambio mecanico
- **Session**: 1 (design-fix, POC)

## Success metrics

| Metric | Baseline | Target | How to measure |
|--------|----------|--------|----------------|
| TS errors | 84 | 0 | `npm run typecheck` |
| Vitest passed | 399/399 | 399/399 | `npm test` |
| Lint problems | 0 | 0 | `npm run lint` |
| Sync success | 3/3 | 3/3 | `npm run sync` |

## Technical reference

### tsconfig path mapping rationale

- `@/*` → `../../layout/src/*` simula contexto post-sync (donde el SFC vive en `layout/src/modsComponents/`).
- Despues del sync: `@/components/atoms` desde `layout/src/modsComponents/...vue` resuelve a `layout/src/components/atoms` (vite alias `@` → `src/`).
- En typecheck local: `@/components/atoms` desde `mods/curriculum-design/modsComponents/...vue` resuelve a `up1/layout/src/components/atoms` (tsconfig path).

### Vueform declaration merge structure

```ts
declare module '@vueform/vueform' {
  export function defineElement<
    Props extends ComponentObjectPropsOptions,
    SetupReturn extends Record<string, any>
  >(options: {
    name: string
    submits?: boolean
    components?: Record<string, any>
    props?: Props
    emits?: string[]
    setup?: (props: ExtractPropTypes<Props>, ctx: any) => SetupReturn
    // Options API
    data?: () => Record<string, any>
    computed?: Record<string, any>
    methods?: Record<string, any>
    watch?: Record<string, any>
    mounted?: () => void
    // ... otros lifecycle
  }): DefineComponent<Props, SetupReturn>
}
```

## Rules discovered

(Se llena durante execute si hay discoveries.)

## Bugs found

(Se llena durante execute. Los TS2322/TS7006 son fixes legitimos de bugs latentes — se documentaran al cierre.)

## Acceptance checkpoints

- [x] **Funcional**: `npm run typecheck` ejecuta sin error de config + reporta exit 0
- [x] **Tests**: `npm test` 399/399 sin regresion respecto a baseline TICKET-013
- [x] **NFRs**: N/A
- [x] **Rules**: RULE-mods-014 respetada (imports siguen apuntando a atoms del layout-library, ubicacion: relativos validos post-sync)
- [x] **Integration**: `npm run sync` 3/3 success. SFC sincronizado al layout valido sin error vite (verificado tras revert de F4)
- [x] **Docs**: `.ai/PATTERNS.md` agrega seccion "Typecheck del mod (UPONE-1038)"
