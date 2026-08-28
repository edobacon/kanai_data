---
id: SPEC-object-manager-hu6-createdvia-versionsourceid
project: up1
ticket: TICKET-041
status: done
---

# SPEC — HU-6: `createdVia` en eventos + auditoría persiste `versionSourceId`

# SPEC — HU-6: `createdVia` en eventos + auditoría persiste `versionSourceId`

## Executive summary — lo que estas aprobando

> *Diseñada para revision rapida. El detalle vive en Requirements y Tasks.*

**Que se quiere**: que el evento post-create de `object-manager` lleve el **origen** de la creacion — `createdVia: "scratch" | "prefill" | "version"` — y, cuando es `version`, el `versionSourceId` (id del registro del que se versiono), para que el audit (`ChangeLog`) registre la trazabilidad de origen. Todo **aditivo**, sin pisar la consolidacion L40 (`sourceRefId/Name/Type`).

**Hallazgo del intake que ajusta el alcance** (verificado contra el codigo): el lado consumidor **ya esta cableado** por HU-9 (TICKET-035) — `recordAuditEvent` ya extrae `versionSourceId` de `input.data._versionSourceId`, lo valida y lo persiste en `ChangeLog.versionSourceId`. El flow `audit-capture.json` ya mapea `data: $json.data` al input del audit. Por lo tanto **el unico cambio de producto es que `createInstance` EMITA la metadata** dentro del registro que devuelve (convencion `_`-prefix, como `_triggeredBy`); el resto del pipeline ya la transporta y consume. **El JSON del flow NO se edita.**

**Decisiones criticas** (racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| A | Emitir `_versionSourceId` y `_createdVia` **dentro de `data`** (registro devuelto por createInstance), no a nivel superior del payload (DEC-LOCAL-01) | El extractor de HU-9 lee `input.data._versionSourceId`; embeber ahi reusa el pipeline existente y evita editar el flow n8n. A nivel superior obligaria a cambiar el mapeo del flow. |
| B | `createdVia` se deriva: `version` si `asNewVersion===true`; `prefill` si `prefillFrom.source != null` sin versionar; `scratch` si ninguno (DEC-LOCAL-02) | Es la fuente unica de verdad del origen; se extrae a un helper puro testeable. |
| C | `versionSourceId = prefillFrom.source` **solo** cuando `version`; `null` en scratch/prefill (DEC-LOCAL-03) | La correctitud del audit se deriva de esa nulidad (no de que el flow ramifique por createdVia): scratch/prefill → versionSourceId null → audit sin versionSourceId. |
| D | El flow `audit-capture.json` **no se modifica**; S2 lo verifica con contract test (DEC-LOCAL-04) | HU-9 ya extrae el campo de `data`; editar el flow seria cambio innecesario y arriesgado. Reduce el alcance vs lo que el ticket asumia. |

**Riesgos principales y mitigacion**:
- *Romper L40* (tocar `sourceRefId` al agregar `versionSourceId`) → REQ-PRESERVE-05 + test que verifica `sourceRefId` poblado y `versionSourceId=null` en create no-version. Son campos ortogonales; HU-6 no toca el codigo de L40.
- *El campo no sobrevive el unwrap del Code node del flow* (queda fuera de `input.data`) → contract test que simula el unwrap (`record = envelope.data.data`) y asserta `input.data._versionSourceId`.
- *Ensanchar el contrato `core:*`* → confirmado aditivo (H1): unico consumer filtra por whitelist; otros mods ignoran campos extra.

**Que NO se hace**:
- NO se edita `audit-capture.json` (DEC-LOCAL-04).
- NO se toca `sourceRefId/Name/Type` ni el codigo de consolidacion L40.
- NO se cambia el SDL de `recordAuditEvent` (ya acepta `data` JSON con la metadata embebida).
- NO se agrega `createdVia` como columna persistida (es metadata de payload/trazabilidad).

**Tamaño estimado**: 1 SP · 3 sessions livianas. La mas riesgosa: **S2** (preservacion L40) — gate fuerte.

**Como vas a saber que funciona**: unit tests que (a) `deriveCreatedVia` retorna el origen correcto en los 3 casos, (b) `createInstance` adjunta `_createdVia`/`_versionSourceId` al registro devuelto, (c) el payload publicado los transporta dentro de `data`, (d) un create version persiste `versionSourceId` en el audit y un create no-version mantiene `sourceRefId` y `versionSourceId=null`.

## Purpose

Dar trazabilidad de **origen** a la creacion de instancias versionables. **Actor**: dev/analista que audita el historial en `ChangeLog`. **Valor**: cierra el versionamiento SP3 permitiendo distinguir scratch/prefill/version y enlazar una version a su origen, sin colisionar con la consolidacion L40 que ya existe.

## Requirements

### REQ-01: Derivar y emitir `createdVia`

> **Que cambia**: cada creacion ahora "sabe" de donde vino (scratch/prefill/version) y lo lleva en el evento. Antes el evento no distinguia origen.
> **Por que**: el audit necesita el origen para trazar como nacio cada registro.

El sistema MUST derivar `createdVia` en `createInstance` mediante un helper puro `deriveCreatedVia({ asNewVersion, prefillFrom })`: `"version"` si `asNewVersion === true`; `"prefill"` si `!asNewVersion && prefillFrom?.source != null`; `"scratch"` en otro caso. MUST adjuntar `_createdVia` al registro devuelto (`result.data`).

<details><summary>Scenarios de validacion</summary>

#### Scenario: version
- **GIVEN** `data.asNewVersion === true` con `prefillFrom.source = 'ACT-1'`
- **WHEN** se crea la instancia
- **THEN** `createdVia === 'version'`

#### Scenario: prefill
- **GIVEN** `asNewVersion` falsy y `prefillFrom.source = 'ACT-1'`
- **WHEN** se crea
- **THEN** `createdVia === 'prefill'`

#### Scenario: scratch
- **GIVEN** sin `asNewVersion` ni `prefillFrom.source`
- **WHEN** se crea
- **THEN** `createdVia === 'scratch'`

</details>

**Acceptance**: el helper retorna el origen correcto en los 3 casos; el registro devuelto incluye `_createdVia`.

### REQ-02: Emitir `versionSourceId` solo en `version`

> **Que cambia**: cuando la creacion es una version, el evento lleva el id del registro origen; en scratch/prefill no.
> **Por que**: el audit enlaza la version a su fuente solo cuando aplica.

El sistema MUST setear `versionSourceId = prefillFrom.source` cuando `createdVia === "version"`, y `null` en otro caso. MUST adjuntar `_versionSourceId` al registro devuelto (`result.data`).

<details><summary>Scenarios de validacion</summary>

#### Scenario: version lleva el source id
- **GIVEN** `asNewVersion` con `prefillFrom.source = 'ACT-1'`
- **WHEN** se crea
- **THEN** `result.data._versionSourceId === 'ACT-1'`

#### Scenario: scratch/prefill → null
- **GIVEN** create scratch o prefill
- **WHEN** se crea
- **THEN** `result.data._versionSourceId === null`

</details>

**Acceptance**: `_versionSourceId` poblado solo en version; null en los otros casos.

### REQ-03: La metadata viaja en el payload del evento (aditivo)

> **Que cambia**: el evento `core:*` post-create ahora transporta `_createdVia`/`_versionSourceId` dentro de su `data`, sin romper a otros consumidores.
> **Por que**: el flow de auditoria los lee de ahi; otros mods los ignoran.

El sistema MUST hacer que `_createdVia`/`_versionSourceId` viajen dentro del `data` del payload publicado por `withEventPublish` (consecuencia de adjuntarlos al registro devuelto — el decorador publica el resultado del resolver). El cambio MUST ser aditivo: no altera el shape existente ni rompe a consumidores que filtran por whitelist.

<details><summary>Scenarios de validacion</summary>

#### Scenario: payload transporta la metadata
- **GIVEN** un create version
- **WHEN** `withEventPublish` publica el evento
- **THEN** el `data` publicado incluye `_versionSourceId` y `_createdVia`

</details>

**Acceptance**: el payload publicado (mock de `publishToChannel`) incluye la metadata dentro de `data`.

### REQ-04: La auditoría persiste `versionSourceId` (pipeline HU-9, flow sin cambios)

> **Que cambia**: una version queda auditada con su `versionSourceId` en `ChangeLog`. El flow n8n no requiere edicion.
> **Por que**: HU-9 ya cableo la extraccion/persistencia; HU-6 solo alimenta el dato.

El sistema MUST persistir `versionSourceId` en el audit cuando llega en `input.data._versionSourceId` (comportamiento existente de `recordAuditEvent`, HU-9). El flow `audit-capture.json` MUST permanecer sin cambios — se verifica que rutea `data` correctamente.

<details><summary>Scenarios de validacion</summary>

#### Scenario: audit de version
- **GIVEN** un payload de version con `data._versionSourceId = 'ACT-1'` que pasa el unwrap del flow
- **WHEN** `recordAuditEvent` procesa el input
- **THEN** persiste `ChangeLog.versionSourceId = 'ACT-1'`

</details>

**Acceptance**: contract test confirma versionSourceId persistido vía el pipeline existente; el JSON del flow no cambia.

### REQ-PRESERVE-05: L40 intacto

> **Que cambia**: nada en L40 — se garantiza que sigue igual.
> **Por que**: `versionSourceId` y `sourceRefId` son ortogonales; HU-6 no debe alterar la consolidacion al padre.

El sistema MUST NOT modificar `sourceRefId/sourceRefName/sourceRefType` ni el codigo que los computa. Un create no-version MUST mantener `sourceRefId` poblado (cuando aplica L40) y `versionSourceId = null`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: L40 preservado en no-version
- **GIVEN** un create no-version de una CurricularSection (caso L40)
- **WHEN** se audita
- **THEN** `sourceRefId` poblado como antes y `versionSourceId === null`

</details>

**Acceptance**: test de regresion L40 verde; sin cambios en el codigo de `sourceRef*`.

## Resolvers

HU-6 no agrega resolvers nuevos: extiende `createInstance` (object-manager) para emitir metadata. `recordAuditEvent` (mod curriculum-design) se reusa sin cambios.

| name | type | auth | cambio | Notas |
|------|------|------|--------|-------|
| createInstance | Mutation | withObjectAuth('create') + withEventPublish('create') | derivar createdVia + adjuntar `_createdVia`/`_versionSourceId` al registro devuelto | object-manager/src/graphql/resolvers/instance.resolver.js |
| recordAuditEvent | Mutation | (mod) | sin cambios (reusa extractVersionSourceId, HU-9) | mods/curriculum-design/logic/auditCapture.resolver.js |

## Tasks

### Session 1 — Emitir createdVia + versionSourceId desde createInstance [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear helper puro `deriveCreatedVia({ asNewVersion, prefillFrom })` → `{ createdVia, versionSourceId }` | REQ-01, REQ-02 | developer | — | object-manager/src/graphql/resolvers/helpers/derive-created-via.js | vitest unit del helper (3 casos) verde | borrar el helper | DET-1, DET-2, DET-8 | done | 1 |
| S1.T2 | Wire en `createInstance`: invocar helper tras resolver prefillFrom y adjuntar `_createdVia`/`_versionSourceId` al registro devuelto (`result.data`) en los return paths | REQ-01, REQ-02, REQ-03 | developer | S1.T1 | object-manager/src/graphql/resolvers/instance.resolver.js | vitest unit (result.data lleva los campos en 3 casos) verde | git revert del hunk | DET-5, DET-8, DET-16 | done | 1 |
| S1.T3 | Unit tests: helper (3 casos) + createInstance adjunta metadata (version/prefill/scratch) + payload via withEventPublish transporta data._versionSourceId | REQ-01, REQ-02, REQ-03 | developer | S1.T2 | object-manager/tests/unit/resolvers/created-via.test.js | vitest run del archivo verde (assertions concretas) | borrar el test | DET-7, DET-1 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) | — | reviewer | S1.T3 | projects/up1/tickets/ticket-041.md | gate persistido + vitest --coverage del area verde | n/a | DET-20, DET-23 | done | 1 |

### Session 2 — Verificar pipeline de auditoría + preservación L40 [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Contract test: simular unwrap del flow (`record = envelope.data.data`) → `input.data._versionSourceId`; `recordAuditEvent` persiste versionSourceId (prisma mock) en version | REQ-04 | developer | S1.GATE | object-manager/tests/unit/resolvers/created-via.test.js | vitest unit verde | revert de los casos | DET-7, DET-5 | done | 2 |
| S2.T2 | Test de regresion L40: create no-version mantiene `sourceRefId` poblado y `versionSourceId=null`; verificar (lectura) que `audit-capture.json` rutea `data` sin cambios | REQ-PRESERVE-05, REQ-04 | developer | S1.GATE | object-manager/tests/unit/resolvers/created-via.test.js, mods/curriculum-design/flows/audit-capture.json | vitest unit (L40 intacto) verde + inspeccion del flow documentada | revert de los casos | DET-7, DET-4, DET-10 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2, ⚑ fuerte: L40 intacto + audit persiste versionSourceId) | — | reviewer | S2.T2 | projects/up1/tickets/ticket-041.md | gate persistido + vitest --coverage verde + checklist L40 | n/a | DET-20, DET-23 | done | 2 |

### Session 3 — Cierre [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Quality review (tier light) + commits granulares DET-27 (object-manager + repo dkc) | REQ-01 | reviewer | S2.GATE | object-manager/, projects/up1/ | quality review pass + commits creados | n/a (revert por commit) | DET-13, DET-14, DET-27 | done | 3 |
| **S3.GATE** | Gate de cierre Session 3 (tier: T1) + teach-close | — | reviewer | S3.T1 | projects/up1/tickets/ticket-041.md | vitest run del modulo verde + teach-close generado | n/a | DET-20, DET-22 | done | 3 |

## Technical reference

- **withEventPublish**: `object-manager/src/events/decorators/withEventPublish.js` — publica `{ objectType, operation, data: enrichedData, ... }`; `enrichedData = { ...result, _triggeredBy }`. El `data` del payload = lo que devuelve el resolver. Re-export via `src/events/index.js`.
- **createInstance**: `instance.resolver.js` — `asNewVersion = data?.asNewVersion === true`; `prefillFrom = await resolveEffectivePrefillFrom(...)`; retorna `{ id, data: createdRecord, extended, cloneMap }` (~linea 3005). El registro `createdRecord` (= `result.data`) es el que el flow desempaqueta como `input.data`.
- **Flow n8n**: `mods/curriculum-design/flows/audit-capture.json` — Code node hace `record = envelope.data.data`, mapea `input.data = record`. `_versionSourceId` viaja dentro de `record`. SIN cambios.
- **recordAuditEvent**: `mods/curriculum-design/logic/auditCapture.resolver.js` — `extractVersionSourceId(input.data._versionSourceId)` (HU-9), valida origen, persiste `ChangeLog.versionSourceId`. L40: `sourceRefId/Name/Type` independientes.
- **Modelo**: `prisma/UPU/schema.prisma` `ChangeLog.versionSourceId String?` (HU-9) + `sourceRefId/Name/Type` (L40).
- **Tests**: vitest; `tests/unit/events/withEventPublish.test.js` (patron de assert del payload con `expect.objectContaining`); `tests/unit/resolvers/`.

## Constraints

- RULE-dev-004: trabajo core en rama `UPONE-1206`; commits con `UPONE-1212`; merge a develop gated por team up1.
- DET-20/DET-23/DET-27/DET-30: sessions con gate, quality review, commits granulares, red autopilot super.
- Convencion `_`-prefix para metadata en payloads de evento (existente: `_triggeredBy`, `_previousData`, `_versionSourceId` de HU-9).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HU-9 / TICKET-035 | internal | `ChangeLog.versionSourceId` + `extractVersionSourceId` + persistencia en `recordAuditEvent` | Cerrada — habilita el consumo; sin riesgo |
| HU-3 / TICKET-039 | internal | `asNewVersion` + `prefillFrom.source` en createInstance | Cerrada |
| HU-1 / TICKET-036 | internal | prefill declarativo (`resolveEffectivePrefillFrom`) | Cerrada |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Romper L40 al emitir versionSourceId | low | high | REQ-PRESERVE-05 + test de regresion; HU-6 no toca codigo de `sourceRef*` |
| El campo no sobrevive el unwrap del flow | medium | medium | Contract test que simula `record = envelope.data.data` y asserta `input.data._versionSourceId` |
| Ensanchar `core:*` rompe otros consumers | low | medium | H1 confirmada: unico consumer filtra por whitelist; cambio aditivo |
| Multiples return paths en createInstance dejan algun path sin metadata | medium | medium | S1.T2 cubre los return paths relevantes; tests de los 3 casos lo detectan |

## Open questions

> Ninguna abierta. La ubicacion de la metadata (dentro de `data`), la no-edicion del flow, la derivacion de createdVia y la preservacion L40 quedaron cerradas en Decisions (autopilot super: decidir + documentar).

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Metadata dentro de `data` (convencion `_`-prefix)
- **Contexto**: donde colocar `createdVia`/`versionSourceId` en el payload.
- **Drivers**: reusar el extractor de HU-9 (`input.data._versionSourceId`), evitar editar el flow.
- **Opcion elegida**: adjuntar `_createdVia`/`_versionSourceId` al registro devuelto (`result.data`) → viajan dentro de `data`.
- **Alternativas**: nivel superior del payload → obligaria a cambiar el mapeo del flow n8n.
- **Consecuencias**: cambio minimo, flow intacto; los campos quedan en el JSON `data` de la respuesta GraphQL (inocuo).
- **Session**: design.

### DEC-LOCAL-02: `createdVia` via helper puro
- **Contexto**: derivar el origen.
- **Opcion elegida**: helper `deriveCreatedVia({ asNewVersion, prefillFrom })` testeable en aislamiento.
- **Alternativas**: inline en createInstance → mas dificil de testear.
- **Consecuencias**: derivacion cubierta por unit test directo.
- **Session**: design.

### DEC-LOCAL-03: `versionSourceId` solo en version
- **Contexto**: cuando poblar versionSourceId.
- **Opcion elegida**: `prefillFrom.source` solo si `createdVia === 'version'`, sino null.
- **Consecuencias**: la correctitud del audit se deriva de la nulidad; no requiere que el flow ramifique por createdVia.
- **Session**: design.

### DEC-LOCAL-04: Flow `audit-capture.json` sin cambios
- **Contexto**: el ticket asumia que el flow debia mapear versionSourceId.
- **Drivers**: HU-9 ya extrae de `data._versionSourceId`; el flow ya rutea `data`.
- **Opcion elegida**: no editar el JSON; verificar con contract test + inspeccion.
- **Alternativas**: editar el flow → cambio innecesario y arriesgado (n8n).
- **Consecuencias**: reduce el alcance; S2 verifica en vez de modificar.
- **Session**: design.

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-01..REQ-04 + REQ-PRESERVE-05 pasan
- [x] **Tests**: unit del helper (3 casos), createInstance adjunta metadata, payload la transporta, audit persiste versionSourceId, L40 intacto — verdes con assertions concretas
- [x] **Rules**: convencion `_`-prefix respetada; no se toca codigo de `sourceRef*`
- [x] **Integration**: no rompe withEventPublish ni otros consumers (vitest del modulo verde)
- [x] **Flow**: `audit-capture.json` sin cambios (verificado por inspeccion)
- [x] **Branch**: trabajo en `UPONE-1206`; commits con `UPONE-1212`
- [x] **Docs**: teach-close generado al cierre
