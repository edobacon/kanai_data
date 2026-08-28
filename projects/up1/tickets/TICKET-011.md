---
id: TICKET-011
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1038
module: curriculum-design
autopilot: manual
---

# Plan de pruebas baseline + QA automatizado de curriculum-design SP1

## Request

Doble objetivo:

1. Cierre formal de los 10 TCs cerrados por override en TICKET-009 — reemplazar overrides documentales con evidencia automatizada real.
2. Construir red de seguridad (test plan baseline) que proteja el refactor del TICKET-010 contra regresiones silenciosas.

Contrato: la suite resultante debe estar VERDE antes de iniciar el TICKET-010. Cada fase del refactor 010 corre la suite YYY y solo commitea si verde.

## Estructura del plan

### Tests integration (Vitest + filesystem + Prisma)
- recordtypes-declared.test.ts — TC-009-01/02/03: 7 RTs declarados, no per-tenant, draft RTs ausentes (GeneralData/GraduationProfile/EntryProfile).
- seed-counts.test.ts — TC-009-10/11/12/13: counts UV (Modality=1, LO=3, Sessions=18, EvalComp=8, Bibliography=9, CustomSection=2) + AIEP (Modality=13, LO=40, Content=3, EvalComp=1) + CustomSection schema fijo (3 fields) + habilitacion semana 18 = Session.
- recordtypes-codegen.test.ts — TC-009-05/06: tablas Prisma generadas para los 7 RTs + filas en up1_layen_layout para layouts default_rt__*.
- composable-buildTree.test.ts (NUEVO, soporta refactor S3): parentId hierarchy, sort por position, nodos huerfanos a roots, ciclos detectados con visited set + warn + skip. Pure function exportable desde useCompositeSectionTree.
- sanitize-html.test.ts (NUEVO, soporta refactor S3): XSS canonicos (<img onerror>, <svg onload>, javascript: href, data: href, nested allowed/disallowed), preservacion de tags whitelist, force target=_blank rel=noopener en <a>.

### Tests E2E (Playwright + DKC config)
- detail-univalle.spec.ts — TC-009-14 a 19: overview UV con tabs + Modality 1 entry + LO 3 entries + Sessions 18 entries (incl. semana 18 habilitacion) + EvalComp 8 entries con jerarquia composite + Bibliography 9 entries con FK Institution UV + CustomSection 2 entries richText.
- detail-aiep.spec.ts — TC-009-20/21/22: overview AIEP + Content 3 (Theoretical/Practical) + EvalComp 1 (Nota 6).
- detail-stress.spec.ts — TC-009-23/24: 13 Modalities AIEP + 40 LO AIEP sin layout shift, scroll/paginacion funcional, performance < 2s render.
- composite-tree-flows.spec.ts — TC-009-08 + (~TC-009-07 POC obsoleto re-spec): DnD reorder sibling-only persiste posicion + edit modal con form custom + view modal read-only + validacion sumativa visual (Nota Final 100% vs sum hijos con tolerancia + borde rojo + tooltip).
- customsection-wysiwyg.spec.ts — TC-009-19 parte CustomSection: Trix editor en _edit + RichTextRenderer sanitizado en _view.
- coexistence.spec.ts — TC-009-28: detail filtra por ownerId=AA especifico, NO muestra objetos del seed core (Person/Faculty/Course de uPlanner University demo).
- create-flows.spec.ts — TC-009-09 re-spec: crear programa shell + crear seccion por tab (RT-tab pattern Session 6, no RT-picker original).

### Screenshots baseline
Capturar y guardar en tickets/TICKET-YYY.screenshots/ los screenshots clave ANTES del refactor 010. Tras cada fase del 010, re-capturar y diff visual. Vistas: tree expandido/colapsado, modal edit, modal view, DnD in progress, badge invalido validacion sumativa, WYSIWYG, detail UV/AIEP overview, stress AIEP, create programa shell, create seccion por tab.

## Contrato de la suite
- VERDE antes de iniciar TICKET-010 (bloqueante).
- VERDE despues de cada fase del refactor 010 antes de commit.
- NO se modifican tests durante el refactor — test rojo post-refactor = regresion, no test desactualizado (salvo cambio explicito documentado).

## Esfuerzo estimado
~3-4 dias de dev concentrado:
- Integration suites: 1d
- E2E suites: 2d (Playwright + DKC config + 7 specs)
- Screenshots baseline: 0.5d
- Estabilizacion (flakes, timing): 0.5d

## Sprint
Implementacion arranca AHORA bajo UPONE-1038. Commits con prefix UPONE-1038. Rama UPONE-1038-{descripcion} (ramificada de develop tras merge 87e1efb del 1035).

## Estrategia de paralelismo aprobada
Mientras se construye la suite YYY, se ejecutan en paralelo los quick wins must del TICKET-010 que son bajo riesgo (C4 codigo muerto, S1 cleanup compartido, E3 ciclos defensivo, magic numbers extraidos) — son cambios localizados ya cubiertos por validateWeightedSum + verificacion manual rapida. Los must con riesgo de comportamiento (C1 extraccion Vue, C2 prop tipada, C3 form, Cl1 i18n) esperan a la suite verde.

## Cierre TCs override del TICKET-009
La suite verde reemplaza los 10 overrides documentales del 009 con evidencia automatizada. Al cierre del YYY, los TCs override del 009 quedan COVERED por las suites correspondientes. Documentar el mapping en el Summary del YYY.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement |
| Tipo de cambio | — |
| Modulo principal | curriculum-design |
| Modulos afectados | — |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|

### Context found

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | — |
| Base branch | — |
| DB state | — |
| Services | — |
| Test data | — |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| F1 | E2E con Playwright + storageState capturado manual del browser logueado | Sesiones Clerk dev tienen `__client_uat` con TTL corto (~10min de inactividad). El state.json captado en t0 queda invalidado al usarse en t1+. Clerk JS en browser real hace refresh transparente; Playwright launchea browser frio sin esa cadena | Login programatico via Clerk Backend API + secret key seria viable para CI estable, pero fuera de scope SP1 |
| F2 | Component tests sobre SFCs Vueform (CompositeSectionTreeElement, RichTextRendererElement) con @vue/test-utils + jsdom | `defineElement` de @vueform/vueform no es Vue 3 standard. Mockear Vueform + atoms + composables = ~3-4h de yak-shave para cubrir lo que ya cubren las pure functions extraidas (validateWeightedSum, buildTree, sanitizeHtmlSafe) | La lógica testeable se extrae como pure functions y se cubre con vitest unit. El SFC integrador queda fuera del scope automatizado |
| F3 | Asumir que el state.json minimal alcanza para mantener sesion Clerk activa varios minutos | Cookies efimeras + `__client_uat` con TTL corto invalidan la sesion entre runs incluso si los refresh tokens son validos | Para test runs con Clerk dev: pre-step `npm run sync` no resuelve el auth, pero asegura datos integros. Auth requiere browser real con sesion activa o login programatico |

## Sessions

### Session 1 — 2026-05-04/05 (Setup integration + LLM-e2e baseline + corrida)

**Disparador**: TICKET-011 scaffolded como red de seguridad pre-refactor TICKET-010. El usuario aprobo el plan: integration suite + e2e protectivo + screenshots baseline antes de tocar refactor del 010.

**Trabajo realizado** (cronologico):

1. **Push UPONE-1035 + merge fase 4 a develop** (cierre formal del 1035 en remoto). Commit `1483501` en develop.
2. **Rama `UPONE-1038-qa-baseline`** desde develop al dia.
3. **Vitest infra del mod** (commit `135fd16`): vitest.config.ts + .gitignore + scripts test/test:watch + primer integration test `recordtypes-declared.test.ts` (27 tests).
4. **seed-counts.test.ts** (commit `8d2de40`): 24 tests Prisma mock que validan los counts UV (1/3/18/8/9/2) + AIEP (13/40/3/1) + CustomSection schema fijo + habilitacion=Session.
5. **Extraer buildTree + tests** (commit `6bef18a`): zero behavior change, validateWeightedSum 22/22 sigue pass + 21 tests buildTree.
6. **Extraer sanitizeHtmlSafe + tests XSS** (commit `a261edb`): 28 tests XSS canonicos. **Hallazgo C7**: bug walker shallow del sanitizer (deja `<input>` dentro de `<form>` stripped). Documentado como item nuevo del TICKET-010.
7. **layouts-declared.test.ts** (commit `6ac63b7`): 57 tests de los 23 layouts JSON.
8. **Pivot Playwright → component tests → LLM-e2e** (commit `696607b`): tras detectar imposibilidad de mantener auth Clerk en Playwright, pivot a scenarios markdown ejecutables por LLM con MCP chrome-devtools.
9. **Setup LLM-e2e + 1 scenario template + fixtures** (commit `30fc363`): README, runner-instructions, fixtures (seed-uv.json, seed-aiep.json, expected-tabs.json) + scenario template detail-uv-modality-tab.md + fixtures-vs-seed.test.ts (21 tests garantizan sync fixtures con seed real).
10. **13 scenarios restantes** (commit `8987485`): UV (5 tabs), AIEP (3 tabs), stress (2), coexistence, create-section-flow.
11. **Primera corrida LLM-e2e via MCP**: 14/14 ejecutados. **FAIL real detectado en scenario 5** (Q1 weight=13 en DB UPU vs 11 en seed). Fixtures-vs-seed pasaba (seed correcto). Causa: edit manual via UI persistido sin re-correr sync.
12. **Resolucion via `npm run sync`**: re-ejecuta seed con cleanup → recreate. Q1 vuelve a 11. Re-corrida del scenario 5 PASS limpio.
13. **4 scenarios edit/create adicionales** (commit `92ac06e`): edit-evaluation-tree-weight, create-section-modality, customsection-wysiwyg-edit, create-academicactivity-shell. Ejecutados via MCP, todos PASS.
14. **18 screenshots baseline** capturados en `tickets/ticket-011.screenshots/`.
15. **Adopcion pre-step `npm run sync`** documentado en README + runner-instructions.

**Estado al cierre**: 200/200 unit+integration pass + 18/18 LLM-e2e baseline + screenshots. Red de seguridad lista para arrancar TICKET-010.

## Testing

### Coverage map

| REQ | Cubierto por | Tipo | Status |
|-----|-------------|------|--------|
| Integration baseline | 7 suites vitest (200 tests) | Unit + Integration | ✅ COVERED |
| Cobertura TC-009-01/02/03 | recordtypes-declared.test.ts | Integration | ✅ COVERED |
| Cobertura TC-009-10/11/12/13 | seed-counts.test.ts | Integration | ✅ COVERED |
| Cobertura TC-009-05/06 (estructura) | layouts-declared.test.ts | Integration | ✅ COVERED parcial (declarativo) |
| Composable buildTree | composable-buildTree.test.ts | Integration | ✅ COVERED |
| Sanitize XSS | sanitize-html.test.ts | Integration | ✅ COVERED + hallazgo C7 |
| Validacion sumativa | validateWeightedSum.spec.ts | Unit | ✅ COVERED |
| Fixtures-vs-seed | fixtures-vs-seed.test.ts | Integration | ✅ COVERED |
| Cobertura visual TC-009-14 a 22 | LLM-e2e detail-uv/aiep-* (10 scenarios) | LLM-e2e | ✅ COVERED |
| Stress TC-009-23/24 | LLM-e2e stress-aiep-* (2 scenarios) | LLM-e2e | ✅ COVERED |
| Coexistencia TC-009-28 | LLM-e2e coexistence-no-core-data | LLM-e2e | ✅ COVERED |
| Create flow TC-009-09 | LLM-e2e create-section-flow + create-section-modality | LLM-e2e | ✅ COVERED |
| Edit modal CompositeTree (item C3 del 010) | LLM-e2e edit-evaluation-tree-weight | LLM-e2e | ✅ COVERED |
| Create AcademicActivity shell | LLM-e2e create-academicactivity-shell | LLM-e2e | ✅ COVERED |
| WYSIWYG sanitize render | LLM-e2e customsection-wysiwyg-edit | LLM-e2e | ✅ COVERED parcial (view; Trix edit deuda) |

### Test cases (suites + scenarios)

| # | Suite/Scenario | Tipo | Tests | Status | Evidence |
|---|---|---|---|---|---|
| 1 | validateWeightedSum.spec.ts | Unit | 22 | pass | mod commit history |
| 2 | recordtypes-declared.test.ts | Integration | 27 | pass | commit 135fd16 |
| 3 | seed-counts.test.ts | Integration | 24 | pass | commit 8d2de40 |
| 4 | composable-buildTree.test.ts | Integration | 21 | pass | commit 6bef18a |
| 5 | sanitize-html.test.ts | Integration | 28 | pass | commit a261edb |
| 6 | layouts-declared.test.ts | Integration | 57 | pass | commit 6ac63b7 |
| 7 | fixtures-vs-seed.test.ts | Integration | 21 | pass | commit 30fc363 |
| LLM-1 a 18 | scenarios LLM-e2e | LLM-e2e | 18 scenarios | pass | result.md + 18 screenshots |

### Test artifacts

| Archivo | Tipo | Cubre | Framework |
|---------|------|-------|-----------|
| `mods/curriculum-design/modsComponents/CompositeSectionTree/validateWeightedSum.spec.ts` | unit | computeInvalidNodes (REQ-02/03/04) | Vitest |
| `mods/curriculum-design/tests/integration/recordtypes-declared.test.ts` | integration | TC-009-01/02/03 | Vitest filesystem |
| `mods/curriculum-design/tests/integration/seed-counts.test.ts` | integration | TC-009-10/11/12/13 | Vitest + Prisma mock |
| `mods/curriculum-design/tests/integration/composable-buildTree.test.ts` | integration | buildTree pure function | Vitest |
| `mods/curriculum-design/tests/integration/sanitize-html.test.ts` | integration | XSS canonicos | Vitest + jsdom |
| `mods/curriculum-design/tests/integration/layouts-declared.test.ts` | integration | 23 layouts JSON | Vitest filesystem |
| `mods/curriculum-design/tests/integration/fixtures-vs-seed.test.ts` | integration | sync fixtures-vs-seed | Vitest + Prisma mock |
| `mods/curriculum-design/tests/llm-e2e/scenarios/*.md` (18 archivos) | LLM-e2e | TCs override del 009 | LLM + chrome-devtools MCP |
| `mods/curriculum-design/tests/llm-e2e/fixtures/*.json` (3 archivos) | LLM-e2e fixtures | seed UV/AIEP + expected tabs | JSON |
| `mods/curriculum-design/tests/llm-e2e/result.md` | LLM-e2e log | Resultado corrida 1 | Markdown |
| `mods/curriculum-design/tests/llm-e2e/README.md` + `runner-instructions.md` | docs | Workflow de ejecucion | Markdown |
| `tickets/ticket-011.screenshots/llm-e2e-*.png` (18 archivos) | screenshots baseline | Diff visual post-refactor | PNG |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| Vitest mod completo | `cd mods/curriculum-design && npm test` | n/a (suites nuevas) | 200/200 pass — 1.21s | +200 tests nuevos |
| LLM-e2e corrida 1 | (manual via LLM + MCP) | n/a | 18/18 pass + 1 FAIL real resuelto via sync | nueva infra |
| Lint/Typecheck workspace | n/a en root del monorepo | n/a | n/a | **delegated to TICKET-010** |

## Summary

### What was requested

Construir red de seguridad pre-refactor TICKET-010 con dos capas: (a) integration tests automatizados sobre la logica del mod (counts, schemas, layouts, pure functions) y (b) e2e protectivo sobre los flows visuales del detail UV/AIEP. Cierre paralelo de los TCs cerrados por override en TICKET-009.

### What was done

- **Suite vitest 200/200 pass en 1.21s**: 7 archivos cubriendo unit (validateWeightedSum) + integration (recordtypes, seeds, buildTree, sanitize, layouts, fixtures-vs-seed).
- **2 enabling refactors zero-behavior-change**: `buildTree` y `sanitizeHtmlSafe` extraidos de SFCs Vueform a archivos `.ts` independientes. Validados con tests aislados. **Esto cuenta parcialmente como item S3 del TICKET-010**.
- **Pivot definitivo a LLM-e2e**: tras descartar Playwright (Clerk dev efemero) y component tests sobre Vueform SFCs (yak-shave de mock), adopcion de scenarios markdown ejecutables por agente LLM con MCP chrome-devtools.
- **18 scenarios LLM-e2e** cubriendo TC-009-14 a 24, 28, create flows, edit modal, WYSIWYG render.
- **18 screenshots baseline** capturados en `tickets/ticket-011.screenshots/` para diff visual post-refactor 010.
- **Pre-step `npm run sync` documentado**: la primera corrida detecto Q1 weight=13 en DB UPU vs 11 en seed. Sync resuelve drift de datos.
- **fixtures-vs-seed.test.ts (21 tests)**: garantiza que los fixtures de los scenarios LLM-e2e estan sincronizados con el seed real.

### What was learned

- **Hallazgos del baseline**:
  - DB UPU desincronizada con seed (resuelto via sync, documentado como pre-step obligatorio)
  - BUG-platform-008 (i18n keys recordList.* no resueltos) confirmado pre-existente
  - BUG-platform-009 (Apollo cache pollution) confirmado pre-existente
  - Discrepancia labels columnas (Nombre vs Actividad/Referencia/Sección) — bug platform consistente en 3 tabs
  - Validacion sumativa funciona correctamente (Fase 4 SP1)
- **Hallazgo nuevo C7 agregado al TICKET-010**: bug walker shallow del sanitizeHtmlSafe (deja `<input>` dentro de `<form>` stripped en output).
- **Lecciones tecnicas**:
  - Clerk dev sessions efemeras invalidan storageState manual de Playwright entre runs
  - Vueform `defineElement` requiere mock complejo para component tests, mejor extraer pure functions
  - LLM-e2e con MCP es el approach mas pragmatico cuando el auth no es controlable

### Pendiente

- **TICKET-010 (refactor)** — desbloqueado. Arranca tras este cierre.
- **TICKET-YYY-1 (deuda formal)**: implementar login programatico con Clerk Backend API para Playwright en CI. Postpuesto fuera de scope SP1.
- **TICKET-YYY-2 (deuda formal)**: investigar bug labels columnas (Nombre vs Actividad/Referencia/Sección) — posible plataforma issue.
- **Verificacion manual post-refactor 010**: el dev del 010 ejecuta scenarios afectados por cada commit con riesgo visual + diff con screenshots baseline.

### Metrics

| Metric | Value |
|--------|-------|
| Sessions | 1 |
| Commits del mod | 10 |
| Commits del deckard | 4 |
| Vitest tests creados | 200 (22 unit + 178 integration) |
| LLM-e2e scenarios creados | 18 |
| Screenshots baseline capturados | 18 |
| Fixtures sincronizados con seed | 3 archivos |
| FAILs reales detectados (resueltos en cierre) | 1 (Q1 weight drift via sync) |
| Hallazgos nuevos para TICKET-010 | 1 (item C7 sanitize walker shallow) |
| Bugs pre-existentes confirmados (no regresion) | 3 (BUG-platform-008/009 + labels columnas) |
| Failed approaches | 3 (Playwright/Clerk, Vueform mock, storageState efimero) |
| Suite duration | 1.21s integration + ~40min LLM-e2e con narracion |
