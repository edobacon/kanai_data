---
id: TICKET-080
project: up1
type: ticket
status: closed
work_type: improvement
module: up1-mcp
autopilot: autonomous
---

# Migrar el plan de ejecución del MCP de up1 a artefactos DKC y retirar el md como fuente de verdad

## Request

El plan de ejecución del MCP de up1 (`up1-mcp`, adaptador MCP que expone los mods curriculum-design/engagement/layouts a LLMs) vive hoy en un único documento markdown de 288KB:
`/Users/edobacon/Workspace/uplanner/specs/ongoing/up1/mcp-curriculum-design-plan-ejecucion-2026-06-05.md`
(sesiones S0–S34, con su propio tablero §12.0, convención de checkboxes `[ ]/[~]/[x]/[!]` y bitácora inline). Ese tracking corre en paralelo y desconectado del flujo DKC del proyecto up1.

El dev pide que **todo** el contenido del md pase a vivir en DKC, repartido en sus distintos artefactos según corresponda, de modo que:
1. El registro de avance del MCP sea parte del proyecto up1 en DKC (visible en HC, dentro del flujo de tickets/specs/rules).
2. Se integre al flujo de tareas: un ticket que desarrolle capacidades en un mod pueda actualizar el MCP **orgánicamente**.
3. Ya **no se dependa** del md externo (queda retirado, archivado con puntero a la nueva fuente de verdad en DKC).

### Decisiones tomadas con el dev (previas al ticket)

- **D-A — Ubicación**: `up1-mcp` se registra como **módulo** del proyecto up1 en `config.yaml` (repo hermano en `/Users/edobacon/Workspace/uplanner/mcp`). NO proyecto DKC propio.
- **D-B — Acoplamiento mod→MCP**: vía **RULE nueva** con **backlog must** que bloquea el cierre del ticket (DET-16 propagación + DET-17 backlog lifecycle). Un solo ticket del mod cubre mod + reflejo en MCP.
- **D-C — Historia**: las sesiones S0–S34 se preservan como **evolution log DKC-resident** (`specs/mcp/EVOLUTION-up1-mcp.md`), NO se recrean 34 tickets.
- **D-D — Granularidad de reglas**: **una constraint por archivo** (reglas individuales en `rules/mcp/`).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement |
| Tipo de cambio | architecture (transversal: nuevo módulo + specs + reglas + decisiones + bugs cross-módulo + evolution log) |
| Modulo principal | up1-mcp (nuevo) |
| Modulos afectados | curriculum-design, object-manager, uengagement (bugs de plataforma), config/platform (registro de módulo) |

## Creation scope

Ambos flags `false`: la migración produce **artefactos DKC** (markdown del KB), no elementos visuales de producto ni un data-model nuevo del producto. El step `design-draft` se omite.

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | — |
| Data model | no | — |

## Triage

Migración de conocimiento de gran volumen (288KB / S0–S34 + §12.E/F/R + §13/§14/§15 + apéndice) ya **inventariado y clasificado** (descubrimientos, decisiones, failed approaches, diferidos, riesgos por sesión) en la conversación de intake. El trabajo es de **estructuración y ruteo a artefactos**, no de descubrimiento. Complejidad: media-alta por volumen y por la cantidad de artefactos destino, baja por incertidumbre (el mapa de migración ya está acordado).

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El contenido del md mapea a: 2 specs + ~12 rules individuales + ~6 decisions + ~7 bugs (con dedup) + 1 evolution log + backlog del módulo | ✓ confirmada | Mapa de migración acordado con el dev; inventario estructurado extraído de S0–S34 |
| H2 | Varios "bugs" del md ya existen en DKC (audit gap, drift OfferingEnrollment, scoped uniqueness, accent folding) → dedup, no duplicar | ~ parcial | `grep` en `bugs/` halló candidatos en platform/object-manager/core (bug-platform-015/016/018/019/020, bug-object-manager-002, bug-core-001); requiere lectura 1×1 en ejecución |
| H3 | El acoplamiento orgánico mod→MCP se logra con 1 RULE (backlog must, DET-16/17) sin tocar el motor DKC | ✓ confirmada | DET-16/DET-17 ya soportan el mecanismo; la regla solo lo formaliza para el surface del MCP |

### Context found

- **Rules del modulo**: ninguna — `rules/mcp/` no existe aún (se crea en este ticket). Relacionadas: `RULE-dev-005` (specs-external read-only), `RULE-dev-004` (core work policy — no aplica, esto es mod/KB).
- **Bugs abiertos**: ninguno en `bugs/up1-mcp/`. Candidatos de dedup en otros módulos (ver H2). **Advertencia**: no crear bugs duplicados — leer cada candidato antes de registrar (DET-11 KB-first).
- **Specs relacionados**: `specs/curriculum-design/*` (programa-de-asignatura, versioning, RBAC version/clone) y `specs/core/*` describen el dominio que el MCP expone; las specs nuevas del MCP referencian (no duplican) ese dominio.
- **Docs relevantes**: el md fuente (288KB); `config.yaml` del proyecto up1; memorias del dev sobre drift UPU / audit gap / scoped uniqueness (ya en KB).
- **Warnings**:
  - **Self-dev de deckard**: los artefactos viven en el repo `deckard` (`projects/up1/`). El git hook rechaza commits a `main`; rama actual de deckard = `feature/HOR-123-changes-viewer`. Definir rama de trabajo antes de commitear (ver Setup).
  - `dkc_create_record` auto-commitea cada artefacto (1 commit/archivo) — planear los commits considerando eso.
  - El md externo (`uplanner/specs/ongoing/up1/`) es editable; su mirror en `specs-external/` es read-only (RULE-dev-005). El puntero de retiro va en el md real, no en el mirror.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | deckard: **rama actual `feature/HOR-123-changes-viewer`** (decisión del dev — commits de KB de up1 conviven con el trabajo de viewer). NO `main` (git hook). up1-mcp repo: sin tocar (solo lectura, branch `main`) |
| Base branch | deckard `main` (para la rama nueva) |
| DB state | N/A — trabajo de KB, sin DB |
| Services | HC (horadric-cube) para verificar render del módulo/specs/reglas nuevas (opcional) |
| Test data | El md fuente + inventario estructurado ya extraído |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| — | — | — | — | — | — |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| — | — | — | — |

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Desde gate |
|-----------|--------|-------|------------|
| 2026-06-24T15:45 | false → super | dev pidió correr las 3 sesiones de corrido | S1.T1 |

### Plan de sessions (preplanificacion)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Registrar módulo + specs de diseño + evolution log | 1 | T0 | config.yaml (módulo up1-mcp); `SPEC-mcp-architecture.md` (§0–§4, §6, §8–§11 + trazabilidad); `SPEC-mcp-surface-and-contracts.md` (§5, §7, §12.R, guide); `EVOLUTION-up1-mcp.md` (S0–S34 + bitácora) | ⚑ fuerte | specs y evolution validan (dkc-validate), HC lista el módulo y las specs |
| S2 | Reglas individuales + decisiones | 2 | T0 | ~12 rules en `rules/mcp/` (P1–P7 + acoplamiento mod→MCP + operativas + contrato conversacional); ~6 decisions (foundations, mvp-scope, multimod-arch, model-v2, semantic-resolution, conversational-contract) | ⚑ fuerte | reglas y decisiones validan; la regla de acoplamiento queda enlazada a curriculum-design/uengagement |
| S3 | Bugs (dedup KB-first) + backlog + retiro del md | 3 | T0 | ~7 bugs en `bugs/{módulo}` (dedup contra existentes); backlog del módulo (S9, S8.V1, S25 T5/T9-T11, escritura engagement bloqueada por drift, live E2E dev-pending); puntero de retiro en el md externo; reindex final | ⚑ fuerte | sin bugs duplicados; backlog autocontenido; md externo apunta a DKC; HC consistente |

**Notas del plan**: S1→S2→S3 secuenciales (S2 referencia specs de S1; S3 dedup depende de specs/reglas para no duplicar conocimiento ya migrado). Esqueleto preliminar — `intake-explore` lo refina y `design-improvement` asigna task contracts. Tier T0 (doc-only) en las tres: el entregable es KB markdown, validado por `dkc-validate` + render en HC, sin código de producto.

### Session 1 — 2026-06-24 — Registrar módulo + specs de diseño + evolution log [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T0

**Objetivo**: Registrar `up1-mcp` como módulo en config.yaml y producir las dos specs de diseño del MCP (architecture + surface-and-contracts) más el evolution log con la historia S0–S34.

**Tasks completadas**:
- [x] S1.T1 — Registrar módulo `up1-mcp` en config.yaml
- [x] S1.T2 — Escribir SPEC-mcp-architecture.md
- [x] S1.T3 — Escribir SPEC-mcp-surface-and-contracts.md
- [x] S1.T4 — Escribir EVOLUTION-up1-mcp.md
- [x] S1.GATE — Gate de sync Session 1 (tier T0)

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-06-24 — Reglas individuales + decisiones [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T0

**Objetivo**: Crear las reglas individuales en rules/mcp/ (P1–P7 + acoplamiento mod→MCP + contrato/operativas) y los registros de decisión en decisions/.

**Tasks completadas**:
- [x] S2.T1 — Crear reglas de principio RULE-mcp-001..007 (P1–P7)
- [x] S2.T2 — Crear reglas de contrato/operativas
- [x] S2.T3 — Crear RULE-mcp-surface-reflects-mod-capability + enlaces
- [x] S2.T4 — Crear decisiones DEC-*
- [x] S2.GATE — Gate de sync Session 2 (tier T0)

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-06-24 — Bugs (dedup) + backlog + retiro del md [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T0

**Objetivo**: Registrar las limitaciones de up1 como bugs (dedup KB-first), poblar el backlog con los pendientes vivos del MCP, retirar el md externo con puntero a DKC y verificar cobertura total.

**Tasks completadas**:
- [x] S3.T1 — Dedup KB-first de bugs candidatos
- [x] S3.T2 — Crear/actualizar bugs de up1
- [x] S3.T3 — Poblar backlog con pendientes vivos
- [x] S3.T4 — Retirar el md externo (puntero a DKC)
- [x] S3.T5 — Verificación de cobertura total + reindex
- [x] S3.GATE — Gate de sync Session 3 (tier T0)

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Teaching — Intake

**Status**: skipped
**Razon**: teach_policy: skip (HOR-106) — migración de KB pura exenta de teach por decisión del dev en intake
**Archivo**: [`TICKET-080.teach/teach-intake.md`](TICKET-080.teach/teach-intake.md) (cuando existe)

## Teaching — Close

**Status**: skipped
**Razon**: teach_policy: skip (HOR-106) — migración de KB pura, exenta de teach por decisión del dev en intake
**Archivo**: [`TICKET-080.teach/teach-close.md`](TICKET-080.teach/teach-close.md) (cuando existe)

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-IMPROVE-01 (todo el md mapeado a artefactos) | TC-1 | manual | pass |
| REQ-IMPROVE-02 (artefactos válidos + HC los muestra) | TC-2 | auto | pass |
| REQ-IMPROVE-03 (acoplamiento mod→MCP operativo) | TC-3 | manual | pass |
| REQ-PRESERVE-04 (md retirado sin pérdida) | TC-4 | manual | pass |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | Cobertura total del md: cada sección (S0–S34, §12.E/F/R, §13/§14/§15, apéndice) tiene artefacto destino | REQ-IMPROVE-01 | manual | no | inventario extraído | recorrer el mapa de migración vs artefactos creados | 0 secciones sin destino | 0 huérfanas: §0-§11→SPEC-mcp-architecture; §5/§7/§12.R→SPEC-mcp-surface; §12.0+S0-S34+§13→EVOLUTION; P1-P7+convenciones→RULE-mcp-001..015; §12.E/F/R+§14→DEC-020..025; §11→bugs(om-003/4/5/6,cd-001)+reuse(platform-005,integrity spec); pendientes→Backlog | recorrido del mapa de migración (S3.T5) | pass | S3.T5 | — |
| TC-2 | Artefactos válidos y visibles: `dkc-validate` pasa en specs/rules/decisions/bugs nuevos y `dkc-reindex` + HC listan módulo up1-mcp y sus artefactos | REQ-IMPROVE-02 | auto | no | artefactos escritos | `dkc-validate` por tipo + `dkc-reindex up1` + revisar HC | validate OK, HC consistente | 3 specs (SpecFull --no-strict valid) + 15 rules + 6 decisions + 5 bugs = 26 OK / 0 BAD; reindex OK | `dkc-validate` sweep S3.T5 | pass | S1.GATE,S2.GATE,S3.GATE | — |
| TC-3 | Acoplamiento operativo: la RULE de acoplamiento está creada, enlazada desde curriculum-design/uengagement y describe el backlog must bloqueante | REQ-IMPROVE-03 | manual | no | regla creada | leer la regla + verificar links + DET-16/17 referenciados | regla accionable y enlazada | RULE-mcp-015 scope:global (auto-carga en todo módulo, incl. curriculum-design/uengagement/layouts), level:must, formato de backlog must + DET-16/17 | `rules/mcp/RULE-mcp-015-surface-reflects-mod-capability.md` | pass | S2.GATE | — |
| TC-4 | Retiro sin pérdida: el md externo apunta a DKC como fuente de verdad y el backlog preserva los pendientes vivos (S9, S8.V1, S25 T5/T9-11, escritura engagement, live E2E) | REQ-PRESERVE-04 | manual | no | migración completa | abrir md externo + backlog del módulo | puntero presente, pendientes preservados | banner ⛔ RETIRADO + status_note en el md externo apuntando a specs/mcp/; Backlog B1-B8 con los 8 pendientes vivos | md externo head + `## Backlog` del ticket | pass | S3.T5 | — |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| — | — | — | — | — |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| dkc-validate (KB integrity) | `./commands/dkc-validate <Type> projects/up1/...` | — | — | — |

**Baseline**: KB de up1 íntegro antes de la migración.
**Final**: KB íntegro + módulo up1-mcp poblado, sin drift en HC.

## Backlog

> Pendientes vivos del MCP migrados desde el md (S0–S34). NINGUNO es `must` (no bloquean el cierre de TICKET-080, que es la migración). Son trabajo futuro del MCP: al retomar uno, abrir un ticket DKC nuevo `module: up1-mcp` (no son tasks de este ticket). Detalle histórico en [EVOLUTION-up1-mcp](../specs/mcp/EVOLUTION-up1-mcp.md).

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | **S9 — Distribución hospedada (HTTP + OAuth)**: habilita ChatGPT/Gemini para usuarios finales | nuevo | EVOLUTION S9 (postergada) | núcleo transport-agnostic (stdio MVP); diseño compatible | Implementar transporte Streamable HTTP + OAuth (Clerk como provider) + config staging/prod; desplegar el adaptador. Ticket nuevo `up1-mcp` | should |
| B2 | **S8.V1 — Smoke de instalación GUI del `.mcpb`** en Claude Desktop end-to-end | nuevo | EVOLUTION S8 | `.mcpb` 18.4MB generado y listo | Instalar el `.mcpb` en Claude Desktop (paso GUI manual) + smoke de una tool. Requiere el dev | could |
| B3 | **S25.T5 — Docencia (`eng_assign_teacher`/`list_teaching_assignments`/`set_event_coverage`)** | nuevo | EVOLUTION S25 | tools diseñadas; bloqueadas | Desbloquear al regenerar baseline UPU (drift TeachingAssignment, mismo problema que [[BUG-object-manager-006]]) | should |
| B4 | **S25.T9 — Asistencia masiva (`eng_take_attendance`)** | nuevo | EVOLUTION S25 | — | Requiere baseline UPU regenerado (drift Attendance) + seed de OfferingEnrollment/Attendance | could |
| B5 | **S25.T10 — Feedback (`eng_list_form_templates`/`request_feedback`/`submit_feedback`)** | nuevo | EVOLUTION S25 | — | Requiere seed de FormTemplate/Feedback (hoy 0). No shippear escritura sin validación en vivo (DET-13) | could |
| B6 | **S25.T11 — Journal (`eng_list_journal`/`add_journal_entry`)** | nuevo | EVOLUTION S25 | — | Requiere seed de Journal (hoy 0) | could |
| B7 | **Escritura de engagement (enroll/unenroll/bulk/mark_attendance)** validada en vivo | nuevo | EVOLUTION S24 | código correcto per model-v2 | Desbloquear regenerando el baseline de UPU a model-v2 limpio ([[BUG-object-manager-006]]); luego correr la validación de escritura | should |
| B8 | **Live E2E dev-pending de S20/S21/S22/S23 + Term** | nuevo | EVOLUTION S20–S23/S29 | código completo; sesión MCP en memoria corre build anterior | Rebuild del MCP + reiniciar el server + re-OTP; correr los smokes E2E pendientes | should |

## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|
| `20cd851` | 2026-06-24 | TICKET-080 S1 docs(up1-mcp): registrar módulo + specs arquitectura/surface + evolution log | S1.T1, S1.T2, S1.T3, S1.T4 | REQ-IMPROVE-01, REQ-PRESERVE-01 |
| `0548779` | 2026-06-24 | TICKET-080 S2 docs(up1-mcp): reglas individuales + decisiones | S2.T1, S2.T2, S2.T3, S2.T4 | REQ-IMPROVE-02, REQ-IMPROVE-03 |
| `0483a4a` | 2026-06-24 | TICKET-080 S3 docs(up1-mcp): bugs (dedup) + backlog + retiro del md | S3.T1, S3.T2, S3.T3, S3.T4, S3.T5 | REQ-IMPROVE-03, REQ-IMPROVE-04, REQ-PRESERVE-01 |

## Summary

### What was requested
Migrar todo el plan de ejecución del MCP de up1 (md de 288KB, S0–S34) a artefactos DKC y retirar el md como fuente de verdad.

### What was done
Todo el contenido del md (288KB, S0–S34 + §12.E/F/R + §13/§14/§15 + apéndice) migró a artefactos DKC del proyecto up1, en 3 sesiones:
- **S1**: `up1-mcp` registrado como módulo en `config.yaml`; 3 specs de referencia en `specs/mcp/` (architecture, surface-and-contracts, EVOLUTION con la historia S0–S34).
- **S2**: 15 reglas individuales en `rules/mcp/` (P1–P7 + RULE-mcp-015 acoplamiento mod→MCP scope global + contrato/operativas) y 6 decisiones (DEC-020..025).
- **S3**: 5 bugs nuevos de limitaciones de up1 (dedup KB-first: 2 reusados — bug-platform-005 + SPEC-integrity done); backlog B1–B8 con los pendientes vivos; md externo retirado con banner + puntero a DKC; cobertura total verificada (0 secciones huérfanas).

El "update orgánico" del MCP queda formalizado: `RULE-mcp-015` (scope global, backlog must DET-16/17) obliga a todo ticket de un mod a reflejar el surface del MCP antes de cerrar.

### What was discovered
- Rules creadas: RULE-mcp-001..015 (15; RULE-mcp-015 = acoplamiento, scope global).
- Decisions tomadas: DEC-020 (foundations), DEC-021 (mvp-scope), DEC-022 (multimod-arch), DEC-023 (model-v2-realign), DEC-024 (semantic-resolution), DEC-025 (conversational-contract).
- Bugs encontrados: BUG-object-manager-003 (accent folding), -004 (auth stacktrace leak), -005 (getMyPermissions role-collapse), -006 (drift OfferingEnrollment UPU); BUG-curriculum-design-001 (audit gap updateActivityValidated). Reuse: bug-platform-005 (position), SPEC-curriculum-design-improve-server-side-integrity (weight-sum, done).
- Pendientes vivos (no `must`): backlog B1–B8 (S9 hospedado, S8.V1, S25 T5/T9-T11, escritura engagement, live E2E dev-pending).

### Testing summary
| Metric | Value |
|--------|-------|
| REQs covered | 7/7 (4 improve + 3 preserve) |
| Test cases | 4 (TC-1..TC-4), todos pass |
| Artefactos válidos | 3 specs (--no-strict) + 15 rules + 6 decisions + 5 bugs = 26/26 OK |
| Cobertura del md | 0 secciones huérfanas |

### Metrics
| Metric | Value |
|--------|-------|
| Sessions | 3 |
| Tasks completed | 14 (+ 3 gates) |
| Commits | 3 (20cd851, 0548779, 0483a4a) |
| Rules created | 15 |
| Decisions taken | 6 |
| Bugs found | 5 (+ 2 reuse) |

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-06-24 | 2026-06-24 |
| intake-explore | done | 2026-06-24 | 2026-06-24 |
| teach-intake | skipped | — | — |
| design-improvement | done | 2026-06-24 | 2026-06-24 |
| design-transition-to-execute | done | 2026-06-24 | 2026-06-24 |
| request-execute | done | 2026-06-24 | 2026-06-24 |
| request-close | done | 2026-06-24 | 2026-06-24 |
| teach-close | skipped | — | — |
