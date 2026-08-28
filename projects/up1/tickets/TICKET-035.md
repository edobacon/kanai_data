---
id: TICKET-035
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1215
module: curriculum-design
autopilot: autonomous
---

# HU-9 | Agregar campo versionSourceId en changeLog.json (rework aplicado)

## Request

> Contenido literal del ticket Jira [UPONE-1215](https://u-planner.atlassian.net/browse/UPONE-1215) (Historia, parent epic UPONE-1038 "Curriculum Design | Programa de asignatura"). Reporter/Assignee: Eduardo Bacon. **Estado: REWORK ya aplicado en Jira 2026-05-26**.

### Descripción

Extender `changeLog` con `versionSourceId: String?` para rastrear de qué objeto se versionó cada Activity, **sin colisionar con** `sourceRefId` (patrón L40).

### Criterios de aceptación

* Agregar `versionSourceId` (nullable).
* **NO** modificar el enum `action` (7 valores) ni `source` (6 valores).
* **NO** modificar `sourceRefId/Name/Type` (L40 intacto).
* `recordAuditEvent` lee/valida/persiste `versionSourceId`; migración + sync.

### Dependencias

Ninguna.

### Cambio vs versión anterior del ticket (⚠️ REWORK)

El contenido anterior de este ticket ("agregar `Clone` al enum + `sourceRefId`") corresponde a **IMP-8 e IMP-3, ambos RECHAZADOS**, y **rompe el contrato cerrado en UPONE-1098** (AC2 verbatim fija los 7 valores del enum `action`; `sourceRefId` es el patrón L40 ya en producción). Este ticket se reescribió: la trazabilidad de versionamiento se hace con un campo NUEVO `versionSourceId`, sin tocar enums ni `sourceRefId`. Distinguir un Create derivado de versión se hace vía `versionSourceId != null`.

## Contexto operativo del plan SP3

### P2.1 — HU-9 · Campo versionSourceId en changeLog (Fase 2) · [mod] · `P1`

- **Meta**: implement · ~1 SP · certeza confirmado · rollback drop campo `versionSourceId` · riesgo bajo (no toca enums ni L40)
- **Contexto**: para auditar de que objeto se versiono cada Activity, sin colisionar con `sourceRefId` (L40, patron distinto). Campo nuevo, aditivo. **Reconciliacion**: el ticket Jira pide `Clone` en el enum + rename `sourceRefId` — **rechazados** (rompen UPONE-1098); rework aplicado.
- **Que se realiza**: agregar `versionSourceId: String?` a `changeLog.json`; `recordAuditEvent` lo lee/valida/persiste; **NO** tocar enum `action`(7)/`source`(6) ni `sourceRefId/Name/Type`; indice opcional; migracion + sync.
- **Depende de**: nada (lo consumen HU-3 y HU-6).
- **Investigar**: nada.
- **Prueba**: `unit` audit de version con `versionSourceId`; sin el para Create normal; L40 intacto; enums sin cambios.

## Material internalizado — HU detallada

### HU-9 · Agregar campo versionSourceId en changeLog.json

**Sprint:** SP3 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** dev del mod
**Quiero** extender `changeLog` con `versionSourceId: String (nullable)`
**Para** rastrear de que objeto se versiono cada Activity, sin colisionar con `sourceRefId` (L40).

**Estado actual verificado:** `changeLog.json` — `action` 7 valores, `source` 6 valores, `sourceRefId/Name/Type` (L40). `versionSourceId` ausente, no colisiona.

**Criterios de aceptacion:**

- [ ] Agregar `versionSourceId: { type: string, not_null: false, description: "ID origen en Create derivado de versionamiento. DISTINTO de sourceRefId (L40)." }`.
- [ ] **NO modificar** enum `source` (6) ni enum `action` (7) — IMP-8 rechazado.
- [ ] **NO modificar** `sourceRefId/Name/Type` — L40 intacto.
- [ ] Flow n8n actualizado (HU-6, en TICKET-041 — fuera del scope de este ticket).
- [ ] `recordAuditEvent`: lee `versionSourceId` del input, valida que el source existe y es del mismo `entityType`, persiste.
- [ ] Index opcional sobre `versionSourceId` (decision menor).
- [ ] Migracion Prisma + sync.
- [ ] Tests: audit con `versionSourceId` para Create de version; sin el para Create normal; L40 mantiene `sourceRefId` poblado y `versionSourceId=null`.

**Dependencias:** Ninguna (paralelo).

## Material internalizado — Decisiones de diseno

### D18 — Rename `sourceRefId` rechazado

**Decision fijada**: **No** se renombra `sourceRefId`. IMP-3 rechazado. Se agrega un campo nuevo `versionSourceId` distinto. **Distinguir Create de version**: via `versionSourceId != null`, **no** via un nuevo enum value.

**Justificacion**:
- `sourceRefId/Name/Type` es el patron L40 ya en produccion (audit chain consolidado al padre). Renombrar rompe ese contrato + cierre formal de UPONE-1098.
- IMP-8 (`Clone` en enum `action`) tambien rechazado por la misma razon.
- Un campo aditivo nuevo `versionSourceId` es trivial, sin impacto en consumers existentes.

## Material internalizado — Discovery (gap con archivo:linea)

### §2.6 changeLog.json (estado actual)

- `changeLog.json`: enum `action` 7 valores (:48), `source` 6 (:55), `sourceRefId/Name/Type` (L40, :91...). `versionSourceId` **ausente**.

### Factibilidad §3.3 (estado verificado)

- enum `action`: 7 valores (`Create, Update, Delete, StateTransition, MADSSync, Import, Restore`).
- enum `source`: 6 valores (`DirectEdit, Workflow, ChangeRequest, MADS, Import, SystemCalculation`).
- `sourceRefId/Name/Type`: existen, semantica del patron L40 (referencia al hijo polimorfico consolidado al padre).
- `versionSourceId`: **ausente** — no colisiona con `sourceRefId` (conceptos distintos).
- `auditCapture.resolver.js:56-59`: `EXCLUDED_FIELDS = { 'updatedAt', 'createdAt', 'version', 'lockedBy', 'tenantId' }`. **`previousVersionId` NO esta en la lista** (B2 — se corrige en TICKET-043 HU-8a, no aqui).

## Material internalizado — Shape canonico

### `changeLog.json` post-HU-9 (campo nuevo aditivo)

```json
{
  "properties": {
    "versionSourceId": {
      "type": "string",
      "not_null": false,
      "description": "ID de la instancia origen en un Create derivado de versionamiento. DISTINTO de sourceRefId (patron L40)."
    }
  }
}
```

> **Lo que NO cambia**: enums `action` (7 valores) y `source` (6 valores), campos `sourceRefId`/`sourceRefName`/`sourceRefType` (L40).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | single (1 archivo + 1 resolver + 1 migracion) |
| Modulo principal | curriculum-design |
| Modulos afectados | mods/curriculum-design (changeLog.json + recordAuditEvent), object-manager (prisma migration) |
| Layer | mod (con migracion que aplica a tenants via core) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | — |
| Data model | yes | Campo nuevo `versionSourceId: String?` en changeLog |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | true (autopilot super, 2026-05-29) |
| Version aprobada | 1 |
| Path | [TICKET-035.draft/](TICKET-035.draft/) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | `versionSourceId` campo aditivo no rompe consumers existentes del changeLog | ✓ confirmada | `audit-capture.json` filtra por whitelist; consumers desconocen el campo |
| H2 | El rework ya esta aplicado en Jira (2026-05-26); este ticket implementa el contenido reworked, no el contenido legacy con `Clone` | ✓ confirmada | Body del Jira tiene seccion "⚠️ REWORK" explicita |

### Context found

- **Rules del modulo**: RULE-dev-004 (toca codigo core via migracion Prisma).
- **Bugs abiertos**: B2 (`previousVersionId` fuera de `EXCLUDED_FIELDS`) — relacionado pero corregido en TICKET-043, no aqui.
- **Specs relacionados DKC**: TICKET-020/029 (SP2, UPONE-1098 audit chain) — cerrados, contrato L40 fijo.
- **Docs relevantes del repo**:
  - `mods/curriculum-design/objects/changeLog.json` (modelo activo)
  - `mods/curriculum-design/logic/auditCapture.resolver.js` (recordAuditEvent)
  - `object-manager/src/graphql/resolvers/mods/curriculum-design/auditCapture.resolver.js` (copia, V1 verificar cual corre)
- **Warnings**:
  - **NO tocar enums** ni `sourceRefId`. La rework existe precisamente porque la version original violaba el contrato L40 de UPONE-1098.
  - **Branch core**: `UPONE-1206` (migracion Prisma toca core).

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` (epica core, migracion Prisma) |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| DB state | UPU recreada via reset canonico 2026-05-28 |
| Services | object-manager (4000), postgres local |
| Test data | seeds UPU con changeLog historico |

## Plan de sessions (preplanificacion)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | HU-9 — agregar `versionSourceId` a changeLog.json + migracion + `recordAuditEvent` + tests | execute | T2 | JSON + resolver + migracion + unit tests | ⚑ fuerte | enums intactos; L40 intacto; campo presente y nullable |
| S2 | Cierre — validacion + commit + teach-close | execute | T1 | review + commit DET-27 | auto | tests verdes; commit conforme |

## Sessions

### Modo (autopilot)

| Timestamp | Transicion | Razon | Aplica desde |
|-----------|-----------|-------|--------------|
| 2026-05-29 | false → super | dev trigger `/dkc 035 autopilot super` — autonomo por-ticket | proximo gate |

### Plan de sessions

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | HU-9 implementacion: `versionSourceId` en changeLog.json + errors.js + resolver + tests + codegen/migracion/sync | execute | T2 | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ⚑ fuerte | enums (action 7 / source 6) intactos; L40 intacto; campo presente y nullable; 20 tests pre-existentes verdes; quality review aislado (DET-23/30) |
| S2 | Cierre: validacion final + commits DET-27 por repo + teach-close | execute | T1 | S2.T1 | auto | working tree limpio; commits conformes; cierre reforzado approve (DET-30 REQ-03) |

> Sessions ejecutadas a continuacion (DET-20 / DET-29).

### Session 1 — 2026-05-29 — HU-9 implementacion (JSON + resolver + tests + migracion + sync) [phase: execute]

**Tipo**: ⚑ fuerte (cambio que toca modelo + migracion; validacion empirica de enums/L40 intactos)
**Validation tier**: T2 (unit + coverage del area auditCapture)

**Objetivo**: Agregar `versionSourceId` aditivo a changeLog.json, hacer que `recordAuditEvent` lo lea/valide/persista, cubrir con tests (sin romper los 20 pre-existentes), y propagar via codegen + migracion additive + sync.

parallel_groups: [[S1.T1, S1.T2]]

**Tasks completadas**:
- [x] S1.T1 — Agregar property `versionSourceId` (aditivo, nullable, fuera de required) a changeLog.json
- [x] S1.T2 — Agregar code `AUDIT_INVALID_VERSION_SOURCE` a errors.js
- [x] S1.T3 — recordAuditEvent: leer `data._versionSourceId`, validar (existe + mismo entityType), persistir en los 3 builders de row
- [x] S1.T4 — Tests: unit + integration (persiste / null / origen invalido / L40 intacto + 20 pre-existentes)
- [x] S1.T5 — codegen + migracion Prisma additive + sync; verificar schema generado
- [x] S1.GATE — Gate de sync Session 1 (tier T2): quality review aislado (DET-23/30), persistir, decidir continue/iterate

**Validacion del tier**:
- T2 — vitest area auditCapture: 79/79 (55 unit + 24 integration; 20 integration pre-existentes intactos + 4 nuevos version-source + 4 unit nuevos). Suite full mod: 638 passed, 1 fail PREEXISTENTE (`fixtures-vs-seed` `activity.version`, no tocado por este ticket — verificado via stash).

**Discoveries / Learns nuevos**: L1 (db push por-tenant), L2 (entanglement codegen tenants stale), L3 (path synced changelog) — ver `## Learns`.

**Quality review (DET-23)**:

**Reviewer**: subagente aislado (sonnet, contexto limpio — DET-30 REQ-10)
**Tier de revision**: standard (T2)
**Resultado global**: approve

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | extractVersionSourceId pura <10 LOC; 3 builders consistentes con `?? null`; usa ERR centralizado, sin magic strings |
| 2 | Lint | n/a | mod sin eslint config |
| 3 | Tipado/consistencia | pass | string/String?/String coherente en JSON↔Prisma↔GraphQL; coercion String explicita |
| 4 | Testing | warn | 79/79 + 20 pre-existentes intactos. Gap: versionSourceId en branches update/transition sin test de contrato (→ B1, bajo riesgo) |
| 5 | Escalabilidad | n/a | findUnique por PK O(1) |
| 6 | Mantenibilidad | pass | reusa AUDITABLE_TYPE_TO_PRISMA_KEY; helper exportado en _internals; error centralizado |
| 7 | Claridad | pass | JSDoc + description que distingue versionSourceId de sourceRefId (L40) |
| 8 | Accesibilidad | n/a | backend puro |
| 9 | Storybook | n/a | sin UI |
| 10 | Error handling | pass | no-fatal (errors[], early return sin throw); catch justificado por degradacion grafil |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 2 (cierre: teach-close + status closed). Quality review aislado approve; 79/79 tests; warn dim4 -> B1. Commits S1: a075dda feat, 2c08f28 test (mod), e6eefc4 chore (object-manager)
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Decision**: continue → Session 2 (cierre). Warn de dim 4 documentado como B1 (could, no bloqueante).

### Session 2 — 2026-05-29 — Cierre (validacion final + teach-close) [phase: execute]

**Tipo**: auto (commits S1 ya ejecutados en S1.GATE per DET-27)
**Validation tier**: T1 (re-confirmar suite del area + working trees limpios)

**Objetivo**: Validacion final de cierre reforzada (DET-30 REQ-03), teach-close v2 HTML (DET-22, MUST en autopilot), status closed + story points.

**Tasks completadas**:
- [x] S2.T1 — Validacion final: suite area verde + working trees limpios (commits S1 ya hechos) + cierre reforzado DET-30 REQ-03
- [x] S2.GATE — Gate de sync Session 2 (tier T1): teach-close v2 + validacion cierre + status closed

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Sesion final. teach-close v2 validado (0 errors); cierre reforzado DET-30 REQ-03 approve; story points executed=2 (manual). Proceder a status closed
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Test cases

| # | Test case | source_ref | Affects UI | Actual | Evidence | Status | Session | Cambios gatillados |
|---|-----------|------------|------------|--------|----------|--------|---------|--------------------|
| TC-1 | Property versionSourceId additive en JSON; enums + L40 intactos | REQ-IMPLEMENT-01, REQ-PRESERVE-01 | no | `git diff changeLog.json` = solo +versionSourceId (enum action 7 / source 6 y sourceRef* sin cambios) | git diff objects/changeLog.json | pass | S1.T1 | — |
| TC-2 | Create con _versionSourceId valido persiste el campo | REQ-IMPLEMENT-02 | no | rows[0].versionSourceId==='act-src', 0 errors | vitest TC-AUD-VERSION-SOURCE "Create derivado de version persiste..." | pass | S1.T4 | — |
| TC-3 | Create normal deja versionSourceId=null | REQ-IMPLEMENT-02 | no | rows[0].versionSourceId===null | vitest TC-AUD-VERSION-SOURCE "Create normal... null" | pass | S1.T4 | — |
| TC-4 | Origen inexistente → AUDIT_INVALID_VERSION_SOURCE, 0 rows | REQ-IMPLEMENT-02 | no | errors[0].code==='AUDIT_INVALID_VERSION_SOURCE', rows.length===0 | vitest TC-AUD-VERSION-SOURCE "error AUDIT_INVALID_VERSION_SOURCE..." | pass | S1.T4 | — |
| TC-5 | Consolidacion L40 sigue poblando sourceRefId; versionSourceId null | REQ-PRESERVE-01 | no | sourceRefId==='cs-child-1' y versionSourceId===null | vitest TC-AUD-VERSION-SOURCE "consolidacion L40..." | pass | S1.T4 | — |
| TC-6 | Tests pre-existentes pasan sin modificacion | REQ-PRESERVE-01 | no | 79/79 verdes (20 integration pre-existentes intactos; git diff tests = solo adiciones; reviewer aislado preexisting_untouched=true) | npx vitest run unit+integration auditCapture | pass | S1.T4 | — |
| TC-7 | db push additive + schema generado contiene el campo | REQ-IMPLEMENT-03 | no | UPU schema `versionSourceId String?`; DB UPU columna text nullable (information_schema) | sync object-manager + query information_schema.columns | pass | S1.T5 | 13 schemas stale revertidos (entanglement Activity, otro ticket) |

## Backlog

| # | Item | Priority | Detectado en | Estado |
|---|------|----------|--------------|--------|
| B1 | Test de contrato + guard opcional para `versionSourceId` en branches update/transition (hoy se persiste si n8n lo envia, sin test). Warn del reviewer aislado S1 — bajo riesgo (semantica del caller). | could | S1.GATE quality review | open |
| B2 | Tenants stale (DEMO01-10, TEST, UCASMT, UCENG, UCPLN, placeholder) no tienen `versionSourceId` en su schema commiteado: se revirtio el codegen entangled con cambios de Activity/Workflow de otro ticket de versionamiento. Se regeneran al sync de ese ticket. | could | S1.T5 | open |
| B3 | Blocker PREEXISTENTE (no de este ticket): db push falla en BASEMODEL/TEST/UCASMT/UCENG/UCPLN por `Activity.workflowId`/`currentStatusId` required con NULLs existentes (trabajo de versionamiento de Activity). Mismo origen que la falla de `fixtures-vs-seed.test.ts` (`activity.version`). Requiere data migration en el ticket de Activity. | could | S1.T5 | open (otro ticket) |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El platform usa `prisma db push` por-tenant (via `npm run sync` del object-manager), NO migration files, para materializar cambios de schema en los tenants. El campo aditivo se aplica con db push. | dev | S1 | refined | RULE-dev-006 |
| L2 | Un `npm run sync` regenera TODOS los schemas de tenant via codegen; tenants stale arrastran cambios de otros tickets aun no propagados (entanglement). Para commits scoped: revertir los schemas entangled y commitear solo los limpios (UPU/BASEMODEL) + el object source + dynamic.js. | dev | S1 | refined | RULE-platform-012 |
| L3 | El mod `changeLog.json` sincroniza a `object-manager/objects/business/Base/changelog.json` (lowercase). | dev | S1 | discarded | consolidacion Fase D — no reusable/especifico del ticket |

## Teaching — Intake

**Status**: done — [teach-intake.html](TICKET-035.teach/teach-intake.html) (v2 HTML, 2026-05-29)

## Teaching — Close

**Status**: done — [teach-close.html](TICKET-035.teach/teach-close.html) (v2 HTML, 2026-05-29)
