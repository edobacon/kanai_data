---
id: TICKET-041
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1212
module: object-manager
autopilot: autonomous
---

# HU-6 | createdVia metadata en eventos + flow n8n persiste versionSourceId

## Request

> Contenido literal del ticket Jira [UPONE-1212](https://u-planner.atlassian.net/browse/UPONE-1212) (Historia, parent epic UPONE-1206). **Priority del plan: P2 (recortable a SP4).**

### Descripción

Que los eventos post-create incluyan `createdVia: "scratch"|"prefill"|"version"` y que el flow n8n persista `versionSourceId`, para trazabilidad del origen sin colisionar con L40.

### Criterios de aceptación

* Payload incluye `createdVia` (+`versionSourceId` solo cuando `version`).
* El flow `audit-capture` persiste `versionSourceId`; **no** modifica `sourceRefId/Name/Type` (L40 intacto).

### Dependencias

HU-1, HU-3, HU-9.

### Cambio vs actual

* el flow n8n persiste `versionSourceId`.

## Contexto operativo del plan SP3

### P2.7 — HU-6 · createdVia + n8n persiste versionSourceId (Fase 2) · [dominio-CD/versionamiento] · `P2`

- **Meta**: implement · ~2 SP · certeza confirmado · rollback git revert payload + flow n8n · riesgo: ensancha el contrato core:* (latente)
- **Contexto**: trazabilidad del origen (`scratch`/`prefill`/`version`) en los eventos + persistir `versionSourceId` via el flow n8n. El evento `create` se publica al canal `core:*` (todos los objetos); el unico consumer es el audit del propio mod (filtra por whitelist), asi que agregar campos no rompe a terceros.
- **Que se realiza**: payload post-create incluye `createdVia` (+`versionSourceId` cuando `version`); flow `audit-capture.json` persiste `versionSourceId` sin tocar `sourceRefId` (L40).
- **Depende de**: HU-1 (TICKET-036), HU-3 (TICKET-039), HU-9 (TICKET-035).
- **Investigar**: confirmar handler n8n del audit-capture.
- **Prueba**: `unit` payload en 3 casos; audit de version con `versionSourceId`; L40 intacto. **Recortable a SP4**.

## Material internalizado — HU detallada

### HU-6 · createdVia metadata + flow n8n persiste versionSourceId

**Sprint:** SP3 · **Track:** Core object-manager + flow n8n · **Repos:** `object-manager`, `mods/curriculum-design/flows`

**Como** dev de mod
**Quiero** que los eventos BullMQ incluyan `createdVia: "scratch" | "prefill" | "version"` y que el flow n8n persista `versionSourceId`
**Para** trazabilidad del origen de versiones, sin colisionar con L40.

**Estado actual verificado:** el payload del evento es extensible via `withEventPublish` — aditivo.

**Criterios de aceptacion:**

- [x] Payload post-create incluye `createdVia` y `versionSourceId` (solo cuando `createdVia: "version"`).
- [x] Flow n8n `flows/audit-capture.json`: rutea `data` por unwrap; `_versionSourceId` viaja embebido (sin editar el flow — DEC-LOCAL-04). `recordAuditEvent` (HU-9) lo persiste solo en version.
- [x] `recordAuditEvent` persiste `versionSourceId` (HU-9). **NO modifica** `sourceRefId/Name/Type` (L40 intacto — verificado).
- [x] Tests: helper 3 casos + payload + contract unwrap (HU-6); audit version/null + L40 (HU-9). 11 unit HU-6 verdes.

**Dependencias:** HU-1, HU-3, HU-9.

## Material internalizado — Discovery §2.8

### Evento de create / audit n8n (estado actual)

- `withEventPublish.js:131-168` publica al canal `core:*` **para todos los objetos** + canal domain condicional por `X-App-ID`.
- Unico consumer: `mods/curriculum-design/flows/audit-capture.json`, con whitelist `Activity|CurricularSection|CurricularLink` → otros objectTypes se descartan antes de leer el payload. Agregar `createdVia`/`versionSourceId` no rompe a otros mods (los ignora).

## Material internalizado — Shape canonico

### Payload del evento post-create

```js
// Antes
{ objectType, objectId, data, action: 'Create' }

// Despues (HU-6)
{
  objectType, objectId, data, action: 'Create',
  createdVia: 'scratch' | 'prefill' | 'version', // siempre presente
  versionSourceId: '<source.id>' | null // solo si createdVia === 'version'
}
```

### Flow `audit-capture.json` post-HU-6

```json
{
  "nodes": [
    {
      "id": "filter-event",
      "type": "filter",
      "rules": ["objectType in [Activity, CurricularSection, CurricularLink]"]
    },
    {
      "id": "record-audit",
      "type": "graphql-mutation",
      "operation": "recordAuditEvent",
      "variables": {
        "action": "{{$json.action}}",
        "source": "core:*",
        "sourceRefId": null,
        "versionSourceId": "{{ $json.versionSourceId || null }}"
      }
    }
  ]
}
```

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | multi (event payload + flow n8n + recordAuditEvent resolver) |
| Modulo principal | object-manager |
| Modulos afectados | object-manager (withEventPublish), mods/curriculum-design (flow audit-capture + recordAuditEvent) |
| Layer | core + mod (toca ambos) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | — |
| Data model | no | (campo `versionSourceId` ya creado en TICKET-035 HU-9) |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | n/a |
| Version aprobada | — |
| Path | — |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Agregar `createdVia`/`versionSourceId` al payload `core:*` no rompe a otros mods porque el unico consumer filtra por whitelist | ✓ confirmada | `audit-capture.json` filtra por `objectType in [Activity, ...]`; otros eventos se descartan |
| H2 | El flow n8n acepta payload extension sin cambio del nodo de filtro | ✓ confirmada (a validar) | n8n acepta JSON arbitrario; solo el mapeo en `record-audit` necesita actualizarse |

### Context found

- **Rules del modulo**: RULE-dev-004 (toca core via withEventPublish).
- **Bugs abiertos**: ninguno.
- **Specs relacionados DKC**: TICKET-035 (HU-9 campo `versionSourceId`), TICKET-036 (HU-1), TICKET-039 (HU-3 audit `versionSourceId` al crear v2).
- **Docs relevantes del repo**:
  - `object-manager/src/middleware/withEventPublish.js:131-168` (payload publish)
  - `mods/curriculum-design/flows/audit-capture.json` (flow n8n)
  - `mods/curriculum-design/logic/auditCapture.resolver.js` (recordAuditEvent)
- **Warnings**:
  - **Prioridad P2 — recortable a SP4** si el sprint se ajusta.
  - **Branch core**: `UPONE-1206`.

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| DB state | UPU con `versionSourceId` columna disponible (post-TICKET-035) |
| Services | object-manager (4000), n8n (5678), redis (BullMQ), postgres |

## Sessions

### Modo (autopilot)

| Timestamp | Transicion | Razon | Aplica desde |
|-----------|-----------|-------|--------------|
| 2026-06-02T10:50:00-0400 | false → super | dev trigger "super autopilot" en `/dkc 041 super autopilot` | proximo gate (teach-intake) |

### Plan de sessions

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | HU-6 — emitir `createdVia`/`versionSourceId` desde createInstance (helper + wire) + unit tests | execute | T2 | helper + wire + tests | auto | metadata correcta en 3 casos |
| S2 | HU-6 — verificar pipeline audit (contract test) + preservacion L40 | execute | T2 | contract + L40 tests | ⚑ fuerte | versionSourceId persistido; L40 intacto |
| S3 | Cierre — commits + teach-close | execute | T1 | review + commit DET-27 | auto | tests verdes |

### Session 1 — 2026-06-02 — Emitir createdVia + versionSourceId desde createInstance [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Helper `deriveCreatedVia` + wire en createInstance (adjuntar `_createdVia`/`_versionSourceId` al registro devuelto) + unit tests de los 3 casos (scratch/prefill/version) y del payload.

**Tasks completadas**:
- [x] S1.T1 — Helper puro `deriveCreatedVia({ asNewVersion, prefillFrom })`
- [x] S1.T2 — Wire en createInstance: adjuntar `_createdVia`/`_versionSourceId` al registro devuelto
- [x] S1.T3 — Unit tests: helper (3 casos) + createInstance adjunta metadata + payload la transporta
- [x] S1.GATE — Gate de sync Session 1 (tier T2)

**Validacion del tier**: T2 — `npx vitest run tests/unit/resolvers/ tests/unit/events/` → 21 files / 567 passed (8 de created-via). Sin regresion.

**Reviewer**: aislado (sub-agente sonnet, contexto limpio) + re-review tras fix
**Tier de revision**: standard (T2)
**Resultado global**: pass (tras iterate→fix)

#### Quality review (DET-23)

| # | Dimension | Estado | Nota |
|---|-----------|--------|------|
| 1 | Calidad de codigo | pass | helper puro + spread en los 3 return paths; bug RT corregido tras review |
| 2 | Lint/estilo | pass | consistente con helpers existentes (`_`-prefix como `_triggeredBy`) |
| 3 | Tipado | n/a | JS puro |
| 4 | Testing | pass | helper 6 casos + createInstance scratch real + assert del payload publicado (REQ-03) |
| 5 | Escalabilidad | pass | derivacion O(1); sin queries extra |
| 6 | Mantenibilidad | pass | logica aislada en helper testeable |
| 7 | Claridad | pass | comentarios HU-6 en wire y RT path |
| 8 | a11y | n/a | backend |
| 9 | Storybook | n/a | backend |
| 10 | Error handling | pass | helper defensivo (args vacios → scratch) |

> Reviewer recommendation: **approve** (tras iterate). **Bug critico corregido**: el return path RecordType (~linea 2479) no inyectaba la metadata y los `rt__*` estan en la whitelist de auditoria → habria emitido eventos sin createdVia; fix: spread en los 3 return paths (RT/extended/regular). Cobertura version/prefill: la derivacion via helper (6 casos) + el wire via scratch (mismo return path) + RT por inspeccion del diff — correr createInstance para version/prefill solo testearia los mocks de prepareVersionData/applyPrefillFromSource (ortogonal a HU-6). Aceptable para T2.

**Commit DET-27**: `67f8f47` (object-manager) (ver tabla ## Commits)

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-06-02 — Verificar pipeline audit + preservacion L40 [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Contract test del unwrap del flow → `input.data._versionSourceId` + persistencia versionSourceId (mock); test de regresion L40 (sourceRefId intacto, versionSourceId null en no-version); verificar que `audit-capture.json` no requiere cambios.

**Tasks completadas**:
- [x] S2.T1 — Contract test: unwrap del flow + recordAuditEvent persiste versionSourceId (version)
- [x] S2.T2 — Test regresion L40 + verificar flow audit-capture.json sin cambios
- [x] S2.GATE — Gate de sync Session 2 (tier T2, ⚑ fuerte)

**Validacion del tier**: T2 — `npx vitest run tests/unit/resolvers/ tests/unit/events/` → 21 files / 570 passed (11 de created-via). Sin regresion.

**Reviewer**: aislado (sub-agente sonnet) + re-review con evidencia HU-9
**Tier de revision**: standard (T2, gate ⚑ fuerte)
**Resultado global**: pass (tras iterate→evidencia)

#### Quality review (DET-23)

| # | Dimension | Estado | Nota |
|---|-----------|--------|------|
| 1 | Calidad de codigo | pass | contract test con replica fiel del unwrap; anti-drift reforzado |
| 2 | Lint/estilo | pass | consistente |
| 3 | Tipado | n/a | JS puro |
| 4 | Testing | pass | REQ-04 (unwrap→input.data._versionSourceId), REQ-PRESERVE-05 (no-version null + sin sourceRef*), DEC-LOCAL-04 (assert estructural sobre flow real) |
| 5 | Escalabilidad | pass | — |
| 6 | Mantenibilidad | pass | flowUnwrap referencia el Code node real |
| 7 | Claridad | pass | — |
| 8 | a11y | n/a | backend |
| 9 | Storybook | n/a | backend |
| 10 | Error handling | pass | — |

> Reviewer recommendation: **approve** (gate ⚑ fuerte, tras iterate). Finding F-01 (persistencia de recordAuditEvent vía prisma mock) **resuelto por límite de scope + cobertura HU-9**: el eslabón B (recordAuditEvent lee `input.data._versionSourceId` y persiste `ChangeLog.versionSourceId` sin tocar `sourceRefId`) vive en `mods/curriculum-design/logic/` (FUERA del execute_scope de HU-6 = `object-manager/` + `mods/curriculum-design/flows/`) y ya está testeado por HU-9/TICKET-035 en `auditCapture-handlers.test.ts:704-777` (versionSourceId='act-src', sourceRefId=null L40, caso null, origen inválido). HU-6 cubre su mitad (eslabón A: emit + transport hasta `input.data._versionSourceId`). Re-testear B violaría DET-10 (developer no expande alcance). Anti-drift F-03 reforzado.

**Commit DET-27**: `4bc8ed2` (object-manager) (ver tabla ## Commits)


**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-06-02 — Cierre: quality review + commits DET-27 + teach-close [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T1 (unit area)

**Objetivo**: Quality review (tier light), commits granulares DET-27 (object-manager + repo dkc) y teach-close.

**Tasks completadas**:
- [x] S3.T1 — Quality review + commits granulares DET-27
- [x] S3.GATE — Gate de cierre Session 3 (tier T1) + teach-close

**Validacion del tier**: T1 — `npx vitest run tests/unit/resolvers/ tests/unit/events/` → 570/570 verde (area HU-6). Sin regresion introducida.

**Reviewer**: inline light (T1, cierre; S1/S2 ya con reviewer aislado)
**Tier de revision**: light (T1)
**Resultado global**: pass

#### Quality review (DET-23)

| # | Dimension | Estado | Nota |
|---|-----------|--------|------|
| 1 | Calidad de codigo | pass | sin codigo nuevo en S3; S1/S2 revisadas por reviewer aislado |
| 7 | Claridad | pass | teach-close generado y validado; learns L1-L4 + AC verificados |

> Cierre: 5 REQ (1 PRESERVE) entregados, 8 TC verdes, teach-intake + teach-close validados. Flow audit-capture.json sin cambios (DEC-LOCAL-04). L40 intacto.

**Commit DET-27**: n/a — session de cierre, sin codigo de producto nuevo (records dkc en commit de cierre)

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Commits

| Hash | Fecha | Header | Tasks | REQs |
|------|-------|--------|-------|------|
| 67f8f47 | 2026-06-02 | UPONE-1212-S1 feat(versioning): emit createdVia + versionSourceId en createInstance | S1.T1, S1.T2, S1.T3 | REQ-01, REQ-02, REQ-03 |
| 4bc8ed2 | 2026-06-02 | UPONE-1212-S2 test(versioning): contract del flow audit + preservacion L40 | S2.T1, S2.T2 | REQ-04, REQ-PRESERVE-05 |

> Repo: object-manager (submodulo), rama `UPONE-1206`. Push gated por revision team up1.

## Test cases

| TC | source_ref | Descripcion | Actual | Evidence | Status | Session | Cambios gatillados |
|----|-----------|-------------|--------|----------|--------|---------|--------------------|
| TC-01 | REQ-01 | `deriveCreatedVia` retorna version/prefill/scratch correcto (3 casos + edges) | 6/6 segun reglas | created-via.test.js deriveCreatedVia verde | pass | S1 | — |
| TC-02 | REQ-02 | versionSourceId = source solo en version; null en prefill/scratch | OK | created-via.test.js (casos version/prefill/scratch) | pass | S1 | — |
| TC-03 | REQ-01/REQ-03 | createInstance scratch adjunta `_createdVia=scratch`/`_versionSourceId=null` a result.data | result.data correcto | created-via.test.js createInstance scratch verde | pass | S1 | — |
| TC-04 | REQ-04 | Contract: unwrap del flow → input.data._versionSourceId (version) | _versionSourceId='ACT-1' en input.data | created-via.test.js S2 TC REQ-04 verde | pass | S2 | — |
| TC-05 | REQ-PRESERVE-05 | No-version → versionSourceId null tras unwrap; sin sourceRef* en payload (L40 ortogonal); flow audit-capture.json sin cambios (assert estructural) | null + flow intacto | created-via.test.js S2 (REQ-PRESERVE-05 + DEC-LOCAL-04) verde | pass | S2 | — |

> Affects UI: no (eventos/audit backend; sin componente visual).

## Backlog

> Vacio.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | `createInstance` tiene 3 return paths para el create (RecordType ~2479, extended ~3010, regular ~3012). Una metadata que debe viajar en el payload del evento DEBE inyectarse en LOS 3 — el reviewer aislado detecto que el path RT quedo sin `_createdVia`/`_versionSourceId` en el primer intento. Patron a recordar: al agregar campos al payload de eventos, auditar todos los return paths del resolver. | reviewer | S1 | refined | RULE-core-024 |
| L2 | El audit de HU-9 lee `versionSourceId` de `input.data._versionSourceId` (convencion `_`-prefix) y el flow n8n rutea `data` tal cual — por eso HU-6 emite la metadata DENTRO de `data` y el flow `audit-capture.json` no requiere edicion. Reduce el alcance vs lo que el ticket asumia. | developer | S1 | refined | RULE-mods-048 |
| L3 | Un pipeline cross-mod se testea repartido por execute_scope: HU-6 cubre emit+transport (object-manager), HU-9 cubre consume+persist (mod). El contract test cierra la juntura (campo llega a input.data._versionSourceId) sin duplicar la persistencia (que esta fuera de scope — DET-10). | reviewer | S2 | refined | RULE-core-026 |
| L4 | No pre-escribir stubs de sessions futuras: HC (`sessions.ts` regla 4) marca in_progress cualquier session con `**Tasks completadas:**` poblado + ticket vivo. Materializar solo la session activa just-in-time via `open-session N`; las futuras viven en `### Plan de sessions`. (Sintoma observado por el dev: S2/S3 "en ejecucion" desde el inicio). | dev | S2 | refined | [[reference_dkc_no_prewrite_future_session_stubs]] |

## Teaching — Intake

**Status**: done
**Archivo**: `tickets/TICKET-041.teach/teach-intake.html` (v2 HTML, validado)
**Bloques**: tldr, callout (4), concept-card (5), flow, code, invariant, timeline, study-qa (4), tag. Cobertura 3 direcciones + 4 ejes. Hallazgo central: HU-9 ya cableo el audit; el flow n8n NO requiere edicion.

## Teaching — Close

**Status**: done
**Archivo**: `tickets/TICKET-041.teach/teach-close.html` (v2 HTML, validado)
**Bloques**: tldr, callout, concept-card (hipotesis+lessons), comparison-table (decisiones), flow (pipeline), invariant (scope), timeline, study-qa. 5to eje + evolucion hipotesis + 4 lessons.
