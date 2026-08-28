---
id: TICKET-014
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1038
module: curriculum-design
autopilot: manual
---

# Resolver 84 errores TS en mod curriculum-design (defineElement opaque + paths sin tsconfig)

## Request

Descubierto al cierre del TICKET-013 (eslint config del mod): el mod `curriculum-design` reporta **84 errores TS** cuando se ejecuta `vue-tsc --noEmit` sobre `modsComponents/`. Los errores son visibles en el IDE (Volar/TS plugin) pero no bloquean runtime ni tests (vitest pasa 399/399).

**Distribucion**:

| Categoria | Codigo | Cantidad aprox | Causa raiz |
|-----------|--------|----------------|------------|
| Setup return invisible al template | `TS2339` | ~70 | `defineElement` de Vueform tiene firma de tipo opaca — Volar/vue-tsc trata las bindings expuestas por `setup()` como `{}`. Cada acceso en el template (`modalState`, `viewState`, `tree`, `loading`, `error`, `$t`, `el$`, etc.) reporta `Property X does not exist on type '{}'` |
| Paths no resueltos | `TS2307` | ~5 | `@/composables/useApolloClient`, `../../components/atoms`, `../../components/molecules`. El mod no tiene `tsconfig.json` propio que mapee los paths del monorepo |
| Props implicit any | `TS7006` | ~1 | `setup(props)` sin tipo explicito porque los props de `defineElement` no se infieren con tipo |

**SFCs afectados**: 2 (los unicos con `defineElement` en el mod):
- `modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue`
- `modsComponents/RichTextRenderer/RichTextRendererElement.vue`

**Helpers `.ts` afectados** (TS2307): `CompositeSectionView.ts`, `useCompositeSectionTree.ts`, etc — todos los que importan paths del monorepo.

**Alcance del ticket**:
- Crear `tsconfig.json` propio del mod con paths del monorepo (resuelve los ~5 TS2307)
- Tipar `props` con `PropType<...>` explicito (resuelve TS7006)
- Resolver TS2339 — opciones a evaluar en design-fix:
  - Refactor a `<script setup lang="ts">` con `defineElement` envolviendo el setup return
  - Crear helper `defineUpElement<T>` que propague setup return type via generics
  - Aumentar typings de `@vueform/vueform` con declaration merge
- Agregar script `typecheck` al `package.json` apuntando a `vue-tsc --noEmit`
- Validar: `npm run typecheck` reporta 0 errors
- Documentar pattern en `.ai/PATTERNS.md` para futuros SFCs Vueform del mod

**Referencias**:
- Predecesor: TICKET-013 (cerrado, eslint config del mod)
- Backlog item B1 del TICKET-013 (prioridad `should`)
- Posible coordinacion con platform si el fix requiere cambios en types upstream de Vueform

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | single (curriculum-design) |
| Modulo principal | curriculum-design |
| Modulos afectados | — (potencial coordinacion con platform si se aumentan types de Vueform) |

## Creation scope

- `creates_visual`: false (cambio de tooling/typing, no toca UI)
- `creates_data`: false (no introduce entidades nuevas)
- Justificacion: ticket de typing — el alcance es deuda tecnica de TS, sin impacto en data ni en UI runtime

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | TS2307 (~5) se resuelven con tsconfig.json del mod con paths apuntando a `../../layout/src` (donde viven los composables y componentes que el mod consume post-sync) | confirmed | Layout tsconfig:22-26 mapea `@/*` a `./src/*`. Composable `useApolloClient` existe en `layout/src/composables/useApolloClient.ts`. Atoms en `layout/src/components/atoms/`. El mod escribe codigo asumiendo contexto post-sync (cuando el SFC vive en `layout/src/modsComponents/`) |
| H2 | TS7006 (~1) se resuelve tipando `setup(props: SetupProps)` con interface o usando `PropType<...>` derivado | confirmed | Pattern estandar Vue 3 — solo requiere tipado explicito |
| H3 | TS2339 (~70) viene de `defineElement: any` en `@vueform/vueform/types/index.d.ts:82`. El resultado del SFC es `any`, Volar usa `{}` para bindings del template. Approaches: (a) declaration merge sobre `@vueform/vueform` con generics, (b) helper local `defineUpElement<P,S>` que wrappa defineElement y expone DefineComponent<P,S>, (c) `<script setup lang="ts">` (incierto si Vueform lo soporta para custom elements) | confirmed | Grep directo a declaracion. `VueformElement` SI esta tipado como `interface ... extends DefineComponent` — Vueform tiene tipos parciales |
| H4 | Complejidad: media. Approach (b) helper local es el mas seguro (cero coordinacion platform, cambio mecanico). Approach (a) declaration merge puede tener limitaciones con tipos `any` upstream — probar primero | confirmed | RichTextRendererElement.vue ~96 LOC, CompositeSectionTreeElement.vue ~1000 LOC. Solo 2 SFCs con defineElement |
| H5 | El path `../../components/atoms` (relativo) en imports del mod resuelve solo post-sync. Para typecheck local (pre-sync) se necesita: (i) migrar a alias `@/components/atoms` Y mapear `@/*` a `../../layout/src/*`, O (ii) typecheck en ubicacion sincronizada (requiere `npm run sync` antes) | confirmed | El SFC vive en `mods/curriculum-design/modsComponents/` pre-sync, en `layout/src/modsComponents/` post-sync. Solo en el segundo `../../components/atoms` resuelve a `layout/src/components/atoms` |

### Context found

**Causa raiz exacta** (researcher, 2026-05-07):

1. **TS2339 (~70 errores) — defineElement opaque**:
   - `node_modules/@vueform/vueform/types/index.d.ts:82` declara `const defineElement: any;`
   - Resultado: el componente exportado por `defineElement({...})` es tipo `any`
   - Volar/vue-tsc cuando type-checkea el `<template>` busca el setup return type del componente, recibe `any`/falsy, y usa `{}` como fallback
   - Cada acceso del template (`modalState`, `viewState`, `tree`, `loading`, `error`, `$t`, `el$`, etc.) reporta `Property X does not exist on type '{}'`
   - **Vueform SI tiene tipos parciales**: existe `interface VueformElement extends DefineComponent { el$: VueformElement; ... }` y `interface ButtonElementProps`, etc. Pero `defineElement` la funcion factory es `any`

2. **TS2307 (~5 errores) — paths sin tsconfig**:
   - El mod NO tiene `tsconfig.json` propio
   - Imports usados:
     - `@/composables/useApolloClient` — el alias `@/` mapea a `./src/*` en `up1/layout/tsconfig.json:22-26`
     - `../../components/atoms`, `../../components/molecules` — paths relativos
   - Donde existen los archivos:
     - `up1/layout/src/composables/useApolloClient.ts`
     - `up1/layout/src/components/atoms/`, `molecules/`
   - El mod escribe codigo asumiendo contexto **post-sync**:
     - Pre-sync: SFC vive en `mods/curriculum-design/modsComponents/...` → `../../components/atoms` resuelve a `mods/curriculum-design/components/atoms/` (NO existe)
     - Post-sync: SFC vive en `layout/src/modsComponents/...` → `../../components/atoms` resuelve a `layout/src/components/atoms/` (existe)
   - Por lo tanto: typecheck local del mod requiere mapear paths para simular el contexto post-sync

3. **TS7006 (~1 error) — props implicit any**:
   - `CompositeSectionTreeElement.vue:227` declara `setup(props)` sin tipo
   - Causa: defineElement no propaga el `Props` tipado al callback de setup
   - Fix directo: tipar `setup(props: PropType<...>)` o usar interface dedicada

**Layout config base de referencia**:
- `up1/layout/tsconfig.json` — strict, paths `@/*` a `./src/*`, lib ES2020+DOM, jsx preserve, isolatedModules, declaration emit
- `up1/layout/vueform.config.ts` — registra elements via glob `./src/modsComponents/*/*.vue` (confirma que post-sync el SFC vive ahi)

**SFCs custom Vueform en el mod** (los unicos afectados por TS2339):
- `modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue` (~1000 LOC, 24 props, ~25 setup return entries)
- `modsComponents/RichTextRenderer/RichTextRendererElement.vue` (~96 LOC, ~3 props, ~4 setup return entries)

**Helpers y subcomponentes con TS2307**:
- `modsComponents/CompositeSectionTree/CompositeSectionView.ts:13` (`../../components/atoms`)
- `modsComponents/CompositeSectionTree/CompositeSectionForm.ts` (similar)
- `modsComponents/CompositeSectionTree/CompositeSectionNode.ts` (similar)
- `modsComponents/CompositeSectionTree/useCompositeSectionTree.ts:11` (`@/composables/useApolloClient`)

**Bugs / rules / specs del modulo aplicables**:
- BUG-platform-012 (sync-styles no auto-importa CSS) — NO aplica al typing
- RULE-platform-001 (CSS inline en SFCs Vueform) — el ticket NO modifica CSS de SFCs
- RULE-platform-003 (helpers >15 LOC extraidos a .ts) — el mod ya cumple. Las extracciones no se tocan
- RULE-mods-014/015 — atoms del layout-library + i18n — no afectados por typing

**Decisiones tomadas con el dev (intake)**:
- Branch: continuar en `UPONE-1038-eslint-config` (mismo epic, ampliacion del scope a typing)
- External: TICKET-014 ahora con `external: UPONE-1038`
- Commits con prefijo `UPONE-1038 fix:` (no `TICKET-014`)

**Approaches viables a evaluar en design-fix**:
- **A**: declaration merge en el mod sobre `@vueform/vueform` para aumentar `defineElement` con generics
- **B**: helper local `defineUpElement<P,S>` que envuelve `_defineElement` y expone `DefineComponent<P,S>`
- **C**: refactor a `<script setup lang="ts">` — incierto si Vueform soporta (su patron canonico usa `defineElement({...})` como `export default`)
- **Combinaciones**: A o B + tsconfig + props tipados

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1038-eslint-config` (continua en la misma rama del TICKET-013, decision dev — epic ampliado para cubrir tooling+typing del mod). Los commits del 014 llevan prefijo `UPONE-1038 fix:` |
| Base branch | `develop` (mod) |
| DB state | N/A |
| Services | vue-tsc del monorepo (`up1/node_modules/.bin/vue-tsc`) |
| Test data | N/A |
| Working dir | `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design/` |

### Reproduction steps

1. cd `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design/`
2. Crear `tsconfig.check.json` minimo con `include: ['modsComponents/**/*.{ts,vue}']`
3. Ejecutar `../../node_modules/.bin/vue-tsc -p tsconfig.check.json --noEmit`
4. Esperado actualmente: 84 errores TS (TS2339 ~70 + TS2307 ~5 + TS7006 ~1)

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | `npm run sync` regenera schemas Prisma + GraphQL typedefs desde solo los mods activos. Mods en `ignoredMods` pierden sus models/objects/lang del state sincronizado. Para que un mod siga funcionando en runtime tras un sync, debe estar fuera de `ignoredMods`. La decision dev en memoria `feedback_curriculum_design_dev_pattern` ("monorepo se mantiene limpio") aplica solo si no se corren syncs — si el dev SI corre sync (como acceptance check), todos los mods deben estar activos | passive (descubierto en runtime-fix) | 2 | refined | DECISION-014 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| F1 | Extender slots de ElementLayout via `interface ElementLayoutSlots { element?: ... }` en declaration merge | El interface no existe upstream (`@vueform/vueform/types/index.d.ts` declara `ElementLayout` como class con `$props` pero NO expone slots como interface). Mi declaracion creaba un nuevo interface que no se enlazaba con la inferencia que Volar hace sobre el componente real. Los 2 TS2339 sobre slot 'element' persistieron | Volar/vue-tsc infiere slots desde la implementacion del componente, no desde interfaces declaradas externamente. Para extender slots de un componente upstream tipado como class, hay que aumentar el class itself o suprimir el error con @ts-expect-error documentado |
| F2 | tsconfig path mapping `"../../components/*": ["../../layout/src/components/*"]` para evitar migrar imports relativos | TypeScript paths NO acepta keys con prefijos relativos `../`. La directive se ignora silenciosamente | Migrar imports a alias `@/...` es la unica via — los relativos NO se pueden re-mapear via tsconfig paths |
| F3 | tsconfig con `paths: {"@/*": ["../../layout/src/*"]}` resolviendo via path mapping | El path mapping resuelve antes que las declaraciones de modulo en `.d.ts` shim. vue-tsc terminaba procesando codigo source del layout (`TableCell.vue` etc.) reportando errores transitivos fuera del scope del mod | Para aislar typecheck del codigo upstream: usar shims `.d.ts` con `declare module '@/components/...'` SIN definir `paths` en tsconfig. Los shims tienen precedencia |
| F4 | Migrar imports `../../components/atoms` → `@/components/atoms` para que el typecheck resuelva via shim | Rompio el runtime en suite (Nuxt). El suite NO tiene `@` alias al layout — `@` esta reservado para el root del proyecto Nuxt. Post-sync el SFC se copia a `layout/src/modsComponents/` y al cargarlo desde suite, vite reporta `Failed to resolve import "@/components/atoms"`. Solo el layout/storybook tiene `@` → `src/` | NO migrar imports relativos del mod cuando el path resuelve por relativo en el contexto donde se ejecuta. Para typecheck local, usar wildcards en shims (`declare module '*/components/atoms'`) — matchea cualquier path que termina asi, incluidos relativos. Verificar antes de migrar imports: que TODOS los contextos runtime (layout vite, suite Nuxt, storybook, vitest) resuelvan el alias destino |
| F5 | Shim `.d.ts` con `import type { Component } from 'vue'` top-level | El import top-level convirtio el archivo de "ambient module declaration" a "module file". Las `declare module '@/...'` se volvieron module augmentations (no declaraciones standalone) y los modulos no se encontraron — TS2307 reaparecio | En `.d.ts` ambient: NO usar `import type` top-level. Usar `import('vue').Component` inline en cada declaracion para mantener el archivo como ambient |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|------------|--------------|-----------|
| ~~B1~~ | ~~Investigar hydration mismatch en runtime SSR del suite (probable causa: `saveError: undefined` serializa distinto entre server y cliente vs `null`)~~ | nuevo | descubierto post-S2.GATE durante smoke runtime | El cambio `saveError: ref<string \| null>(null)` → `ref<string \| undefined>(undefined)` en CompositeSectionTreeElement.vue (TICKET-014 S2.T8). Setters tambien cambiados de `null` a `undefined`. Resuelve TS2322 pero puede romper SSR hydration | **Resuelto en [TICKET-023](./ticket-023.md) (2026-05-12)** — hipotesis descartada con evidencia runtime via PW Python. Test diferencial confirmo que el mismatch viene del wrapper `[tenant_id].vue` de suite y aparece en CUALQUIER ruta del tenant (incluido `/UPU/profile` sin mod). Registrado como [BUG-platform-016](../bugs/platform/bug-platform-016.md). El cambio `saveError null→undefined` NO es la causa — puede mantenerse | ~~should~~ resolved (descartado) |

## Sessions

### Session 1 — Intake completado + design-fix (2026-05-07, en curso)

**Objetivo**: completar el intake con investigacion empirica de causas raiz, ejecutar design-fix (diagnostico → causa raiz → plan + spec con tasks), aprobar con el dev y pasar a execute.

**Actions log**

| Timestamp | Agent | Accion | Referencia | Detalle |
|-----------|-------|--------|------------|---------|
| 2026-05-07 | scribe | session-open | S1 | Session abierta tras decision dev de continuar en branch `UPONE-1038-eslint-config` con epic ampliado (TICKET-014 con external UPONE-1038) |
| 2026-05-07 | researcher | gather-context | vueform | Confirmacion empirica: `node_modules/@vueform/vueform/types/index.d.ts:82` declara `const defineElement: any` — causa raiz de TS2339. `VueformElement` SI esta tipado como interface extends DefineComponent |
| 2026-05-07 | researcher | gather-context | tsconfig | Layout `tsconfig.json` mapea `@/*` a `./src/*`. Composables y atoms viven en `up1/layout/src/`. Mod escribe codigo asumiendo contexto post-sync (SFC en `layout/src/modsComponents/`). El mod NO tiene tsconfig propio |
| 2026-05-07 | researcher | gather-context | mod-files | 2 SFCs con defineElement (CompositeSectionTreeElement.vue, RichTextRendererElement.vue). 4 helpers TS con paths relativos / alias. 1 setup() sin tipo en CompositeSectionTreeElement.vue:227 |
| 2026-05-07 | scribe | intake-fill | TICKET-014 | Triage actualizado con 5 hipotesis (H1..H5) — todas confirmed. Context found completo con causa raiz por categoria, evidencia, decisiones del dev, approaches viables. Status → in_progress |
| 2026-05-07 | architect | design-poc | approach-A | POC empirico ejecutado: tsconfig + declaration merge sobre @vueform/vueform redujeron 84 → 17 → 11 → 10 errores en iteraciones. Validado que approach A es viable. POC limpio (archivos POC removidos para arrancar execute con repo limpio) |
| 2026-05-07 | architect | design-spec | SPEC-curriculum-design-fix-typescript | Spec generado con 4 REQs (FIX-01/02 + PRESERVE-01/02/03/04), 11 tasks distribuidas en 2 sessions (S1: T1-T5+GATE infra, S2: T6-T10+GATE fixes), 6 risks con mitigacion, 2 DEC-LOCAL (approach A, alias migration). Status: in_progress (in disk). depends_on: SPEC-curriculum-design-improve-eslint |
| 2026-05-07 | scribe | spec-approved | SPEC-curriculum-design-fix-typescript | Dev aprobo spec en presentacion. Confirmacion explicita: "ejecuto autopilot, paro en commits/push/close" |
| 2026-05-07 | researcher | gather-context | S1.T1 | Baseline TS errors capturado: 84 totales (TS2339 x74, TS2307 x8, TS7006 x2). Vitest baseline: 399/399 |
| 2026-05-07 | developer | implement | S1.T2 | Creado `tsconfig.json` del mod (strict, ES2020, vite/client types, allowJs, sin `paths` — los shims tienen precedencia) |
| 2026-05-07 | developer | implement | S1.T3 | Creado `types/vueform.d.ts` con declaration merge sobre `defineElement<Props, SetupReturn>` con generics + Options API support. Resuelve ~70 TS2339 |
| 2026-05-07 | developer | implement | S1.T3b | Creado `types/layout-shims.d.ts` con `declare module '@/components/atoms'`, `'@/components/molecules'`, `'@/composables/useApolloClient'` (Component-typed, no `any`). Decoupling del codigo source del layout |
| 2026-05-07 | developer | implement | S1.T4 | Script `typecheck` agregado a package.json (`vue-tsc --noEmit`) |
| 2026-05-07 | developer | implement | S1.T5 | Migrados 5 imports de `../../components/*` a `@/components/*` (REVERTIDO en S2.T8c por F4) |
| 2026-05-07 | reviewer | gate-validation | S1.GATE | Post-S1: 4 errores residuales (TS2339 x2 slot 'element', TS7006 x1 callback :111, TS2322 x1 saveError). Plan S2 ajustado para incluir T7b (slot suppression). Recommendation: continue |
| 2026-05-07 | developer | implement | S2.T6 | `setup(props: any)` agregado en CompositeSectionTreeElement.vue:227. Posteriormente removido el `any` por feedback dev — la declaration merge infiere correctamente, NO requiere anotacion explicita |
| 2026-05-07 | developer | implement | S2.T7 | Tipado callback `(v: boolean)` en CompositeSectionTreeElement.vue:111 |
| 2026-05-07 | developer | implement | S2.T7b | Suprimido TS2339 del slot 'element' con `<!-- @vue-expect-error -->` documentado en CompositeSectionTreeElement.vue:39 y RichTextRendererElement.vue:19. Causa raiz registrada en F1 |
| 2026-05-07 | developer | implement | S2.T8 | Cambio `saveError: ref<string \| null>(null)` → `ref<string \| undefined>(undefined)` + 6 setters de `null` → `undefined`. TS2322 baja a 0 |
| 2026-05-07 | developer | refactor | S2.T8b | Refinado shims sin `any`: atoms/molecules tipados como `import('vue').Component`, `useTenantApolloClient` retorna shape real `{ data, errors? }` con `data: any` documentado. Encontrado y resuelto F5 (import top-level convirtio el .d.ts a module file) |
| 2026-05-07 | developer | bugfix | S2.T8c | Revertida migracion de imports `@/components/...` a relativos `../../components/...` tras descubrir F4 (suite Nuxt no tiene `@` alias al layout, runtime fallaba). Shims ajustados a wildcards `*/components/atoms` y `*/components/molecules`. Restaurado vitest.config alias original |
| 2026-05-07 | reviewer | review | S2.T9 | Validacion final round: typecheck 0 errors, vitest 399/399, sync 3/3 success, lint 0 problems. Todos REQs PRESERVE/FIX cumplidos |
| 2026-05-07 | developer | docs | S2.T10 | Agregada seccion "Typecheck del mod (UPONE-1038)" a `.ai/PATTERNS.md`: como correr, arquitectura del typing (3 archivos), convencion de imports (relativos para components, alias `@/` para composables), limitaciones (slot 'element', inferencia de props de atoms), mantenimiento |
| 2026-05-07 | reviewer | gate-validation | S2.GATE | Aceptacion final: 84 → 0 errores TS. Matriz REQ-FIX-01/02 + REQ-PRESERVE-01/02/03/04 todos passed. 5 failed approaches registrados con learnings. Recommendation: continue → request-close |
| 2026-05-07 | dev | smoke-test | runtime-suite | Reportado mensaje "No tiene permiso para realizar esta accion" en vista del mod tras cambios. Investigacion: i18n key `unauthorized` del suite (lang/es_CL.json:88), causa runtime RBAC/sesion. Tras relogear, vista funciona — sesion stale. NO causado por TICKET-014. Confirmado smoke OK |
| 2026-05-07 | dev | smoke-test | runtime-suite | Reportado "Error al cargar hwassessment" en hello-world-mod. Investigacion: `npm run sync` (corrido como acceptance check) regenero `object-manager/prisma/*/schema.prisma` removiendo HwAssessment porque hello-world-mod estaba en `ignoredMods`. Causa: el sync solo procesa mods activos, regenera schemas full — los models de mods en `ignoredMods` desaparecen del schema |
| 2026-05-07 | scribe | learn-captured | L1 | Aprendizaje: el `npm run sync` del monorepo regenera schemas Prisma y type defs GraphQL desde los mods activos (no los `ignoredMods`). Si un mod esta en `ignoredMods` y antes tenia presencia en suite/object-manager, sus models/objects/lang desaparecen tras el sync. Regla implicita: para que un mod siga funcionando en runtime, debe estar fuera de `ignoredMods` antes de cualquier sync. Status: raw |
| 2026-05-07 | developer | fix | runtime-fix | Removido `hello-world-mod` de `ignoredMods` en `up1/package.json`. Re-corrido `npm run sync` (75.81s object-manager + 0.40s layout + 0.79s suite, 3/3 success). Verificado: HwAssessment restaurado en `prisma/*/schema.prisma` (model + relations). Lang en `suite/lang/es_CL.json` con strings de hello-world. Curriculum-design sin regresion: typecheck 0, vitest 399/399, lint 0 |
| 2026-05-07 | dev | runtime-issue | hydration | Reportado "Hydration mismatch" en console del browser (Nuxt SSR). Sospechoso: el cambio `saveError: ref<string \| null>` → `ref<string \| undefined>` en CompositeSectionTreeElement.vue. SSR puede serializar `null` y cliente render `undefined`, generando mismatch. NO investigado a fondo por priorizar coexistencia. Capturado como B1 |

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-FIX-01 (TS2307 resueltos) | TC-01 | manual | COVERED — passed |
| REQ-FIX-02 (TS7006 resuelto) | TC-02 | manual | COVERED — passed |
| REQ-FIX-03 (TS2339 resueltos) | TC-03 | manual | COVERED — passed |
| REQ-PRESERVE-01 (vitest no rompe) | TC-04 | auto | COVERED — passed |
| REQ-PRESERVE-04 (runtime suite sin error) | TC-05 | manual | COVERED — passed |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | TS2307 (paths) resueltos | REQ-FIX-01 | manual | tsconfig.json + shims creados | `npm run typecheck` | 0 errores TS2307 | 0 errores TS2307 | log vue-tsc en S2.GATE | passed |
| TC-02 | TS7006 (props any) resuelto | REQ-FIX-02 | manual | declaration merge aplicado | `npm run typecheck` | 0 errores TS7006 | 0 errores TS7006 | log vue-tsc en S2.GATE | passed |
| TC-03 | TS2339 (template bindings) resueltos | REQ-FIX-03 | manual | approach A (declaration merge) + slot 'element' suprimido | `npm run typecheck` | 0 errores TS2339 | 0 errores TS2339 | log vue-tsc en S2.GATE | passed |
| TC-04 | vitest sigue pasando | REQ-PRESERVE-01 | auto | post-fix | `npm test` | 18 files / 399 tests / 0 failed | 18 files / 399 tests / 0 failed (3.14s) | log vitest en S2.GATE | passed |
| TC-05 | runtime suite sin error vite al cargar SFCs | REQ-PRESERVE-04 | manual | post-sync | reload suite + abrir vista que monta CompositeSectionTreeElement / RichTextRenderer | sin error vite "Failed to resolve import" | sin error post-revert F4 (imports relativos restaurados) | reportado por dev al detectar F4, validado tras revert | passed |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| vitest mod | `npm test` | 399/399 (TICKET-013 baseline) | — | — |
| TS check mod | `npm run typecheck` | 84 errores (74 TS2339 + 8 TS2307 + 2 TS7006) | 0 errores | -84 (eliminados) — nueva capacidad establecida |
| vitest mod | `npm test` | 18 files / 399 tests / 0 failed (= TICKET-013 baseline) | 18 files / 399 tests / 0 failed (3.14s) | sin regresion |
| lint mod | `npm run lint` | 0 problems (= TICKET-013 close) | 0 problems | sin regresion |
| sync monorepo | `npm run sync` | 3/3 success (= TICKET-013 close) | 3/3 success | sin regresion |

## Summary

### What was requested

Resolver los 84 errores TS detectados en el mod `curriculum-design` durante el cierre de TICKET-013. Causa raiz: `defineElement: any` upstream + paths sin tsconfig + bugs latentes (saveError, callbacks sin tipo).

### What was done

- Mod ahora tiene **typecheck propio** via `npm run typecheck` (vue-tsc), reportando 0 errores (de 84 baseline).
- Arquitectura del typing en 3 archivos:
  - `tsconfig.json` propio del mod (strict, vite/client types, allowJs).
  - `types/vueform.d.ts`: declaration merge sobre `@vueform/vueform` aumentando `defineElement<Props, SetupReturn>` con generics. Resuelve los ~70 TS2339 de bindings del template (causa raiz upstream).
  - `types/layout-shims.d.ts`: shims con wildcards (`*/components/atoms`, `*/components/molecules`) tipados como `import('vue').Component` (no `any`) + `@/composables/useApolloClient` con shape real `{ data, errors? }`.
- Bugs latentes resueltos:
  - `saveError: ref<string | null>` → `ref<string | undefined>` (alinea con consumer en CompositeSectionForm).
  - Callback inline `(v: boolean) =>` tipado en CompositeSectionTreeElement.vue:111.
  - `<template #element>` suprimido con `@vue-expect-error` documentado en 2 SFCs (slot 'element' valido en runtime de Vueform pero ausente de los tipos upstream).
- Pattern documentado en `.ai/PATTERNS.md` seccion "Typecheck del mod (UPONE-1038)" con como correr, arquitectura, convencion de imports, limitaciones, mantenimiento.

### What was learned

- **Learns capturados**: 0 directos durante execute (todos los discoveries quedaron como failed approaches con learnings — ver tabla Failed approaches: F1..F5).
- **Failed approaches registrados** (5):
  - **F1**: extender `interface ElementLayoutSlots` no funciona — Volar infiere slots desde el componente real, no desde interface upstream. Solucion: `@vue-expect-error` localizado.
  - **F2**: tsconfig paths con prefijos relativos `"../../components/*"` no aceptado por TS. Solucion: wildcards en shim `.d.ts`.
  - **F3**: paths mapping a layout source carga codigo transitivo con errores. Solucion: shims `.d.ts` con declaracion de modulo (precedencia sobre paths).
  - **F4**: migrar imports relativos a alias `@/components/...` rompe runtime suite Nuxt — `@` reservado para root del proyecto Nuxt, no apunta al layout. Solucion: mantener relativos + wildcards en shims.
  - **F5**: `import type` top-level convierte el `.d.ts` a "module file" y los `declare module` se vuelven augmentations sin efecto. Solucion: `import('vue').Component` inline.
- **Rules creadas**: 0 (los learnings son tactical sobre TS+Vueform+Nuxt, no warrant rule formal).
- **Decisions tomadas**: DEC-LOCAL-01 (approach A declaration merge sobre Vueform), DEC-LOCAL-02 (wildcards en shims, NO migrar imports a alias).
- **Bugs encontrados**: 0 explicitos. Los bugs latentes (saveError null, callback any) fueron fixeados como parte del scope.

### Pendiente

- Aplicar el mismo pattern (tsconfig + shims + declaration merge) a otros mods cuando tengan SFCs custom Vueform — backlog del workspace, no de este ticket.
- Si Vueform actualiza upstream y tipa `defineElement` correctamente, validar que la declaration merge sigue compatible.

### Metrics

| Metric | Value |
|--------|-------|
| Sessions | 1 (intake + design) + 1 (execute + close) |
| Tasks completed | 11/11 (S1.T1..T5 + S1.GATE + S2.T6..T10 + S2.T8b + S2.T8c + S2.GATE) |
| Commits | 0 (pendiente — el dev confirma antes de commitear) |
| Learns captured | 0 |
| Rules created | 0 |
| Decisions taken | 2 (DEC-LOCAL-01, DEC-LOCAL-02) |
| Bugs found | 0 (bugs latentes resueltos como parte del scope) |
| Test cases | 5 pass / 0 fail / 0 pending |
| Failed approaches | 5 (F1..F5) |
| Backlog items captured | 1 (B1 — hydration mismatch should) |
| Learns captured | 1 (L1 — sync regenera schemas omitiendo ignoredMods, status raw) |
| TS errors: pre → post | 84 → 0 |
| Vitest: pre → post | 399/399 → 399/399 (sin regresion) |
| Lint: pre → post | 0 problems → 0 problems (sin regresion) |
| Sync: pre → post | 3/3 success → 3/3 success (sin regresion) |
| Side effect resuelto | hello-world-mod removido de ignoredMods, schema con HwAssessment restaurado |
