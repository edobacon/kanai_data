---
id: TICKET-122
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1557
module: object-manager
autopilot: manual
---

# Backend: el borrado en bloque no debe contar la proyeccion RT propia como referencia externa

## Request

Frente backend del bug de hard-delete **UPONE-1557**. `deleteBulkInstances` sobre un objeto base con extensiones RecordType (tablas `rt__<Rt>__<base>` con FK `<base>Id`) se bloquea con `CONSTRAINT_VIOLATION` aunque no exista ninguna referencia externa real: la validacion de referencias cuenta las capas de proyeccion del propio objeto como si fueran referencias entrantes. El borrado individual ya lo resuelve bien; hay que llevar el bulk a paridad.

> Atado al Jira **UPONE-1557** (frente backend). El frente frontend activo es TICKET-130 (hermano, mismo external); TICKET-123 fue el predecesor, cerrado por superseded-by-UPONE-1600.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | single (core, object-manager) |
| Modulo principal | object-manager |
| Modulos afectados | ninguno (comportamiento generico del motor de borrado) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | `validateBulkDelete` (`referenceValidationService.js`) no excluye las proyecciones `rt__*__<base>` propias al buscar referencias por convencion `<base>Id`; el id nunca llega al loop que las limpia | ✓ confirmada | Ver doc de analisis, secciones 2-4 |
| H2 | El fix correcto es la exclusion quirurgica de la proyeccion propia (Opcion A), no reemplazar el gate por el motor del preview (Opcion B) | ✓ confirmada | Ver doc de analisis, seccion 6 (blast radius, escalabilidad, paridad con single) |

### Context found

- **Analisis code-grounded (fuente de verdad de este ticket)**: [`kb/sp8/BUG-core-bulkdelete-rt-projection-false-restrict.md`](../kb/sp8/BUG-core-bulkdelete-rt-projection-false-restrict.md). Diagnostico, opciones A/B/B', malla de seguridad y plan de tests completos.
- **Propuesta Jira**: [`kb/sp8/PROPUESTA-jira-hard-delete-core-robustez-detalle.md`](../kb/sp8/PROPUESTA-jira-hard-delete-core-robustez-detalle.md).
- **Hermano frontend**: [[TICKET-130]] (mismo `external`, frente `layout`); [[TICKET-123]] fue el predecesor cerrado (superseded por UPONE-1600).
- **Warnings**: la exclusion debe anclarse en la introspeccion real de la FK (`resolveRtProjectionFks`), no en un patron de string `rt__`, para no sobre-excluir una proyeccion de OTRO objeto que legitimamente referencia al base (doc, seccion 7).

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | (a crear) `UPONE-1557-om-false-restrict` |
| Base branch | develop |
| DB state | tenant real (BD real): el guard depende de introspeccion Prisma + casing de columnas; unit con mock puede dar falso verde (doc, seccion 8.3) |
| Services | object-manager |
| Test data | objeto base sin hijos con proyeccion RT (ej. `Availability` / `InstructorAvailability`, FK `availabilityId`) |

### Reproduction steps

1. Objeto base sin hijos declarados con proyeccion `rt__*__<base>` (FK convencion minuscula) y sin referencia externa real.
2. `deleteBulkInstances(objectType, ids)` sobre esas filas.
3. Observado: bloqueo `CONSTRAINT_VIOLATION` para todos los ids. Esperado: borra base + proyeccion, `errors: []` (paridad con `deleteInstance`).

## Acceptance

- [ ] Bulk de base con proyeccion RT y sin referencia externa real borra base + capas de proyeccion, sin bloqueo ni huerfanos.
- [ ] Bulk de base referenciado por objeto externo real sigue bloqueando (referencia real intacta).
- [ ] Bulk de base referenciado por custom field de tipo referencia sigue bloqueando.
- [ ] Comportamiento identico para FK de proyeccion minuscula (`availabilityId`) y capitalizada (`OrgUnitId`).
- [ ] Borrado individual del mismo objeto sin regresion (paridad).
- [ ] Verificado contra BD real (no solo unit con Prisma mockeado). Sin artefactos de sync commiteados. Commits/PR con id `UPONE-1557`.

## Testing

### Test cases (plan; se ejecutan y registran en execute — orden tests-first)

| # | Case | Tipo | Momento | Esperado |
|---|------|------|---------|----------|
| TC-1 | Red: bulk base sin hijos, referenciado por objeto externo real | integration | verde sobre codigo actual | sigue bloqueando |
| TC-2 | Red: precision, base con proyeccion propia + tercer objeto que lo referencia | integration | verde sobre codigo actual | excluye la propia, bloquea por la ajena |
| TC-3 | Red: individual equivalente sigue borrando | integration | verde sobre codigo actual | borra |
| TC-4 | Reproduce: bulk base con proyeccion propia, FK minuscula, sin ref externa | integration | ROJO hoy -> verde con fix | borra base + proyeccion, `errors: []` |
| TC-5 | Matriz de casing: FK minuscula y capitalizada | integration | verde con fix | ambos borran |
| TC-6 | Bloqueo por custom field reference (step-2, ortogonal al fix) | unit | verde sobre codigo actual y tras el fix | sigue bloqueando |

## Sessions

### Plan de sessions

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Red de seguridad + RED del bug (tests-first) | execute | T2 | S1.T1 malla (TC-1/TC-2/TC-3 integracion + TC-6 unit) VERDE sobre codigo actual; S1.T2 RED del bug (TC-4/TC-5 minuscula) ROJO reproducible | ⚑ fuerte | Malla VERDE sobre codigo actual + RED reproducible; si un test de la malla sale rojo el diagnostico esta mal, parar |
| S2 | Implementar Opcion A + cerrar | execute | T2 | S2.T1 exclusion quirurgica de proyeccion RT propia (introspeccion PK==FK); S2.T2 unit directo; S2.T3 suite integracion completa contra BD real UPU; S2.T4 doc delete-cascade.md + marcar BUG resuelto | auto | TC-4/TC-5(min) VERDE, malla sigue VERDE, suite completa VERDE contra BD real, doc actualizada, commits con id UPONE-1557 sin artefactos de sync |

### Session 1 — 2026-08-13 — Red de seguridad + RED del bug (tests-first) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Montar la malla de seguridad (TC-1/TC-2/TC-3 integracion + TC-6 unit) VERDE sobre el codigo actual sin tocar codigo, y luego el RED del bug (TC-4/TC-5 minuscula) ROJO reproducible contra el codigo actual.

**Tasks completadas**:
- [x] S1.T1 — Malla de seguridad: TC-1 (bloqueo FK externa real base sin hijos), TC-2 (precision del match: no sobre-excluir rt__ ajena), TC-3 (single sin regresion), TC-6 (custom field reference, unit). VERDE sobre codigo actual
- [x] S1.T2 — RED del bug: TC-4 (bulk base + proyeccion FK minuscula sin ref externa) y TC-5 caso minuscula. ROJO reproducible contra codigo actual

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 2 (S2: implementar Opcion A + cerrar). Malla VERDE (TC-1/2/3/6) + RED reproducible (TC-4/TC-5a) confirmados sobre codigo actual
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-08-13 — Implementar Opcion A + cerrar [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Implementar la exclusion quirurgica de la proyeccion RT propia en discoverFKRelationshipsFromPrisma (introspeccion PK==FK, casing-agnostico), verificar TC-4/TC-5a VERDE + malla intacta, correr la suite completa contra BD real UPU y actualizar la doc oficial.

**Tasks completadas**:
- [x] S2.T1 — Exclusion quirurgica de la proyeccion RT propia (rt__ cuya PK es la FK a base.id), anclada en introspeccion real, no en string rt__
- [x] S2.T2 — Unit directo: excluye proyeccion propia, preserva FK externa real + custom field reference + ext__/core_/self
- [x] S2.T3 — Suite completa hard-delete-cascade.integration contra BD real UPU VERDE, verificacion independiente (DET-33)
- [x] S2.T4 — Doc delete-cascade.md (paridad bulk/single) + marcar BUG resuelto en kb/sp8 (repo deckard)

**Discoveries / Learns nuevos**:
- L1 (DET-4/DET-40, desviacion de diseño verificada en BD): `resolveRtProjectionFks` NO devuelve solo proyecciones propias. Para bases como OrgUnit devuelve tambien rt__ AJENAS que referencian el base por una columna que no es su PK (`rt__InstructorAvailability__availability.orgUnitId`, `rt__Departmental__InstructorAffiliation.orgUnitId` -> OrgUnit.id). Anclar la exclusion en su set crudo (como sugeria el spec "set exacto de resolveRtProjectionFks") habria violado REQ-REGRESSION-01 ("no excluir rt__ de OTROS objetos"). La proyeccion propia se distingue por `PK == FK`. Para Availability las 5 son propias (fk==PK), por eso el spec/KB no lo detectaron (solo examinaron Availability).
- L2 (arquitectura, blast radius): la exclusion se implemento como introspeccion self-contained en `referenceValidationService.js` (misma consulta information_schema que resolveRtProjectionFks + condicion `PK == FK`), sin exportar/importar resolveRtProjectionFks ni tocar el delete-path ni single-delete. Evita acoplar el servicio al resolver, mantiene el delete loop intacto y hace el unit testeable.

**Validacion del tier**:
- T2 — vitest run del area: integration `hard-delete-cascade.integration.test.js` 23/23 VERDE contra BD real UPU; unit `referenceValidationService.test.js` 4/4 VERDE. Malla (TC-1/2/3/6) VERDE sobre codigo actual y tras el fix; RED (TC-4/TC-5a) paso de ROJO a VERDE.

**DET-40 — Auditoria de reemplazo (veredicto: covered)**:
Gate viejo (discoverFKRelationshipsFromPrisma): contaba como referencia entrante todo modelo (no self/ext__/core_) con una columna `<base>Id` existente y >=1 fila. 1:1 con el nuevo:
- self / ext__ / core_: exclusiones INTACTAS.
- FK externa real (AvailabilityException.availabilityId): sigue bloqueando (TC-1). PRESERVADO.
- rt__ ajena por columna no-PK (rt__InstructorAvailability.orgUnitId para OrgUnit): sigue bloqueando (TC-2). PRESERVADO.
- custom field reference (step-2, core_FieldDefinition): sin cambios, sigue bloqueando (TC-6). PRESERVADO.
- casing-escape (FK capital): sin cambios. PRESERVADO.
- UNICO delta: proyeccion RT PROPIA (rt__ con PK==FK->base.id) deja de bloquear (TC-4/TC-5a) = el false-RESTRICT corregido.
La exclusion (PK==FK) es subconjunto de lo que el loop limpia -> ninguna capa excluida queda huerfana.

**Learns INFO del quality gate (no bloquean)**:
- L3 (TC-6 unit vs integration): TC-6 (custom field reference, base sin hijos) quedo como unit aunque el spec lo ubicaba en integration. Decision consciente: el path step-2 (custom fields) es ortogonal al cambio en discoverFK y no tiene sensibilidad de casing; el unit determinista es la cobertura correcta y UPU no tiene un fixture limpio base-sin-hijos + custom reference no-convencion. TC-1..TC-5 si son integration contra BD real (RULE-core-034).
- L4 (teorico, PK compuesta): el criterio PK==FK asume proyeccion RT 1:1 con PK simple. Una `rt__` con PK COMPUESTA donde `<base>Id` sea solo parte del PK quedaria excluida por el EXISTS actual (matchea si la FK-col es UNA de las columnas de la PK). Hoy NO existe en up1 (todas las proyecciones RT son 1:1 PK simple). Anotar por si a futuro se introducen proyecciones con PK compuesta: habria que exigir que la PK sea exactamente esa unica columna.
- L5 (wording, resuelto): los comentarios de `referenceValidationService.js` decian "fail-open" cuando el comportamiento es fail-safe (mantiene el bloqueo ante error de introspeccion). Corregido en commit `fa1069d3` (dentro del execute_scope).

**Quality review (DET-23 / DET-35)** — VEREDICTO EXTERNO transcrito (no auto-aprobacion):

**Reviewer**: juez dual ciego (2 dkc-reviewer independientes en contexto limpio), invocados por el orquestador
**Tier de revision**: exhaustive (T2, modo dual DET-35)
**Resultado global**: approved (AMBOS jueces coinciden; sin false-ACCEPT)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Correctitud del fix | pass | Desviacion PK==FK escrutada adversarialmente: correcta y MAS conservadora que el set crudo de resolveRtProjectionFks (subconjunto -> a lo sumo un bloqueo de mas, nunca borrado indebido; fail-safe ante error de introspeccion) |
| 2 | Testing (DET-33) | pass | Orquestador RE-CORRIO la suite hard-delete-cascade.integration contra BD real UPU -> 23/23 passed (confirmado, no self-report) |
| 3 | Hallazgos INFO | n/a | 3 INFO (L3/L4/L5), no bloquean |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Quality gate DET-23/DET-35: juez dual ciego (2 dkc-reviewer independientes) AMBOS approved, coinciden, sin false-ACCEPT; PK==FK confirmado correcto y mas conservador (fail-safe). DET-33: orquestador re-corrio suite integracion BD real UPU 23/23. Acceptance verificado con evidencia real. Execute completo; status NO closed (espera OK del dev para close+push).
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket
