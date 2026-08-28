---
id: SPEC-016-hu9-changelog-version-source-id
project: up1
type: doc
module: curriculum-design
status: done
tags:
  - sp4
  - mod
  - hu-9
  - changelog
  - audit
  - versioning
  - epic-UPONE-1038
---

# HU-9 · Campo versionSourceId en changeLog.json

## Executive summary — lo que estas aprobando

> *Seccion de revision rapida. El detalle vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: agregar un campo nuevo `versionSourceId: String?` al audit log del mod
curriculum-design (`changeLog`) para rastrear de que objeto se versiono un Activity cuando
se crea por clonacion/versionamiento. Es un campo aditivo, nullable, que NO toca el contrato
cerrado de UPONE-1098 (enums `action`/`source` + patron L40 `sourceRefId/Name/Type`). El
resolver `recordAuditEvent` lo lee del payload, valida el origen y lo persiste.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Campo nuevo en vez de `Clone` en enum / rename de `sourceRefId` | Tocar enum `action` o `sourceRefId` rompe AC2 verbatim + patron L40 de UPONE-1098 (produccion). D18 ya rechazo el legacy (IMP-8/IMP-3). |
| 2 | Validacion de origen: existe + mismo entityType, error no-fatal si invalido | Mantiene el patron append-only del resolver (no throw); n8n decide retry. Degrada grafil si el entityType no es mapeable a BD. |
| 3 | Sin index sobre versionSourceId | YAGNI — no hay query conocida que filtre por el. El AC lo marca opcional. |

**Riesgos principales y como los mitigamos**:

- **Romper accidentalmente el contrato L40 / enums** → red de tests existentes
  (`auditCapture-handlers.test.ts`, 20 tests) DEBE pasar sin modificacion; tests nuevos
  verifican explicitamente enums y `sourceRef*` intactos.
- **Migracion no-additive** → el campo es nullable sin default; `prisma migrate` genera
  `ALTER TABLE ADD COLUMN ... NULL`, no destructivo. Validar el diff de la migracion.

**Que NO se hace en este ticket**:

- Poblar `versionSourceId` desde el flow n8n (HU-6 → TICKET-041).
- Corregir `previousVersionId` fuera de `EXCLUDED_FIELDS` (B2 → TICKET-043 HU-8a).
- Index sobre el campo.

**Tamano estimado**: 2 sessions ejecutables (S1 implementacion T2 ⚑ fuerte, S2 cierre T1
auto), ~2-3h efectivas. S1 es la mas larga (incluye migracion + sync).

**Como vas a saber que funciona**:

- Tests verdes: un Create con `data._versionSourceId` valido persiste el campo; un Create
  normal lo deja `null`; un origen inexistente devuelve `AUDIT_INVALID_VERSION_SOURCE`.
- `grep versionSourceId` en el prisma schema generado retorna la columna nullable.
- Los 20 tests pre-existentes pasan sin tocar.

---

## Purpose

Extender el modelo `changeLog` con trazabilidad de linaje de versionamiento mediante un
campo aditivo `versionSourceId`, persistido por `recordAuditEvent`, sin alterar el contrato
de auditoria consolidado en UPONE-1098 (SP3).

## Requirements

### REQ-IMPLEMENT-01: Campo versionSourceId en changeLog.json

> **Que cambia**: el objeto `ChangeLog` gana una columna `versionSourceId` (texto, nullable). Vacia para todo evento normal; poblada solo en un Create derivado de versionamiento.
> **Por que**: hoy no hay forma de saber de que objeto se versiono un Activity creado por clonacion.

El sistema MUST agregar a `mods/curriculum-design/objects/changeLog.json` un property
`versionSourceId` con `type: string`, `not_null: false` y description que lo distinga
explicitamente de `sourceRefId` (patron L40). El campo MUST NOT entrar en `required[]`. Los
enums `action` (7 valores) y `source` (6 valores) y la tripleta `sourceRefId/Name/Type`
MUST permanecer sin cambios.

**Actor**: system
**Layers**: schema, database

#### Acceptance
**El usuario puede verificar que funciona**: `grep versionSourceId changeLog.json` retorna el
property nullable; `git diff` no muestra cambios en enums ni en `sourceRef*`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Property additive | changeLog.json sin versionSourceId | se agrega el property | el JSON valida y enums intactos | `required[]` sin versionSourceId; enum action 7 / source 6 |

### REQ-IMPLEMENT-02: recordAuditEvent lee, valida y persiste versionSourceId

> **Que cambia**: el resolver de auditoria ahora lee `data._versionSourceId` del payload, comprueba que ese objeto origen exista y sea del mismo entityType, y lo guarda en la fila del changeLog.
> **Por que**: el campo necesita poblarse y validarse en el unico escritor del audit log.

El sistema MUST leer `versionSourceId` desde `input.data._versionSourceId` (convencion de
campos meta con prefijo `_`). Si esta presente, MUST validar que existe un record del mismo
`entityType` resuelto con ese id; si no existe, MUST devolver un error no-fatal
`AUDIT_INVALID_VERSION_SOURCE` en `errors[]` (sin throw) y NO persistir la fila. El campo
MUST persistirse (`null` cuando ausente) en los tres builders de row: simple
(create/delete/update-sin-prev), batch de update, y transition. Cuando el `entityType`
resuelto no tiene mapeo a un accessor Prisma (`AUDITABLE_TYPE_TO_PRISMA_KEY`), el resolver
MAY omitir la validacion y persistir igual (degradacion grafil, consistente con el lookup
de name/code del padre).

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: Create derivado de version (happy path)
- **GIVEN** un Activity origen `act-src` existe y un Create con `data._versionSourceId='act-src'`
- **WHEN** se invoca recordAuditEvent
- **THEN** la fila persiste `versionSourceId='act-src'`
- **AND** no hay errores

#### Scenario: Create normal (sin versionSourceId)
- **GIVEN** un Create sin `data._versionSourceId`
- **WHEN** se invoca recordAuditEvent
- **THEN** la fila persiste `versionSourceId=null`

#### Scenario: origen inexistente
- **GIVEN** un Create con `data._versionSourceId='ghost'` y no existe Activity 'ghost'
- **WHEN** se invoca recordAuditEvent
- **THEN** errors[] contiene `AUDIT_INVALID_VERSION_SOURCE` y rows.length === 0

</details>

#### Acceptance
**El usuario puede verificar que funciona**: los tests de integracion nuevos pasan (happy
path persiste, normal deja null, origen invalido devuelve error).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Persiste en Create de version | origen existe | Create con _versionSourceId | row con campo poblado | `rows[0].versionSourceId='act-src'` |
| 2 | Null en Create normal | sin _versionSourceId | Create | row con null | `rows[0].versionSourceId===null` |
| 3 | Error origen invalido | origen no existe | Create con _versionSourceId | error no-fatal | `errors[0].code==='AUDIT_INVALID_VERSION_SOURCE'`, 0 rows |

### REQ-IMPLEMENT-03: Migracion Prisma additive + sync

> **Que cambia**: la columna nueva se materializa en el schema Prisma y la BD via el flujo canonico codegen → migracion → sync.
> **Por que**: el cambio en el JSON solo es efectivo cuando codegen + migracion lo propagan.

El sistema MUST regenerar el schema via `npm run codegen`, generar una migracion Prisma
additive (`ADD COLUMN ... NULL`), y correr `npm run sync`. La migracion MUST NOT contener
operaciones destructivas (drop/rename de columnas existentes).

**Actor**: system
**Layers**: database, config

#### Acceptance
**El usuario puede verificar que funciona**: el prisma schema generado contiene
`versionSourceId String?` en el modelo ChangeLog; el SQL de la migracion es un solo
`ADD COLUMN`.

### REQ-PRESERVE-01: Contrato UPONE-1098 intacto

> **Que cambia**: nada — este REQ fija lo que NO debe cambiar.
> **Por que**: el legacy del Jira rompia este contrato; el rework existe para preservarlo.

El sistema MUST mantener intactos: enum `action` (7 valores), enum `source` (6 valores),
campos `sourceRefId/sourceRefName/sourceRefType` (L40). Los 20 tests de
`auditCapture-handlers.test.ts` MUST pasar sin modificacion.

**Actor**: system
**Layers**: schema, backend

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Tests existentes intactos | suite pre-existente | run vitest | todos pasan | 20/20 sin editar el archivo |
| 2 | sourceRefId sigue poblandose | consolidacion L40 | update de hijo | sourceRefId poblado, versionSourceId null | row con ambos campos coherentes |

## Non-functional requirements

Sin NFRs especificos — cambio aditivo de bajo impacto.

## Artifacts

### Models

| Table | Column | Type | Nullable | Default | Description |
|-------|--------|------|----------|---------|-------------|
| ChangeLog | versionSourceId | String | si | (none) | ID origen en Create derivado de versionamiento. Distinto de sourceRefId (L40). |

**Indexes**: ninguno nuevo (decision menor — YAGNI).

### Error codes

| Code | Cuando | Fatal |
|------|--------|-------|
| AUDIT_INVALID_VERSION_SOURCE | `data._versionSourceId` presente pero el origen no existe en el mismo entityType | No (errors[], n8n decide retry) |

## Tasks

### Session 1 — HU-9 implementacion (JSON + resolver + tests + migracion + sync) [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S1.T1, S1.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar property `versionSourceId` a changeLog.json (aditivo, nullable, fuera de required) | REQ-IMPLEMENT-01 | developer | — | mods/curriculum-design/objects/changeLog.json | lint JSON + grep required sin el campo | git revert | DET-8, DET-16 | pending | 1 |
| S1.T2 | Agregar code `AUDIT_INVALID_VERSION_SOURCE` a errors.js | REQ-IMPLEMENT-02 | developer | — | mods/curriculum-design/logic/errors.js | grep code presente | git revert | DET-8 | pending | 1 |
| S1.T3 | recordAuditEvent: leer data._versionSourceId, validar (existe + mismo entityType), persistir en los 3 builders | REQ-IMPLEMENT-02 | developer | S1.T1, S1.T2 | mods/curriculum-design/logic/auditCapture.resolver.js | vitest integration | git revert | DET-5, DET-8, DET-11 | pending | 1 |
| S1.T4 | Tests: unit (helper validacion) + integration (persiste / null / origen invalido / L40 intacto) | REQ-IMPLEMENT-02, REQ-PRESERVE-01 | developer | S1.T3 | tests/unit/auditCapture.test.js, tests/integration/auditCapture-handlers.test.ts | vitest run (nuevos + 20 pre-existentes) | git revert | DET-7, DET-25 | pending | 1 |
| S1.T5 | codegen + migracion Prisma additive + sync; verificar schema generado | REQ-IMPLEMENT-03 | developer | S1.T1, S1.T3 | object-manager (prisma schema/migration generados), sync outputs | codegen ok + migracion ADD COLUMN + grep schema | revertir migracion (prisma migrate resolve --rolled-back) + git revert | DET-8, RULE-dev-004 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — quality review aislado (DET-23/30), persistir resultados, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + reviewer veredicto + decision | (no aplica) | DET-20, DET-23, DET-30 | pending | 1 |

### Session 2 — Cierre (validacion + commits + teach-close) [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Validacion final + commits DET-27 por repo (mods/curriculum-design + object-manager) | — | developer | S1.GATE | repos del execute_scope + object-manager | working tree limpio + commits con prefijo UPONE-1215-S1/S2 | git revert | DET-27, DET-19 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T1)** — validacion de cierre reforzada (DET-30 REQ-03), teach-close, decision | — | reviewer | S2.T1 | ticket | cierre reforzado approve + teach-close | (no aplica) | DET-20, DET-22, DET-23, DET-30 | pending | 2 |

### Task contract

```
Task S1.T3: recordAuditEvent lee/valida/persiste versionSourceId
- source_ref: REQ-IMPLEMENT-02
- agent: developer
- files: mods/curriculum-design/logic/auditCapture.resolver.js
- precondition: S1.T1 (property en JSON) + S1.T2 (error code) listos
- expected_output: setupAuditContext resuelve ctx.resolvedVersionSourceId con validacion;
  _buildSimpleEventData + batch update + transition incluyen el campo
- validation: vitest tests de integracion (S1.T4) verdes
- rollback: git revert
- rules: [DET-5, DET-8, DET-11]
```
