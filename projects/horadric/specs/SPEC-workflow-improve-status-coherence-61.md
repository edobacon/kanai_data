---
id: SPEC-workflow-improve-status-coherence-61
project: horadric
ticket: HOR-061
status: done
---

# Coherencia automatica entre contenido del ticket y `status` del frontmatter

# Coherencia automatica entre contenido del ticket y `status` del frontmatter

## Executive summary — lo que estas aprobando

> *Spec en `status: draft` por DET-18 + RULE-workflow-explore-conditional-001. HOR-061 es `explore + conditional` — este spec es **blueprint accionable**, NO se ejecuta hasta que C1-C4 del ticket disparen. Aprobar el spec significa fijar el diseño para que el LLM/dev futuro pueda implementar sin re-descubrir.*

**Que se quiere**: cuando un ticket acumula info productiva (sessions, learns, refinements) via comandos de captura informal (`dkc-sync`, `dkc-learn`, conversacion libre), su `status` del frontmatter NO se actualiza — solo los steps formales en `prompts/steps/` lo cambian. El caso baseline (up1/TICKET-020) quedo en `status: open` durante 6 dias con 5 sessions de intake productivas; el kanban HC lo mostraba en columna "Registro" cuando en realidad estaba cerca de design. Este spec diseña tres mejoras incrementales (M1 template, M2 validator, M3 auto-promote) que cierran el gap detection→promote.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **M3 auto-promote es opt-in por default (off)**, no automatico. El dev activa por ticket o globalmente | Respeta inercia de devs habituados a que comandos de captura no toquen status. Friccion baja, escalable a automatico si datos del segundo caso confirman robustez |
| 2 | **M2 `StatusCoherence` extiende `commands/dkc-validate` con 5to kind**, no construye runner standalone | Reusa SPEC-workflow-output-schemas-26 (output schemas Zod) + SPEC-workflow-gates-verifiable-23 (gates verificables). 0 infra duplicada. Coordinacion necesaria con HOR-053 si activa antes para evitar `kind` colision |
| 3 | **Whitelisting de status terminales** (`archived`, `obsolete`, `done`, `draft`) en el validator: sessions historicas en estos estados NO son drift | Sin esto, el validator marcaria todos los tickets archived como falsos positivos. Reglas declarativas con precision, no exhaustivas |

**Riesgos principales y como los mitigamos**:

- **Meta-riesgo: el ticket modifica DKC mismo y el LLM ejecuta via DKC. Cambios en steps pueden afectar mi propio comportamiento durante execute** → tests aislados en `commands/lib/validators/StatusCoherence.test.ts` antes de wire-in en steps que el LLM usa (intake-explore, design-*, etc.). M2/M3 viven en archivos nuevos; M1 solo edita template documental
- **BUG-workflow-mcp-append-learn-no-markdown-write-004 (`detected`, sin fix) puede heredarse a M3 si usa MCP tools** → verificar bug scope en S3.T1 antes de elegir mecanismo de write. Si el bug aplica a `dkc_set_ticket_status`, usar fallback inline (`Edit` directo + `dkc-reindex` sincrono)
- **M2 falsos positivos rompen confianza del dev** → fixtures con 3 casos no-drift legitimos (archived con sessions, open sin sessions, closed con backlog must) ademas del caso drift. Cobertura >=80% en validator nuevo

**Que NO se hace en este ticket**:

- **Modificar steps existentes que escriben status** (intake-explore, design-*, request-*, teach-*). Su logica de promocion se mantiene. M3 actua sobre eventos donde NO hay step formal (captura informal)
- **HC viewer rendering** — sigue derivando del frontmatter sin cambios
- **Index sqlite** — sigue derivando del frontmatter, sin nuevo campo
- **Migracion retroactiva de tickets pre-existentes** — el validator detecta; el promote es opt-in (no batch)
- **Integrar `dkc-validate StatusCoherence` en gates de design-{tipo} obligatoriamente** — queda como check separado invocable. Wire en `dkc-verify-gate` es decision pendiente (ver Open questions)

**Tamano estimado**: 4 sessions ejecutables (S1=M1 T0 / S2=M2 T2 / S3=M3 T2 fuerte / S4=validacion T3 fuerte), aproximadamente 5-8 SP distribuidos. La mas riesgosa es S3 (M3 auto-promote — decision opt-in vs automatico requiere datos del segundo caso).

**Como vas a saber que funciona**:

- Ejecutas `node commands/dkc-validate StatusCoherence projects/up1/tickets/ticket-020.md` sobre fixture pre-fix → exit code 1 + JSON con `code: 'STATUS_OPEN_WITH_SESSIONS'` y `suggested: 'intake-explore'`
- Aplicas M3 sobre el mismo fixture (modo manual) → frontmatter cambia + reindex sincrono + HC kanban refleja el ticket en columna "Intake"
- Ejecutas suite completa `node commands/dkc-validate` con 5 kinds → 4 existentes sin regresion + StatusCoherence pass

---

## Purpose

Cerrar el loop **detect → promote** entre contenido del ticket markdown (SoT canonico segun RULE-workflow-state-sot-markdown-canonical-003) y proyeccion derivada en frontmatter `status`. Diseñado para devs que usan DKC + comandos de captura informal + HC kanban en paralelo.

## Requirements

### REQ-IMPROVE-01: Template documenta los 16 valores de status agrupados

> **Que cambia**: el dev abre `templates/records/ticket.md` y ve todos los valores validos de `status` agrupados por categoria (estables / transicionales / terminales) con nota de cuando cada uno aplica. Antes solo veia `open | in_progress | closed` (3 de 16).
> **Por que**: el LLM que crea un ticket desde cero confia en el template. Sin set completo, escribe un ticket que parece valido pero queda fuera del flujo (ej. olvida que `intake-explore` existe).

El sistema MUST documentar los 16 valores reales de status en `templates/records/ticket.md` linea 8 agrupados por categoria. El sistema MUST agregar un comentario inline o bloque doc en el template que indique cuando cada valor aplica (que step lo escribe, que columna del kanban HC le corresponde).

**Actor**: system (template documental)
**Layers**: meta (templates)

<details><summary>Scenarios de validacion</summary>

#### Scenario: dev lee el template para crear ticket
- **GIVEN** un dev abre `templates/records/ticket.md`
- **WHEN** llega a la linea de `status`
- **THEN** ve los 16 valores agrupados en 3 categorias con descripcion breve

#### Scenario: parser de tickets legacy
- **GIVEN** un ticket pre-2026-05-18 con `status: open` o `status: closed` (valores estables)
- **WHEN** el parser HC o el indexador lee el frontmatter
- **THEN** el ticket sigue parseando sin warnings (template documenta, no enforza)

</details>

#### Acceptance
**El dev puede verificar**: abre `templates/records/ticket.md` y ve los 16 valores con anotacion de origen (que step los escribe).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Template completo | Template post-update | Grep `'^status:'` en template | Retorna 1 linea + comentario con valores agrupados | 1 + bloque doc |
| 2 | Tickets legacy parsean | Ticket con `status: open` pre-update | dkc-reindex | Sin errores | Exit 0 |

---

### REQ-IMPROVE-02: `dkc-validate StatusCoherence` detecta drift forward

> **Que cambia**: el dev ejecuta `node commands/dkc-validate StatusCoherence <ticket.md>` y obtiene reporte de coherencia. Si el ticket tiene `status: open` con sessions productivas en el body, sale exit 1 con sugerencia. Antes este check no existia — el drift se descubria revisando manualmente.
> **Por que**: detectable mecanicamente significa enforceable en gates futuros (`dkc-verify-gate`, CI). Sin validator no hay automatizacion posible.

El sistema MUST exponer un nuevo kind `StatusCoherence` en `commands/dkc-validate` que detecta drift forward: ticket en `status: open` (o cualquier estado pre-intake) con >=1 `### Session N` en el body que NO sea Session 0 Discovery automatica. El validator MUST devolver exit code 1 con JSON `{ valid: false, issues: [{ code, current, suggested, evidence }] }`.

**Actor**: dev (CLI), CI
**Layers**: meta (commands)

<details><summary>Scenarios de validacion</summary>

#### Scenario: detecta drift forward
- **GIVEN** ticket con `status: open` y 5 `### Session N` (N>=1) en `## Sessions`
- **WHEN** `node commands/dkc-validate StatusCoherence <ticket>`
- **THEN** exit 1, JSON `valid: false`, issue `code: 'STATUS_OPEN_WITH_SESSIONS'`, `current: 'open'`, `suggested: 'intake-explore'`, `evidence: '### Session N count: 5'`

#### Scenario: open sin sessions (legitimo)
- **GIVEN** ticket recien creado con `status: open` y sin sessions (esqueleto vacio)
- **WHEN** validator
- **THEN** exit 0, `valid: true`

#### Scenario: in_progress con sessions (legitimo)
- **GIVEN** ticket en `in_progress` con sessions ejecutadas
- **WHEN** validator
- **THEN** exit 0

</details>

#### Acceptance
**El dev puede verificar**: corre el comando sobre fixture `up1/ticket-020.md` pre-fix (recuperable de `git log`) y ve drift detectado con sugerencia.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Drift forward | Fixture TICKET-020 pre-fix | dkc-validate | Exit 1 + JSON | code: STATUS_OPEN_WITH_SESSIONS |
| 2 | Open legitimo | Ticket esqueleto | dkc-validate | Exit 0 | valid: true |
| 3 | In_progress OK | Ticket execute | dkc-validate | Exit 0 | valid: true |

---

### REQ-IMPROVE-03: Validator detecta drift inverso + respeta terminales

> **Que cambia**: ademas del drift forward (REQ-02), el validator detecta el drift inverso (`status: closed` con tasks pending no resueltas) y respeta tickets terminales (archived/obsolete) como legitimos aunque tengan sessions historicas.
> **Por que**: sin reglas declarativas con precision el validator genera falsos positivos en tickets archivados que tienen sessions historicas legitimas. Falsos positivos rompen confianza.

El sistema MUST detectar drift inverso: ticket con `status: closed` y >=1 task con `Status: pending` en el spec referenciado. El sistema MUST whitelist los status terminales (`archived`, `obsolete`, `done`, `draft`) — sessions historicas en estos estados son legitimas y NO generan issue.

**Actor**: dev, CI
**Layers**: meta (commands)

<details><summary>Scenarios de validacion</summary>

#### Scenario: drift inverso (closed con pending)
- **GIVEN** ticket `status: closed` con spec que tiene `S3.T2 | ... | pending`
- **WHEN** validator
- **THEN** exit 1, code: `STATUS_CLOSED_WITH_PENDING_TASKS`

#### Scenario: archived con sessions historicas
- **GIVEN** ticket `status: archived` con 8 `### Session N`
- **WHEN** validator
- **THEN** exit 0 (sessions historicas son legitimas en terminales)

#### Scenario: draft con sessions (explore+conditional)
- **GIVEN** ticket explore+conditional con spec `draft` y sessions limitadas (referencia)
- **WHEN** validator
- **THEN** exit 0

</details>

#### Acceptance
**El dev puede verificar**: corre validator sobre 3 fixtures (drift inverso, archived legitimo, draft legitimo) y obtiene los 3 resultados esperados.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Closed pending | Ticket closed + spec pending | validator | Exit 1 | STATUS_CLOSED_WITH_PENDING_TASKS |
| 2 | Archived sessions | Ticket archived + 8 sessions | validator | Exit 0 | valid: true |
| 3 | Draft sessions | Ticket draft + 2 sessions referencia | validator | Exit 0 | valid: true |

---

### REQ-IMPROVE-04: Hook de auto-promote opt-in

> **Que cambia**: cuando el dev ejecuta `dkc-sync` o `dkc-learn` con flag `--promote` (o ticket frontmatter `auto_promote: true`), si el validator detecta drift forward se actualiza el `status` del frontmatter automaticamente + reindex sincrono. Sin el flag: comportamiento actual sin cambios.
> **Por que**: cerrar el loop detect→promote evita que el dev tenga que recordar manualmente el comando. Opt-in respeta inercia y permite escalar a automatico cuando datos lo justifiquen.

El sistema MUST exponer un step `prompts/steps/dkc-status-promote.md` (o equivalente) invocable manualmente (`dkc promote <ticket>`) o como hook desde comandos de captura. El sistema MUST aplicar el promote SOLO si se cumple uno de: (a) flag `--promote` en el comando invocante; (b) frontmatter del ticket tiene `auto_promote: true`; (c) frontmatter del proyecto config tiene `auto_promote_default: true`. El sistema MUST pedir confirmacion explicita al dev antes de aplicar el cambio salvo en modo `autopilot: true | strict`.

**Actor**: dev, autopilot
**Layers**: meta (steps), meta (commands)

<details><summary>Scenarios de validacion</summary>

#### Scenario: opt-in manual
- **GIVEN** ticket con drift forward + dev invoca `dkc promote <ticket>`
- **WHEN** el step ejecuta
- **THEN** muestra al dev: "Drift: status=open, sessions=5. Sugerido: intake-explore. ¿Aplicar? (y/n)" → si confirma, Edit frontmatter + reindex sincrono

#### Scenario: opt-in via flag en captura
- **GIVEN** dev ejecuta `dkc-sync --promote` sobre ticket con drift
- **WHEN** sync termina
- **THEN** invoca promote automaticamente; pide confirmacion (a menos que autopilot)

#### Scenario: sin flag (comportamiento actual)
- **GIVEN** dev ejecuta `dkc-sync` sin `--promote`
- **WHEN** sync termina
- **THEN** sessions agregadas, status sin tocar (comportamiento actual)

#### Scenario: autopilot strict
- **GIVEN** ticket con `autopilot: strict` + drift detectado durante captura
- **WHEN** promote dispara
- **THEN** aplica sin confirmacion + log de transicion

</details>

#### Acceptance
**El dev puede verificar**: invoca `dkc promote up1/ticket-020.md` sobre fixture pre-fix, confirma el prompt, abre HC kanban y ve el ticket movido de columna "Registro" a "Intake".

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Promote manual confirmado | Fixture pre-fix + dev confirma | promote step | Edit + reindex | status cambia |
| 2 | Promote rechazado | Fixture + dev responde 'n' | promote step | No edit | status sin cambios |
| 3 | Autopilot strict | Ticket strict + drift | sync con drift detectado | Aplica sin confirmacion | log de cambio |
| 4 | Sin flag | Ticket + dkc-sync sin --promote | sync | sessions agregadas | status sin tocar |

---

### REQ-PRESERVE-01: Validators existentes sin regresion

> **Que cambia**: nada visible al dev. Los 4 kinds existentes (`SpecTask`, `SessionBlock`, `Rule`, `Decision`) siguen comportandose identico.
> **Por que**: agregar kind nuevo no debe afectar runner existente. Confianza preservada.

El sistema MUST mantener el comportamiento exit code y JSON output de los 4 kinds existentes de `commands/dkc-validate`. Suite de tests existente MUST pasar sin modificaciones.

**Actor**: dev, CI
**Layers**: meta (commands)

#### Acceptance
**Regresion**: suite completa de `commands/lib/validators/*.test.ts` pasa antes y despues de S2-S4. Coverage delta no degrada.

---

### REQ-PRESERVE-02: Steps existentes que escriben status sin modificacion

> **Que cambia**: nada. `intake-explore.md`, `design-*.md`, `request-*.md`, `teach-*.md` siguen escribiendo status como hoy.
> **Por que**: estos steps tienen el patron HOR-056 capa C ya probado. Tocarlos amplia scope sin valor — M3 actua sobre eventos donde NO hay step formal (captura informal).

El sistema MUST NO modificar la logica de promocion de status existente en steps formales. M3 actua SOLO sobre eventos donde no hay step formal previo (dkc-sync, dkc-learn, conversacion libre captured via Edit manual).

**Actor**: system (steps DKC)
**Layers**: meta (prompts/steps)

#### Acceptance
**Verificacion**: grep diff de `prompts/steps/intake-explore.md`, `design-*.md`, `request-*.md`, `teach-*.md` antes y despues del work. Cambios = 0.

---

### REQ-PRESERVE-03: HC viewer y index sqlite sin modificacion

> **Que cambia**: nada. HC kanban sigue renderizando por `status`, sqlite-index sigue derivando del frontmatter sin nuevos campos.
> **Por que**: M1/M2/M3 viven en deckard repo, no en horadric-cube. Cero impacto cross-repo.

El sistema MUST NO requerir cambios en `horadric-cube/` (HC viewer, server, sqlite-index) para que M1/M2/M3 funcionen.

**Actor**: system (HC platform)
**Layers**: frontend, server, database (HC)

#### Acceptance
**Verificacion**: `cd horadric-cube && git diff` post-execute = sin cambios. HC kanban sigue mostrando tickets con `status` actualizado por M3 sin codigo nuevo.

---

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Validator `StatusCoherence` rapido sobre 1 ticket | latencia | < 100ms |
| Performance | Validator escalable sobre suite completa (~50 tickets) | latencia total | < 5s |
| Coverage | Validator nuevo con tests | line coverage | >=80% |
| Robustez | M3 atomico (Edit + reindex) | exit code | 0 si reindex pasa; 3 + rollback si reindex falla |

## Artifacts

### Modified: `templates/records/ticket.md` (M1)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Linea 8 `status:` | `open \| in_progress \| closed` (3 valores) | Bloque doc con 16 valores agrupados en 3 categorias (estables / transicionales / terminales) + cuando aplica cada uno | El LLM crea tickets desde el template — sin set completo escribe tickets fuera del flujo |

### Added: `commands/lib/validators/StatusCoherence.ts` (M2)

| Field | Value | Purpose |
|-------|-------|---------|
| `kind` | `'StatusCoherence'` | Identificador del validator en runner |
| `schema` | Zod schema con campos `current`, `sessions_count`, `tasks_pending_count`, `is_terminal` | Output estructurado para downstream |
| `rules` | Array declarativo de matchers: `STATUS_OPEN_WITH_SESSIONS`, `STATUS_CLOSED_WITH_PENDING_TASKS`, etc. | Reglas extensibles sin tocar core logic |
| `whitelist_terminal_status` | `['archived', 'obsolete', 'done', 'draft']` | Whitelisting para evitar falsos positivos |

### Added: `prompts/steps/dkc-status-promote.md` (M3)

| Field | Value | Purpose |
|-------|-------|---------|
| Trigger manual | `dkc promote <ticket>` | Invocacion explicita por dev |
| Trigger hook | `dkc-sync --promote` o `dkc-learn --promote` flag | Auto-invocacion desde captura |
| Confirmacion | y/n prompt salvo autopilot | Friccion baja, escalable |
| Logging | Append a `### Modo (autopilot)` o sub-tabla nueva `### Status promotion log` en `## Sessions` del ticket | Trazabilidad de transiciones |

### Modified: `commands/dkc-validate` runner (M2 wire)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Kinds soportados | 4 (`SpecTask`, `SessionBlock`, `Rule`, `Decision`) | 5 (+ `StatusCoherence`) | Extension natural, 0 infra duplicada |
| `--all` flag behavior | Itera 4 kinds | Itera 5 | Acceso uniforme via flag |

## Tasks

### Session 1 — M1 Template update [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Documentar los 16 valores de status agrupados (estables/transicionales/terminales) en `templates/records/ticket.md` linea 8 con comentario inline + bloque doc indicando que step escribe cada valor | REQ-IMPROVE-01 | developer | — | `templates/records/ticket.md` | lint frontmatter post-update + grep `^status:` retorna comentario con 16 valores | `git revert` | DET-1, DET-2, DET-11 | pending | 1 |
| S1.T2 | Grep regression sobre tickets existentes (up1, horadric, drunappgor, pehuen, bayley) para asegurar que el cambio en template NO rompe parse de tickets legacy con `status` de 3 valores estables | REQ-PRESERVE-01 | researcher | S1.T1 | `projects/*/tickets/*.md` (solo lectura) | grep + dkc-reindex sobre proyectos pasa sin warnings | (no aplica — solo lectura) | DET-5, DET-7, DET-11 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T0)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, validar T0 (lint + cross-refs), decidir continue/iterate | — | reviewer | S1.T1, S1.T2 | `tickets/HOR-061.md` | gate persistido + Quality review DET-23 (light) + decision documentada | (no aplica — cierre de session) | DET-20, DET-23 | pending | 1 |

### Session 2 — M2 Validator StatusCoherence [tipo: auto] [tier: T2]

> **⚠️ CONDITIONAL — NO ejecutar en HOR-061 reactivado (2026-05-18).** Re-clasificacion: HOR-061 ejecuta solo S1. S2 queda como blueprint conditional para activacion C1-C4 originales en ticket nuevo. Mantener tasks en `pending`.


| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Capturar baseline de `commands/dkc-validate` con 4 kinds existentes: ejecutar suite + capturar coverage delta vs main | REQ-PRESERVE-01 | researcher | S1.GATE | `commands/lib/validators/*.test.ts` | suite pasa, baseline coverage capturado en `### Session 2` del ticket | (no aplica — solo lectura) | DET-4, DET-13 | pending | 2 |
| S2.T2 | Crear `commands/lib/validators/StatusCoherence.ts` con schema Zod + reglas declarativas: `STATUS_OPEN_WITH_SESSIONS`, `STATUS_CLOSED_WITH_PENDING_TASKS`, whitelisting terminales | REQ-IMPROVE-02, REQ-IMPROVE-03 | developer | S2.T1 | `commands/lib/validators/StatusCoherence.ts` (nuevo) | unit tests del archivo aislado pasa | `git revert` | DET-5, DET-8, DET-10, DET-11, RULE-workflow-state-sot-markdown-canonical-003 | pending | 2 |
| S2.T3 | Wire del 5to kind en `commands/dkc-validate` runner (case statement / dispatch) + actualizar `--all` flag para iterar 5 kinds | REQ-IMPROVE-02 | developer | S2.T2 | `commands/dkc-validate`, `commands/lib/dispatch.ts` (o equivalente segun estructura actual) | invocar `dkc-validate StatusCoherence <fixture>` retorna JSON estructurado | `git revert` | DET-5, DET-8, DET-16 | pending | 2 |
| S2.T4 | Tests integration con fixtures: drift forward (TICKET-020 pre-fix recuperado de `git log`), open legitimo (esqueleto), archived legitimo, closed con pending. Coverage >=80% en StatusCoherence.ts | REQ-IMPROVE-02, REQ-IMPROVE-03, REQ-PRESERVE-01 | developer | S2.T3 | `commands/lib/validators/StatusCoherence.test.ts` (nuevo) | suite pasa + coverage report >=80% | `git revert` | DET-5, DET-7, DET-13 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — validacion T2 (vitest + coverage delta), Quality review DET-23 (standard), decidir continue/iterate. Si baseline degradado o tests fail: iterate | — | reviewer | S2.T1..T4 | `tickets/HOR-061.md` | gate persistido + Quality review (standard, dim 1-7+10) + coverage delta documentado | (no aplica) | DET-20, DET-23 | pending | 2 |

### Session 3 — M3 Auto-promote opt-in [tipo: ⚑ fuerte] [tier: T2]

> **⚠️ CONDITIONAL — NO ejecutar en HOR-061 reactivado (2026-05-18).** Mismo motivo que S2: blueprint conditional. Activacion via C1-C4 + ticket nuevo.


| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Verificar scope de BUG-workflow-mcp-append-learn-no-markdown-write-004 — ¿aplica solo a `dkc_append_learn_to_ticket` o tambien a `dkc_set_ticket_status`? Decision: si aplica a set_status, usar fallback inline (`Edit` + `dkc-reindex` sincrono) | REQ-IMPROVE-04 | researcher | S2.GATE | `bugs/workflow/BUG-...004.md`, MCP tools docs | bug scope documentado en `### Session 3` con decision | (no aplica — solo lectura) | DET-4, DET-5, DET-11 | pending | 3 |
| S3.T2 | Crear step `prompts/steps/dkc-status-promote.md`: declara contract (input ticket_id, output status updated + log), describe los 3 modos (manual, hook, autopilot), reusa logica de detection de M2 | REQ-IMPROVE-04 | developer | S3.T1 | `prompts/steps/dkc-status-promote.md` (nuevo) | lint frontmatter del step pasa + cross-references a M2 validas | `git revert` | DET-1, DET-2, DET-8, DET-16, RULE-workflow-state-sot-markdown-canonical-003 | pending | 3 |
| S3.T3 | Implementar detection logic en el step usando `dkc-validate StatusCoherence` (output JSON parseable). Si exit 1: extraer `suggested` value y preparar Edit | REQ-IMPROVE-04 | developer | S3.T2 | `commands/lib/promote.ts` (o equivalente) | unit test: dado fixture pre-fix, detection retorna `{ from: 'open', to: 'intake-explore' }` | `git revert` | DET-5, DET-8, DET-11 | pending | 3 |
| S3.T4 | Implementar write logic atomica: confirmacion (skip si autopilot strict) → Edit frontmatter → `commands/dkc-reindex` sincrono → log en `### Status promotion log` del ticket. Si reindex falla: rollback del Edit | REQ-IMPROVE-04 | developer | S3.T3 | `commands/lib/promote.ts`, helpers de Edit | E2E test: invoca promote sobre fixture, valida frontmatter actualizado + log apendeado | rollback automatico via re-Edit con valor previo | DET-5, DET-8, DET-10, DET-16 | pending | 3 |
| S3.T5 | Wire opt-in en `dkc-sync` (flag `--promote`) y `dkc-learn` (flag `--promote`). Manual entry point `dkc promote <ticket>` standalone | REQ-IMPROVE-04 | developer | S3.T4 | `commands/dkc-sync`, `commands/dkc-learn`, `commands/dkc-promote` (nuevo) | invocar `dkc-sync --promote` sobre fixture aplica promote post-sync; invocar sin flag NO aplica | `git revert` | DET-5, DET-8, DET-16 | pending | 3 |
| **S3.GATE** | **Gate ⚑ fuerte de sync Session 3 (tier: T2)** — Quality review DET-23 (standard, todas las dim aplicables incluyendo 10 error handling porque hay rollback), smoke manual: aplica promote sobre fixture y verifica HC kanban refleja cambio. Decision continue/iterate/escalate (escalate si decision opt-in vs automatico requiere mas datos del segundo caso) | — | reviewer | S3.T1..T5 | `tickets/HOR-061.md` | gate persistido + Quality review + smoke HC kanban pass + decision dev humana | (no aplica) | DET-20, DET-23 | pending | 3 |

### Session 4 — Validacion integral + docs [tipo: ⚑ fuerte] [tier: T3]

> **⚠️ CONDITIONAL — NO ejecutar en HOR-061 reactivado (2026-05-18).** Validacion integral aplica cuando M2+M3 estan implementados. Hasta entonces no tiene scope.


| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | E2E regression de `commands/dkc-validate` con los 5 kinds (4 existentes + StatusCoherence). Suite completa pasa, coverage delta de project no degrada. Capturar metrics en `### Session 4` del ticket | REQ-PRESERVE-01, REQ-PRESERVE-03 | reviewer | S3.GATE | `commands/lib/validators/*.test.ts`, `tickets/HOR-061.md` | suite completa pasa + coverage no degrada + HC kanban funcional sin cambios | (no aplica) | DET-5, DET-7, DET-13, DET-14 | pending | 4 |
| S4.T2 | Docs: agregar entry en `INDEX.md` (o equivalente) con descripcion del 5to kind + comando manual `dkc promote`. Update `templates/records/ticket.md` con referencia al validator si aplica (cross-link). Actualizar `prompts/steps/dkc-sync.md` o equivalente con seccion sobre flag `--promote` | REQ-IMPROVE-01, REQ-IMPROVE-04 | developer | S4.T1 | `INDEX.md`, `docs/*.md` segun aplique | docs publicados sin broken links | `git revert` | DET-5, DET-16, RULE-workflow-state-sot-markdown-canonical-003 | pending | 4 |
| **S4.GATE** | **Gate ⚑ fuerte de sync Session 4 (tier: T3)** — Quality review DET-23 (exhaustive, las 10 dim aplicables), regression completa pre-merge, dev humano valida el behavior end-to-end. Si pasa: ticket cierra con `closed_reason: explored` si se implemento completo, o queda `in_progress` con backlog si quedan items must | — | reviewer | S4.T1, S4.T2 | `tickets/HOR-061.md`, `specs/SPEC-...md` | gate persistido + Quality review exhaustive + dev review explicit | (no aplica) | DET-13, DET-14, DET-20, DET-23 | pending | 4 |

### Task contract — detalles ampliados (referencia)

**S2.T2 contract**:
```
Task #2.2: Crear StatusCoherence.ts
- source_ref: REQ-IMPROVE-02, REQ-IMPROVE-03
- agent: developer
- files: commands/lib/validators/StatusCoherence.ts (nuevo)
- precondition: S2.T1 done (baseline capturado)
- expected_output: archivo creado con schema Zod + matchers declarativos + export del kind
- validation: vitest unit aislado pasa
- rollback: git revert
- rules: [DET-5, DET-8, DET-10, DET-11, RULE-workflow-state-sot-markdown-canonical-003]
```

**S3.T4 contract**:
```
Task #3.4: Write logic atomica
- source_ref: REQ-IMPROVE-04
- agent: developer
- files: commands/lib/promote.ts (o equivalente), commands/dkc-reindex (uso)
- precondition: S3.T3 done (detection funcional)
- expected_output: funcion `applyPromote(ticket, from, to)` que hace Edit + reindex + log; rollback automatico si falla
- validation: E2E test con fixture + verificacion post-state (frontmatter + log apendeado)
- rollback: re-Edit con valor previo si reindex falla mid-operacion
- rules: [DET-5, DET-8, DET-10, DET-16]
```

## Constraints

- **RULE-workflow-state-sot-markdown-canonical-003** — markdown body es SoT canonical. M3 puede tocar frontmatter porque es proyeccion derivada (DET-3 cubre status del frontmatter como mutable).
- **RULE-workflow-session-format-canonical-002** — sessions DEBEN seguir Template de Gate. Detector de M2 parsea `### Session N` literal; sessions con formato no canonico pueden generar falsos negativos. Diseño: usar regex tolerante con fallback a contar headers H3 que matchean `^### Session \d+`.
- **RULE-workflow-explore-conditional-001** — el spec mismo es `draft` hasta C1-C4. Las tasks NO se ejecutan ahora.
- **RULE-server-frontmatter-legacy-001** — consumers HC declaran campos como opcionales. M1 agrega valores nuevos al template; consumers ya tolerantes (no breaking change).
- **DET-3** — frontmatter operativo (`status`, `spec`, `closed`) es mutable. M3 lo aplica explicitamente.
- **DET-5** — multi-capa. M2 detection lee body + frontmatter (2 capas). No invariante de single-source.
- **DET-7** — REQ-PRESERVE obligatorio. 3 REQ-PRESERVE cubren regression de validators existentes, steps DKC, HC viewer.
- **DET-11** — KB-first. Spec consulta SPEC-workflow-output-schemas-26 (output schemas), SPEC-workflow-gates-verifiable-23 (gates), SPEC-workflow-state-sot-and-contracts-46 (SoT y contracts) explicitamente.
- **DET-16** — propagacion. M3 toca frontmatter + reindex + log en ticket; documentado en S3.T4.
- **DET-17** — backlog `must` bloquea cierre. M2 detecta drift inverso (closed con pending) que es manifestacion de DET-17 violado.
- **DET-20, DET-23** — sessions con gate + quality review aplican a este spec mismo cuando se ejecute.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-workflow-output-schemas-26 | internal (DKC) | Patron de `dkc-validate {kind}` + schemas Zod del runner | Si el patron cambia mid-execute, M2 puede requerir refactor |
| SPEC-workflow-gates-verifiable-23 | internal (DKC) | Patron de gates verificables — M2 puede integrarse aqui (opcional, decision pendiente) | Bajo. Wire es decision separada |
| SPEC-workflow-state-sot-and-contracts-46 | internal (DKC) | Define markdown body como SoT canonical + status como projection. Base arquitectural directa | Cero. Ya `done` |
| HOR-053 (validator post-step Directive) | internal (DKC, condicional) | Si HOR-053 implementado antes, comparte runner. Si HOR-061 antes, HOR-053 hereda | Coordinacion necesaria si ambos avanzan en paralelo (kind namespace) |
| `commands/dkc-reindex` | internal (DKC) | M3 lo invoca post-Edit. Si reindex tiene latencia alta, M3 percibe lentitud | Bajo. Reindex actual <5s en proyectos hasta ~100 tickets |
| BUG-workflow-mcp-append-learn-no-markdown-write-004 | bug (DKC) | Si aplica a `dkc_set_ticket_status`, M3 usa fallback inline | Medio. Bloqueante si scope del bug es amplio. Verificar en S3.T1 |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Meta-riesgo: ticket modifica DKC mismo y LLM ejecuta via DKC | medium | high (afecta comportamiento del LLM ejecutor) | Tests aislados en archivos nuevos (validator, step). NO modificar steps existentes (REQ-PRESERVE-02). Wire-in en S3.T5 es de bajo riesgo (flags opt-in) |
| M2 falsos positivos en tickets terminales con sessions historicas | medium | medium (rompe confianza) | REQ-IMPROVE-03 + whitelisting + 3 fixtures no-drift en S2.T4 |
| HOR-053 implementado en paralelo genera colision de kind | low | medium (refactor coordinado) | Verificar HOR-053 status en S2.T2 antes de wire-in. Si ambos avanzan, coordinar namespace `kind` (StatusCoherence vs Directive) |
| Decision opt-in vs automatico de M3 inadecuada | medium | medium (friccion o ausencia de adopcion) | S3.GATE es ⚑ fuerte con escalate explicit. Si datos del segundo caso (C1) cambian la decision, escalate documentado |
| BUG-workflow-mcp-append-learn-no-markdown-write-004 scope amplio impide M3 via MCP | low | high (bloquea S3.T4) | S3.T1 verifica scope del bug ANTES de elegir mecanismo. Fallback inline (Edit + reindex sync) si aplica |
| Performance del validator sobre suite completa | low | low (~50 tickets) | NFR <5s suite. Si excede: cache de parser por file mtime |

## Open questions

- [ ] **¿M2 wire-in en `dkc-verify-gate` standalone o invocable inline desde steps de design/execute?** — SPEC-workflow-gates-verifiable-23 hace que dkc-verify-gate sea el punto de entrada de gates. Si M2 vive standalone, los gates internos no lo invocan auto. Wire-in es mas valor (deteccion automatica) pero amplia scope. Decision: en S3 segun datos del segundo caso C1.
- [ ] **¿`auto_promote_default` a nivel project config o solo a nivel ticket?** — config a nivel project es mas conveniente, pero menos granular. Ticket es mas friccion pero respeta autonomy por ticket. Decision: implementar ambos en S3.T5 (ticket sobreescribe project si ambos definidos).
- [ ] **¿Que pasa si el dev rechaza el promote? (REQ-IMPROVE-04 scenario 2)** — ¿se vuelve a preguntar la proxima vez que ejecute dkc-sync? ¿Hay flag `--no-promote` per-ticket? Decision: en S3.T4 — patron sugerido: rechazo silencioso, no spam. El validator sigue detectando (warning), pero el step de promote no propone si el dev ya rechazo en la misma session.
- [ ] **¿Format del log `### Status promotion log`?** — sub-tabla nueva en `## Sessions` similar a `### Modo (autopilot)` (RULE-workflow-session-format-canonical-002 patron similar), o seccion nueva propia? Decision: sub-tabla nueva siguiendo patron `### Modo (autopilot)` con columnas `Timestamp | From | To | Trigger | Actor`.

## Decisions

(Se llenan post-activacion durante design y ejecucion. Vacio en estado draft.)

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Drift tickets detectados | 1 (TICKET-020, manual) | 100% de drift detectable post-M2 | `dkc-validate StatusCoherence --all` en CI sobre todos los proyectos retorna lista completa |
| Tickets corregidos post-detection | 1 (TICKET-020, manual) | >=80% en 7 dias post-detect (cuando M3 activo) | Diff `git log` sobre `frontmatter.status` de tickets flagged por M2 |
| Friccion del dev (rechazos de promote) | N/A | < 30% rechazo en primera semana post-rollout M3 | Conteo de logs `### Status promotion log` con accion `rejected` |
| Falsos positivos en archived/obsolete | N/A | 0 | Manual review de `dkc-validate --all` durante 1 semana post-activacion |

## Technical reference

### Patron de `commands/dkc-validate {kind} {file}` (de SPEC-workflow-output-schemas-26)

```typescript
// commands/lib/validators/StatusCoherence.ts (esqueleto referencial)
import { z } from 'zod';

export const StatusCoherenceSchema = z.object({
  current: z.enum(['open', 'intake-explore', 'design-improvement', /* ... 16 valores */]),
  sessions_count: z.number().nonnegative(),
  tasks_pending_count: z.number().nonnegative(),
  is_terminal: z.boolean(),
});

export const matchers = [
  {
    code: 'STATUS_OPEN_WITH_SESSIONS',
    severity: 'error',
    condition: (data) => data.current === 'open' && data.sessions_count > 0 && !data.is_terminal,
    suggest: () => 'intake-explore',
  },
  {
    code: 'STATUS_CLOSED_WITH_PENDING_TASKS',
    severity: 'error',
    condition: (data) => data.current === 'closed' && data.tasks_pending_count > 0,
    suggest: () => 'in_progress',
  },
  // ... extensible
];

export const TERMINAL_STATUS = ['archived', 'obsolete', 'done', 'draft'] as const;
```

### Patron de auto-promote step (referencia)

```markdown
# prompts/steps/dkc-status-promote.md (esqueleto)

## 1. Detectar drift (reusa M2)
invocar `commands/dkc-validate StatusCoherence <ticket>`
parsear JSON output
si exit 0: terminar (no drift)
si exit 1: extraer `suggested` y proceder al paso 2

## 2. Confirmar (skip si autopilot strict)
Pedir al dev: "Drift detectado: status={current}, sugerido={suggested}. Aplicar? (y/n)"

## 3. Aplicar (atomico)
- Edit frontmatter del ticket: status = suggested
- Invocar commands/dkc-reindex sincrono
- Si reindex falla: rollback (re-Edit con valor previo) + reportar error
- Si reindex pasa: append a `### Status promotion log` del ticket
```

## Rules discovered

(Se llena durante ejecucion. Vacio en estado draft.)

## Bugs found

(Se llena durante ejecucion. Vacio en estado draft.)

## Acceptance checkpoints

- [ ] **Funcional**: 4 REQ-IMPROVE + 3 REQ-PRESERVE — todos los scenarios pasan
- [ ] **Tests**: vitest suite con coverage >=80% en StatusCoherence.ts + 4 fixtures (drift forward, open legitimo, archived legitimo, closed pending)
- [ ] **NFRs**: latencia validator <100ms por ticket, <5s suite completa
- [ ] **Rules**: 4 RULE + 7 DET listados en Constraints aplicados en task contracts (cobertura DET-11 + ticket frontmatter rules:)
- [ ] **Integration**: HC viewer y index sqlite sin cambios (REQ-PRESERVE-03). Steps DKC existentes sin cambios (REQ-PRESERVE-02). Validators existentes sin regresion (REQ-PRESERVE-01)
- [ ] **Docs**: INDEX actualizado + cross-link template ↔ validator. Step `dkc-status-promote.md` con contract completo.
- [ ] **Coordinacion HOR-053**: confirmado namespace `kind` sin colision (StatusCoherence vs Directive).
- [ ] **Verificacion del meta-riesgo**: ejecutar M2/M3 sobre el propio HOR-061 al cierre verifica que el LLM ejecutor no se ve afectado.

## Archiving

Cuando este spec ejecute (post-activacion C1-C4) y cierre: actualizar `status: draft → done`. Hasta entonces queda en `draft`.

Si C1-C4 nunca disparan y un caso futuro hace este spec obsolete (ej. DKC migra a otro modelo de status), archivar via `commands/dkc-archive-spec`.
