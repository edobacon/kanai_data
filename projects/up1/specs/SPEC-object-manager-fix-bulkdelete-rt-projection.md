---
id: SPEC-object-manager-fix-bulkdelete-rt-projection
project: up1
ticket: TICKET-122
status: in_progress
---

# Fix: el borrado en bloque no debe contar la proyeccion RecordType propia como referencia externa

# Fix: el borrado en bloque no debe contar la proyeccion RecordType propia como referencia externa

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements, Fix scope y Tasks. Si el Executive summary te basta para decidir, ese es el objetivo.*

**Que se quiere**: `deleteBulkInstances` sobre un objeto base con extensiones RecordType (tablas `rt__<Rt>__<base>` unidas por la FK `<base>Id`) hoy se rechaza con `CONSTRAINT_VIOLATION` aunque no haya ninguna referencia externa real: el gate de validacion previa cuenta las capas de proyeccion del propio objeto como si fueran referencias entrantes. El borrado individual (`deleteInstance`) ya borra estos objetos bien; este fix lleva el bulk a paridad con el singular, con una exclusion quirurgica anclada en la introspeccion real de la FK.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Opcion A (exclusion quirurgica en `validateBulkDelete`), NO Opcion B (apuntar el bulk al motor del preview) | A mantiene el cache FK (no degrada el bulk masivo, el caso que disparo el bug), tiene blast radius minimo y solo alinea bulk con el singular ya probado. B degrada performance y cambia la semantica de bloqueo de muchos objetos a la vez |
| 2 | Anclar la exclusion en `resolveRtProjectionFks` (introspeccion de la FK real), NO en un patron de string `rt__` | Un match por string sobre-excluiria una `rt__` de OTRO objeto que legitimamente referencia al base; la introspeccion cubre ademas cualquier casing (minuscula/capitalizada) |
| 3 | Orden tests-first + verificacion contra BD real | `validateBulkDelete` no tiene tests directos y protege bloqueos legitimos; el unit mockeado dio falso verde por casing. La red de seguridad va primero, VERDE sobre codigo actual, antes de tocar nada |

**Riesgos principales y como los mitigamos**:

- **Romper un bloqueo legitimo (FK externa real / custom field reference) sin enterarnos** → tests de la malla de seguridad (TC-1, TC-2) VERDE sobre codigo actual ANTES del fix; el fix se implementa sobre una malla ya verde.
- **Sobre-excluir una `rt__` ajena que referencia legitimamente al base** → la exclusion se ancla en el set exacto de `resolveRtProjectionFks(prisma, model)`, no en un prefijo `rt__`; TC-2 (precision del match) lo verifica.
- **Falso verde de unit mockeado (el bug ya paso una vez asi)** → el guard autoritativo es integracion contra BD real (UPU); el unit directo es complemento, no reemplazo.

**Que NO se hace en este ticket** (limites explicitos del scope):

- **Opcion B' (modulo unico de deteccion compartido preview↔ejecucion)**: cierra la divergencia amplia (polimorficas, version-chain, subarbol) pero es refactor transversal. Follow-up de deuda tecnica, no respuesta a este incidente.
- **Limpieza de las ~31k filas de Continental**: se resuelve aparte con script one-off; no depende de este fix.
- **El frente frontend** (render del bloqueo como aviso): es [[TICKET-130]], hermano de mismo `external` ([[TICKET-123]] fue el predecesor, superseded por UPONE-1600).

**Tamano estimado**: 2 sessions ejecutables (~0.5-1 dia efectivo), tier T2. La mas delicada es la Session 1 (montar la red de seguridad correcta: si un test de la malla sale rojo sobre codigo actual, el diagnostico esta mal y hay que revisar antes de seguir).

**Como vas a saber que funciona**:

- Un `deleteBulkInstances` de un base sin hijos con proyeccion RT y FK minuscula (`availabilityId`), sin referencia externa, borra base + proyeccion con `errors: []` (hoy falla).
- Un base referenciado por un objeto externo real o por un custom field reference SIGUE bloqueando.
- El caso FK capitalizada (`OrgUnitId`) y minuscula (`availabilityId`) se comportan identico.
- El borrado individual del mismo objeto no regresiona.

---

## Purpose

Corregir un false-RESTRICT en el path generico de `deleteBulkInstances` del core `object-manager`: `validateBulkDelete` cuenta la FK de proyeccion `<base>Id` de las tablas `rt__*__<base>` del propio objeto como referencia entrante y bloquea el borrado antes de que el id llegue al loop que ya sabe limpiar esas capas. El fix excluye esas proyecciones propias por introspeccion de la FK real, llevando el bulk a paridad con el singular. Afecta a cualquier objeto base sin hijos declarados que tenga proyeccion RT con FK de convencion minuscula.

## Requirements

### REQ-FIX-01: el bulk de un base con proyeccion RT propia y sin referencia externa borra sin bloqueo

> **Que cambia**: borrar en bloque filas de un objeto base que tiene extensiones RecordType deja de fallar con `CONSTRAINT_VIOLATION` cuando no hay referencia externa real; borra la base y sus capas de proyeccion, igual que ya hace el borrado fila a fila.
> **Por que**: hoy la validacion previa confunde la proyeccion propia del objeto con una referencia externa, bloqueando un borrado legitimo de forma sistematica.

El sistema MUST excluir las proyecciones `rt__<Rt>__<base>` del propio objeto (resueltas por `resolveRtProjectionFks`) del conjunto de referencias entrantes que evalua `validateBulkDelete`, de modo que el borrado en bloque de un base sin referencia externa real elimine base + proyecciones con `errors: []`.

**Actor**: system (motor de borrado)
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: bulk de base sin hijos con proyeccion RT (FK minuscula), sin referencia externa
- **GIVEN** un objeto base sin hijos declarados con proyeccion `rt__*__<base>` cuya FK sigue la convencion minuscula (`availabilityId`) y sin ningun objeto externo que lo referencie
- **WHEN** se ejecuta `deleteBulkInstances({ objectType: <base>, ids })`
- **THEN** borra la base y todas las capas de proyeccion, `errors: []`, sin bloqueo

#### Scenario: paridad de casing
- **GIVEN** dos bases equivalentes, uno con FK de proyeccion minuscula (`availabilityId`) y otro capitalizada (`OrgUnitId`)
- **WHEN** se borran en bloque
- **THEN** ambos borran base + proyeccion, sin diferencia por casing

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ejecutar el borrado en bloque de filas de un objeto base con RecordType y sin referencia externa; la operacion completa sin error de restriccion y no deja capas de proyeccion huerfanas.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-4 | Reproduce el bug | base sin hijos + proyeccion FK minuscula, sin ref externa | `deleteBulkInstances` | borra base + proyeccion | `errors: []` (ROJO hoy, VERDE con fix) |
| TC-5 | Matriz de casing | FK minuscula (`availabilityId`) y capitalizada (`OrgUnitId`) | bulk delete | ambos borran | sin bloqueo en ninguno |

### REQ-REGRESSION-01: los bloqueos legitimos y el borrado individual se preservan

> **Que cambia**: nada visible; lo que hoy debe bloquear (una referencia externa real, un custom field de tipo reference) SIGUE bloqueando, y el borrado individual no cambia.
> **Por que**: `validateBulkDelete` protege casos vivos y no tiene tests directos; la exclusion del fix debe ser quirurgica y no degradar la deteccion real.

El sistema MUST seguir bloqueando el borrado en bloque cuando exista una referencia externa real (FK de otro objeto o custom field `reference`), MUST NO excluir proyecciones `rt__` de OTROS objetos que referencien legitimamente al base, y MUST preservar el comportamiento del borrado individual (`deleteInstance`).

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: FK externa real sigue bloqueando (base sin hijos)
- **GIVEN** un base sin hijos referenciado por un objeto externo real (FK real, no su propia proyeccion)
- **WHEN** se borra en bloque
- **THEN** sigue bloqueando con mensaje de referencia (`CONSTRAINT_VIOLATION`)

#### Scenario: precision del match (no sobre-excluir)
- **GIVEN** un base con proyeccion propia MAS un tercer objeto que es `rt__` de OTRA cosa y referencia legitimamente al base
- **WHEN** se borra el base en bloque
- **THEN** excluye SU proyeccion pero sigue bloqueando por la `rt__` ajena

#### Scenario: custom field de tipo reference sigue bloqueando
- **GIVEN** un base sin hijos referenciado por un custom field `core_FieldDefinition` con `fieldType='reference'` (no una FK de convencion ni su propia proyeccion)
- **WHEN** se borra el base en bloque
- **THEN** sigue bloqueando por la referencia del custom field (la exclusion de proyeccion propia NO afecta la deteccion de custom fields)

#### Scenario: single no regresiona
- **GIVEN** el mismo fixture del scenario de REQ-FIX-01
- **WHEN** se borra por `deleteInstance` (singular)
- **THEN** sigue borrando (ya funciona hoy)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intentar borrar en bloque un objeto realmente referenciado por otro; la operacion sigue bloqueada con el mensaje de referencia.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-1 | Bloqueo por FK externa real | base sin hijos referenciado por objeto externo | bulk delete | bloquea | `CONSTRAINT_VIOLATION` (VERDE sobre codigo actual) |
| TC-2 | Precision del match | base + proyeccion propia + `rt__` ajena que lo referencia | bulk delete del base | excluye propia, bloquea por ajena | bloqueo por la ajena |
| TC-3 | Single sin regresion | fixture de REQ-FIX-01 | `deleteInstance` | borra | sin bloqueo (VERDE sobre codigo actual) |
| TC-6 | Bloqueo por custom field reference | base sin hijos referenciado por custom field `core_FieldDefinition` `fieldType='reference'` | bulk delete | bloquea | `CONSTRAINT_VIOLATION` (VERDE sobre codigo actual y tras el fix) |

## Fix scope

### Antes (comportamiento actual)
`validateBulkDelete` → `findReferencingObjects` → `discoverFKRelationshipsFromPrisma` escanea todo modelo Prisma con un campo `<base>Id` y cuenta las tablas de proyeccion `rt__*__<base>` del propio objeto como referencias externas. Manda los ids a `blockedResults` con `CONSTRAINT_VIOLATION`. El id nunca llega al loop de borrado (`instance.resolver.js:6049`) que limpia las proyecciones y luego la base.

### Despues (comportamiento esperado)
`discoverFKRelationshipsFromPrisma` excluye las proyecciones `rt__*__<base>` del propio objeto (set exacto de `resolveRtProjectionFks(prisma, selfModel)`), junto a las exclusiones ya existentes (`self`, `ext__`, `core_`). El id llega a `deletableIds`, el loop limpia proyeccion + base, `errors: []`. Bulk queda a paridad con single. Toda otra deteccion (FK externa real, custom field reference) intacta.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `object-manager/src/services/referenceValidationService.js` | En `discoverFKRelationshipsFromPrisma` (linea 75-89): agregar exclusion de las proyecciones RT propias resueltas por `resolveRtProjectionFks` | Path generico de `deleteBulkInstances` para todo base con proyeccion RT; no toca la deteccion de referencias externas reales |
| `object-manager/tests/integration/hard-delete-cascade.integration.test.js` | Agregar TC-1..TC-5 (malla de seguridad + reproduce + matriz de casing) | Cobertura del path `validateBulkDelete` para objetos sin hijos, hoy inexistente |
| `object-manager/tests/` (unit) | Unit directo de `discoverFKRelationshipsFromPrisma` / `findReferencingObjects` | Guarda la funcion exacta que se toca (complemento barato) |
| `object-manager/docs/features/delete-cascade.md` | Documentar que `validateBulkDelete` excluye las proyecciones RT propias y que bulk queda a paridad con single | Doc oficial del comportamiento observable |

## Tasks

### Session 1 — Red de seguridad + RED del bug (tests-first) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Escribir la malla de seguridad y correrla VERDE sobre el codigo ACTUAL (sin tocar codigo): TC-1 (bloqueo por FK externa real en base sin hijos), TC-2 (precision del match: no sobre-excluir `rt__` ajena), TC-3 (single sin regresion), TC-6 (bloqueo por custom field `reference`) | REQ-REGRESSION-01 | developer | — | object-manager/tests/integration/hard-delete-cascade.integration.test.js | Los 4 tests VERDE contra codigo actual (si alguno sale rojo: el diagnostico esta mal, revisar antes de seguir) | git revert | DET-7, DET-33, DET-40 | done | 1 |
| S1.T2 | Escribir el test que reproduce el bug (RED): TC-4 (bulk base sin hijos + proyeccion FK minuscula `availabilityId`, sin ref externa) y TC-5 caso minuscula de la matriz de casing. Debe salir ROJO contra el codigo actual (evidencia reproducible del bug) | REQ-FIX-01 | developer | S1.T1 | object-manager/tests/integration/hard-delete-cascade.integration.test.js | TC-4/TC-5(min) ROJO reproducible contra codigo actual | git revert | DET-7, DET-13 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket con Template de Gate, confirmar malla VERDE + RED reproducible, decidir continue/iterate | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Implementar Opcion A + cerrar [tipo: auto] [tier: T2]

parallel_groups: [[S2.T2, S2.T4]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Implementar Opcion A: exclusion quirurgica de las proyecciones RT propias en `discoverFKRelationshipsFromPrisma`, anclada en el set exacto de `resolveRtProjectionFks(prisma, selfModel)` (introspeccion de la FK real, casing-agnostico). NO usar patron de string `rt__` | REQ-FIX-01 | developer | S1.GATE | object-manager/src/services/referenceValidationService.js | TC-4 y TC-5(min) pasan a VERDE; la malla (TC-1/2/3) sigue VERDE | git revert | DET-5, DET-8, DET-11, DET-40 | done | 2 |
| S2.T2 | Unit directo de `discoverFKRelationshipsFromPrisma` / `findReferencingObjects`: afirmar que excluye `rt__*__<target>` propias, `ext__`, `core_`, self, y PRESERVA FK externas reales + custom fields reference | REQ-REGRESSION-01 | developer | S2.T1 | object-manager/tests/ (unit) | unit nuevo VERDE | git revert | DET-7, DET-4 | done | 2 |
| S2.T3 | Correr la suite completa `hard-delete-cascade.integration.test.js` contra BD real (tenant UPU) y verificar independientemente (DET-33) que el fix no dejo ningun test previo rojo ni capas huerfanas. Evidencia runtime real (no unit mockeado) | REQ-FIX-01, REQ-REGRESSION-01 | reviewer | S2.T1 | object-manager/tests/integration/ | suite completa VERDE contra BD real; sin regresion | git revert | DET-7, DET-13, DET-14, DET-33 | done | 2 |
| S2.T4 | (a) Actualizar la doc oficial del repo up1: en `delete-cascade.md` documentar que `validateBulkDelete` excluye las proyecciones RT propias y que el bulk queda a paridad con el single (DET-37 dim1). (b) Marcar el BUG resuelto en el KB (DET-37 dim2): es una accion de records en el repo deckard, por eso NO figura en la columna Files (que gobierna solo el codigo up1 bajo RULE-dev-004), pero S2.T4 es su dueño operativo | REQ-FIX-01 | developer | S2.T1 | object-manager/docs/features/delete-cascade.md | (a) doc refleja el comportamiento nuevo; (b) BUG marcado resuelto en kb/sp8 (repo deckard); lint frontmatter/cross-ref | git revert | DET-16, DET-37 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir en `## Sessions`, quality review (DET-23), verificar acceptance checkpoints con evidencia real, confirmar que el commit final NO incluye artefactos de sync y que los commits llevan el id `UPONE-1557` (DET-19/DET-27), decidir continue/iterate | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + acceptance verificado con evidencia + sin artefactos de sync + id de commit correcto | (no aplica) | DET-13, DET-19, DET-20, DET-23, DET-27, DET-33 | done | 2 |

## Constraints

- DET-40 (auditoria de reemplazo): al reenrutar el criterio de exclusion, enumerar 1:1 que hacia el gate viejo (que bloqueaba, que dejaba pasar) y verificar que el nuevo lo replica salvo el false-RESTRICT que corrige.
- RULE-dev-004 (core work policy): `layer: core`, todo el trabajo va en una rama unica `UPONE-1557` (o la de la epica); merge a develop gated por revision del team up1. El cierre DKC no implica merge.
- RULE-dev (up1): SQL de Postgres con tablas PascalCase entre comillas dobles; nunca referenciar DMMF en clientes Prisma tenant-scoped — usar introspeccion / `resolveRtProjectionFks`.
- **execute_scope refinado (design)**: durante el design se refino el `execute_scope` del ticket para incluir `object-manager/tests/` (habilita el unit directo complemento de la seccion 8.3 del KB, ademas de `tests/integration/`) y `object-manager/docs/features/delete-cascade.md` (DET-37 dim1: la doc oficial es MUST porque el cambio es observable). Ambos son archivos del repo up1 gobernados por el branch guard (RULE-dev-004). No introduce codigo de negocio nuevo fuera del fix; queda ratificado con el `spec-approval` del dev.
- **KB DKC fuera del execute_scope (por diseño)**: marcar el BUG como resuelto (DET-37 dim2) toca `projects/up1/kb/sp8/BUG-*.md` en el repo **deckard**, que NO es codigo de up1 y por tanto NO esta —ni debe estar— en el `execute_scope` (que gobierna la rama de codigo up1, RULE-dev-004). Ese bookkeeping se hace por el flujo de records de DKC en el close, no en el commit de codigo. No es una expansion del scope de codigo.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Tenant real UPU (BD real) | internal | El guard depende de introspeccion Prisma + casing real de columnas | Sin BD real, el unit mockeado da falso verde (el bug ya paso asi) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El fix rompe un bloqueo legitimo (FK externa real / custom field) | medium | borrado indebido de datos referenciados | TC-1/TC-2 VERDE sobre codigo actual ANTES del fix; fix sobre malla verde |
| Sobre-exclusion de una `rt__` ajena que referencia al base | medium | borrado indebido | anclar en `resolveRtProjectionFks` (introspeccion), no en string `rt__`; TC-2 lo verifica |
| Falso verde de unit mockeado | high | el bug reaparece silencioso | guard autoritativo = integracion contra BD real (DET-33); unit solo complementa |

## Open questions

- (ninguna — H1 y H2 confirmadas en el intake)

## Decisions

### DEC-LOCAL-01: Opcion A (exclusion quirurgica) sobre Opcion B (swap al motor del preview)
- **Contexto**: el bulk y el preview usan dos motores de deteccion distintos; el preview excluye bien la proyeccion propia, el bulk no
- **Drivers**: escalabilidad (cache FK del bulk), blast radius, riesgo de regresion, evidencia de correctitud (el single ya funciona), reversibilidad
- **Opcion elegida**: A — excluir la proyeccion propia en `validateBulkDelete`, anclada en `resolveRtProjectionFks`
- **Alternativas**: B (apuntar el bulk al motor del preview) — descartada por regresion de performance en bulk masivo y cambio de semantica de bloqueo; B' (modulo unico compartido) — follow-up de deuda tecnica
- **Consecuencias**: cierra el incidente con cambio minimo y reversible; deja latente la divergencia amplia preview↔ejecucion (anotada como B')
- **Session**: intake (confirmada en design)

## Technical reference

- Bug (fuente de verdad): `projects/up1/kb/sp8/BUG-core-bulkdelete-rt-projection-false-restrict.md`
- `referenceValidationService.js`: `discoverFKRelationshipsFromPrisma` (62; exclusion incompleta 75-89 — punto del fix), `validateBulkDelete` (297), `parseDeleteError` (383)
- `instance.resolver.js`: `resolveRtProjectionFks` (44 — fuente de verdad de la exclusion), `deleteBulkInstances` (5814; `validateBulkDelete` en 5974; limpieza de proyeccion en 6049), `deleteInstance` (4126; limpieza en 4280 — path singular que ya funciona)
- `deleteImpactPlan.js`: motor del preview (`findIncomingReferences` 709; nota de diseño de la divergencia 706-707)
- Test con falso verde por casing: `hard-delete-cascade.integration.test.js:740` (OrgUnit, FK `OrgUnitId` capitalizada)
- Fixtures: `mods/uengagement-up1/objects/Availability.json` (base sin hijos), `.../RecordTypes/rt__StudentAvailability__Availability.json` (FK `availabilityId` minuscula)

## Acceptance checkpoints

- [ ] **Funcional**: TC-4/TC-5 pasan (bulk borra base + proyeccion sin bloqueo, ambos casings)
- [ ] **Tests** (DET-37 dim4): malla (TC-1/2/3/6) + reproduce (TC-4/5) + unit directo, corridos y en VERDE contra BD real
- [ ] **Rules**: exclusion anclada en introspeccion (no string `rt__`); DET-40 auditoria de reemplazo cubierta
- [ ] **Integration**: FK externa real y custom field reference siguen bloqueando; single sin regresion
- [ ] **Sin artefactos de sync commiteados**: el fix no toca objects/JSON ni corre codegen/sync (N/A por naturaleza), pero el S2.GATE verifica que el commit final no incluya artefactos de sync (guard contra un sync corrido por error al validar)
- [ ] **Commits/PR con id `UPONE-1557`** (DET-19/DET-27): rama unica de la epica, prefijo del id externo en cada commit
- [ ] **Docs oficiales** (DET-37 dim1): `delete-cascade.md` actualizado
- [ ] **KB DKC** (DET-37 dim2): BUG marcado resuelto (housekeeping deckard, en el close)
- [ ] **Planning-completeness**: entry registrada

## Archiving

Usar `/dkc-archive-spec` cuando deje de ser fuente de verdad. No borrar manualmente.
