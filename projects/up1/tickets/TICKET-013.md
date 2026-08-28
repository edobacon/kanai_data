---
id: TICKET-013
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1038
module: curriculum-design
autopilot: manual
---

# ESLint config para mod curriculum-design + fix de hallazgos accionables

## Request

Establecer una configuracion ESLint propia del mod curriculum-design — actualmente el mod no tiene `.eslintrc*` ni `eslint.config.js`, y el config del platform (`up1/layout/eslint.config.js`) explicitamente ignora `modsComponents/` (linea 47), por lo que los SFCs custom + helpers TS del mod nunca son lintedos.

**Hallazgos detectados** (lint ad-hoc post-cierre TICKET-012, usando config layout sin el ignore):

21 problemas (10 errors, 11 warnings) clasificados en:

1. **Falsos positivos del Vue plugin sin contexto platform** (10 — descartar):
   - `vue/no-reserved-component-names` x7: Button, Input, Text, Textarea son atoms del layout-library — renombrar contradice RULE-mods-014
   - `vue/valid-attribute-name` x2: `el$` es convencion de Vueform `defineElement`
   - `vue/no-v-html` x1: justificable, `sanitizeHtmlSafe` neutraliza el HTML antes de v-html
   
2. **Test stubs intencional** (4 warnings — disable rule en `tests/stubs/`):
   - `vue/one-component-per-file` x4 en `tests/stubs/atoms.ts`

3. **Accionables reales** (5):
   - `vue/order-in-components` x3 (auto-fix con --fix)
   - `vue/require-prop-types` x2 en `tests/stubs/atoms.ts:50,66` (modelValue sin tipo)

**Alcance del ticket**:
- Crear `eslint.config.js` propio del mod, basado en `up1/layout/eslint.config.js` con ajustes:
  - `disable` de las rules que son falsos positivos por contexto (atoms reservados, el$, v-html con sanitizer)
  - `disable` de `vue/one-component-per-file` para `tests/stubs/`
  - `enable` de las que aplican (order-in-components, require-prop-types)
- Agregar script `lint` y `lint:fix` al `package.json` del mod
- Aplicar los 5 fixes accionables (3 con --fix + 2 manuales en stubs/atoms.ts)
- Documentar en `.ai/PATTERNS.md` el approach de lint del mod (referencia para hello-world-mod template — fuera de scope si requiere coordinacion platform)

**Promueve RULE-mods-036** (creada al cierre TICKET-012 sobre alineacion visual): podria evolucionar a RULE-mods-037 sobre lint obligatorio en mods, dependiendo del outcome de este ticket.

**Referencias**:
- Predecesor: TICKET-012 (cerrado, merge cf2f9ca + 9cac4c7 i18n)
- Epic: UPONE-1038
- Config base: up1/layout/eslint.config.js

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
| H1 | Lint del mod es viable usando el binario eslint del monorepo root sin declarar deps locales (config layout via flat config se hereda parcialmente) | propuesta | `up1/node_modules/.bin/eslint` existe, layout/eslint.config.js define rules. Mod no tiene node_modules eslint propio |
| H2 | Los 21 hallazgos descritos en la request se clasifican como: 10 falsos positivos por contexto platform, 4 warnings de test stubs intencionales, 5 accionables reales (3 auto-fix + 2 manuales) | propuesta | Inventario detallado en el body de la request. Validacion ad-hoc post-cierre TICKET-012 |
| H3 | Disable de `vue/no-reserved-component-names` (Button/Input/Text/Textarea como atoms) es necesario por RULE-mods-014 (atoms del layout-library en modsComponents) — los nombres reservados son atoms intencionales, no conflicts | propuesta | RULE-mods-014 manda usar atoms; renombrar contradice la rule |
| H4 | Disable de `vue/no-v-html` para RichTextRendererElement.vue es justificable: el HTML pasa por `sanitizeHtmlSafe` (whitelist conservadora, validada con 31 tests TICKET-010) antes del v-html | propuesta | `modsComponents/RichTextRenderer/RichTextRendererElement.vue:24` + `sanitizeHtml.ts` |
| H5 | Complejidad: media. ~6-7 tasks (baseline + config + scripts + auto-fix + manual fixes + regression + docs/rule). Single-area (tooling), single-repo (curriculum-design), bajo riesgo (no toca runtime) | confirmed | Spec aprobado: 7 tasks + 1 GATE en 1 session, T2. Ver SPEC-curriculum-design-improve-eslint |

### Context found

**Repo y branch**:
- Mod en `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design/` (repo git independiente, remote `bitbucket.org:uplanner/curriculum-design.git`)
- Branch actual: `UPONE-1038-eslint-config` (DET-19 — external id como segmento)
- Base: `develop`. Ultimo commit relevante: `9cac4c7 UPONE-1038: merge ortografia i18n strings (post-TICKET-012)`

**ESLint en el monorepo**:
- Binario: `up1/node_modules/.bin/eslint` (eslint v9 segun layout/package.json)
- Plugins disponibles: `eslint-plugin-vue ^9.17`, `eslint-plugin-storybook ^10.3`, `@typescript-eslint/parser`
- Decision D1 (dev): el mod NO declara deps eslint propias — usa binario monorepo via path relativo al ejecutar `npm run lint`. Mod NO es lintable standalone fuera del monorepo. Reduce duplicacion, alineado con otros mods (ai-agent, retention-wellbeing, object-manager-editor — ninguno tiene eslint propio)

**Config base — `up1/layout/eslint.config.js`**:
- `pluginVue.configs['flat/recommended']` + `storybook.configs['flat/recommended']`
- TS via `@typescript-eslint/parser` (sin reglas TS propias, solo parser)
- Ignora `node_modules/`, `dist/`, `coverage/`, `modsComponents/` (linea 47), `.cache/`, etc.
- Disables de formatting (delegado a Prettier): html-indent, attributes-order, etc. (lineas 26-37)
- **Critico**: ignora `modsComponents/` — por eso los SFCs custom + helpers TS del mod nunca son lintedos en el contexto layout

**Estado eslint en otros mods**:
- `ai-agent`, `retention-wellbeing`, `object-manager-editor`, `flow-viewer`, `hello-world-mod`: ninguno tiene `.eslintrc*` ni `eslint.config.js`. curriculum-design seria el primero
- Decision D2 (dev): crear RULE-mods-036 al cierre — "Todo mod debe tener `eslint.config.js`" — aplicaria a hello-world-mod template + futuros mods (coordinacion platform en ticket separado para hello-world)

**Estructura del mod**:
- `modsComponents/CompositeSectionTree/` (12 archivos: SFC + 8 helpers TS + types + spec)
- `modsComponents/RichTextRenderer/` (SFC + sanitizer)
- `tests/stubs/atoms.ts`, `tests/stubs/molecules.ts`, `tests/stubs/useApolloClient.ts` (stubs locales para vitest del mod)
- `tests/integration/*.test.ts` (12 tests integration ya existentes)
- Sin `tsconfig.json` propio (usa el del monorepo o default tsc)

**Hallazgos detectados (resumen del body)**:
- 10 errors + 11 warnings = 21 totales
- Falsos positivos por contexto (10 — descartar via disable):
  - `vue/no-reserved-component-names` x7 (Button, Input, Text, Textarea x2 atoms reusados)
  - `vue/valid-attribute-name` x2 (`el$` convencion Vueform `defineElement`)
  - `vue/no-v-html` x1 (RichTextRenderer con sanitizer validado)
- Test stubs intencional (4 warnings — disable rule en `tests/stubs/`):
  - `vue/one-component-per-file` x4 (atoms.ts re-exporta multiples stubs en un archivo)
- Accionables reales (5):
  - `vue/order-in-components` x3 — auto-fix con `--fix`
  - `vue/require-prop-types` x2 en `tests/stubs/atoms.ts:50,66` (modelValue sin tipo) — fix manual

**Bugs / rules / specs del modulo**:
- Specs existentes: `SPEC-academic-activity-list`, `SPEC-composite-section-tree-weighted-sum` (no afectan al ticket — son features previos del modulo)
- Bugs abiertos: BUG-platform-012 (sync-styles no auto-importa CSS de mods) — NO afecta a tooling, no bloquea
- Rules aplicables: RULE-platform-001 (CSS inline en SFCs Vueform — el SFC del RichTextRenderer ya cumple), RULE-platform-003 (helpers >15 LOC extraidos a .ts — el mod ya cumple via TICKET-010), RULE-mods-014/015 (atoms y i18n — justifica los disables del config)

**Sanitizer del v-html (justificacion del disable de `vue/no-v-html`)**:
- `modsComponents/RichTextRenderer/sanitizeHtml.ts` — whitelist conservadora (`p`, `br`, `div`, `span`, formato basico, headings, listas, tablas, `a` con bloqueo de `javascript:`/`data:`). Cubierto por tests integration en TICKET-010.

**Desde transcripts previos**: N/A (no hay transcripts del modulo curriculum-design tooling).

**Warnings**:
- Si el mod corre lint via binario monorepo: cualquier dev fuera de un checkout monorepo no podra lintar. Documentar en README y en `.ai/PATTERNS.md`.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1038-eslint-config` (ya creada, en mod curriculum-design) |
| Base branch | `develop` (mod) |
| DB state | N/A (cambio de tooling, no toca DB) |
| Services | vitest del mod (`npm test` en mod). ESLint via `up1/node_modules/.bin/eslint` |
| Test data | N/A (lint analiza codigo estatico) |
| Working dir | `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design/` para acciones git/codigo del mod |
| Monorepo path | `/Users/edobacon/Workspace/uplanner/up1/` para invocar binario eslint |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|------------|--------------|-----------|
| B1 | Resolver 84 errores TS en el mod (TS2339 ~70 + TS2307 ~5 + TS7006 ~1) | nuevo | descubierto post-S1.T7 al validar typing del IDE | El mod NO tiene `tsconfig.json` propio. SFCs custom Vueform (`CompositeSectionTreeElement.vue` + `RichTextRendererElement.vue`) reportan `Property X does not exist on type '{}'` por la firma opaca de `defineElement` (Vueform). Helpers TS y modules ts importan paths del monorepo (`@/composables/...`, `../../components/atoms`, `../../components/molecules`) que no resuelven sin tsconfig | Crear `tsconfig.json` del mod con paths del monorepo (resuelve TS2307). Tipar `props` con `PropType<...>` (resuelve TS7006). Para TS2339: refactor defineElement con declaration merge / helper `defineUpElement<T>` o aumentar typings de Vueform. Validar con `vue-tsc --noEmit`. Trackear en TICKET-014 (creado al cierre de TICKET-013) | should |

## Sessions

### Session 1 — Intake + design-improvement (2026-05-07, completada)

**Objetivo**: completar intake del ticket pre-existente (que solo tenia Request + Classification), recopilar contexto, levantar hipotesis y triage, generar SPEC aprobado para execute.

**Actions log**

| Timestamp | Agent | Accion | Referencia | Detalle |
|-----------|-------|--------|------------|---------|
| 2026-05-07 | researcher | gather-context | curriculum-design | Inspeccion del repo: branch correcta `UPONE-1038-eslint-config`, ultimo commit `9cac4c7` post-cierre TICKET-012, mod sin `eslint.config.js` ni scripts lint. Inventario de archivos del mod: 14 archivos `.ts/.vue` en modsComponents (CompositeSectionTree + RichTextRenderer), 12 tests integration en `tests/`, stubs de atoms en `tests/stubs/`. Sin tsconfig.json propio |
| 2026-05-07 | researcher | gather-context | platform | Verificacion de eslint en monorepo: binario en `up1/node_modules/.bin/eslint` (v9.39.2), plugins `eslint-plugin-vue ^9.17` + `eslint-plugin-storybook ^10.3` + `@typescript-eslint/parser` instalados via layout. Layout/eslint.config.js (53 LOC) usa flat config, ignora `modsComponents/` linea 47 |
| 2026-05-07 | researcher | gather-context | mods | Verificacion estado eslint en otros mods: ninguno (`ai-agent`, `retention-wellbeing`, `object-manager-editor`, `flow-viewer`, `hello-world-mod`) tiene `.eslintrc*` ni `eslint.config.js`. curriculum-design seria el primero |
| 2026-05-07 | researcher | gather-context | rules | Rules aplicables identificadas: RULE-mods-014 (atoms del layout-library — justifica disable de `vue/no-reserved-component-names`), RULE-mods-015 (i18n via $t), RULE-platform-001 (CSS inline en SFCs Vueform — RichTextRenderer ya cumple), RULE-platform-003 (helpers >15 LOC extraidos — mod ya cumple via TICKET-010). DET-19 (external id en repo) aplicable porque ticket tiene `external: UPONE-1038` |
| 2026-05-07 | scribe | intake-fill | TICKET-013 | Frontmatter actualizado: `creates_visual: false`, `creates_data: false`, `draft_approved: skipped`, `rules: [DET-13, DET-7, DET-19, RULE-platform-001/003, RULE-mods-014/015]`. Triage con 5 hipotesis (H1..H5) propuesta/confirmed. Context found completo. Setup con branch + working dir + monorepo path. Testing inicial con coverage map (4 REQs preliminares) y 4 test cases pending |
| 2026-05-07 | dev-decision | decision | DEC-LOCAL-01 | ESLint usa binario monorepo root, no devDeps locales. Driver: cero duplicacion + alineamiento con otros mods. Alternativas descartadas: self-contained (deps duplicadas) y peerDependencies (hibrido sin beneficio claro). Trade-off: mod no lintable fuera del checkout monorepo |
| 2026-05-07 | dev-decision | decision | DEC-LOCAL-02 | RULE-mods-036 ("Todo mod debe tener eslint.config.js") promovida al cierre, no como spec discovery. Alineado con TICKET-012 → RULE-mods-035 |
| 2026-05-07 | architect | design-analysis | improvement | Analisis estado actual → delta → estado deseado presentado al dev. Alcance dentro/fuera definido (fuera: hello-world-mod, lint TS-specific, modificar layout). Complejidad: media-baja. Confirmado con dev |
| 2026-05-07 | architect | design-spec | SPEC-curriculum-design-improve-eslint | Spec generado con: Purpose, 4 requirements (REQ-IMPROVE-01/02 + REQ-PRESERVE-01/02 + scenarios), Changes (Added + Modified + Auto-fix), 7 tasks + 1 GATE en Session 1 [tipo: auto] [tier: T2], task contracts completos con source_ref/files/validation/rollback/rules, Constraints, Risks (5), Success metrics (3), Decisions (DEC-LOCAL-01/02), Acceptance checkpoints |
| 2026-05-07 | scribe | spec-approved | SPEC-curriculum-design-improve-eslint | Dev aprobo spec en presentacion. Spec escrito a disco con la flag de execute-ready (no approved-only — listo para execute) en `projects/up1/specs/curriculum-design/` |
| 2026-05-07 | scribe | gate-transition | request-execute | request-execute.md leido completo, gates D + E internalizados. Session 2 abierta. Confirmacion explicita del dev: "procedo en autopilot, paro solo en commits/push/close" |

**Decisiones tomadas**:
- **DEC-LOCAL-01** (en spec): ESLint usa binario del monorepo root. Mod no declara devDeps eslint.
- **DEC-LOCAL-02** (en spec): RULE-mods-036 promovida al cierre del ticket via request-close, no como discovery del execute.

**Learns capturados**: 0. (Discoveries del intake — ej. "ningun otro mod tiene eslint.config" — entraron como Context found y como hipotesis, no como learns por ser hechos contextuales, no patterns reusables).

**Rules/bugs creados**: 0 en esta session. RULE-mods-036 se crea en Session 2 al cierre.

**Failed approaches**: 0.

**Test artifacts creados**: 0 (intake + design no producen test artifacts).

**Tasks completadas**: intake (5 secciones del ticket), design-improvement (spec aprobado), gate-transition. Session 1 produce el plan que Session 2 ejecuta — no hay tasks `S1.T*` aqui.

**Tasks pendientes**: 0 de Session 1. Session 2 arranca con S1.T1..T7 + S1.GATE del spec.

**Resultado**: SPEC-curriculum-design-improve-eslint aprobado, en disco con la flag de execute-ready. Plan listo: 7 tasks + 1 GATE [tier: T2] estimadas en 1.5-2h. Session 2 abierta para execute.

### Session 2 — Ejecutar tasks del SPEC-curriculum-design-improve-eslint + cierre (2026-05-07, completada)

**Objetivo**: Ejecutar las 7 tasks (S1.T1..T7) + S1.GATE del spec en autopilot, parando solo en commits/push/close. Tras gate, cerrar ticket con request-close (que promueve RULE-mods-036).

**Working dirs**: `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design/` (mod) + `/Users/edobacon/Workspace/uplanner/up1/` (monorepo para invocar binario eslint y `npm run sync`)

**Branch**: `UPONE-1038-eslint-config` (verificada — DET-19 external id como segmento)

| Timestamp | Agent | Accion | Referencia | Detalle |
|-----------|-------|--------|------------|---------|
| 2026-05-07 | scribe | session-open | S2 | Session abierta. Spec status → in_progress |
| 2026-05-07 | researcher | gather-context | S1.T1 | Baseline lint: 21 problemas (10 errors, 11 warnings). Inventario: vue/no-reserved-component-names x8 (Button/Input/Textarea/Text en CompositeSectionForm/Node/View + atoms.ts:49,65), vue/valid-attribute-name x2 (`el$` en CompositeSectionTreeElement.vue:144 + RichTextRendererElement.vue:29), vue/no-v-html x1 (RichTextRendererElement.vue:24), vue/order-in-components x3 (CompositeSectionForm.ts:21 + Node.ts:26 + View.ts:21 — auto-fixable), vue/one-component-per-file x5 (atoms.ts lineas 14, 48, 64, 80, 96), vue/require-prop-types x2 (atoms.ts:50, 66) |
| 2026-05-07 | researcher | gather-context | S1.T1 | Baseline vitest: 18 test files, 399 tests, 0 failed (3.32s) |
| 2026-05-07 | scribe | task-completed | S1.T1 | done. Baseline registrado. Coverage map: REQ-IMPROVE-01/REQ-PRESERVE-01 baseline establecido |
| 2026-05-07 | developer | implement | S1.T2 | Creado `up1/mods/curriculum-design/eslint.config.js` (90 LOC). Hereda pluginVue flat/recommended + tsParser. Disables base de formatting (mismos que layout). Disable de no-reserved-component-names + valid-attribute-name (justificados por RULE-mods-014 + Vueform). Override scoped: `RichTextRendererElement.vue` con no-v-html off (sanitizeHtmlSafe). Override per-glob: `tests/stubs/**/*.ts` con one-component-per-file off |
| 2026-05-07 | developer | implement | S1.T3 | Agregados scripts `lint` y `lint:fix` a package.json del mod usando path relativo `../../node_modules/.bin/eslint`. `npm run lint` ejecuta sin error de config |
| 2026-05-07 | reviewer | review | S1.T2+T3 | Validacion: `npm run lint` reporta 5 problemas (0 errors, 5 warnings). Inventario post-disables: vue/order-in-components x3 + vue/require-prop-types x2 (ambos accionables esperados). 16 falsos-positivos eliminados (8 reserved + 2 valid-attr + 1 v-html + 5 one-component). Recommendation: approve |
| 2026-05-07 | scribe | task-completed | S1.T2 | done |
| 2026-05-07 | scribe | task-completed | S1.T3 | done |
| 2026-05-07 | developer | implement | S1.T4 | `npm run lint:fix` aplicado. Auto-fix movio `emits` debajo de `props` en CompositeSectionForm.ts:21, CompositeSectionNode.ts:26, CompositeSectionView.ts:21 (cambio cosmetico, no funcional). Vitest post-fix 399/399 sin regresion. Lint baja a 2 warnings (solo manuales) |
| 2026-05-07 | developer | implement | S1.T5 | tests/stubs/atoms.ts:50 (Input.modelValue) y :66 (Textarea.modelValue) con `type: String, default: ''`. Lint final: 0 problems |
| 2026-05-07 | reviewer | review | S1.T6 | Regression check passed: vitest 399/399 (= baseline), `npm run sync` 3/3 success (object-manager + layout + suite), `npm run lint` 0 problems. Recommendation: approve |
| 2026-05-07 | scribe | task-completed | S1.T4 | done |
| 2026-05-07 | scribe | task-completed | S1.T5 | done |
| 2026-05-07 | scribe | task-completed | S1.T6 | done |
| 2026-05-07 | developer | implement | S1.T7 | Agregada seccion "Lint del mod (UPONE-1038)" a `.ai/PATTERNS.md` con: como correr, tabla de decisiones de config (7 rules con razon), diferencias vs layout config, future (pre-commit fuera de scope) |
| 2026-05-07 | scribe | task-completed | S1.T7 | done |
| 2026-05-07 | reviewer | gate-validation | S1.GATE | T2 validation passed. Matriz REQ→TC: REQ-IMPROVE-01 → TC-01 passed. REQ-IMPROVE-02 → TC-02 passed. REQ-PRESERVE-01 → TC-03 passed (399/399 vitest). REQ-PRESERVE-02 → TC-04 passed (3/3 sync). 7/7 tasks done. Acceptance checkpoints del spec: funcional ok, tests sin regresion, rules respetadas (RULE-mods-014, RULE-platform-001), integration ok (sync), docs ok (.ai/PATTERNS.md). Recommendation: approve → avanzar a request-close (que crea RULE-mods-036) |
| 2026-05-07 | scribe | task-completed | S1.GATE | done. Decision: continue (avanzar a /dkc close) |
| 2026-05-07 | scribe | backlog-captured | B1 | Discovery: 84 errores TS en el mod (TS2339 ~70 por defineElement opaque + TS2307 ~5 por paths sin tsconfig + TS7006 ~1 por props sin tipo). Capturado como B1 prioridad `should`. Decision dev: crear TICKET-014 separado para fix integral, no bloquea cierre TICKET-013 |
| 2026-05-07 | scribe | session-complete | S2 | Session 2 completada. 7 tasks + GATE done sin iterate ni escalate. 0 failed approaches. 1 backlog item capturado (B1 → TICKET-014). Discoveries pasivos: ninguno relacionado al alcance original (eslint config). El descubrimiento TS-typing es ortogonal al spec |
| 2026-05-07 | scribe | rule-created | RULE-mods-036 | Promotion al cierre desde DEC-LOCAL-02 del spec. Archivo creado: `projects/up1/rules/mods/rule-mods-036.md`. Level: must, scope: module, no retroactiva. Source: TICKET-013 Session 2 |
| 2026-05-07 | scribe | spec-closed | SPEC-curriculum-design-improve-eslint | status → done. Acceptance checkpoints todos marcados. RULE-mods-036 linkeada en seccion "Rules discovered" del spec. Frontmatter actualizado con `closed: 2026-05-07` |
| 2026-05-07 | scribe | summary-written | TICKET-013 | Summary completo escrito: What was requested / What was done / What was learned / Pendiente / Metrics. 12 metricas registradas (sessions, tasks, commits=0, learns=0, rules=1, etc.) |
| 2026-05-07 | scribe | ticket-closed | TICKET-013 | status → closed + `closed: 2026-05-07`. Listo para auto-reindex y tracker comment. Commit pendiente — el dev confirma antes de commitear |

**Tasks ejecutadas en esta session**

| Task | Status | Resultado | Files modificados |
|------|--------|-----------|-------------------|
| S1.T1 (researcher) — Capturar baseline | done | Lint baseline: 21 problemas (10 errors, 11 warnings) confirmados; vitest baseline: 18 files / 399 tests passed (3.32s) | (read-only) |
| S1.T2 (developer) — Crear `eslint.config.js` | done | Config 90 LOC en mod root. Hereda layout flat/recommended + tsParser. Disables base de formatting + contextuales (no-reserved-component-names, valid-attribute-name). Override scoped per-file (RichTextRendererElement.vue: no-v-html off) y per-glob (`tests/stubs/**/*.ts`: one-component-per-file off). Ignores estandar | `up1/mods/curriculum-design/eslint.config.js` (new) |
| S1.T3 (developer) — Agregar scripts a package.json | done | Scripts `lint` y `lint:fix` apuntan a `../../node_modules/.bin/eslint .` (D1 cumplida — sin devDeps eslint). `npm run lint` reporta 5 problemas (3 order-in-components + 2 require-prop-types) post-disables — los 16 falsos positivos fueron eliminados como esperado | `up1/mods/curriculum-design/package.json` |
| S1.T4 (developer) — Auto-fix `vue/order-in-components` | done | `npm run lint:fix` aplico 3 fixes: en CompositeSectionForm.ts:21, CompositeSectionNode.ts:26 y CompositeSectionView.ts:21 movio `emits` debajo de `props` (cambio cosmetico). Lint baja a 2 warnings. Vitest 399/399 sin regresion | 3 archivos |
| S1.T5 (developer) — Fix manual atoms.ts modelValue | done | Input.props.modelValue (linea 50) y Textarea.props.modelValue (linea 66) tipados con `type: String, default: ''`. Lint final: 0 problems. Vitest 399/399 sin regresion | `up1/mods/curriculum-design/tests/stubs/atoms.ts` |
| S1.T6 (reviewer) — Verificar regression | done | Triple check pass: vitest 399/399 (3.93s = baseline T1 ± 0.61s), `npm run sync` 3/3 success (object-manager 69.32s, layout 0.37s, suite 0.80s), `npm run lint` "0 problems" | (read-only) |
| S1.T7 (developer) — Documentar approach en .ai/PATTERNS.md | done | Seccion "Lint del mod (UPONE-1038)" agregada al final del archivo con: como correr (`npm run lint`/`lint:fix`), tabla de 7 decisiones de config con razon, diferencias vs layout config, future (pre-commit fuera de scope) | `up1/mods/curriculum-design/.ai/PATTERNS.md` |
| S1.GATE (reviewer) — Aceptacion tecnica [⚑ fuerte tier T2] | done | T2 validation passed. Matriz REQ→TC: 4/4 passed. 7/7 tasks done. Recommendation: approve → avanzar a request-close (que crea RULE-mods-036) | ticket + spec |

**Decisiones tomadas**: 0 nuevas en Session 2 (las DEC-LOCAL-01/02 se tomaron en Session 1, intake/design).

**Learns capturados**: 0. La implementacion siguio exactamente el plan del spec sin discoveries — el inventario del baseline coincidio con la prediccion del ticket, los disables eliminaron los falsos positivos como se esperaba, los auto-fixes y manuales se aplicaron sin sorpresa.

**Rules/bugs creados**:
- **RULE-mods-036** (level: must, scope: module): "Todo mod del monorepo debe tener `eslint.config.js` propio". Promovida al cierre desde DEC-LOCAL-02 del spec. Archivo: `projects/up1/rules/mods/rule-mods-036.md`. No retroactiva — aplica a mods nuevos. Migracion de `hello-world-mod` y mods existentes en tickets separados.

**Failed approaches**: 0.

**Test artifacts creados**: 0 (lint config + scripts + fixes no introducen tests nuevos — la cobertura via vitest existente es la regression suite).

**Backlog descubierto en esta session**:
- **B1** (prioridad `should`): 84 errores TS en el mod (TS2339 ~70 por defineElement opaque + TS2307 ~5 por paths sin tsconfig + TS7006 ~1 por props sin tipo). Detectado al consultar el dev sobre TS errors en IDE durante S1.GATE. Capturado fuera del alcance del spec actual. **Decision dev**: crear TICKET-014 separado para fix integral. No bloquea cierre TICKET-013 (Regla 17 — solo `must` bloquea).

**Tickets nuevos creados a partir de descubrimientos**:
- **TICKET-014** (open, work_type: fix, modulo: curriculum-design): "Resolver 84 errores TS en mod curriculum-design (defineElement opaque + paths sin tsconfig)". Intake completo (Request, Classification, Triage con 4 hipotesis, Setup con reproduction steps, Coverage map preliminar, 4 test cases pending). Pendiente: design-fix + execute. Tags: predecessor:TICKET-013.

**Tasks completadas en esta session**: S1.T1..T7 + S1.GATE (8 items, 100%).

**Tasks pendientes**: 0 del spec. Pendiente externo a este ticket: TICKET-014 (con su propio backlog de tasks por generar en design-fix).

**Resultado**: TICKET-013 cerrado con todos sus REQs cumplidos (4/4 passed), regression sin issues, RULE-mods-036 promovida, pattern de lint documentado y replicable. 1 backlog item descubierto y trackeado en TICKET-014 (no bloqueante).

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-IMPROVE-01 (lint runnable) | TC-01 | manual | COVERED — passed |
| REQ-IMPROVE-02 (zero accionables) | TC-02 | manual | COVERED — passed |
| REQ-PRESERVE-01 (vitest no rompe) | TC-03 | auto | COVERED — passed |
| REQ-PRESERVE-02 (build/sync no rompen) | TC-04 | manual | COVERED — passed |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | `npm run lint` corre y reporta hallazgos | REQ-IMPROVE-01 | manual | eslint.config.js creado en el mod | 1) cd mod 2) `npm run lint` | Comando ejecuta sin error de config. Reporta inventario | Comando ejecuta. Post-config + pre-fix: 5 warnings (3 order-in-components + 2 require-prop-types) | log de consola en S2 sessions log T2/T3 | passed |
| TC-02 | `npm run lint` reporta 0 errors y 0 warnings post-fix | REQ-IMPROVE-02 | manual | TC-01 OK + auto-fix + manual fixes aplicados | 1) cd mod 2) `npm run lint` | "0 problems" / exit 0 | "0 problems" / exit 0 | log de consola en S2 sessions log T6 | passed |
| TC-03 | vitest del mod sigue pasando (regression suite ya existente) | REQ-PRESERVE-01 | auto | post-cambios | `npm test` en mod | Mismo conteo de tests passed que pre-config (baseline en task #1) | 18 files / 399 passed (= baseline T1 18/399) | log vitest en S2 sessions log T6 | passed |
| TC-04 | `npm run sync` desde monorepo no se rompe | REQ-PRESERVE-02 | manual | post-config | `npm run sync` en up1 root | sync ejecuta como pre-config (eslint.config.js es ignorado por sync, no es synced artifact) | 3/3 success (object-manager 69.32s, layout 0.37s, suite 0.80s) | log sync en S2 sessions log T6 | passed |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| (a definir en design — probable solo configuracion de lint, sin nuevos tests) | — | — | — | — |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| vitest mod | `cd up1/mods/curriculum-design && npm test` | 18 files / 399 tests / 0 failed (3.32s) | 18 files / 399 tests / 0 failed (3.93s) | 0 cambios — sin regresion |
| eslint mod | `cd up1/mods/curriculum-design && npm run lint` | 21 problemas (10 err, 11 warn) — sin config propia, baseline con layout config sin ignore de modsComponents | 0 problems | -21 (eliminados) — nueva capacidad establecida |
| sync monorepo | `cd up1 && npm run sync` | (no medido — control: pre-cambio funciona) | 3/3 success (object-manager 69.32s + layout 0.37s + suite 0.80s) | sin regresion |

## Summary

### What was requested

Establecer config ESLint propia para el mod `curriculum-design` y aplicar fixes accionables detectados al cierre del TICKET-012 — quality gate del mod previamente ausente.

### What was done

- Mod `curriculum-design` ahora puede lintarse via `npm run lint` (y auto-fix via `npm run lint:fix`) desde su raiz, usando el binario eslint del monorepo sin declarar deps locales.
- Lint pasa sin issues: `0 errors / 0 warnings` (de 21 problemas pre-config).
- Los 5 hallazgos accionables corregidos:
  - 3 auto-fix `vue/order-in-components` (`emits` movido bajo `props`) en CompositeSectionForm.ts, CompositeSectionNode.ts, CompositeSectionView.ts
  - 2 manual `vue/require-prop-types` en `tests/stubs/atoms.ts` (Input/Textarea modelValue con `type: String`)
- Falsos positivos por contexto eliminados via disables justificados:
  - `vue/no-reserved-component-names` off (atoms reusados — RULE-mods-014)
  - `vue/valid-attribute-name` off (`el$` Vueform)
  - `vue/no-v-html` off scoped en `RichTextRendererElement.vue` (sanitizeHtmlSafe valida)
  - `vue/one-component-per-file` off per-glob `tests/stubs/**/*.ts` (intencional multi-component)
- Pattern documentado en `.ai/PATTERNS.md` del mod (seccion "Lint del mod (UPONE-1038)") con como correr, decisiones de config, diferencias vs layout, future.
- **Promotion**: RULE-mods-036 creada — "Todo mod del monorepo debe tener `eslint.config.js` propio" (level: must, scope: module, no retroactiva).

### What was learned

- **Learns capturados**: 0 directos durante execute (la implementacion siguio el plan, sin discoveries no anticipados).
- **Rules creadas**: RULE-mods-036 (promovida al cierre desde DEC-LOCAL-02 del spec).
- **Decisions tomadas**: DEC-LOCAL-01 (eslint usa binario monorepo, no devDeps locales), DEC-LOCAL-02 (RULE-mods-036 promovida al cierre).
- **Bugs encontrados**: 0.
- **Backlog descubierto durante execute**: B1 — 84 errores TS en el mod (TS2339 ~70 por defineElement opaque + TS2307 ~5 por paths sin tsconfig + TS7006 ~1 por props sin tipo). Prioridad `should`. Trackeado en **TICKET-014** (open) — fix integral con su propio design-fix por complejidad de typing de SFCs custom Vueform.

### Pendiente

- TICKET-014 (open) atiende los 84 errores TS detectados. Tiene intake completo y triage. Falta design-fix + execute.
- Aplicabilidad de RULE-mods-036 a `hello-world-mod` y otros mods existentes (`ai-agent`, `retention-wellbeing`, `object-manager-editor`, `flow-viewer`) — migracion caso a caso en tickets separados (con coordinacion platform para `hello-world-mod`).

### Metrics

| Metric | Value |
|--------|-------|
| Sessions | 2 (S1: intake+design, S2: execute+gate+close) |
| Tasks completed | 7/7 + S1.GATE |
| Commits | 0 (pendiente — el dev confirmara antes de commitear) |
| Learns captured | 0 |
| Learns → rules | 0 |
| Learns → bugs | 0 |
| Learns → decisions | 0 (DEC-LOCAL-01/02 surgieron en intake/spec, no como learns) |
| Learns discarded | 0 |
| Rules created (total) | 1 (RULE-mods-036, promovida desde DEC-LOCAL-02) |
| Decisions taken | 2 (DEC-LOCAL-01, DEC-LOCAL-02 — ambas en spec) |
| Bugs found | 0 |
| Test cases | 4 pass / 0 fail / 0 pending |
| Failed approaches | 0 |
| Backlog items captured | 1 (B1 — should — TICKET-014 creado) |
| Lint hallazgos: pre → post | 21 → 0 |
| Vitest: pre → post | 399/399 → 399/399 (sin regresion) |
