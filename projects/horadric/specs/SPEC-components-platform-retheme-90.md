---
id: SPEC-components-platform-retheme-90
project: horadric
ticket: HOR-090
status: done
---

# Re-theme de HC a plataforma dark-azul + acento amarillo

# Re-theme de HC a plataforma dark-azul + acento amarillo

## Executive summary — lo que estas aprobando

> *Spec del re-theme. Draft v1 aprobado (`HOR-090.draft/preview.html`). Impacto visual transversal.*

**Que se quiere**: subir HC de "navegación de texto" a plataforma moderna — dark-azul + amarillo de identidad, destacando status/métricas/IDs. El draft aprobado fija el target visual.

**Decisiones (resueltas en draft-approval)**:

| # | Decision | Resolución |
|---|----------|-----------|
| 1 | Amarillo: ¿accent separado de warning? | **Sí** — `--color-accent` (#f59e0b/#fcd34d) nuevo, `--color-warning` se mantiene. Coexisten. |
| 2 | Tono de azul | El del preview aprobado: bg `#050a14`, primary `#60a5fa`. |
| 3 | TicketsGrid | **Cards densas** (mantener densidad como vista alternativa al kanban, no cards completas). |
| 4 | Íconos | **Los actuales del proyecto** — NO agregar dependencia de íconos nueva (en super, dep nueva pregunta). |

**Riesgos**: vistas a medio migrar (mezcla zinc/azul) → migrar completa por vista; regresión visual de sessions/teach → no tocarlos (solo migrar slate residual) + screenshots.

**Que NO se hace**: agregar librería de íconos; tocar lógica de color de los componentes-referencia; cambiar datos (read-only).

**Tamaño**: 2 sessions. S1 fundación (tokens + tailwind alias + shell + drift fix, T2). S2 vistas (T3 ⚑ fuerte, validación visual).

**Como sabras que funciona**: `npm run build` OK; la app se ve dark-azul + amarillo coherente; screenshots de las 6 vistas sin mezcla zinc; sessions/teach intactos.

---

## Purpose

Activar de verdad el design-system (HOR-021) con paleta dark-azul + acento amarillo, exponiendo los tokens en Tailwind y migrando los `slate-*` hardcodeados, empezando por la fundación (tokens + shell) y subiendo las vistas planas a patrón "plataforma" (cards, status/métricas semánticos).

## Estado actual → deseado → delta

### Estado actual
- `tokens.css` (HOR-021) con paleta zinc-neutro + primary índigo + amarillo=warning. **559 `slate-*` hardcoded** lo ignoran. `tailwind.config.ts` no expone tokens.

### Estado deseado
- Tokens dark-azul + `--color-accent` amarillo, expuestos como utilities Tailwind. Shell + tickets + 6 vistas migrados, sin `slate-*` en lo migrado. Componentes-referencia intactos.

### Delta
| Cambia | NO cambia |
|--------|-----------|
| tokens.css (paleta azul + accent), tailwind.config (alias), shell, tickets, 6 vistas | Datos (read-only); lógica de color de sessions/teach/RuleBadge; estructura tabbed |

## Requirements

### REQ-IMPROVE-01: re-token dark-azul + accent amarillo + tailwind expone tokens

> **Que cambia**: la app pasa de zinc-neutro a azul-oscuro; el amarillo se vuelve acento de identidad; los tokens son usables como utilities Tailwind (`bg-elevated`, `text-primary`, `accent`).
> **Por que**: es la fundación — sin esto el re-theme no es transversal y seguís hardcodeando.

El sistema MUST re-tokenizar `tokens.css` (surfaces azul-oscuro, primary `#60a5fa`, `--color-accent` amarillo nuevo) y exponer los tokens como color utilities en `tailwind.config.ts`.

**Actor**: system · **Layers**: frontend (tokens, config)

<details><summary>Scenarios</summary>

#### Scenario: tokens azules + tailwind
- **GIVEN** tokens.css + tailwind.config.ts post-cambio
- **WHEN** se inspecciona / build
- **THEN** surfaces son azul-oscuro, `--color-accent` existe, y `bg-elevated`/`text-primary`/`text-accent` funcionan como utilities

</details>

### REQ-IMPROVE-02: shell migrado a tokens + nav activo destacado

> **Que cambia**: header/nav y shell dejan de usar `slate-*`; el nav activo se destaca en amarillo.
> **Por que**: el header es lo primero que se ve; fija el tono "plataforma".

El sistema MUST migrar `shell/*` (HeaderBar, ProjectSelector, Stat, FilterPill, SearchInput) a tokens/utilities, con el nav activo destacado (accent). Fix del drift banner light-mode en `SectionSessions.vue`.

**Actor**: system · **Layers**: frontend (shell)

### REQ-IMPROVE-03: vistas a patrón plataforma (status/métricas/list semánticos)

> **Que cambia**: board cards con status semántico, métricas con color por tipo, list-views de tabla a cards.
> **Por que**: es lo que sube de "navegación de texto" a plataforma.

El sistema MUST migrar TicketCard/TicketsGrid/WorkflowState (status semántico), ProjectOverview/HomeView/Stat (métricas por tipo), RecordsListView (tabla → list-cards), RecordDetailView/SpecDetail (badges semánticos), siguiendo el patrón del draft aprobado.

**Actor**: system · **Layers**: frontend (tickets, views)

### REQ-PRESERVE-01: componentes-referencia + read-only intactos

> **Que cambia**: nada en sessions/teach/RuleBadge salvo migrar slate residual; HC sigue read-only.
> **Por que**: son la barra de calidad; no romper lo que ya está bien.

El sistema MUST preservar la lógica de color de `SessionsSummaryTable`, `SectionSessions` (salvo banner), `HypothesisMap`, `DecisionMatrix`, `RuleBadge`. Sin regresión funcional. `npm run build` OK.

**Actor**: system · **Layers**: frontend

### REQ-PRESERVE-02: a11y AA + validación visual

> **Que cambia**: contraste AA en el nuevo theme; screenshots antes/después.
> **Por que**: dark-azul + amarillo debe ser legible.

El sistema MUST cumplir contraste WCAG AA (texto sobre azul-oscuro, amarillo sobre oscuro) y validarse con screenshots de las 6 vistas (gate ⚑ fuerte S2).

**Actor**: system · **Layers**: frontend

## Tasks

### Session 1 — Fundación: tokens + tailwind alias + shell + drift fix [tipo: auto] [tier: T2]

Quality review DET-23 standard (reviewer aislado por super, DET-30 REQ-10).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Re-token tokens.css (surfaces azul-oscuro + primary azul + `--color-accent` amarillo) | REQ-IMPROVE-01 | developer | — | src/assets/tokens.css | tokens azules + accent; build OK | git revert | DET-7 | done | 1 |
| S1.T2 | Exponer tokens como utilities en tailwind.config.ts | REQ-IMPROVE-01 | developer | S1.T1 | tailwind.config.ts | `bg-elevated`/`text-accent` resuelven; build OK | git revert | DET-7 | done | 1 |
| S1.T3 | Migrar shell/* a tokens + nav activo destacado + fix drift banner | REQ-IMPROVE-02 | developer | S1.T2 | src/components/shell/*, src/components/ticket-sections/SectionSessions.vue | 0 slate-* en shell migrado; build OK; screenshot header | git revert | DET-16 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2) + quality review DET-23 standard (reviewer aislado) | — | reviewer | S1.T3 | — | build OK + shell sin slate + DET-23 pass | — | DET-13, DET-14, DET-23 | done | 1 |

### Session 2 — Vistas a plataforma [tipo: ⚑ fuerte] [tier: T3]

Validación visual (screenshots). Reviewer aislado exhaustive obligatorio (super, T3, user-facing).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Board: TicketCard + TicketsGrid (cards densas) + WorkflowState con status semántico | REQ-IMPROVE-03 | developer | S1.GATE | src/components/tickets/*, src/views/TicketsBoard.vue | screenshot board; status por estado | git revert | DET-16 | done | 2 |
| S2.T2 | Métricas: ProjectOverview + HomeView + Stat con color por tipo | REQ-IMPROVE-03 | developer | S2.T1 | src/views/ProjectOverview.vue, HomeView.vue, src/components/shell/Stat.vue | screenshot overview | git revert | DET-16 | done | 2 |
| S2.T3 | List-views: RecordsListView (tabla → cards) + RecordDetailView/SpecDetail badges | REQ-IMPROVE-03 | developer | S2.T2 | src/views/RecordsListView.vue, RecordDetailView.vue, SpecDetail.vue | screenshot records; sin mezcla zinc | git revert | DET-16 | done | 2 |
| S2.T4 | Validación visual + a11y: screenshots de las 6 vistas + contraste AA + regresión sessions/teach | REQ-PRESERVE-01, REQ-PRESERVE-02 | reviewer | S2.T3 | — | screenshots aprobados; AA; build | N/A | DET-7, DET-13 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T3, ⚑ fuerte) + quality review DET-23 exhaustive (reviewer aislado) | — | reviewer | S2.T4 | — | build + screenshots + AA + DET-23 exhaustive | — | DET-13, DET-14, DET-23, DET-30 | done | 2 |

## Constraints

- RULE-platform-001 (CSS inline prohibido en componentes) — usar tokens/utilities, no `style=` salvo casos justificados (como ya hace SessionsSummaryTable).
- HC read-only — sin cambios de datos.
- No agregar dependencias (íconos) — usar los actuales.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HOR-021 tokens.css | internal | base del design-system | — |
| Draft v1 aprobado | internal | target visual | — |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Vistas a medio migrar (mezcla zinc/azul) | medium | high | migrar completa por vista; grep slate por vista; screenshots |
| Regresión visual sessions/teach | medium | medium | no tocar su lógica; screenshot de regresión en S2.T4 |
| Contraste AA insuficiente (amarillo/azul) | low | medium | verificar AA en S2.T4 |

## Open questions

(Ninguna — las 4 resueltas en draft-approval.)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: amarillo como `--color-accent` separado de `--color-warning`
- **Contexto**: el amarillo debe ser identidad (IDs, nav, CTAs) sin perder su rol de warning.
- **Opción elegida**: token nuevo `--color-accent` (#f59e0b/#fcd34d); `--color-warning` se mantiene.
- **Alternativas**: reusar `--color-warning` como accent — descartado (ambigüedad semántica: ¿es warning o identidad?).
- **Session**: design (draft-approval).

### DEC-LOCAL-02: TicketsGrid en cards densas, no cards completas
- **Contexto**: el modo Grid es alternativa al Kanban; convertirlo a cards completas perdería densidad.
- **Opción elegida**: cards densas (status semántico + acento, pero compactas).
- **Session**: design.

## Acceptance checkpoints

- [x] **Funcional**: tokens azules + accent + tailwind expone utilities (REQ-IMPROVE-01)
- [x] **Shell**: migrado, nav activo destacado, drift banner fixed (REQ-IMPROVE-02)
- [x] **Vistas**: board/métricas/list-views a patrón plataforma (REQ-IMPROVE-03)
- [x] **Preserve**: sessions/teach/RuleBadge intactos; build OK (REQ-PRESERVE-01)
- [x] **Visual + a11y**: screenshots 6 vistas sin mezcla zinc; contraste AA (REQ-PRESERVE-02)
