---
id: SPEC-up1-mcp-improve-dkc-migration
project: up1
ticket: TICKET-080
status: done
---

# Migración del plan de ejecución del MCP de up1 a artefactos DKC

# Migración del plan de ejecución del MCP de up1 a artefactos DKC

## Executive summary — lo que estas aprobando

**Que se quiere**: El desarrollo del `up1-mcp` (adaptador MCP que expone los mods curriculum-design/engagement/layouts a LLMs) se trackea hoy en un md externo de 288KB (S0–S34) con su propio tablero, desconectado de DKC. Esta mejora **migra todo ese conocimiento a artefactos DKC** del proyecto up1 (módulo + specs + reglas + decisiones + bugs + evolution log + backlog) y **retira el md** como fuente de verdad, de modo que el avance del MCP viva en el flujo DKC/HC y un ticket que desarrolle una capability de un mod pueda actualizar el MCP **orgánicamente**.

**Decisiones criticas que necesitan tu OK** (ya acordadas en intake — se listan para trazabilidad):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `up1-mcp` = **módulo** del proyecto up1 (no proyecto DKC propio) | Acoplamiento mod→MCP intra-proyecto; HC lo muestra junto al resto de up1 |
| 2 | Acoplamiento mod→MCP vía **RULE con backlog must** (DET-16/17) | Es el mecanismo del "update orgánico": el ticket del mod no cierra hasta reflejar el surface |
| 3 | Historia S0–S34 → **evolution log DKC-resident**, NO 34 tickets | Preserva la narrativa sin inflar el tracker con 34 cierres retro de bajo valor |
| 4 | Bugs de up1 → **reuse** de los existentes (dedup KB-first), no duplicar | Varios ya están en KB (audit gap, drift, scoped uniqueness); duplicar rompe DET-11 |

**Riesgos principales y como los mitigamos**:

- **Pérdida de contenido en una migración de 288KB** → cobertura verificada contra el inventario estructurado ya extraído (TC-1 recorre cada sección S0–S34/§12.E/F/R/§13-15/apéndice).
- **Bugs duplicados** → S3 lee 1×1 los candidatos existentes (`bug-platform-015/016/018/019/020`, `bug-object-manager-002`, `bug-core-001`) antes de crear; reuse > create.
- **Drift del KB de up1 / HC** → `dkc-validate` por tipo + `dkc-reindex` + revisión de HC al cerrar cada sesión.

**Que NO se hace en este ticket** (límites explícitos):

- NO se toca el código del `up1-mcp` (`/uplanner/mcp`) ni de up1 — es migración de KB, no desarrollo del MCP.
- NO se ejecutan los pendientes vivos del MCP (S9 hospedado, S25 T5/T9-T11, live E2E) — se **registran** como backlog del módulo.
- NO se recrean los 34 tickets históricos (decisión 3).
- NO se fixean los bugs de plataforma de up1 — se registran/enlazan.

**Tamaño estimado**: 3 sessions (S1–S3), ~4-6h efectivas, tier T0 (doc-only). La más voluminosa es S2 (~12 reglas + ~6 decisiones).

**Como vas a saber que funciona**:
- Abro HC y el proyecto up1 muestra el módulo `up1-mcp` con sus 2 specs, ~12 reglas, ~6 decisiones y el evolution log.
- Cada sección del md externo tiene un artefacto DKC destino (0 huérfanas).
- El md externo abre con un puntero a `projects/up1/specs/mcp/` como nueva fuente de verdad.
- La regla de acoplamiento está creada y enlazada desde curriculum-design/uengagement.

---

## Purpose

Convertir un plan de ejecución monolítico (md de 288KB, tracking propio S0–S34) en conocimiento DKC nativo del proyecto up1: registrar `up1-mcp` como módulo, descomponer el diseño/arquitectura/surface en specs, los principios/convenciones en reglas, las elecciones en decisiones, las limitaciones de up1 en bugs (reusando los existentes), y la historia de sesiones en un evolution log. El objetivo de fondo es **acoplar** el desarrollo del MCP al flujo de tickets del mod, para que el surface no derive.

## Requirements

### REQ-IMPROVE-01: Diseño y evolución del MCP viven en specs DKC

> **Que cambia**: el diseño del `up1-mcp` (objetivo, principios, arquitectura de 3 capas, auth, surface por mod, extensibilidad, limitaciones) pasa de secciones del md a specs DKC consultables; la historia S0–S34 a un evolution log.
> **Por que**: hoy ese diseño solo existe en el md externo, invisible a DKC/HC y al flujo de tickets.

El sistema (KB de up1) MUST contener, bajo `specs/mcp/`, las specs `SPEC-mcp-architecture` (objetivo §0, principios §1, arquitectura §2, auth §4, multi-LLM §6, homologación §8, auto-doc §9, packaging §10, limitaciones §11, trazabilidad apéndice) y `SPEC-mcp-surface-and-contracts` (catálogo de tools por mod §5, extensibilidad/ModPack §7, resolución semántica §12.R, guide derivada de contratos), más `EVOLUTION-up1-mcp.md` (tablero §12.0 + bitácora S0–S34). El módulo `up1-mcp` MUST estar registrado en `config.yaml`.

**Actor**: system (dev consumidor del KB)
**Layers**: config, docs/KB

#### Acceptance
**El usuario puede verificar que funciona**: en HC, el proyecto up1 lista el módulo `up1-mcp` con sus 2 specs y el evolution log; cada uno abre y refleja el contenido del md.

### REQ-IMPROVE-02: Principios y decisiones del MCP viven en reglas y decisiones DKC

> **Que cambia**: los principios no negociables (P1–P7), las convenciones de contrato (confidencialidad, higiene de salida, resolución con sinónimos), las reglas operativas (MCP-TEST-, sesión cifrada, preview→commit) y las elecciones de arquitectura pasan a `rules/mcp/` (una constraint por archivo) y `decisions/`.
> **Por que**: son constraints y decisiones reusables que deben citarse desde tickets futuros, no prosa en un md.

El sistema MUST contener reglas individuales en `rules/mcp/` para P1–P7, la regla de acoplamiento mod→MCP, y las convenciones de contrato/operativas; y registros de decisión en `decisions/` para foundations (§14), mvp-scope, multimod-arch (§12.E), model-v2 realign (§12.F), semantic-resolution (§12.R) y conversational-contract (S20/S22/S23/S21).

**Actor**: system
**Layers**: docs/KB

#### Acceptance
**El usuario puede verificar que funciona**: `rules/mcp/` contiene ~12 reglas con what/why/where/when y nivel normativo; `decisions/` contiene los ~6 registros con drivers y alternativas descartadas.

### REQ-IMPROVE-03: Limitaciones de up1 viven como bugs DKC y el acoplamiento mod→MCP queda formalizado

> **Que cambia**: las limitaciones de up1 (§11 + descubrimientos clasificados BUG) se registran como bugs en su módulo dueño, reusando los existentes; el acoplamiento orgánico se formaliza en una regla con backlog must.
> **Por que**: las limitaciones son defectos de up1 (no del MCP) y deben vivir en su módulo; el acoplamiento es el corazón del pedido.

El sistema MUST registrar las limitaciones de up1 como bugs en `bugs/{módulo}/` **reusando** los existentes cuando apliquen (dedup), y MUST contener `RULE-mcp-surface-reflects-mod-capability` que obligue, vía backlog must bloqueante (DET-16/17), a reflejar en `up1-mcp` toda capability de mod nueva expuesta a usuario final.

**Actor**: system
**Layers**: docs/KB

#### Acceptance
**El usuario puede verificar que funciona**: no hay bugs duplicados (cada limitación apunta a un bug único, nuevo o existente); la regla de acoplamiento existe y está enlazada desde curriculum-design/uengagement.

### REQ-IMPROVE-04: El flujo de tareas integra los pendientes del MCP y el md queda retirado

> **Que cambia**: los pendientes vivos del MCP pasan al backlog del ticket/módulo; el md externo se retira con un puntero a DKC.
> **Por que**: cerrar el loop — el trabajo futuro del MCP entra por el flujo DKC y nadie vuelve a depender del md.

El sistema MUST registrar en el backlog los pendientes vivos (S9 hospedado, S8.V1 install GUI, S25 T5/T9-T11, escritura engagement bloqueada por drift UPU, live E2E dev-pending de S20/S21/S22/S23/Term) con contexto autocontenido, y el md externo MUST abrir con un puntero a `projects/up1/specs/mcp/` como nueva fuente de verdad.

**Actor**: system
**Layers**: docs/KB

#### Acceptance
**El usuario puede verificar que funciona**: el backlog del ticket lista cada pendiente con "qué existe / cómo retomar"; el md externo apunta a DKC en su encabezado.

### REQ-PRESERVE-01: Cobertura total sin pérdida

> **Que cambia**: la migración garantiza que cada sección del md tenga un artefacto DKC destino; ninguna se pierde.
> **Por que**: es una migración de 288KB — sin verificación de cobertura, secciones enteras podrían quedar fuera silenciosamente.

El sistema MUST mapear cada sección del md (S0–S34, §12.E/F/R, §13/§14/§15, apéndice) a un artefacto DKC. NINGUNA sección queda sin destino.

<details><summary>Scenarios de validacion</summary>

#### Scenario: recorrido de cobertura
- **GIVEN** el inventario estructurado del md y los artefactos creados
- **WHEN** se recorre el mapa de migración sección por sección
- **THEN** cada una apunta a ≥1 artefacto DKC (spec/rule/decision/bug/evolution/backlog)
</details>

### REQ-PRESERVE-02: Dedup — no duplicar KB existente

El sistema MUST reusar bugs/conocimiento ya presentes en el KB (audit gap de `updateActivityValidated`, drift `OfferingEnrollment` UPU, scoped uniqueness config-driven, y los candidatos de `bugs/platform|object-manager|core`) en vez de crear duplicados.

### REQ-PRESERVE-03: Integridad del KB de up1

El sistema MUST mantener el KB de up1 íntegro: `dkc-validate` pasa en todos los artefactos nuevos y `dkc-reindex` + HC quedan sin drift.

## Changes

### Added: módulo `up1-mcp` en `config.yaml`

| Field | Value | Purpose |
|-------|-------|---------|
| name | up1-mcp | id del módulo |
| path | /Users/edobacon/Workspace/uplanner/mcp | repo hermano (fuera del monorepo up1) |
| purpose | Adaptador MCP (GraphQL + Clerk OTP) que expone curriculum-design/engagement/layouts a LLMs | descripción |
| layer | mcp-adapter | capa |

### Added: artefactos DKC (destino de cada parte del md)

| Artefacto | Origen en el md | Tipo |
|-----------|-----------------|------|
| `specs/mcp/SPEC-mcp-architecture.md` | §0, §1, §2, §4, §6, §8, §9, §10, §11, apéndice | spec |
| `specs/mcp/SPEC-mcp-surface-and-contracts.md` | §5, §7, §12.R, S10/S11 | spec |
| `specs/mcp/EVOLUTION-up1-mcp.md` | §12.0 tablero + bitácora S0–S34 | spec (evolution log, read-only) |
| `rules/mcp/RULE-mcp-001..007` (P1–P7) | §1 principios | rule ×7 |
| `rules/mcp/RULE-mcp-surface-reflects-mod-capability` | NUEVA (acoplamiento) | rule |
| `rules/mcp/RULE-mcp-*` (confidencialidad, higiene salida, enum-sinónimos, MCP-TEST-, sesión cifrada, preview→commit, blockGenericMutation) | S20/S23/S28/§15/S7/S17 | rule ×~4-5 |
| `decisions/DEC-*` (foundations, mvp-scope, multimod-arch, model-v2, semantic-resolution, conversational-contract) | §14, §12.E, §12.F, §12.R, S20/S22/S23/S21 | decision ×~6 |
| `bugs/{módulo}/*` | §11 + descubrimientos BUG (dedup) | bug ×~7 |
| `## Backlog` del ticket | S9, S8.V1, S25 T5/T9-T11, escritura engagement, live E2E | backlog |
| puntero en el md externo | retiro | edit |

## Tasks

### Session 1 — Registrar módulo + specs de diseño + evolution log [tipo: ⚑ fuerte] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Registrar módulo `up1-mcp` en `config.yaml` (name/path/purpose/layer) | REQ-IMPROVE-01 | developer | — | `projects/up1/config.yaml` | `dkc-reindex up1` OK + HC lista el módulo | git revert | DET-16, DET-2 | done | 1 |
| S1.T2 | Escribir `SPEC-mcp-architecture.md` (§0,§1,§2,§4,§6,§8,§9,§10,§11,apéndice) | REQ-IMPROVE-01 | architect | S1.T1 | `projects/up1/specs/mcp/SPEC-mcp-architecture.md` | `dkc-validate Spec` OK | git rm | DET-1, DET-2, DET-11 | done | 1 |
| S1.T3 | Escribir `SPEC-mcp-surface-and-contracts.md` (§5,§7,§12.R,S10/S11) | REQ-IMPROVE-01 | architect | S1.T1 | `projects/up1/specs/mcp/SPEC-mcp-surface-and-contracts.md` | `dkc-validate Spec` OK | git rm | DET-1, DET-2, DET-11 | done | 1 |
| S1.T4 | Escribir `EVOLUTION-up1-mcp.md` (tablero §12.0 + bitácora S0–S34 desde el inventario) | REQ-PRESERVE-01 | architect | S1.T1 | `projects/up1/specs/mcp/EVOLUTION-up1-mcp.md` | cobertura S0–S34 vs inventario | git rm | DET-6, DET-2 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T0)** — persistir en `## Sessions`, validar specs + reindex + HC, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision | (no aplica) | DET-13, DET-20, DET-23 | done | 1 |

### Session 2 — Reglas individuales + decisiones [tipo: ⚑ fuerte] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear reglas de principio `RULE-mcp-001..007` (P1–P7), una constraint por archivo | REQ-IMPROVE-02 | architect | S1.GATE | `projects/up1/rules/mcp/` | `dkc-validate Rule` OK | git rm | DET-1, DET-2, DET-16 | done | 2 |
| S2.T2 | Crear reglas de contrato/operativas (confidencialidad, higiene de salida, enum-sinónimos, MCP-TEST-, sesión cifrada, preview→commit, blockGenericMutation) | REQ-IMPROVE-02 | architect | S1.GATE | `projects/up1/rules/mcp/` | `dkc-validate Rule` OK | git rm | DET-1, DET-2 | done | 2 |
| S2.T3 | Crear `RULE-mcp-surface-reflects-mod-capability` (acoplamiento, backlog must) + enlazar desde curriculum-design/uengagement | REQ-IMPROVE-03 | architect | S1.GATE | `projects/up1/rules/mcp/`, `rules/curriculum-design/`, `rules/uengagement/` | regla referencia DET-16/17 + links bidireccionales | git rm | DET-16, DET-17 | done | 2 |
| S2.T4 | Crear decisiones `DEC-*` (foundations, mvp-scope, multimod-arch §12.E, model-v2 §12.F, semantic-resolution §12.R, conversational-contract) | REQ-IMPROVE-02 | architect | S1.GATE | `projects/up1/decisions/` | `dkc-validate Decision` OK | git rm | DET-2, DET-16 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T0)** — persistir, validar reglas/decisiones + reindex, verificar enlaces de acoplamiento, decidir | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + decision | (no aplica) | DET-13, DET-20, DET-23 | done | 2 |

### Session 3 — Bugs (dedup) + backlog + retiro del md [tipo: ⚑ fuerte] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Dedup KB-first: leer candidatos (`bug-platform-015/016/018/019/020`, `bug-object-manager-002`, `bug-core-001`) y mapear limitación→bug existente vs nuevo | REQ-PRESERVE-02 | researcher | S2.GATE | `projects/up1/bugs/` | mapa dedup documentado | (no aplica) | DET-11, DET-4 | done | 3 |
| S3.T2 | Crear/actualizar bugs de up1 (accent folding, weight sum, position null, *Name placeholders, auth INTERNAL_SERVER_ERROR, getMyPermissions role-collapse, executionUnit column; reuse audit gap/drift/uniqueness) | REQ-IMPROVE-03 | developer | S3.T1 | `bugs/object-manager/`, `bugs/curriculum-design/`, `bugs/uengagement/` | `dkc-validate Bug` OK + sin duplicados | git rm | DET-2, DET-11, DET-16 | done | 3 |
| S3.T3 | Poblar `## Backlog` del ticket con pendientes vivos (S9, S8.V1, S25 T5/T9-T11, escritura engagement, live E2E) autocontenidos | REQ-IMPROVE-04 | architect | S2.GATE | `projects/up1/tickets/ticket-080.md` | cada item con "qué existe/cómo retomar" | git revert | DET-17 | done | 3 |
| S3.T4 | Retirar el md externo: encabezado con puntero a `projects/up1/specs/mcp/` como fuente de verdad | REQ-IMPROVE-04 | developer | S3.T2, S3.T3 | `uplanner:specs/ongoing/up1/mcp-curriculum-design-plan-ejecucion-2026-06-05.md` | puntero presente; el md ya no se edita como tracking | git revert | DET-16 | done | 3 |
| S3.T5 | Verificación de cobertura total (TC-1): recorrer el mapa de migración vs artefactos; reindex final | REQ-PRESERVE-01 | reviewer | S3.T2, S3.T3, S3.T4 | — | 0 secciones huérfanas + `dkc-reindex` OK | (no aplica) | DET-13, DET-4 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T0)** — persistir, validar todo el KB + HC sin drift, cobertura total, decidir cierre | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4, S3.T5 | ticket | gate persistido + decision | (no aplica) | DET-13, DET-20, DET-23 | done | 3 |

## Constraints

- **RULE-dev-005**: specs-external es read-only — el puntero de retiro va en el md real (`uplanner/specs/ongoing/up1/`), no en el mirror.
- **DET-11 (KB-first)**: leer los bugs candidatos antes de crear; reuse > create.
- **DET-16 (propagación)**: la regla de acoplamiento ES la propagación formalizada hacia el surface del MCP.
- **DET-17 (backlog lifecycle)**: el mecanismo de "update orgánico" es un backlog must bloqueante.
- Self-dev de deckard: commits en la rama actual `feature/HOR-123-changes-viewer` (no `main`); `dkc_create_record` auto-commitea por archivo.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Inventario estructurado del md | internal | Extracción S0–S34 ya hecha en intake | Si falta detalle, releer el md (disponible) |
| HC (horadric-cube) | internal | Verificar render del módulo/specs/reglas | Bajo — solo verificación visual |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Pérdida de contenido en la descomposición | medium | alto | TC-1 cobertura total contra inventario; S3.T5 dedicada |
| Bugs duplicados | medium | medio | S3.T1 dedup KB-first antes de crear |
| Drift de HC tras crear muchos artefactos | low | medio | `dkc-validate` + `dkc-reindex` por gate |
| Reglas demasiado genéricas (P1–P7) sin where/when accionable | medium | medio | cada regla ancla a archivo/comportamiento del repo up1-mcp |

## Open questions

- Ninguna abierta — el mapa de migración y las 4 decisiones de diseño se acordaron en intake.

## Decisions

### DEC-LOCAL-01: Evolution log en vez de 34 tickets retro (necesidad/reuso DET-32)
- **Contexto**: cómo preservar la historia S0–S34.
- **Drivers**: trazabilidad vs costo; las 34 sesiones están done.
- **Opcion elegida**: evolution log DKC-resident (drop de tickets retro).
- **Alternativas**: recrear 34 tickets cerrados (alto costo, bajo valor — descartada).
- **Consecuencias**: HC no muestra 34 cierres, pero el evolution log preserva la narrativa.
- **Session**: design.

### DEC-LOCAL-02: Bugs de up1 = reuse de existentes (necesidad/reuso DET-32)
- **Contexto**: las limitaciones de up1 del §11/descubrimientos.
- **Drivers**: DET-11 KB-first; varias ya están en KB.
- **Opcion elegida**: reuse de bugs/memorias existentes; crear solo los faltantes.
- **Alternativas**: crear ~7 bugs nuevos sin dedup (duplicación — descartada).
- **Consecuencias**: menos bugs nuevos; S3.T1 invierte tiempo en dedup.
- **Session**: design.

### DEC-LOCAL-03: Módulo (config mínima) en vez de proyecto DKC propio (necesidad/reuso DET-32)
- **Contexto**: cómo modelar up1-mcp.
- **Drivers**: acoplamiento intra-proyecto; pedido "parte de up1".
- **Opcion elegida**: reduce a un bloque de módulo en `config.yaml`.
- **Alternativas**: proyecto DKC propio (acoplamiento cross-project más pesado — descartada).
- **Consecuencias**: tickets del MCP conviven con los del mod; HC unificado.
- **Session**: design.

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Secciones del md sin destino DKC | 100% (todo en el md) | 0 | recorrido TC-1 |
| Dependencia del md externo para tracking | total | nula (puntero a DKC) | encabezado del md |
| Bugs duplicados creados | — | 0 | revisión dedup S3.T1 |

## Acceptance checkpoints

- [ ] **Funcional**: REQ-IMPROVE-01..04 + REQ-PRESERVE-01..03 cumplidos
- [ ] **Cobertura**: TC-1 — 0 secciones del md huérfanas
- [ ] **Dedup**: TC — 0 bugs duplicados
- [ ] **Integridad**: `dkc-validate` OK en todos los artefactos + HC sin drift
- [ ] **Acoplamiento**: regla creada y enlazada desde curriculum-design/uengagement
- [ ] **Retiro**: md externo apunta a DKC

## Rules discovered

{se llena durante execute}

## Bugs found

{se llena durante execute}
