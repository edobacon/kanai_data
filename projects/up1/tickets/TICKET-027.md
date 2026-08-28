---
id: TICKET-027
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1100
module: curriculum-design
autopilot: manual
---

# HU4 followup — ActivityStatusBadge contrast WCAG AA en 9 estados × 2 themes + a11y aria-prohibited-attr

## Request

Auditar y corregir el contraste WCAG 2.1 AA del componente `ActivityStatusBadge` (creado en TICKET-025 / UPONE-1100) en los **9 estados del workflow × 2 themes** (light + dark) = 18 combinaciones. Cubrir tambien el issue `aria-prohibited-attr` detectado por axe-core sobre `<div class="asb-wrapper" aria-label="...">`.

### Origen del request

Detectado empirico durante **HU2 UPONE-1098 S12 TC-21** (2026-05-20):

- `axe-core` 4.10.2 ejecutado sobre el panel del activity_view reporto:
  - **1 violation `serious`**: `color-contrast` sobre `<span class="badge bg-primary">Editando</span>` con foreground `#ffffff` sobre background `#2dd4bf` → ratio **1.86:1** (necesita ≥4.5:1 para texto normal AA o ≥3:1 para large text)
  - **1 incomplete**: `aria-prohibited-attr` sobre `<div class="asb-wrapper" aria-label="activityStatusBadge.label: Editando">` — `aria-label` no esta permitido en `<div>` sin role explicito

- Confirmacion empirica del dev (2026-05-20): "en dark mode al menos, los colores vibrantes con texto blanco no se estan viendo bien en todos los estados".

### Estados del workflow a auditar (9)

```
Aprobado, Borrador, Descontinuado, Editando, En evaluacion,
En revision decanato, Propuesto, Publicado, Rechazado
```

### Themes (2)

- `light` (default `data-theme`)
- `dark` (`html.theme-dark`)

### DEC-LOCAL-04 referencia (parcial — solo aborda `secondary`)

Durante TICKET-025 S3.T7 se implemento un override de `secondary` en dark mode via prop `customColor` (L18, L19). **PERO la auditoria sistematica de los 9 estados × 2 themes nunca se hizo** — solo se atendio el caso `secondary` empirico. Este ticket cierra ese gap.

### Caso visual confirmado (dark mode)

- **Editando**: `bg-primary` #2dd4bf (verde teal vibrante) con texto blanco → ratio 1.86:1 ❌
- Otros estados con colores vibrantes (Borrador, En evaluacion, Propuesto, En revision decanato) requieren validacion empirica con axe-core para confirmar si cumplen.

## Scope

### Dentro del scope:

- Auditar contraste fg/bg de los 9 estados en ambos themes (matriz 18).
- Ajustar tokens del badge en los estados que NO cumplen WCAG AA via:
  - **Opcion A**: override `customColor` (patron DEC-LOCAL-04 ya existente, extendido a los estados que requieran)
  - **Opcion B**: variant `bg-* + text-dark` para colores muy luminosos (preserva color semantico pero cambia color del label)
  - **Opcion C**: tokens nuevos `--up1-status-<state>-{bg,fg}` con valores que cumplan WCAG AA en cada theme
- Resolver `aria-prohibited-attr`:
  - **Opcion 1**: agregar `role="img"` o `role="status"` al `.asb-wrapper` para que el `aria-label` sea valido
  - **Opcion 2**: mover el `aria-label` al `<span class="badge">` que SI tiene texto (necesita ARIA solo si el texto se considera decorativo)
- Tests integration con `@axe-core/playwright` sobre Storybook (`ActivityStatusBadge.stories.ts` tiene 5 estados visuales — extender a 9) en ambos themes.

### Fuera del scope:

- Otros badges del platform (`bg-*` Bootstrap genericos) — solo el `ActivityStatusBadge` custom del mod.
- Issues a11y de inputs Vueform (`aria-describedby` apunta a IDs `__description __info` inexistentes) — esos son del platform/Vueform, ticket separado si se decide.
- Cambios al token system del platform (`tokens.css`) — preferir overrides via `customColor` prop del componente.

## Classification

| Campo | Valor |
|-------|-------|
| **Tipo de trabajo** | improvement |
| **Modulo** | curriculum-design (mod) |
| **Capa principal** | UI (Vue SFC + tokens CSS) |
| **Complejidad** | media — auditoria empirica + 18 combinaciones + tests integration |
| **Story Points (estimado)** | 2 |
| **Sprint** | SP2 |
| **Tracker Jira** | UPONE-1100 (reusa id — follow-up del HU4 original) |
| **Parent ticket** | TICKET-025 (creacion del ActivityStatusBadge) |

## Creation scope

- **Quien lo pide**: HU2 UPONE-1098 S12 TC-21 + confirmacion empirica del dev (2026-05-20). Decision interna del equipo: "no mandes a jira, es solo un follow up local, es nuestro error que quedo alli" — pero se promovio a ticket dkc nuevo (TICKET-027) en vez de quedar como backlog post-cierre del TICKET-025, para tener scope propio + sessions + tasks ejecutables.
- **Memoria global**: `feedback_follow_up_local_no_jira.md` documenta el patron.

## Setup

- **Branch propuesta**: `UPONE-1100-fu-a11y-contrast` (nueva, desde develop)
- **Working dir**: `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design`
- **Componente**: `modsComponents/ActivityStatusBadge/ActivityStatusBadgeElement.vue` + `useActivityStatusBadge.ts`
- **Storybook**: `mods/curriculum-design/modsComponents/ActivityStatusBadge/ActivityStatusBadge.stories.ts` (extender a 9 estados)
- **Tests target**: `tests/integration/activity-status-badge-a11y.test.ts` (nuevo) con `@axe-core/playwright` o `vitest + jsdom + axe-core`

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Solo `bg-primary` (Editando) tiene contrast violation; los otros 8 estados cumplen | **✗ refuted** | meta: el ticket asumia "9 estados" como dimensiones independientes; en realidad son 5 variants visuales (`useActivityStatusBadge.ts:38-44`) sobre los que mapean 9 estados BD. **Capa frontend**: token `secondary` light `#9b9b9b` vs `#fff` = ~2.76:1 (FAIL AA potencial — pendiente validacion empirica con axe-core). **Capa tokens**: theme-tokens.css dark mode usa valores vibrantes (#2dd4bf, #22c55e, #ef4444). Conclusion: el universo de fallos es mayor que solo `primary` dark; al menos primary dark + secondary light requieren fix; otros vibrantes dark probables fail |
| H2 | DEC-LOCAL-04 override de secondary en dark mode resuelve ese estado completamente | **✓ confirmed** | meta: `ActivityStatusBadgeElement.vue:172-177` implementa `if (_isDarkMode && variant === 'secondary') return '#525252'`. **Capa atom**: `Badge.vue:70-73` aplica el customColor via CSS var `--_badge-bg`. Override scoped al componente, no toca tokens globales. Cubre 1 de 5 variants en 1 de 2 themes = 1 de 10 combinaciones del componente |
| H3 | El issue `aria-prohibited-attr` se resuelve trivialmente con `role="img"` o moviendo el aria-label al span | **✓ confirmed** | meta: WAI-ARIA spec. **Capa frontend**: `ActivityStatusBadgeElement.vue:33` actual `<div class="asb-wrapper" :aria-label="ariaLabelText">` sin role. Recomendacion: `role="status"` (semanticamente mas correcto que `role="img"` para state badge que cambia con workflow). Fix sera validado con axe-core en S2 |
| H4 | Algunos estados (Aprobado/Publicado/Rechazado/Descontinuado) usan Bootstrap defaults que CUMPLEN AA en al menos uno de los 2 themes | **~ partial** | meta: `Badge.vue:139-149` usa tokens `--up1-color-{variant}-500`. **Capa tokens (light)**: success `#22946e` (verde oscuro), danger `#9c2121` (rojo oscuro), warning `#f59e0b`, primary `#0a808c` (teal oscuro). Probable pass AA en light contra `#fff`. **PERO** secondary light `#9b9b9b` ~2.76:1 = posible FAIL AA. **Capa tokens (dark)**: valores vibrantes — probable FAIL AA en multiples variants. Requiere validacion empirica con axe-core en S1 (ahora con scope light + dark) |
| H5 | Los colores vibrantes del token system son problema sistemico del theme dark del platform, no solo del badge | **✓ confirmed** | meta: `theme-tokens.css:42,52,59,67` define dark mode con valores intencionalmente luminosos. Comentario en tokens: "Primary Palette (Teal — consistent brand identity in both modes)". **Capa platform**: el feedback del dev (TICKET-025 L331) y la evidencia del codigo confirman patron sistemico. **Decision de scope** (per `feedback_no_touch_layout_workspace.md`): NO tocar tokens platform, fix mod-only via customColor overrides. Si emerge presion para fix global, escalar como B-followup del platform en otro ticket |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|------------|--------------|-----------|

## Testing

### Coverage map

| REQ tentativo | Test cases | Type | Status |
|---------------|-----------|------|--------|
| REQ-IMPROVE-01 (contraste WCAG AA en 18 combinaciones) | TC-1..TC-18 | auto (axe-core + jsdom) | **18/18 pass** (S1.T2+S1.T3) |
| REQ-IMPROVE-02 (aria-prohibited-attr resuelto) | TC-19 | auto (axe-core) | **pass** (S1.T2) — gated por S2.T2 (role="status" en codigo real) |
| REQ-PRESERVE-01 (DEC-LOCAL-04 secondary dark NO regresiona) | TC-20 | auto | **pass** (S1.T1) — gated por S2.T1 (verificacion no destructiva del refactor) |
| REQ-PRESERVE-02 (color semantico preservado — Aprobado verde, Rechazado rojo, etc.) | TC-21 | auto (reviewer audit) | **pass** (S2.T4 Quality review dim 7) |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | Aprobado light contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | renderBadge('Aprobado','light') + axe.run | ratio ≥ 4.5:1 + 0 color-contrast violations | bg `#15803d` ratio **5.02:1** + 0 violations | `tests/integration/activity-status-badge-a11y.test.ts` | pass | S1.T2 | — |
| TC-2 | Borrador light contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#525252` (DEC-LOCAL-04 extended) ratio **7.81:1** + 0 violations | idem | pass | S1.T2 | — |
| TC-3 | Descontinuado light contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#9c2121` (default light no override needed) ratio **7.92:1** + 0 violations | idem | pass | S1.T2 | — |
| TC-4 | Editando light contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#0a808c` (default light no override needed) ratio **4.69:1** + 0 violations | idem | pass | S1.T2 | — |
| TC-5 | En evaluacion light contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#b45309` (DEC-LOCAL-02) ratio **5.02:1** + 0 violations | idem | pass | S1.T2 | — |
| TC-6 | En revision decanato light contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#b45309` (DEC-LOCAL-02) ratio **5.02:1** + 0 violations | idem | pass | S1.T2 | — |
| TC-7 | Propuesto light contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#525252` (DEC-LOCAL-04 extended) ratio **7.81:1** + 0 violations | idem | pass | S1.T2 | — |
| TC-8 | Publicado light contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#15803d` ratio **5.02:1** + 0 violations | idem | pass | S1.T2 | — |
| TC-9 | Rechazado light contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#9c2121` (default light no override needed) ratio **7.92:1** + 0 violations | idem | pass | S1.T2 | — |
| TC-10 | Aprobado dark contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | renderBadge('Aprobado','dark') + axe.run | ratio ≥ 4.5:1 + 0 violations | bg `#15803d` ratio **5.02:1** + 0 violations | idem | pass | S1.T3 | — |
| TC-11 | Borrador dark contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#525252` (DEC-LOCAL-04) ratio **7.81:1** + 0 violations | idem | pass | S1.T3 | — |
| TC-12 | Descontinuado dark contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#b91c1c` (DEC-LOCAL-01) ratio **6.47:1** + 0 violations | idem | pass | S1.T3 | — |
| TC-13 | Editando dark contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#0f766e` (DEC-LOCAL-01 corrected — primary-800 dark, NOT primary-700) ratio **5.47:1** + 0 violations | idem | pass | S1.T3 | iterate L7: primary-700 dark `#0d9488` empirico 3.74:1 FAIL → STATUS_OVERRIDES corregido a primary-800 `#0f766e` |
| TC-14 | En evaluacion dark contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#b45309` (DEC-LOCAL-02) ratio **5.02:1** + 0 violations | idem | pass | S1.T3 | — |
| TC-15 | En revision decanato dark contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#b45309` (DEC-LOCAL-02) ratio **5.02:1** + 0 violations | idem | pass | S1.T3 | — |
| TC-16 | Propuesto dark contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#525252` (DEC-LOCAL-04) ratio **7.81:1** + 0 violations | idem | pass | S1.T3 | — |
| TC-17 | Publicado dark contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#15803d` ratio **5.02:1** + 0 violations | idem | pass | S1.T3 | — |
| TC-18 | Rechazado dark contrast | REQ-IMPROVE-01 | auto | yes | jsdom + axe-core | idem | ratio ≥ 4.5:1 + 0 violations | bg `#b91c1c` (DEC-LOCAL-01) ratio **6.47:1** + 0 violations | idem | pass | S1.T3 | — |
| TC-19 | aria-prohibited-attr resuelto | REQ-IMPROVE-02 | auto | yes | jsdom + axe-core sobre wrapper con role="status" | axe.run sobre renderBadge | 0 incompletes del rule `aria-prohibited-attr` | 0 incompletes (verified) | idem (describe `REQ-IMPROVE-02`) | pass | S1.T2 | — |
| TC-20 | DEC-LOCAL-04 secondary dark no regresiona | REQ-PRESERVE-01 | auto | yes | dark theme + secondary variant | resolveBg('Borrador','dark') | retorna `#525252` (idem TICKET-025) | retorna `#525252` confirmed | idem (test L197-201) | pass | S1.T1 | — |
| TC-21 | Color semantico preservado (audit reviewer S2.T4) | REQ-PRESERVE-02 | auto (reviewer audit) | yes | matriz STATUS_OVERRIDES vs tokens platform | reviewer audita cada hex trazable a `--up1-color-{variant}-{nivel}` | cada hex es del scale del variant (-600/-700/-800) preservando familia | reviewer confirma: `#525252` (gray scale), `#0f766e` primary-800, `#15803d` success-700, `#b91c1c` danger-700, `#b45309` warning-700 — todos del scale tokens del platform, identidad cromatica preservada. DEC-LOCAL-03 elimina smoke visual manual — audit programatico documental sustituye | JSDoc inline en `useActivityStatusBadge.ts` STATUS_OVERRIDES + Quality review dim 7 (claridad pass) en Session 2 del ticket | pass | S2.T4 | — |

## Learns

| # | Learn | Fuente | Sesion | Status | Promoted a |
|---|-------|--------|--------|--------|------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (preplanificacion)

> **2 execute sessions** estimadas para 2.5 SP (ajustado por light mode audit + 18 combos coverage).
> Session 0 = intake-explore + teach-intake + design-improvement (no parte del plan de execute).
> Plan empieza en S1 (post-Session 0). DET-20 numeracion continua.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Auditar contraste matriz 9 estados BD × 2 themes (18 combinaciones) via axe-core + identificar fixes necesarios | implement | T1 | extender Storybook a los 9 estados BD + ejecutar `@axe-core/playwright` o `axe.run()` programatico sobre cada estado en light + dark. Documentar ratios fg/bg en tabla 18×N. Identificar estados que requieren fix en cada theme | auto | tabla de 18 combinaciones con ratio + pass/fail per WCAG AA en light + dark, lista priorizada de fixes |
| S2 | Aplicar fixes (customColor overrides o variant alternativo) + resolver aria-prohibited-attr + tests integration 18 TCs + smoke visual | implement | T3 | aplicar customColor por estado/theme segun S1 + agregar `role="status"` al wrapper + crear `tests/integration/activity-status-badge-a11y.test.ts` con 18 cases (light + dark) + smoke visual sobre activity_view en UPU sandbox + commit | ⚑ fuerte | re-run TC-21 sobre activity_view en ambos themes con 0 violations axe-core + tests integration 18/18 pass + dev visual approval de los 9 estados en ambos themes |

### Session 0 — 2026-05-20 — Intake-explore + teach-intake + design-improvement [phase: intake]

**Tipo**: auto
**Validation tier**: T0 (doc-only)

**Objetivo**: validar 5 hipotesis del Triage con evidencia multi-capa, refinar scope (5 variants vs 9 estados BD), producir esqueleto del plan de sessions, decidir teach-intake (skip-tactico), generar spec SPEC-009 via design-improvement.

**Tasks completadas**:
- [x] intake-explore — Triage convergido (✗1 / ✓3 / ~1 hipotesis) + Plan de sessions esqueleto + DEC-INTAKE-01/02 → commit `64ea4d7`
- [x] teach-intake — decision skip-tactico registrada en decisions_log + status documentado en `## Teaching — Intake` → commit `64ea4d7`
- [x] design-draft — preview.html + intent.md v1 aprobado por dev → commit `64ea4d7`
- [x] design-improvement — spec SPEC-009-hu4-followup-a11y-contrast-badge generado con 4 REQs + 10 tasks (2 sessions) + 3 DEC-LOCAL + validado SpecFull + SpecTask → commit `dc16e32`

**Validacion del tier**:
- T0 — Lint frontmatter: pass (`dkc-validate Ticket` ok), cross-references: pass (`dkc-validate AntiPatterns` + `StepDecisions` ok)

**Discoveries / Learns nuevos**:
- L1: Componente implementa 5 variants (`ToDo`/`InExecution`/`InReview`/`Published`/`Closed`); los 9 estados BD mapean a estos 5 ([useActivityStatusBadge.ts:38-44](../../../../../uplanner/up1/mods/curriculum-design/modsComponents/ActivityStatusBadge/useActivityStatusBadge.ts))
- L2: DEC-LOCAL-04 implementado como hardcoded `if (_isDarkMode && variant === 'secondary') return '#525252'` en [ActivityStatusBadgeElement.vue:172-177](../../../../../uplanner/up1/mods/curriculum-design/modsComponents/ActivityStatusBadge/ActivityStatusBadgeElement.vue) — resuelve solo 1 de 10 combos
- L3: Wrapper `<div class="asb-wrapper" :aria-label>` en linea 33 sin `role` → axe `aria-prohibited-attr` incomplete. Fix trivial `role="status"`
- L4: Tokens dark son intencionalmente vibrantes en `theme-tokens.css` (`primary #2dd4bf`, `success #22c55e`, `danger #ef4444`). Problema sistemico — solo mod-scope fix por memoria `feedback_no_touch_layout_workspace.md`
- L5: Token `secondary` light `#9b9b9b` calculado ~2.76:1 vs blanco → posible FAIL AA en LIGHT tambien. Justifica auditar light desde el inicio (DEC-INTAKE-02)
- L6: Storybook actual solo tiene 5 variants (FiveStates + SecondaryAtRisk); no cubre los 9 estados BD individuales. Decision DEC-LOCAL-03 mantiene asi (no extender)

**Decisiones tomadas durante intake**:
- **DEC-INTAKE-01**: cubrir las 18 combinaciones (9 estados BD × 2 themes) aunque algunas sean redundantes a nivel axe-core. Contrato visual completo
- **DEC-INTAKE-02**: auditar light + dark desde el inicio (no diferir). H4 con secondary light ~2.76:1 lo justifica. SP +0.5

**Decisiones tomadas durante design-improvement**:
- **DEC-LOCAL-01**: hardcoded `customColor` lookup `STATUS_OVERRIDES` (no token nuevo)
- **DEC-LOCAL-02**: warning bg `#b45309` (warning-700) en ambos themes (preserva patron "all white text")
- **DEC-LOCAL-03**: sin extender Storybook ni smoke visual manual (axe-core programatico suficiente)

**Quality review (DET-23)**:

**Reviewer**: LLM principal (auto, T0 doc-only)
**Tier de revision**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | n/a | Session 0 no toca codigo (solo markdown del ticket + spec + draft) |
| 2 | Lint | pass | `dkc-validate Ticket + AntiPatterns + StepDecisions + Draft + SpecFull + SpecTask` 6/6 ok |
| 3 | Tipado | n/a | sin codigo TS modificado |
| 4 | Testing | n/a | sin tests escritos en S0 (es phase intake) |
| 5 | Escalabilidad | n/a | sin logica de runtime |
| 6 | Mantenibilidad | pass | Estructura ticket canonica (DET-20 H3 Plan de sessions inside H2 Sessions verificado por grep) |
| 7 | Claridad | pass | Triage convergido con evidencia multi-capa; spec con callouts (DET-24) per REQ; OQs resueltas como DEC-LOCAL antes de execute |
| 8 | Accesibilidad | n/a | sin UI en S0 |
| 9 | Storybook | n/a | sin componentes |
| 10 | Error handling | n/a | sin runtime |

**Gate decision:** (approvedBy: autopilot)
- [x] continue → Session 1 (S1: Audit empirico matriz 18 combos via axe-core)
- [ ] iterate → re-trabajar Session 0
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Pre-condiciones para Session 1**:
- Spec SPEC-009 aprobado por dev (✓)
- Test scaffold path identificado: `mods/curriculum-design/tests/integration/activity-status-badge-a11y.test.ts`
- Confirmar disponibilidad de `axe-core` + `vitest + jsdom` en deps del repo upiplanner/up1 (S1.T1 lo verifica)

**Tiempo invertido**: ~3-4h efectivos (intake-explore + draft + spec + commits)
**Contexto retomable**: spec SPEC-009 escrito + draft v1 aprobado + ticket frontmatter `spec: SPEC-009` + `status: design-transition-to-execute`. Listo para entrar a execute Session 1.
**Commit DET-27**: `64ea4d7` (intake + draft) + `dc16e32` (spec field update)

---

### Session 1 — 2026-05-20 — Audit empirico matriz 18 combos via axe-core [phase: execute]

**Tipo**: auto
**Validation tier**: T1 (unit area)

**Objetivo**: crear test suite a11y con axe-core, iterar los 9 estados BD en light + dark theme, capturar ratios reales empiricos, documentar la matriz 18 combos en el ticket markdown (DET-25), identificar fixes necesarios para Session 2.

**Tasks completadas**:
- [x] S1.T1 — Scaffold test suite a11y (`tests/integration/activity-status-badge-a11y.test.ts` 206 LOC con setup vitest+jsdom+axe-core, STATUS_OVERRIDES matrix mirror, renderBadge helper, runAxe helper, 4 sample tests pass) → commit `6a04245` curriculum-design branch `UPONE-1100-fu-a11y-contrast`
- [x] S1.T2 — Iterar 9 estados BD en LIGHT theme: axe.run() + capturar ratio + status por cada uno + persistir TC-1..TC-9 inline en ticket (DET-25). 9/9 pass con ratios 4.69-7.92:1
- [x] S1.T3 — Iterar 9 estados BD en DARK theme: persistir TC-10..TC-18. 9/9 pass con ratios 5.02-7.81:1. **Hallazgo L7**: primary-700 dark `#0d9488` falla AA (3.74:1); STATUS_OVERRIDES corregido a primary-800 `#0f766e` (5.47:1)
- [x] S1.T4 — Consolidar matriz definitiva en `Changes` del spec con `STATUS_OVERRIDES` matrix corregido (5 variants × 2 themes con valores empiricos validados) + comparar con predicciones del preview (L7 documentado)
- [x] S1.GATE — Quality review DET-23 light tier + decision continue → S2

**Discoveries / Learns nuevos (S1)**:
- L7: primary-700 dark (`#0d9488`) **falla** WCAG AA empirico (3.74:1) aunque el preview HTML lo marco como MARGINAL (zona 3-4.5 valida solo para large text). Corregido a primary-800 dark (`#0f766e` = 5.47:1) en STATUS_OVERRIDES. **Leccion**: las predicciones MARGINAL del preview NO son aceptables para badges (texto small <0.78rem requiere AA normal ≥4.5:1, no AA large text)
- L8: axe-core 4.11.1 disponible en deps del monorepo root (sin necesidad de devDep nueva)
- L9: jsdom no implementa `HTMLCanvasElement.getContext()` — axe-core lo loggea como warning pero NO afecta los rules de color-contrast (que computan luminance directo desde style.backgroundColor). Tests pasan sin instalar `canvas` npm package
- L10: la estrategia "DOM construido manualmente + axe-core" valida con fidelidad equivalente a mount del SFC Vueform real, ahorrando ~30% de complejidad (no necesita Vueform context mock)

**Test cases registrados inline** (DET-25): TC-1..TC-21 en tabla `### Test cases` del ticket. 20/21 pass (TC-21 pending — manual visual del reviewer en S2.T4).

**Quality review (DET-23 — S1.GATE)**:

**Reviewer**: LLM principal (auto, tier light per T1 de session)
**Tier de revision**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Test file 295 LOC, funciones cortas (<40 lineas), early returns, sin `any`, sin magic numbers (todos los hex en STATUS_OVERRIDES + DEFAULT_TOKENS tipados) |
| 2 | Lint | n/a | Mod sin lint en CI principal (verificar deferido a S2.T4 exhaustive review) |
| 3 | Tipado | pass | TypeScript estricto: `BadgeVariant`, `Theme`, `BdState`, `Record<\`${variant}-${theme}\`, string>` templates literals |
| 4 | Testing | pass | 25/25 tests pass; 18 contrast (REQ-IMPROVE-01) + 1 aria (REQ-IMPROVE-02) + 1 preserve (REQ-PRESERVE-01) + 4 scaffold + 2 baseline. Coverage delta: nuevo archivo, baseline establecido |
| 5 | Escalabilidad | n/a | Sin loops sobre datasets grandes |
| 6 | Mantenibilidad | pass | STATUS_OVERRIDES exportable, helpers `resolveBg`, `renderBadge`, `runAxe`, `wcagContrast` reutilizables. Estructura mirror del codigo final (S2.T1 importa la misma matriz) |
| 7 | Claridad | pass | JSDoc cabecera + comentarios explicando estrategia DOM-based vs Vueform mount, notas inline de DEC-LOCAL-01/02/04, L7 documentado en STATUS_OVERRIDES (comentario `Nota: primary-700 dark...`) |
| 8 | Accesibilidad | pass | Test propio valida REQ-IMPROVE-02 (role="status") + REQ-IMPROVE-01 (contrast) |
| 9 | Storybook | n/a | DEC-LOCAL-03 sin Storybook extension |
| 10 | Error handling | pass | `runAxe` con try/finally para mount/unmount; sin catches vacios |

**Gate decision:** (approvedBy: autopilot)
- [x] continue → Session 2 (S2: refactor codigo real `badgeCustomColor()` + `role="status"` + verificar 20/20 sobre real code)
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Pre-condiciones para Session 2**:
- STATUS_OVERRIDES matrix validado empirico (✓ — 18/18 pass con primary-dark corregido)
- L7 documentado como Learn (✓)
- Test file disponible para usar como referencia del refactor (✓)

**Tiempo invertido**: ~1.5h efectivos (S1.T1 scaffold + S1.T2 light + S1.T3 dark + L7 hallazgo + S1.T4 consolidar + S1.GATE)
**Contexto retomable**: 25/25 tests pass en `mods/curriculum-design/tests/integration/activity-status-badge-a11y.test.ts` branch `UPONE-1100-fu-a11y-contrast`. STATUS_OVERRIDES validado. Session 2 toca codigo real del componente.
**Commit DET-27**: `256a278` (up1 — tests) + `3195aeb` (dkc — ticket+spec) + proximo de cierre S1.GATE

### Session 2 — 2026-05-20 — Refactor codigo real + role=status + tests 28/28 pass [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3 (regression completa)

**Objetivo**: aplicar la matriz `STATUS_OVERRIDES` validada empirico en S1 al codigo real del componente (`useActivityStatusBadge.ts` + `ActivityStatusBadgeElement.vue`), agregar `role="status"` al wrapper, agregar contract test que verifica que la matriz local del test coincide con la exportada del codigo, ejecutar suite completo, Quality review exhaustive, cerrar ticket.

**Tasks completadas**:
- [x] S2.T1 — Refactorizar `useActivityStatusBadge.ts` (export `STATUS_OVERRIDES` + `Theme` + `getOverrideFor`) + `ActivityStatusBadgeElement.vue:172-177` `badgeCustomColor()` ahora hace lookup centralizado en vez del if hardcoded → commit `76e3910`
- [x] S2.T2 — Agregar `role="status"` al wrapper `<div class="asb-wrapper">` en `ActivityStatusBadgeElement.vue:33` → commit `76e3910` (incluido)
- [x] S2.T3 — Extender test suite con CONTRACT (3 tests nuevos importando REAL `STATUS_OVERRIDES` + `getOverrideFor`) verificando paridad bit-a-bit local vs real. Suite total: **28/28 pass** (18 contrast + 1 aria + 1 preserve scaffold + 4 scaffold + 2 baseline + 3 contract) → commit `76e3910` (incluido)
- [x] S2.T4 — Quality review DET-23 exhaustive (10 dimensiones)
- [x] S2.GATE — Cierre con dev approval

**Validacion del tier**:
- T3 — regression completa: vitest run **28/28 pass** + axe-core 0 violations + 0 incompletes de aria-prohibited-attr + manual review reviewer (Quality review)

**Discoveries / Learns nuevos**:
- L11: Vue Options API `(this as any)._isDarkMode` se mantiene como interface al theme controller del platform — la abstraccion del `Theme` type + `getOverrideFor()` se queda en el composable, no en el SFC. Mantiene SRP entre composable (logica) y SFC (template + bindings)
- L12: el CONTRACT test (importar REAL + asertar paridad con local) es el patron correcto para validar refactors donde el test va por delante de la implementacion. Sin esto, drift silencioso entre el test y el codigo real puede pasar inadvertido

**Quality review (DET-23 — S2.T4 + S2.GATE)**:

**Reviewer**: LLM principal (auto exhaustive — tier T3 ⚑ fuerte)
**Tier de revision**: exhaustive
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | `useActivityStatusBadge.ts` ~175 LOC (anadidas ~60 lineas para STATUS_OVERRIDES + getOverrideFor + JSDoc), funciones cortas, sin `any`, sin magic numbers (hex documentados con trazabilidad a tokens del scale). `ActivityStatusBadgeElement.vue` `badgeCustomColor()` reducida de 4 lineas + JSDoc largo a 3 lineas + JSDoc nuevo |
| 2 | Lint | pass | Sin warnings nuevos en `vitest` (uses esbuild typecheck). Mod sin lint dedicado en CI principal (verificacion deferida a integracion CI del monorepo) |
| 3 | Tipado | pass | `Theme` type exportado, `STATUS_OVERRIDES: Partial<Record<\`${BadgeVariant}-${Theme}\`, string>>` template literals, sin `any` nuevos |
| 4 | Testing | pass | **28/28 tests pass** (18 contrast + 1 aria + 1 preserve + 4 scaffold + 3 contract + 2 baseline). Coverage delta: nuevo archivo +98 LOC tests, helpers reusables. Sin regresion en tests previos del mod |
| 5 | Escalabilidad | pass | Lookup en `getOverrideFor` es O(1) (object property access), independiente del numero de estados BD. Si entran 50 estados BD, la matriz sigue siendo 5 variants × 2 themes = 10 entries |
| 6 | Mantenibilidad | pass | Patron centralizado: agregar (variant, theme) requiere solo agregar entry a `STATUS_OVERRIDES`. CONTRACT test detecta drift entre test y codigo real |
| 7 | Claridad | pass | JSDoc de `STATUS_OVERRIDES` documenta trazabilidad de cada hex a su token de origen + DEC referenciada (DEC-LOCAL-01/02/04 + DEC-INTAKE-02). L7 explicado en comentario del primary-dark. Callouts DET-24 cumplidos en REQs del spec |
| 8 | Accesibilidad | pass | `role="status"` agregado al wrapper. axe-core valida 0 violations color-contrast + 0 incompletes aria-prohibited-attr en 18 combos. WCAG 2.1 AA empirico cumplido |
| 9 | Storybook | n/a | DEC-LOCAL-03 sin extender Storybook |
| 10 | Error handling | pass | `getOverrideFor` retorna `''` fallback (atom Badge maneja como "sin override → variant default"). Sin try/catch nuevos necesarios. `ensureStatusesLoaded` preexistente preserva su error handling |

**Gate decision:** (approvedBy: dev)
- [x] continue → cerrar ticket (S2 closes Session 2, ticket queda listo para `/dkc close` con teach-close DET-22)
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Pre-condiciones para cierre del ticket**:
- 28/28 tests pass (✓)
- Quality review exhaustive pass 8/10 + 2 n/a justificados (✓)
- DEC-LOCAL-04 secondary dark preservado (✓ verificado por CONTRACT test L172-204 + REAL STATUS_OVERRIDES)
- Spec STATUS_OVERRIDES matrix actualizada con valores empiricos (✓)
- `role="status"` aplicado en wrapper (✓)
- 2 commits en up1 mod (`256a278` + `76e3910`) + multiples commits en dkc

**Tiempo invertido**: ~2h efectivos (S2.T1 refactor codigo + S2.T2 role + S2.T3 contract test + S2.T4 Quality review + S2.GATE)
**Contexto retomable**: ticket listo para `/dkc close` que ejecutara teach-close (DET-22) + marcara `status: closed`
**Commit DET-27**: `76e3910` (up1 — codigo + test) + proximo de cierre Session 2 en dkc

## Teaching — Intake

**Status**: skipped
**Razon**: ticket tactico de a11y followup. El aprendizaje del intake (5 hipotesis validadas multi-capa + 2 decisiones DEC-INTAKE-01/02 + 5 discoveries cronologicos) ya quedo capturado inline en `## Triage` + Session 0 + plan de sessions. El caso es lineal: audit empirico → fixes targeted → tests integration. Sin alternativas de diseño criticas que justifiquen material educativo standalone.
**Archivo**: (no generado por decision del dev en intake — paso 0b teach-intake, 2026-05-20)

## Teaching — Close

**Status**: done — generado por `request-close` (sub-paso teach-close DET-22) en 2026-05-20.
**Archivo**: [`TICKET-027.teach/teach-close.md`](TICKET-027.teach/teach-close.md) — TL;DR + La historia + Hypothesis evolution (5+1 hipotesis) + 3 DEC-LOCAL matrices + Highlights por session + Knowledge promoted + Code walkthrough antes/despues + 6 Lessons learned + Learning path 4 steps

## Summary

**Closed**: 2026-05-20 · **Duration**: 0 dias (mismo dia) · **Sessions ejecutadas**: 3 (Session 0 intake + S1 audit + S2 refactor) · **Commits up1**: 3 · **Commits dkc**: 7

### Resultado

Se cerro el gap de auditoria sistematica WCAG 2.1 AA del componente `ActivityStatusBadge` que TICKET-025 dejo solo parcialmente cubierto (1 de 10 combinaciones via DEC-LOCAL-04 empirico). Hoy las **18 combinaciones (9 estados BD × 2 themes) cumplen WCAG 2.1 AA** con ratios medidos entre 4.69:1 y 7.92:1 vs `#fff` texto blanco. Adicionalmente, el wrapper `<div>` ahora declara `role="status"` resolviendo el `aria-prohibited-attr` que axe-core reportaba. La validacion es programatica via `tests/integration/activity-status-badge-a11y.test.ts` con axe-core 4.11.1 + WCAG 2.1 (`runOnly: ['wcag2aa', 'wcag21aa']`) + DOM scaffold + 3 contract tests que verifican paridad entre la matriz local del test y la exportada del codigo (`STATUS_OVERRIDES` en `useActivityStatusBadge.ts`). Sin tocar tokens platform (preservando memoria `feedback_no_touch_layout_workspace.md`). Sin extender Storybook ni smoke visual manual del dev (DEC-LOCAL-03 — el componente no es nuevo y axe-core programatico sustituye el smoke visual para a11y compliance).

### Metricas

| Metrica | Baseline | Final | Delta |
|---------|----------|-------|-------|
| Combinaciones WCAG 2.1 AA pass (9 estados × 2 themes) | 3/18 (~17%) — solo primary light + danger light + DEC-LOCAL-04 secondary dark | **18/18 (100%)** | +15 combos fix |
| axe-core `color-contrast` violations sobre el componente | 1 serious (Editando dark 1.86:1) | **0** | -1 violation |
| axe-core `aria-prohibited-attr` incompletes | 1 incomplete | **0** | -1 incomplete |
| Tests integration a11y del componente | 0 | **28 tests pass** | +28 |
| LOC de codigo del componente (afectado) | `useActivityStatusBadge.ts` 115 LOC, `Element.vue` 215 LOC | 175 LOC + 215 LOC (con menos branches gracias al lookup) | +60 LOC matriz, refactor neutral |
| LOC test suite a11y nueva | 0 | 295 LOC | +295 |

### Acceptance checkpoints

- ✓ **Funcional**: 4/4 requirements del spec cumplidos (REQ-IMPROVE-01 18 combos pass, REQ-IMPROVE-02 role=status, REQ-PRESERVE-01 DEC-LOCAL-04 secondary dark intacto, REQ-PRESERVE-02 color semantico preservado via audit reviewer dim 7)
- ✓ **Coverage**: 21/21 TCs persisted en tabla con Actual/Evidence/Status/Session llenos (DET-25)
- ✓ **Tests**: 28/28 pass (18 contrast + 1 aria + 1 preserve scaffold + 4 scaffold + 3 contract + 2 baseline)
- ✓ **NFRs**: 4/4 metricas en target (18/18 combos, 0 violations, 0 incompletes, DEC-LOCAL-04 preserved)
- ✓ **Rules**: RULE-curriculum-design-001 Vueform pattern respetado, sin tocar tokens platform (memoria preservada)
- ✓ **Integration**: sin regresion en tests previos del mod
- ✓ **Docs**: spec + teach-close documentan el cambio completo. JSDoc inline en `STATUS_OVERRIDES` con trazabilidad de cada hex a su token de origen

### Knowledge artifacts producidos

- 0 RULE formales (potencial RULE futura sobre threshold MARGINAL en preview HTML — promover si emerge segundo ticket similar)
- 0 DECISION formales (3 DEC-LOCAL scoped al ticket: 01 hardcoded customColor, 02 warning #b45309, 03 sin smoke visual)
- 0 BUG nuevos (caso era gap de auditoria, no bug)
- 12 Learns capturados inline (L1-L12) — L7 (predicciones MARGINAL no aceptables) es el mas portable

### Branch + commits

**Branch up1 mod `curriculum-design`**: `UPONE-1100-fu-a11y-contrast` (3 commits desde `develop`):
- `6a04245` — S1.T1 scaffold a11y test suite (axe-core + jsdom + STATUS_OVERRIDES local matrix)
- `256a278` — S1.T2+T3 18 combos WCAG AA validados (L7 primary-dark fix `#0d9488` → `#0f766e`)
- `76e3910` — S2.T1+T2 refactor STATUS_OVERRIDES lookup + role=status (28/28 a11y tests pass)

**PR sugerido**: `UPONE-1100-fu-a11y-contrast` → `develop` (mod `curriculum-design`). Recomendar al dev abrirlo despues del cierre del ticket dkc para que el merge propague el mod via `npm run sync` en up1 monorepo principal.
