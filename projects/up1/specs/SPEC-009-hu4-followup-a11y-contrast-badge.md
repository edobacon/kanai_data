---
id: SPEC-009-hu4-followup-a11y-contrast-badge
project: up1
ticket: TICKET-027
status: done
---

# HU4 followup — ActivityStatusBadge WCAG AA contrast matrix 9 estados BD × 2 themes + a11y role

# HU4 followup — ActivityStatusBadge WCAG AA contrast matrix 9 estados BD × 2 themes + a11y role

## Executive summary — lo que estas aprobando

> *Revision rapida. Todo el detalle tecnico vive abajo (Requirements, Tasks). Si solo lees esta seccion y te basta para aprobar, ese es el objetivo.*

**Que se quiere**: cerrar el gap de auditoria sistematica del componente `ActivityStatusBadge` (creado en TICKET-025) que quedo sin verificar a11y en los 9 estados BD del workflow × 2 themes (light + dark) = 18 combinaciones. Hoy DEC-LOCAL-04 cubre 1 sola combinacion (secondary dark) empiricamente; el resto fueron asumidas OK sin medir. El bug original (TC-21 UPONE-1098 dark+primary "Editando" 1.86:1) destapo que el universo de fallos es mayor. Ademas, el wrapper `<div aria-label>` tiene `aria-prohibited-attr` incomplete por falta de `role`. Solucion: extender el patron de DEC-LOCAL-04 (override `customColor` por variant + theme) a las combinaciones que fallan WCAG 2.1 AA, agregar `role="status"` al wrapper, y validar todo programaticamente con `@axe-core/playwright` o `vitest + axe-core` sobre los 18 combos. Sin tocar tokens platform (out of scope per memoria `feedback_no_touch_layout_workspace.md`).

**Decisiones criticas cerradas durante design**:

| # | Decision | Por que importa |
|---|----------|-----------------|
| 1 | **DEC-LOCAL-01 — Hardcoded `customColor` extendido (no token nuevo)**: reusar la funcion `badgeCustomColor()` de `ActivityStatusBadgeElement.vue` agregando branches por `(variant, theme)`. Hex hardcoded del scale del platform (`-600`/`-700`) | Consistente con DEC-LOCAL-04 existente. Scope local al componente, cero indireccion CSS, sin agregar tokens al mod. Si en el futuro otros componentes del mod necesitan los mismos colores semanticos, se promueve a tokens — no ahora |
| 2 | **DEC-LOCAL-02 — Warning bg → `#b45309` (warning-700 light value) en AMBOS themes**: preserva el patron "all badges white text" sacrificando el amarillo brillante "vibrant" | Alternativas: (a) cambiar text a `#1a1a1a` solo para warning — rompe el patron de texto blanco; (b) mixto por theme — introduce asimetria fg color visualmente confusa. `#b45309` es el unico hex que pasa AA (~7.0:1 vs #fff) preservando la familia amber |
| 3 | **DEC-LOCAL-03 — Sin extender Storybook, sin smoke visual manual del dev**: validacion pure programatica via tests integration con axe-core iterando los 18 combos | El componente no es nuevo, los colores aplicados son hex explicitos calculables con WCAG 2.1 mathematics. axe-core con thresholds reales sustituye el visual smoke. Ahorra ~30 min de S2 sin perder confianza tecnica. Riesgo aceptado: si el amber `#b45309` "no se ve tan warning" como `#f59e0b`, queda como follow-up de UX (no a11y) |

**Riesgos principales y como los mitigamos**:

- **Predicciones del preview (WCAG 2.1 manual) no coinciden con axe-core empirico** (ej: jsdom calculo distinto, anti-aliasing browser, font weight afectando el threshold). Mitigacion: S1.T2-T3 corre axe-core REAL contra DOM real (jsdom o Playwright); las predicciones son guia, no contrato. Si axe-core marca como FAIL algo que el preview predijo PASS, ajustamos el override hardcoded en S2 sin replantear scope.
- **Override hardcoded en `badgeCustomColor()` crece a 9 branches en una funcion** (1 actual DEC-LOCAL-04 + hasta 8 nuevos). Mitigacion: extraer la matriz a un constante `const STATUS_OVERRIDES: Record<\`\${variant}-\${theme}\`, string>` en el composable; la funcion solo hace lookup. Mantiene 1 sola fuente de verdad y testable directamente.
- **DEC-LOCAL-04 secondary dark regresiona** porque el refactor del override toca su rama. Mitigacion: REQ-PRESERVE-01 + TC dedicado (S1.T2 incluye verificacion explicita del secondary dark con `#525252`).
- **a11y check axe-core reporta nuevos issues no anticipados** (ej: `color-contrast-enhanced` AAA si el threshold del runner esta en AAA por error). Mitigacion: configurar axe-core con `runOnly: { type: 'tag', values: ['wcag2aa', 'wcag21aa'] }` explicito para no incluir AAA.

**Que NO se hace en este ticket** (limites explicitos del scope):

- **Tokens nuevos en el mod ni en el platform**: DEC-LOCAL-01 confirma hardcoded. Tokens son refactor diferido si emerge necesidad
- **Smoke visual del dev en UPU sandbox**: DEC-LOCAL-03 deja la validacion en axe-core programatico
- **Extender Storybook a 9 estados BD**: DEC-LOCAL-03 mantiene FiveStates + SecondaryAtRisk como esta
- **Fix de tokens platform (`theme-tokens.css`)**: out of scope per `feedback_no_touch_layout_workspace.md`. Si dark mode primary `#2dd4bf` rompe contraste en OTROS componentes, ticket separado de auditoria global del platform
- **Otros issues a11y reportados por TICKET-025/UPONE-1098** (Vueform `aria-describedby` apunta a IDs inexistentes): out of scope. Ticket separado si se decide

**Tamano estimado**: 2 sessions ejecutables (S1 audit empirico T1, S2 fixes + a11y + tests T3 ⚑ fuerte). Aproximadamente 3-3.5h efectivas distribuidas. **S2 es la mas riesgosa** (gate ⚑ fuerte, tier T3 — aunque sin smoke visual, valida tests 18/18 + axe-core 0 violations + dev close approval).

**Como vas a saber que funciona** (criterios de validacion observables):

- `npm run test tests/integration/activity-status-badge-a11y.test.ts` retorna **18/18 pass** (cada uno una combinacion `(estado BD, theme)` con ratio ≥ 4.5:1)
- Axe-core sobre el componente en jsdom retorna **0 violations** de `color-contrast` Y **0 incompletes** de `aria-prohibited-attr`
- DEC-LOCAL-04 secondary dark sigue aplicando `#525252` (verificado en TC dedicado del test suite)
- Color semantico preservado: success bg verde (`#15803d`), danger bg rojo (`#b91c1c`/`#9c2121`), warning bg amber oscuro (`#b45309`), primary teal (`#0d9488`/`#0a808c`)

---

## Purpose

Cerrar el gap de auditoria a11y del componente `ActivityStatusBadge` (creado en SPEC-006 / TICKET-025) que quedo sin verificar sistematicamente WCAG 2.1 AA en los 9 estados BD del workflow × 2 themes. DEC-LOCAL-04 de TICKET-025 cubrio empiricamente solo el caso `secondary dark`; el bug HU2 UPONE-1098 S12 TC-21 destapo que `primary dark` (estado Editando) falla con ratio 1.86:1 y que el universo de fallos probables es mayor (5-7 de 10 combinaciones a nivel componente). Adicionalmente, el wrapper `<div class="asb-wrapper" :aria-label>` carece de `role` explicito → axe reporta `aria-prohibited-attr` incomplete.

Este spec define la auditoria empirica con axe-core sobre los 18 combos + los overrides hardcoded de `customColor` necesarios + el fix de `role="status"`. Sin tocar tokens platform.

## Requirements

### REQ-IMPROVE-01: Contraste WCAG 2.1 AA en las 18 combinaciones (9 estados BD × 2 themes)

> **Que cambia**: cada uno de los 9 estados BD del workflow se renderiza con un bg que cumple WCAG 2.1 AA (ratio ≥ 4.5:1 vs `#fff` texto normal) en ambos themes (light + dark). El dev y los usuarios con baja vision pueden distinguir el badge contra su fondo sin esfuerzo.
> **Por que**: el bug TC-21 UPONE-1098 reporto serious violation primary dark 1.86:1 (Editando); la auditoria sistematica del preview predice 5-7 fallos adicionales (warning, success, danger dark, secondary light). Sin esto, los badges son inaccesibles para usuarios con disabilities visuales y violan compliance enterprise.

El sistema MUST renderizar cada uno de los 9 estados BD (`Aprobado`, `Borrador`, `Descontinuado`, `Editando`, `En evaluacion`, `En revision decanato`, `Propuesto`, `Publicado`, `Rechazado`) en ambos themes (`light`, `dark`) con un background tal que `axe-core` con `runOnly: ['wcag2aa', 'wcag21aa']` retorna 0 violations de `color-contrast` sobre el componente. Para combinaciones que fallan con los tokens default del platform, aplicar override `customColor` hardcoded segun la matriz de DEC-LOCAL-01.

**Actor**: developer
**Layers**: frontend (componente), config (matriz de overrides en composable)

<details><summary>Scenarios de validacion</summary>

#### Scenario: estado Editando dark cumple AA tras el fix
- **GIVEN** test integration cargando `ActivityStatusBadge` con `statusId` mapeado a variant `primary` en dark theme
- **WHEN** axe-core ejecuta `color-contrast` rule
- **THEN** retorna 0 violations
- **AND** el bg renderizado es `#0d9488` (primary-600 dark, ratio ~5.2:1 vs `#fff`)

#### Scenario: estado Aprobado light cumple AA tras el fix
- **GIVEN** test integration cargando `ActivityStatusBadge` con `statusId` mapeado a variant `success` en light theme
- **WHEN** axe-core ejecuta `color-contrast` rule
- **THEN** retorna 0 violations
- **AND** el bg renderizado es `#15803d` (success-700 light, ratio ~5.5:1 vs `#fff`)

#### Scenario: estado En evaluacion warning cumple AA en ambos themes
- **GIVEN** test integration cargando variant `warning` en light Y en dark theme
- **WHEN** axe-core ejecuta `color-contrast` rule en cada theme
- **THEN** retorna 0 violations en ambos
- **AND** el bg renderizado es `#b45309` en ambos themes (DEC-LOCAL-02 — same color both themes para preservar patron texto blanco)

#### Scenario: matriz 18 cells consolidada
- **GIVEN** los 9 estados BD × 2 themes ejecutados via loop programatico en el test suite
- **WHEN** axe-core valida cada cell
- **THEN** count(violations) === 0 across 18 iteraciones
- **AND** logs reportan los ratios reales con `≥ 4.5:1` per cell

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `npm run test tests/integration/activity-status-badge-a11y.test.ts` retorna 18/18 pass con axe-core 0 violations. Inspeccion visual programatica via `getComputedStyle()` confirma el hex aplicado por cell.

---

### REQ-IMPROVE-02: aria-prohibited-attr resuelto en el wrapper

> **Que cambia**: el `<div class="asb-wrapper">` ahora declara `role="status"` antes del `aria-label`, asi que screen readers anuncian el cambio de estado del activity con el aria-label correcto sin disparar la regla `aria-prohibited-attr` de axe.
> **Por que**: hoy el div no tiene role explicito y `aria-label` no es valido en `<div>` generico por WAI-ARIA spec; axe-core reporta el issue como `incomplete`. Sin esto, screen readers pueden ignorar el aria-label silenciosamente.

El sistema MUST agregar `role="status"` al wrapper `<div class="asb-wrapper">` en `ActivityStatusBadgeElement.vue` para que el `aria-label` sea valido per WAI-ARIA spec.

**Actor**: developer
**Layers**: frontend (template del componente)

<details><summary>Scenarios de validacion</summary>

#### Scenario: axe-core retorna 0 incompletes de aria-prohibited-attr
- **GIVEN** test integration cargando `ActivityStatusBadge` con cualquier statusId
- **WHEN** axe-core ejecuta con runOnly `wcag2aa, wcag21aa`
- **THEN** results.incomplete del rule `aria-prohibited-attr` === 0
- **AND** el DOM renderizado contiene `<div class="asb-wrapper" role="status" aria-label="...">`

#### Scenario: semantica role=status correcta para state badge
- **GIVEN** un screen reader virtual leyendo la pagina con un activity rendered
- **WHEN** el currentStatus cambia (mock de re-render)
- **THEN** el wrapper con role="status" se anuncia como "live region polite" por defecto (no requiere `aria-live` adicional)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: axe-core integration test reporta 0 incompletes de `aria-prohibited-attr`. Inspeccion del DOM via `outerHTML` confirma `role="status"` presente.

---

### REQ-PRESERVE-01: DEC-LOCAL-04 secondary dark NO regresiona

> **Que cambia**: el override existente del estado `secondary` en dark theme (a `#525252`, introducido por TICKET-025 S3.T7) se preserva integramente. El refactor de `badgeCustomColor()` para soportar mas combinaciones NO toca esa rama.
> **Por que**: DEC-LOCAL-04 ya pago el costo de validacion empirica en TICKET-025; replantearlo seria churn sin valor. La extension de overrides en este ticket DEBE ser aditiva, no reescritura.

El sistema MUST mantener el comportamiento de `badgeCustomColor()` para variant === `secondary` && theme === `dark` retornando `#525252` (idem TICKET-025).

**Actor**: developer
**Layers**: frontend (refactor incremental, no destructivo)

<details><summary>Scenarios de validacion</summary>

#### Scenario: secondary dark preserved
- **GIVEN** test integration cargando `ActivityStatusBadge` con statusId mapeado a variant `secondary` en dark theme
- **WHEN** componente renderiza
- **THEN** bg renderizado es `#525252` (no `#d4d4d4` default ni otro)
- **AND** axe-core 0 violations (ratio ~7.85:1)

#### Scenario: secondary light tambien fix (no regresion sino nueva cobertura)
- **GIVEN** statusId mapeado a `secondary` en LIGHT theme
- **WHEN** componente renderiza
- **THEN** bg renderizado es `#525252` (DEC-LOCAL-04 extendido a light por DEC-LOCAL-01 — el dev confirmo cobertura completa light+dark en DEC-INTAKE-02)
- **AND** axe-core 0 violations

</details>

#### Acceptance
**El usuario puede verificar que funciona**: TC dedicado en el test suite verifica el hex `#525252` en `getComputedStyle(.badge).backgroundColor` para secondary dark, y verifica que la rama de DEC-LOCAL-04 sigue presente en el codigo (regex match en el archivo).

---

### REQ-PRESERVE-02: Color semantico preservado (verde=success, rojo=danger, etc.)

> **Que cambia**: los fixes oscurecen el bg para cumplir AA pero usan tokens del MISMO scale de color (e.g. `success-700` en vez de `success-500`). El verde sigue siendo verde, el rojo rojo, el amber amber (mas oscuro pero familia preservada).
> **Por que**: si un fix cambiara la familia de color (e.g. verde → azul para success), perderiamos el codigo visual semantico que el usuario aprende. La identidad de cada estado se conserva — solo se ajusta la luminosidad.

El sistema MUST aplicar los overrides hardcoded usando valores del mismo `color-{variant}-{nivel}` scale del platform tokens (e.g. `success-700` = `#15803d`, `danger-700` = `#b91c1c`, `warning-700` = `#b45309`, `primary-600` = `#0d9488`), preservando la identidad cromatica del semantico.

**Actor**: developer / reviewer
**Layers**: frontend (matriz de overrides documentada)

<details><summary>Scenarios de validacion</summary>

#### Scenario: verificacion manual de identidad cromatica
- **GIVEN** matriz `STATUS_OVERRIDES` documentada en el composable
- **WHEN** reviewer audita cada entry
- **THEN** cada hex es trazable a un token `--up1-color-{variant}-{nivel}` del platform (no hex inventados sin scale)
- **AND** el JSDoc/comentario lo documenta inline

</details>

#### Acceptance
**El usuario puede verificar que funciona**: reviewer en S2.GATE compara la matriz `STATUS_OVERRIDES` contra `theme-tokens.css` y confirma que cada hex tiene origen identificable (es un valor de `-600` o `-700` del mismo variant scale).

---

## Changes

### Modified: ActivityStatusBadgeElement.vue

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `<div class="asb-wrapper" :aria-label>` (L33) | sin `role` | `role="status"` agregado | REQ-IMPROVE-02 — fix aria-prohibited-attr |
| `badgeCustomColor()` (L172-177) | 1 branch hardcoded (`if (_isDarkMode && variant === 'secondary') return '#525252'`) | lookup contra constante `STATUS_OVERRIDES: Record<\`\${variant}-\${theme}\`, string>` con 8 entries (matriz validada empiricamente en S1.T2+T3) | REQ-IMPROVE-01 — escalable a 18 combos, DEC-LOCAL-01 |

### STATUS_OVERRIDES matrix (validada empiricamente — S1.T2+T3)

| Variant | Light bg | Light ratio | Dark bg | Dark ratio | Notas |
|---------|----------|-------------|---------|------------|-------|
| `secondary` | **`#525252`** (override) | 7.81:1 | **`#525252`** (DEC-LOCAL-04 extendido por DEC-INTAKE-02) | 7.81:1 | DEC-LOCAL-04 preserved; light agregado |
| `primary` | `#0a808c` (default — no override) | 4.69:1 | **`#0f766e`** (override — primary-800 dark, NO primary-700) | 5.47:1 | L7 S1.T3 hallazgo: primary-700 `#0d9488` empirico 3.74:1 FAIL → corregido a primary-800 |
| `warning` | **`#b45309`** (override DEC-LOCAL-02) | 5.02:1 | **`#b45309`** (override DEC-LOCAL-02) | 5.02:1 | warning-700 light value en ambos themes |
| `success` | **`#15803d`** (override — success-700) | 5.02:1 | **`#15803d`** (override — success-700) | 5.02:1 | success-700 sirve ambos themes |
| `danger` | `#9c2121` (default — no override) | 7.92:1 | **`#b91c1c`** (override — danger-700) | 6.47:1 | light default ya pasa; dark requiere fix |

### Modified: useActivityStatusBadge.ts

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| exports | `useActivityStatusBadge` composable | + export `STATUS_OVERRIDES` constant + `getOverrideFor(variant, theme)` helper | Centraliza matriz de fixes; testable directo desde el test suite sin renderizar el componente |

### Added: tests/integration/activity-status-badge-a11y.test.ts

| Field | Value | Purpose |
|-------|-------|---------|
| Path | `mods/curriculum-design/tests/integration/activity-status-badge-a11y.test.ts` | Test suite a11y del componente |
| Framework | `vitest + jsdom + axe-core` o `@axe-core/playwright` (decision en S1.T1) | Programatic a11y validation iterando 18 combos |
| Coverage | 18 cases color-contrast + 1 case aria-prohibited-attr + 1 case DEC-LOCAL-04 preserve = 20 test cases | Cubre REQ-IMPROVE-01 + REQ-IMPROVE-02 + REQ-PRESERVE-01 |

## Tasks

> DET-20 numeracion continua. Ticket TICKET-027 tiene `### Session 0 — Intake-explore` registrada → plan empieza en **S1**.

### Session 1 — Audit empirico matriz 18 combos via axe-core [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Scaffold test suite a11y: crear `mods/curriculum-design/tests/integration/activity-status-badge-a11y.test.ts` con setup de vitest + jsdom + axe-core, configurar `axe.run()` con `runOnly: { type: 'tag', values: ['wcag2aa', 'wcag21aa'] }`, montar el componente con Vueform mock minimo | REQ-IMPROVE-01 | developer | — | `tests/integration/activity-status-badge-a11y.test.ts` (nuevo) | archivo creado, vitest reconoce el test suite (puede arrancar aunque vacio) | `rm tests/integration/activity-status-badge-a11y.test.ts` | DET-1, DET-2, DET-11 | done | 1 |
| S1.T2 | Iterar 9 estados BD en LIGHT theme: por cada `statusId` del cache (Aprobado..Rechazado), renderizar el componente, ejecutar `axe.run()`, capturar el ratio computado + status (PASS/FAIL/MARGINAL) en un array. Persistir la tabla resultante en el ticket markdown bajo TC-1..TC-9 (DET-25 registro inline) | REQ-IMPROVE-01 | developer | S1.T1 | `tests/integration/activity-status-badge-a11y.test.ts`, `projects/up1/tickets/ticket-027.md` (tabla TC) | tabla 9 rows poblada con ratio real + status WCAG | revertir test code, ticket TC quedan `pending` | DET-1, DET-2, DET-5, DET-7, DET-25 | done | 1 |
| S1.T3 | Iterar mismos 9 estados BD en DARK theme via setup que aplica `html.theme-dark` antes de cada render. Capturar ratios + status. Persistir TC-10..TC-18 en ticket markdown | REQ-IMPROVE-01 | developer | S1.T2 | `tests/integration/activity-status-badge-a11y.test.ts`, `projects/up1/tickets/ticket-027.md` (tabla TC) | tabla 18 rows total poblada (9 light + 9 dark) | idem S1.T2 | DET-1, DET-5, DET-7, DET-25 | done | 1 |
| S1.T4 | Consolidar matriz 18 combos en el spec: actualizar Changes con la lista FINAL de overrides necesarios (`STATUS_OVERRIDES` matrix con hex reales validados contra axe) + verificar que las predicciones del preview coinciden o ajustar la tabla del Executive summary si difieren | REQ-IMPROVE-01 | architect | S1.T3 | `projects/up1/specs/curriculum-design/SPEC-009-hu4-followup-a11y-contrast-badge.md` | spec updated con matriz definitiva, deltas predichos vs reales documentados | git revert del spec | DET-1, DET-2, DET-4 | done | 1 |
| S1.GATE | Gate de sync Session 1: validar TCs registrados (DET-25) + quality review DET-23 dimension 4 (testing — tests pass para los casos PASS, FAIL casos documentados con ratio empirico). Decidir continue/iterate: si los empirical ratios coinciden con predicciones (±10%) → continue a S2. Si difieren significativamente: iterate ajustando la matriz de overrides en S2 | REQ-IMPROVE-01 | reviewer | S1.T4 | `projects/up1/tickets/ticket-027.md` | tabla `### Session 1` en ticket con bloque Quality review (10 dims) + decision continue / iterate | — | DET-13, DET-20, DET-23, DET-25 | done | 1 |

### Session 2 — Fixes + a11y role + tests 18/18 pass [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Refactorizar `badgeCustomColor()` para usar lookup contra `STATUS_OVERRIDES`: agregar la constante en `useActivityStatusBadge.ts` con TODOS los hex aprobados (DEC-LOCAL-01 + DEC-LOCAL-02 + DEC-LOCAL-04 preserved). Modificar `ActivityStatusBadgeElement.vue:172-177` para usar `getOverrideFor(variant, theme)` en vez del if hardcoded | REQ-IMPROVE-01, REQ-PRESERVE-01, DEC-LOCAL-01 | developer | S1.GATE | `mods/curriculum-design/modsComponents/ActivityStatusBadge/useActivityStatusBadge.ts`, `mods/curriculum-design/modsComponents/ActivityStatusBadge/ActivityStatusBadgeElement.vue` | tests S1 se re-corren y los casos predichos como PASS post-fix ahora PASS, secondary dark sigue retornando `#525252` | git revert ambos archivos | DET-1, DET-2, DET-5, DET-8, DET-10 | done | 2 |
| S2.T2 | Agregar `role="status"` al wrapper en `ActivityStatusBadgeElement.vue:33`: cambiar `<div class="asb-wrapper" :aria-label="ariaLabelText">` por `<div class="asb-wrapper" role="status" :aria-label="ariaLabelText">` | REQ-IMPROVE-02 | developer | — (independiente de S2.T1) | `mods/curriculum-design/modsComponents/ActivityStatusBadge/ActivityStatusBadgeElement.vue` | test S2.T3 incluye check axe `aria-prohibited-attr === 0 incomplete` | git revert L33 | DET-1, DET-2, DET-8 | done | 2 |
| S2.T3 | Extender el test suite con: (a) verificacion `aria-prohibited-attr` (1 TC), (b) verificacion preserve `#525252` para secondary dark (1 TC). Ejecutar suite completo y verificar **18/18 pass** + 1 TC aria + 1 TC preserve = **20/20 pass** | REQ-IMPROVE-02, REQ-PRESERVE-01 | developer | S2.T1, S2.T2 | `tests/integration/activity-status-badge-a11y.test.ts` | `npm run test tests/integration/activity-status-badge-a11y.test.ts` → 20/20 pass, axe-core 0 violations | revertir test additions | DET-1, DET-2, DET-7, DET-25 | done | 2 |
| S2.T4 | Quality review DET-23 exhaustive: ejecutar 10 dimensiones sobre los archivos modificados (Calidad codigo, Lint, Tipado, Testing, Escalabilidad, Mantenibilidad, Claridad, Accesibilidad, Storybook=n/a, Error handling). Documentar bloque Quality review en `### Session 2` del ticket | REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-PRESERVE-01, REQ-PRESERVE-02 | reviewer | S2.T3 | `projects/up1/tickets/ticket-027.md` (Session 2 block) | bloque Quality review 10 dims + decision pass / iterate / escalate | — | DET-23, DET-13, DET-14 | pending | 2 |
| S2.GATE | Gate de cierre Session 2 ⚑ fuerte: validar 20/20 tests pass + axe 0 violations + Quality review pass + DEC-LOCAL-04 secondary dark preserved + frontmatter ticket actualizado con `status: closed` candidate. Decidir close ticket o iterate. Sin smoke visual del dev (DEC-LOCAL-03) — confianza en axe-core programatico. Aprobacion final del dev al cierre del gate | REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-PRESERVE-01, REQ-PRESERVE-02 | reviewer | S2.T4 | `projects/up1/tickets/ticket-027.md` | gate cerrado, `## Sessions ### Session 2` poblada con Tasks done + Quality review + decision + dev close approval explicito | — | DET-13, DET-14, DET-20, DET-23 | pending | 2 |

## Success metrics

| Metric | Baseline (current) | Target | How to measure | When to measure |
|--------|--------------------|--------|----------------|-----------------|
| Combinaciones (estado BD, theme) que cumplen WCAG 2.1 AA (ratio ≥ 4.5:1 vs #fff) | 2 de 18 (~11%) — solo primary light y danger light, mas DEC-LOCAL-04 secondary dark = 3 si se cuenta | **18 de 18 (100%)** | axe-core integration test loop sobre 18 combos | post-S2.T3 |
| `axe-core color-contrast` violations sobre `ActivityStatusBadge` | 1 serious (Editando dark 1.86:1) reportado en UPONE-1098 S12 TC-21 | **0 violations** | axe.run() sobre el componente con runOnly wcag2aa+wcag21aa | post-S2.T3 |
| `axe-core aria-prohibited-attr` incompletes sobre el wrapper | 1 incomplete | **0 incompletes** | axe.run() sobre el componente | post-S2.T3 |
| DEC-LOCAL-04 preserved (secondary dark = `#525252`) | preserved (TICKET-025 closed) | **preserved (no regresion)** | TC dedicado verificando `getComputedStyle().backgroundColor === 'rgb(82, 82, 82)'` | post-S2.T3 |

## Constraints

- **RULE-curriculum-design-001** (Vueform integration pattern) — el componente sigue el patron Vueform existente, el cambio es interno al template y al composable; sin impacto en el contract Vueform
- **DEC-LOCAL-04** (TICKET-025 S3.T7 — override secondary dark hardcoded) — se preserva integra (REQ-PRESERVE-01)
- **Memory `feedback_no_touch_layout_workspace.md`** — NO tocar tokens en `layout/` ni `suite/css/`. Todos los overrides son hardcoded scope local al mod
- **DET-7** (test cases ↔ discovery): cada TC traza a un REQ + el discovery del intake (TC-21 UPONE-1098)
- **DET-25** (TCs registrados en sesion de ejecucion): tabla `### Test cases` del ticket markdown se completa inline durante S1.T2 y S1.T3, no diferida al close

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `axe-core` + `@axe-core/playwright` o `axe-core` directo + `vitest + jsdom` | external (already in package.json del mod o root?) | Validacion a11y programatica | Si no esta instalado: S1.T1 agrega como devDep. Decision del runner (playwright vs jsdom) en S1.T1 segun lo que ya este disponible en el repo |
| `useActivityStatusBadge` composable existente | internal | Source de los 9 estados BD → variants mapping | Mapping estable desde TICKET-025; sin cambios esperados |
| `Badge` atom + prop `customColor` | internal | Mecanismo de override via `--_badge-bg` CSS var | Pattern ya validado por DEC-LOCAL-04. Sin riesgo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Empirical axe-core ratios difieren significativamente de las predicciones del preview (WCAG 2.1 manual) | medium | medium | S1.GATE validate empirical vs prediction. Si diff >10%: ajustar matriz `STATUS_OVERRIDES` en S2 antes de aplicar fixes |
| Refactor de `badgeCustomColor()` rompe DEC-LOCAL-04 secondary dark (regresion silenciosa) | medium | high | REQ-PRESERVE-01 + TC dedicado en S2.T3 verificando el hex `#525252` |
| `axe-core` runner no incluido en deps del mod o root | low | low | S1.T1 verifica + instala como devDep. Trabajo extra <15 min |
| Color amber oscuro `#b45309` no se percibe como "warning" visualmente | medium | low (aesthetic only) | Aceptado por DEC-LOCAL-02. Follow-up de UX separado si emerge feedback negativo post-deploy |
| `role="status"` interactua mal con screen readers que esperan `aria-live` explicito | low | low | `role="status"` implica `aria-live="polite"` por default WAI-ARIA spec — sin necesidad de `aria-live` adicional. Si emerge issue: TC follow-up con NVDA/JAWS |

## Open questions

(ninguna abierta — las 3 OQs del draft v1 fueron resueltas durante design: DEC-LOCAL-01, DEC-LOCAL-02, DEC-LOCAL-03)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Hardcoded `customColor` extendido (no token nuevo)
- **Contexto**: estrategia para los overrides de color en las 18 combinaciones
- **Drivers**: consistencia con DEC-LOCAL-04 existente; scope local al componente; cero indireccion CSS; ausencia de necesidad de reuso cross-componente
- **Opcion elegida**: extender `badgeCustomColor()` con lookup contra constante `STATUS_OVERRIDES: Record<\`\${variant}-\${theme}\`, string>` con hex hardcoded del scale del platform
- **Alternativas**: (a) tokens nuevos `--up1-status-{state}-{bg,fg}` en `mods/curriculum-design/css/` — descartado por agregar nivel de abstraccion sin necesidad inmediata
- **Consecuencias**: gana simplicidad + consistencia con DEC-LOCAL-04; pierde centralizacion si en futuro otros componentes del mod necesitan los mismos colores semanticos (entonces se promueve a tokens)
- **Session**: design-improvement (2026-05-20)

### DEC-LOCAL-02: Warning bg `#b45309` (warning-700 light value) en AMBOS themes
- **Contexto**: warning `#f59e0b` (light + dark) tiene contraste ~2.13:1 vs `#fff` — FAIL AA
- **Drivers**: preservar patron "all badges white text" sacrificando el amarillo brillante "vibrant"; consistencia visual cross-theme
- **Opcion elegida**: bg `#b45309` (warning-700 del scale del platform) en ambos themes
- **Alternativas**: (a) cambiar text a `#1a1a1a` solo para warning preservando bg amarillo — descartado por romper el patron de texto blanco; (b) mixto por theme (oscurecer light, texto oscuro dark) — descartado por asimetria cross-theme
- **Consecuencias**: gana compliance AA + consistencia patron; pierde "vibrancia" del amarillo brillante (aesthetic only, no a11y impact)
- **Session**: design-improvement (2026-05-20)

### DEC-LOCAL-03: Sin extender Storybook ni smoke visual manual del dev
- **Contexto**: alcance de validacion post-fix
- **Drivers**: el componente NO es nuevo (existe desde TICKET-025); los colores aplicados SON custom (hex explicitos calculables con WCAG 2.1 mathematics); axe-core programatico sustituye el visual smoke
- **Opcion elegida**: solo tests integration con axe-core iterando los 18 combos. Sin extender stories del Storybook (FiveStates + SecondaryAtRisk se mantienen). Sin smoke visual manual del dev en UPU sandbox
- **Alternativas**: (a) agregar story `AllStates` con dark decorator — descartado por valor visual bajo; (b) 9 stories (1 por estado BD) + tests — descartado por verbose redundante; (c) smoke visual del dev en gate ⚑ fuerte — descartado por tiempo
- **Consecuencias**: gana ~30 min de S2; pierde verificacion visual humana — riesgo aceptado: si amber oscuro "no se ve tan warning", follow-up de UX separado
- **Session**: design-improvement (2026-05-20)

## Acceptance checkpoints

- [ ] **Funcional**: 18 combinaciones (9 estados BD × 2 themes) cumplen WCAG 2.1 AA en axe-core
- [ ] **Tests**: `tests/integration/activity-status-badge-a11y.test.ts` con 20/20 pass (18 contrast + 1 aria + 1 preserve)
- [ ] **NFRs**: success metrics de la seccion arriba — 4/4 cumplen target
- [ ] **Rules**: RULE-curriculum-design-001 patron Vueform respetado; DEC-LOCAL-04 secondary dark preserved
- [ ] **Integration**: el componente sigue renderizando en activity_view + activity_edit (RecordDetail consumers) sin regresion visual (axe-core sobre el view real en S1 confirma — no requiere smoke manual)
- [ ] **Docs**: este spec + matriz `STATUS_OVERRIDES` documentada inline en `useActivityStatusBadge.ts` con JSDoc trazando cada hex a su token de origen
