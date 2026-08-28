---
id: SPEC-curriculum-design-improve-eslint
project: up1
ticket: TICKET-013
status: done
---

# ESLint config para mod curriculum-design + fix de hallazgos accionables

# ESLint config para mod curriculum-design + fix de hallazgos accionables

## Purpose

Establecer una configuracion ESLint propia del mod `curriculum-design` y aplicar los fixes accionables detectados al cierre de TICKET-012 — devs y reviewers ganan un quality gate objetivo, los 5 hallazgos reales (3 auto-fix + 2 manuales en `tests/stubs/atoms.ts`) quedan saneados, y el mod se vuelve precedente para una rule futura (RULE-mods-036) que aplique lint obligatorio a todos los mods.

## Requirements

### REQ-IMPROVE-01: `npm run lint` ejecutable y completo

El mod MUST proveer comando `npm run lint` que analiza `modsComponents/` y `tests/` con eslint sin error de configuracion.

**Actor**: developer (al modificar el mod)
**Layers**: tooling

#### Scenario: dev corre lint por primera vez
- **GIVEN** mod en clean state, branch `UPONE-1038-eslint-config`
- **WHEN** dev ejecuta `npm run lint` desde el root del mod
- **THEN** comando ejecuta sin error de configuracion
- **AND** reporta inventario de hallazgos consistente con la config (esperado: 0 problems post-fix)

#### Scenario: dev corre lint con auto-fix
- **GIVEN** mod con hallazgos auto-fixables
- **WHEN** dev ejecuta `npm run lint:fix`
- **THEN** los hallazgos auto-fixables se corrigen
- **AND** los archivos afectados quedan modificados pero el codigo compila

#### Acceptance
**El usuario puede verificar que funciona**: ejecutar `npm run lint` y obtener un reporte estructurado en consola.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-01 lint runnable | mod con eslint.config.js | `npm run lint` | exit code 0/1 con reporte | comando ejecuta sin error de config |
| 2 | TC-01b lint:fix runnable | hallazgos auto-fixables | `npm run lint:fix` | fixes aplicados, archivos modificados | exit code 0 |

### REQ-IMPROVE-02: Lint sin issues post-fix

El mod MUST tener 0 errors y 0 warnings al ejecutar `npm run lint` sobre la rama post-fix.

**Actor**: reviewer (al validar PR)
**Layers**: tooling

#### Scenario: lint pasa limpio
- **GIVEN** config aplicada + auto-fix corrido + manual fixes aplicados (S1.T2-T5)
- **WHEN** reviewer ejecuta `npm run lint`
- **THEN** exit code 0
- **AND** stdout reporta "0 problems"

**Contrast**: Antes 21 problemas (10 errors + 11 warnings). Ahora 0 problemas.

#### Acceptance
**El usuario puede verificar que funciona**: `npm run lint` retorna 0 y "0 problems".

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-02 0 hallazgos | post-fix | `npm run lint` | "0 problems" | exit 0 |

### REQ-PRESERVE-01: Tests del mod no se rompen

El mod MUST mantener el resultado de `npm test` (vitest) identico antes y despues del cambio.

**Actor**: system (regression check)
**Layers**: tooling, tests

#### Scenario: vitest pasa con baseline
- **GIVEN** baseline de tests medido en S1.T1 (passed/total)
- **WHEN** post-S1.T5 se ejecuta `npm test`
- **THEN** mismo total passed que baseline
- **AND** mismo total failed que baseline (idealmente 0)

#### Acceptance
**El usuario puede verificar que funciona**: `npm test` reporta el mismo conteo passed que pre-config.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-03 vitest no regresion | baseline T1 | `npm test` post-T5 | mismo conteo | sin regresion |

### REQ-PRESERVE-02: Sync del monorepo no se rompe

El sistema MUST mantener `npm run sync` ejecutando sin error tras la introduccion de `eslint.config.js`.

**Actor**: system (sync mechanism)
**Layers**: tooling, monorepo

#### Scenario: sync sigue funcionando
- **GIVEN** mod con eslint.config.js + scripts agregados
- **WHEN** dev ejecuta `npm run sync` desde monorepo root
- **THEN** sync ejecuta sin error
- **AND** las 8 phases corren igual (mirror, merge, capabilities, logic, apps&layouts, default-layouts, seeds, prisma-schema)

#### Acceptance
**El usuario puede verificar que funciona**: `npm run sync` desde up1 root ejecuta sin error.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | TC-04 sync no regresion | post-config | `npm run sync` | exit 0 | sync ok |

## Non-functional requirements

N/A — mejora de tooling, sin metricas de runtime.

## Artifacts

### Added — `up1/mods/curriculum-design/eslint.config.js`

| Aspecto | Valor | Por que |
|---------|-------|---------|
| Hereda | `pluginVue.configs['flat/recommended']` | Mismas defaults que layout |
| Parser TS | `@typescript-eslint/parser` | helpers .ts del mod |
| Disables base (formatting) | `vue/html-indent`, `vue/attributes-order`, `vue/attribute-hyphenation`, `vue/v-on-event-hyphenation`, `vue/html-self-closing`, `vue/multi-word-component-names`, `vue/max-attributes-per-line`, `vue/singleline-html-element-content-newline`, `vue/multiline-html-element-content-newline`, `vue/html-closing-bracket-newline`, `vue/html-closing-bracket-spacing`, `vue/first-attribute-linebreak` | Prettier owns format (consistencia con layout) |
| Disable contextual | `vue/no-reserved-component-names: 'off'` | RULE-mods-014: Button/Input/Text/Textarea son atoms intencionales |
| Disable contextual | `vue/valid-attribute-name: 'off'` | `el$` es convencion Vueform `defineElement` |
| Disable scoped | `vue/no-v-html: 'off'` SOLO para `modsComponents/RichTextRenderer/RichTextRendererElement.vue` (override per-file) | sanitizeHtmlSafe valida XSS — limitado al SFC con sanitizer |
| Override per-file | `tests/stubs/**/*.ts`: disable `vue/one-component-per-file` (mantener `vue/require-prop-types` activo, se fixea en T5) | stubs son intencional multi-component, prop-types se corrige |
| Ignores | `node_modules/`, `dist/`, `coverage/`, `.cache/`, `.temp/`, `.tmp/` | misma base layout |

### Modified — `up1/mods/curriculum-design/package.json`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `scripts.lint` | (no existe) | `"../../node_modules/.bin/eslint ."` | Usa binario monorepo, sin devDep duplicada (D1 sesion intake) |
| `scripts.lint:fix` | (no existe) | `"../../node_modules/.bin/eslint . --fix"` | Auto-fix accionables |

### Modified — `up1/mods/curriculum-design/tests/stubs/atoms.ts`

| Linea | Antes | Despues | Por que |
|-------|-------|---------|---------|
| 50 (Input.props.modelValue) | `{ default: '' }` (sin `type`) | `{ type: String, default: '' }` | `vue/require-prop-types` |
| 66 (Textarea.props.modelValue) | `{ default: '' }` | `{ type: String, default: '' }` | Idem |

### Auto-fix — `vue/order-in-components` (3 hallazgos)

Archivos a determinar en S1.T1 al re-ejecutar lint con baseline (probable `modsComponents/CompositeSectionTree/*.vue` o `modsComponents/RichTextRenderer/RichTextRendererElement.vue`).

### Added — `up1/mods/curriculum-design/.ai/PATTERNS.md`

Seccion "Lint del mod" con: como correr (`npm run lint` / `npm run lint:fix`), decisiones (binario monorepo via path relativo, disables justificados, override scoped para `tests/stubs/`), comando de fix.

### Added (al cierre, no en execute) — `deckard/projects/up1/rules/mods/rule-mods-036.md`

"Todo mod debe tener `eslint.config.js` propio" (level: must, source TICKET-013, no retroactivo a mods existentes — aplicabilidad nueva). Promocion via `request-close.md`, no como task del execute.

## Tasks

### Session 1 — establecer lint del mod [tipo: auto] [tier: T2]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S1.T1 | Capturar baseline (lint sin config + vitest counts) | researcher | — | (read-only) | DET-1, DET-2, DET-11 | conteo de hallazgos lint pre-config (~21 esperados) + conteo de tests vitest (passed/total) anotados en session log | done | 2 |
| S1.T2 | Crear `eslint.config.js` del mod | developer | S1.T1 | `up1/mods/curriculum-design/eslint.config.js` (new) | DET-5, DET-8, DET-10, DET-11, RULE-mods-014, RULE-platform-001 | archivo creado, hereda layout config, disables y overrides documentados | done | 2 |
| S1.T3 | Agregar scripts `lint`/`lint:fix` a `package.json` | developer | S1.T2 | `up1/mods/curriculum-design/package.json` | DET-5, DET-8, DET-10 | `npm run lint` ejecuta y reporta inventario consistente con baseline post-disables (esperado ~5 issues sin fix) | done | 2 |
| S1.T4 | Auto-fix `vue/order-in-components` | developer | S1.T3 | `modsComponents/CompositeSectionTree/CompositeSectionForm.ts`, `CompositeSectionNode.ts`, `CompositeSectionView.ts` | DET-5, DET-8, DET-10 | `npm run lint:fix` aplica fixes (emits movido bajo props). `npm run lint` -3 warnings. `npm test` 399/399 | done | 2 |
| S1.T5 | Fix manual `tests/stubs/atoms.ts` modelValue prop types | developer | S1.T4 | `up1/mods/curriculum-design/tests/stubs/atoms.ts` (lineas 50, 66) | DET-5, DET-8, DET-10 | Input/Textarea modelValue con `type: String`. `npm run lint` "0 problems". `npm test` 399/399 | done | 2 |
| S1.T6 | Verificar regression (vitest + sync + lint final) | reviewer | S1.T5 | (read-only) | DET-5, DET-7, DET-13, DET-14 | 1) `npm test` mod = 399/399 (= baseline T1). 2) `npm run sync` 3/3 success. 3) `npm run lint` = "0 problems" | done | 2 |
| S1.T7 | Documentar approach en `.ai/PATTERNS.md` | developer | S1.T6 | `up1/mods/curriculum-design/.ai/PATTERNS.md` | DET-2, DET-13 | seccion "Lint del mod (UPONE-1038)" agregada con como correr, decisiones de config, diferencias vs layout, future | done | 2 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2) [⚑ fuerte]** — persistir resultados en `## Sessions` del ticket, correr validacion T2, decidir continue/iterate/escalate. Si pasa: pasar a request-close (que crea RULE-mods-036). | reviewer | S1.T1..T7 | ticket, spec | DET-13, DET-14, DET-19, DET-20 | matriz REQ→evidence completa. TC-01..TC-04 con status `passed`. Gate decision documentado | done | 2 |

### Task contracts (detalle)

```
Task S1.T1: Capturar baseline
- source_ref: REQ-IMPROVE-01, REQ-PRESERVE-01
- agent: researcher
- precondition: branch UPONE-1038-eslint-config checked out
- expected_output: en session log: (a) conteo lint sin config (correr `cd up1 && ./node_modules/.bin/eslint mods/curriculum-design/` o equivalente) — esperado ~21 problemas, (b) conteo vitest (`cd up1/mods/curriculum-design && npm test`) — passed/total
- validation: numeros documentados en ## Sessions del ticket
- rollback: N/A (read-only)
- rules: [DET-1, DET-2, DET-11]

Task S1.T2: Crear eslint.config.js del mod
- source_ref: REQ-IMPROVE-01
- agent: developer
- depends_on: S1.T1
- files: up1/mods/curriculum-design/eslint.config.js (new)
- precondition: layout/eslint.config.js leido como base
- expected_output: archivo creado con: import pluginVue + tsParser, hereda flat/recommended, disables base de formatting (mismos que layout), disable de no-reserved-component-names + valid-attribute-name (justificado), override per-file para RichTextRendererElement.vue (no-v-html off), override per-glob `tests/stubs/**/*.ts` (one-component-per-file off), ignores estandar.
- validation: archivo lintea correctamente al ejecutar manualmente con --print-config (post-T3)
- rollback: rm eslint.config.js
- rules: [DET-5, DET-8, DET-10, DET-11, RULE-mods-014, RULE-platform-001]

Task S1.T3: Agregar scripts lint/lint:fix a package.json
- source_ref: REQ-IMPROVE-01
- agent: developer
- depends_on: S1.T2
- files: up1/mods/curriculum-design/package.json
- precondition: eslint.config.js existe (T2)
- expected_output: scripts.lint = "../../node_modules/.bin/eslint .", scripts.lint:fix = "../../node_modules/.bin/eslint . --fix"
- validation: `cd mod && npm run lint` ejecuta, reporta hallazgos esperados (post-disables, debe reportar solo los 5 accionables: 3 order-in-components errors + 2 require-prop-types warnings — total ~5 issues, ya no 21)
- rollback: revertir package.json (git checkout)
- rules: [DET-5, DET-8, DET-10]

Task S1.T4: Auto-fix vue/order-in-components
- source_ref: REQ-IMPROVE-02
- agent: developer
- depends_on: S1.T3
- files: archivos identificados al ejecutar lint en T3 (probable modsComponents/**/*.vue)
- precondition: `npm run lint` reporta los 3 hallazgos order-in-components con archivo:linea
- expected_output: `npm run lint:fix` aplica fixes; archivos quedan con keys ordenadas segun rule. `npm run lint` reporta -3 errors (ahora solo 2 warnings de require-prop-types).
- validation: 1) `npm run lint` count baja a 2 issues. 2) `npm test` sin regresion (mismo conteo que T1).
- rollback: git checkout de los archivos afectados
- rules: [DET-5, DET-8, DET-10]

Task S1.T5: Fix manual tests/stubs/atoms.ts modelValue prop types
- source_ref: REQ-IMPROVE-02
- agent: developer
- depends_on: S1.T4
- files: up1/mods/curriculum-design/tests/stubs/atoms.ts (lineas 50, 66)
- precondition: `npm run lint` reporta los 2 warnings con archivo:linea
- expected_output: Input.props.modelValue: { type: String, default: '' }. Textarea.props.modelValue: { type: String, default: '' }.
- validation: 1) `npm run lint` reporta "0 problems". 2) `npm test` sin regresion (los stubs siguen renderizando ok porque el cambio agrega type sin alterar default).
- rollback: git checkout tests/stubs/atoms.ts
- rules: [DET-5, DET-8, DET-10]

Task S1.T6: Verificar regression
- source_ref: REQ-PRESERVE-01, REQ-PRESERVE-02
- agent: reviewer
- depends_on: S1.T5
- precondition: T2-T5 aplicadas
- expected_output: matriz de validacion: (a) `npm test` mod = baseline T1, (b) `npm run sync` desde monorepo root exit 0, (c) `npm run lint` mod = "0 problems"
- validation: los 3 checks pasan. Si alguno falla: identificar task culpable y rollback selectivo.
- rollback: N/A (verificacion). Si falla: rollback de la task identificada.
- rules: [DET-5, DET-7, DET-13, DET-14]

Task S1.T7: Documentar approach en .ai/PATTERNS.md
- source_ref: REQ-IMPROVE-01
- agent: developer
- depends_on: S1.T6
- files: up1/mods/curriculum-design/.ai/PATTERNS.md
- precondition: regression OK (T6)
- expected_output: archivo (modificado o creado) con seccion "## Lint del mod" cubriendo: como correr, por que binario monorepo, disables y por que, override per-file para RichTextRenderer, override per-glob para tests/stubs, comando de fix
- validation: archivo legible, link al spec/ticket en source
- rollback: git checkout del archivo
- rules: [DET-2, DET-13]

Task S1.GATE: Gate de sync Session 1 (tier: T2) [⚑ fuerte]
- source_ref: REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-PRESERVE-01, REQ-PRESERVE-02
- agent: reviewer
- depends_on: S1.T1..T7
- expected_output: en ## Sessions del ticket: matriz REQ→evidence completa. TC-01..TC-04 con status `passed`. Decision: continue (avanzar a request-close) | iterate (algun REQ failing) | escalate (riesgo no anticipado).
- validation: gate persistido en ticket usando Template de Gate (DET-20). Si decision = continue: avanzar a /dkc close
- rollback: N/A
- rules: [DET-13, DET-14, DET-19, DET-20]
```

## Constraints

- **RULE-mods-014** — modsComponents usan atoms del layout-library: justifica `disable vue/no-reserved-component-names` (Button/Input/Text/Textarea son atoms intencionales).
- **RULE-mods-015** — i18n via $t(): no aplica a config pero rule activa para futuros fixes que toquen UI strings.
- **RULE-platform-001** — CSS inline en SFCs Vueform: el SFC del RichTextRenderer ya cumple, no se modifica en este ticket.
- **RULE-platform-003** — helpers >15 LOC extraidos a .ts: el mod ya cumple via TICKET-010, no introducimos lint TS-specific (scope-out).
- **DET-19** — branch/commits/PR/comentarios usan `UPONE-1038`. Records dkc usan `TICKET-013`.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| ESLint v9 + plugins en `up1/node_modules` | internal (monorepo) | binario invocado via `../../node_modules/.bin/eslint` | Si monorepo no instalado: lint no corre (mitigado por documentacion en PATTERNS.md) |
| `npm run sync` (monorepo) no procesa eslint.config.js | internal | sync ignora archivos no-synced | Validar en S1.T6 |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Auto-fix de `vue/order-in-components` modifica orden y rompe expectativas | low | medium | S1.T6 corre vitest post-fix. Rollback selectivo si falla |
| ESLint v9 (flat config) incompatible con plugins | low | high | Verificado: layout/eslint.config.js usa misma combinacion (eslint v9 + flat + plugin-vue 9.17) |
| Path relativo `../../node_modules/.bin/eslint` rompe si dev ejecuta desde subdir | low | low | Documentar en PATTERNS.md: "ejecutar desde el root del mod" |
| Disable de `vue/no-v-html` se aplica global por error | medium | medium | Override scoped por archivo (RichTextRendererElement.vue). Verificable con grep |
| RULE-mods-036 al cierre se aplica retroactivamente a otros mods sin notificarlos | low | medium | RULE-mods-036 no retroactiva — aplica a futuros mods. Hello-world en ticket separado |

## Open questions

Ninguna que bloquee execute. Open al cierre:
- [ ] Aplicabilidad de RULE-mods-036 a hello-world-mod (ticket separado tras cierre).

## Decisions

### DEC-LOCAL-01: ESLint usa binario del monorepo root (no devDeps locales)
- **Contexto**: definir como el mod ejecuta eslint
- **Drivers**: cero duplicacion de deps, alineamiento con otros mods (ninguno declara eslint), simplicidad
- **Opcion elegida**: scripts del mod invocan `../../node_modules/.bin/eslint`
- **Alternativas**:
  - Self-contained (declarar devDeps eslint en mod): rechazada — duplica deps, mod no se lint standalone igualmente sin npm install propio
  - PeerDependencies: rechazada — hibrido, agrega complejidad sin beneficio claro
- **Consecuencias**:
  - Gana: cero duplicacion, mantiene mods simples
  - Pierde: mod no se lintable fuera del checkout monorepo. Documentado en PATTERNS.md
- **Session**: 1 (intake)

### DEC-LOCAL-02: RULE-mods-036 promovida al cierre
- **Contexto**: definir si la rule "lint obligatorio en mods" entra en este ticket
- **Drivers**: precedente solido (curriculum-design es el primer mod con eslint), valor de declarar pattern para futuros mods
- **Opcion elegida**: crear RULE-mods-036 al cierre (level: must, no retroactiva)
- **Alternativas**:
  - Diferir a ticket separado: rechazada — el dev confirmo que el momento de promover es al cierre, alineado con TICKET-012 → RULE-mods-035
- **Consecuencias**:
  - Gana: pattern documentado al cierre, valor capturado
  - Pierde: ninguna (retroactividad limitada a futuros mods, hello-world en ticket separado)
- **Session**: 1 (intake)

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Hallazgos lint | 21 | 0 | `npm run lint` |
| Tests vitest passed | (medir T1) | igual o mayor | `npm test` |
| Tiempo ejecucion lint | N/A | < 30s | `time npm run lint` (informativo) |

## Technical reference

**Config base layout** (`up1/layout/eslint.config.js`, 53 lineas):
- `pluginVue.configs['flat/recommended']` + `storybook.configs['flat/recommended']`
- TS via `@typescript-eslint/parser`
- Disables de formatting (delegado a Prettier)
- Ignora `node_modules/`, `dist/`, `dist-ssr/`, `coverage/`, `storybook-static/`, `modsComponents/`, `.temp/`, `.tmp/`, `.cache/`

**Diferencias del mod respecto al layout config**:
- NO ignora `modsComponents/` — el mod lintea sus propios SFCs custom
- NO incluye `storybook` config (mod no tiene storybook)
- Agrega disables contextuales (no-reserved-component-names, valid-attribute-name) por RULE-mods-014 + Vueform conventions
- Override scoped para `RichTextRendererElement.vue` (no-v-html off por sanitizer)
- Override per-glob para `tests/stubs/**/*.ts` (one-component-per-file off)

**Sanitizer (justifica disable de no-v-html scoped)**:
- `modsComponents/RichTextRenderer/sanitizeHtml.ts` — whitelist conservadora de tags + bloqueo de `javascript:`/`data:`/event handlers. Cubierto por 31 tests integration en TICKET-010.

## Rules discovered

- **RULE-mods-036** — Todo mod del monorepo debe tener `eslint.config.js` propio (level: must, scope: module). Promovida al cierre de TICKET-013 desde DEC-LOCAL-02. No retroactiva a mods existentes — migracion caso a caso.

## Bugs found

(Ninguno descubierto durante execute. El descubrimiento TS-typing — 84 errores TS en el mod — se capturo como backlog B1 del TICKET-013 prioridad `should` → ahora rastreado en TICKET-014.)

## Acceptance checkpoints

- [x] **Funcional**: `npm run lint` ejecuta sin error de config + reporta "0 problems" post-fix
- [x] **Tests**: `npm test` (vitest) 399/399 passed = baseline S1.T1
- [x] **NFRs**: N/A
- [x] **Rules**: RULE-mods-014 respetada (atoms intencionales preservados via disable contextual), RULE-platform-001 respetada (CSS inline en SFCs no se modifico)
- [x] **Integration**: `npm run sync` 3/3 success (object-manager + layout + suite)
- [x] **Docs**: `.ai/PATTERNS.md` documenta approach lint del mod en seccion "Lint del mod (UPONE-1038)"
- [x] **Promotion**: RULE-mods-036 creada al cierre (`projects/up1/rules/mods/rule-mods-036.md`)
