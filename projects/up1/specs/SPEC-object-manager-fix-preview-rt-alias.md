---
id: SPEC-object-manager-fix-preview-rt-alias
project: up1
ticket: TICKET-129
status: in_progress
---

# Fix: los previews de impacto de borrado deben resolver el alias RecordType al objeto base

# Fix: los previews de impacto de borrado deben resolver el alias RecordType al objeto base

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements, Fix scope y Tasks. Si el Executive summary te basta para decidir, ese es el objetivo.*

**Que se quiere**: `deleteImpactPreview` y `softDeleteImpactPreview` revientan con `PrismaClientValidationError` cuando reciben un alias de RecordType (`rt__<Rt>__<base>`): consultan la tabla de proyeccion por `id`, columna que no existe (su PK es la FK `<base>Id`). El borrado real (`deleteBulkInstances`) ya resuelve el alias al objeto base (entro con UPONE-1479), pero los dos previews nunca recibieron esa resolucion. Este fix los lleva a paridad: resolver el alias al objeto base antes de invocar el motor de impacto, reutilizando —extraida a un helper compartido— la misma resolucion que ya hace el borrado.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Extraer la resolucion alias->base a un helper compartido `resolveRecordTypeToBaseObject` y migrar **los cuatro call-sites** a el (2 previews — nuevo — + `deleteBulkInstances:6004` + `deleteInstance:4303`, que hoy duplican el bloque inline), en vez de duplicar el bloque en cada preview | Una sola fuente de verdad real para la resolucion: hoy el mismo bloque esta duplicado inline en `deleteBulkInstances` y en `deleteInstance` (verificado contra codigo). Extraer sin migrar ambos delete-paths no consolida, solo mueve una copia. La contraparte es tocar (por refactor) los dos paths de borrado ya probados, cubiertos por su suite de integracion existente (DET-40 auditoria de reemplazo, incluida la preservacion del guard extra de existencia de modelo de `deleteInstance:4315-4318`) |
| 2 | Anclar la resolucion en `parseRecordTypeFileName` + introspeccion `core_ObjectDefinition` (case-insensitive), NO en un patron de string `rt__` | El casing del base no es derivable del nombre; un match por string es fragil y contradice RULE-core-035/043. Se replica exactamente el mecanismo del path de borrado |
| 3 | Verificacion contra BD real (tenant UPU), no unit con Prisma mockeado | Los previews hoy no tienen ningun test; la resolucion depende de introspeccion + casing real de columnas. Un unit mockeado da falso verde (RULE-core-034 / RULE-dev-test-real-shape-not-mocked) |

**Riesgos principales y como los mitigamos**:

- **Que el refactor de los dos delete-paths (`deleteBulkInstances` y `deleteInstance`) altere el borrado real** → DET-40 auditoria de reemplazo: enumerar 1:1 lo que hacia cada bloque inline (incluido el guard extra de existencia de modelo de `deleteInstance:4315-4318`, que NO absorbe el helper — queda en el call-site) y verificar que el helper lo replica; las suites `hard-delete-cascade.integration.test.js` y `scenario-delete-cascade.integration.test.js` corren VERDE antes y despues, y TC-7 fija el guard especifico de `deleteInstance`.
- **Falso verde de unit mockeado (los previews no tienen cobertura hoy)** → el guard autoritativo es integracion contra BD real (tenant UPU); se reproduce el crash en ROJO antes del fix.
- **Sobre-resolver un objeto que no es alias** → `parseRecordTypeFileName` devuelve `null` para nombres que no matchean `rt__(.+)__(.+)`; el helper es no-op para objetos base (TC-5 lo verifica sin regresion).

**Que NO se hace en este ticket** (limites explicitos del scope):

- **Unificar la deteccion de referencias del preview y la de la ejecucion** (divergencia semantica preview-vs-ejecucion): es la deuda mayor ya flagueada como follow-up de UPONE-1557, no este crash por alias.
- **Cambiar la logica interna del motor de impacto** (`buildDeleteImpactPlan` / `buildSoftDeleteImpactPreview`): no se toca; solo se resuelve el `objectType` antes de invocarlo.
- **El frente frontend**: `RecordList.vue` ya degrada best-effort; no requiere cambio.

**Tamano estimado**: 1 session ejecutable (~2-3h, ~2 SP), tier T2, gate ⚑ fuerte (revision core antes de merge). La parte mas delicada es el refactor de `deleteBulkInstances` para consumir el helper sin alterar el borrado real (auditoria DET-40).

**Como vas a saber que funciona**:

- Un `deleteImpactPreview` sobre `rt__Scheme__levelscheme` (tenant UPU) devuelve un plan valido (status, totalCount, byRecordType) sin excepcion de Prisma (hoy revienta).
- `softDeleteImpactPreview` sobre el mismo alias, idem.
- El conteo devuelto por el alias coincide con el del objeto base equivalente (mismos ids).
- Un alias con una referencia entrante viva devuelve `status: "restricted"`, no un error.
- Un objeto base sin RecordType se comporta igual que hoy, y las suites de borrado real no regresionan.
- El guard especifico de `deleteInstance` para alias RT que resuelve a un base sin modelo Prisma sigue devolviendo un error claro con el alias original.

---

## Purpose

Corregir un crash sistematico en los dos previews de impacto de borrado del core `object-manager`: `deleteImpactPreview` (`instance.resolver.js:1467`) y `softDeleteImpactPreview` (`:1506`) pasan el `objectType` crudo al motor de impacto; cuando el tipo es un alias de RecordType (`rt__<Rt>__<base>`), el motor consulta la tabla de proyeccion por `id` —que no existe, su PK es la FK `<base>Id`— y Prisma lanza `PrismaClientValidationError`. El fix resuelve el alias al objeto base antes de invocar el motor, a paridad con `deleteBulkInstances` (`:6004`, UPONE-1479), extrayendo la resolucion a un helper compartido. Afecta a cualquier objeto con RecordTypes cuyo listado use `deleteWarning: { type: "critical" }`.

## Requirements

### REQ-FIX-01: los dos previews resuelven el alias RecordType al objeto base y devuelven un plan valido

> **Que cambia**: abrir el modal de borrado sobre un catalogo gobernado por RecordType deja de reventar en el backend; el preview devuelve el conteo real y las referencias que lo bloquean, mirando el objeto base.
> **Por que**: hoy el preview consulta la tabla de proyeccion por `id` (inexistente) y Prisma lanza; se pierde la barrera de aviso y queda ruido de error en el log.

El sistema MUST resolver el alias de RecordType (`rt__<Rt>__<base>`) al nombre canonico del objeto base ANTES de invocar `buildDeleteImpactPlan` (en `deleteImpactPreview`) y `buildSoftDeleteImpactPreview` (en `softDeleteImpactPreview`), de modo que ambos previews devuelvan un plan valido (`status`, `totalCount`, `byRecordType`, `restrictions`) sin excepcion de Prisma. La resolucion MUST anclarse en `parseRecordTypeFileName` + introspeccion case-insensitive sobre `core_ObjectDefinition` (no en un patron de string `rt__`), y el conteo devuelto para el alias MUST coincidir con el del objeto base equivalente (mismos ids). Un alias con una referencia entrante viva MUST devolver `status: "restricted"`, no un error.

**Actor**: system (motor de impacto de borrado)
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: preview de hard-delete sobre alias RT sin referencia externa
- **GIVEN** un objeto base con proyeccion RecordType listado por el alias (`rt__Scheme__levelscheme` sobre `LevelScheme`, tenant UPU) y sin referencia entrante viva
- **WHEN** se invoca `deleteImpactPreview({ objectType: 'rt__Scheme__levelscheme', ids })`
- **THEN** devuelve un plan valido (`status`, `totalCount`, `byRecordType`) sin `PrismaClientValidationError`

#### Scenario: preview de soft-delete sobre alias RT
- **GIVEN** el mismo objeto base con proyeccion RecordType
- **WHEN** se invoca `softDeleteImpactPreview({ objectType: 'rt__Scheme__levelscheme', ids })`
- **THEN** devuelve un plan valido sin excepcion

#### Scenario: paridad de conteo alias vs base
- **GIVEN** los mismos ids listados por el alias y por el objeto base
- **WHEN** se corre el preview por el alias y por el base
- **THEN** el conteo (`totalCount` / `byRecordType`) es identico

#### Scenario: alias con referencia entrante viva -> restricted
- **GIVEN** un alias RT cuyos registros tienen una referencia entrante viva que bloquearia el borrado
- **WHEN** se corre `deleteImpactPreview` por el alias
- **THEN** devuelve `status: "restricted"` con las restricciones pobladas, no una excepcion

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abrir el modal de borrado critico sobre un listado gobernado por RecordType; el modal carga el conteo real de afectados y el log del object-manager no muestra `PrismaClientValidationError`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-1 | Reproduce hard-delete | alias RT sin ref externa | `deleteImpactPreview` | plan valido | sin excepcion (ROJO hoy, VERDE con fix) |
| TC-2 | Reproduce soft-delete | alias RT | `softDeleteImpactPreview` | plan valido | sin excepcion (ROJO hoy, VERDE con fix) |
| TC-3 | Paridad de conteo | mismos ids por alias y por base | preview por ambos | conteos iguales | igualdad exacta |
| TC-4 | Restrict | alias con referencia entrante viva | `deleteImpactPreview` | `status: "restricted"` | sin error |

### REQ-REGRESSION-01: objetos base y el borrado real se preservan

> **Que cambia**: nada visible; un objeto base sin RecordType sigue dando el mismo preview que hoy, y el borrado en bloque (`deleteBulkInstances`) no cambia de comportamiento tras extraer la resolucion a un helper compartido.
> **Por que**: la resolucion se extrae de `deleteBulkInstances` a un helper que ese mismo path pasa a consumir; el refactor debe ser zero-behavior-change en el borrado real.

El sistema MUST preservar el comportamiento del preview para objetos base sin RecordType (el helper es no-op cuando `parseRecordTypeFileName` devuelve `null`), y MUST preservar el comportamiento de los dos paths de borrado real (`deleteBulkInstances` y `deleteInstance`) tras refactorizarlos para consumir `resolveRecordTypeToBaseObject` (misma resolucion alias->base que hoy, misma emision de eventos con el `objectType` original — UPONE-1479, y en `deleteInstance` el guard de existencia de modelo conservado en el call-site).

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: objeto base sin RecordType (no-op del helper)
- **GIVEN** un objeto base sin proyeccion RecordType
- **WHEN** se corre `deleteImpactPreview` / `softDeleteImpactPreview` por su nombre base
- **THEN** el preview es identico al de hoy (el helper no altera el `objectType`)

#### Scenario: borrado real (bulk y singular) no regresiona tras el refactor
- **GIVEN** la suite `hard-delete-cascade.integration.test.js` existente (cubre `deleteBulkInstances` y `deleteInstance`)
- **WHEN** se corre contra BD real tras migrar ambos delete-paths al helper compartido
- **THEN** toda la suite pasa VERDE, sin cambios de comportamiento; `deleteInstance` conserva su guard de existencia de modelo (DET-40)

#### Scenario: guard de `deleteInstance` para alias RT con base sin modelo Prisma
- **GIVEN** un alias RT parseable cuyo `baseObjectLower` resuelve via `core_ObjectDefinition` a un nombre base que no existe en el cliente Prisma recibido
- **WHEN** se invoca `deleteInstance` por el alias
- **THEN** lanza `Object type <alias-original> not found`, preservando el error claro del call-site y sin delegar esa validacion al helper

</details>

#### Acceptance
**El usuario puede verificar que funciona**: borrar en bloque un objeto con RecordType por el path real sigue funcionando igual que antes del fix.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-5 | No regresion base sin RT | objeto base sin proyeccion RT | preview por nombre base | preview igual que hoy | sin cambio |
| TC-6 | Borrado real sin regresion | suite `hard-delete-cascade` | correr contra BD real tras refactor | suite VERDE | sin regresion (DET-40) |
| TC-7 | Guard deleteInstance | alias RT parseable con base sin modelo Prisma | `deleteInstance` | error claro con alias original | `Object type <alias-original> not found` |

## Fix scope

### Antes (comportamiento actual)
`deleteImpactPreview` (`instance.resolver.js:1467`) y `softDeleteImpactPreview` (`:1506`) pasan el `objectType` crudo a `buildDeleteImpactPlan` / `buildSoftDeleteImpactPreview`. El motor deriva el modelo bajando la primera letra y consulta `findMany({ where: { id: { in: [...] } } })`. Sobre un alias `rt__<Rt>__<base>` (tabla sin columna `id`, PK = FK `<base>Id`) Prisma lanza `PrismaClientValidationError` (`Unknown argument id`). El modal abre sin conteo; queda ruido de error en el log del OM en cada apertura. Los dos paths de borrado real NO tienen el problema porque resuelven el alias inline antes del motor: `deleteBulkInstances` (`:6004-6014`) y `deleteInstance` (`:4303-4319`, con un guard extra de existencia de modelo en `:4315-4318`). Ese bloque de resolucion esta hoy **duplicado** en ambos paths.

### Despues (comportamiento esperado)
Los dos previews resuelven el alias al objeto base (via `resolveRecordTypeToBaseObject`) antes de invocar el motor; el motor recibe el nombre base y devuelve un plan valido. Los dos paths de borrado (`deleteBulkInstances:6004` y `deleteInstance:4303`) se refactorizan para consumir el mismo helper, reemplazando sus bloques inline por la llamada — asi el helper es la **unica** implementacion de la resolucion (4 call-sites). `deleteInstance` conserva en su call-site el guard extra de existencia de modelo (el helper solo resuelve el nombre, no valida el modelo). Preview queda a paridad con el borrado real; el motor de impacto no cambia su logica interna.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `object-manager/src/graphql/resolvers/helpers/resolveRecordTypeToBaseObject.js` | NUEVO helper: `resolveRecordTypeToBaseObject({ prisma, objectType })` → si `parseRecordTypeFileName` matchea, resuelve `baseObjectLower` al casing canonico via `core_ObjectDefinition.findFirst` (case-insensitive) y devuelve el nombre base; si no, devuelve el `objectType` original | Fuente unica de la resolucion alias->base, consumida por los 2 previews + el borrado real |
| `object-manager/src/graphql/resolvers/instance.resolver.js` | (a) `deleteImpactPreview` (:1467) y `softDeleteImpactPreview` (:1506): resolver `objectType` con el helper antes de invocar el motor. (b) `deleteBulkInstances` (:6004) y `deleteInstance` (:4303): reemplazar el bloque inline por la llamada al helper (refactor zero-behavior-change); `deleteInstance` conserva su guard de existencia de modelo (:4315-4318) en el call-site | Los 2 entrypoints de preview + los 2 paths de borrado real; el motor no cambia |
| `object-manager/tests/integration/delete-impact-preview-rt-alias.integration.test.js` | NUEVO: TC-1..TC-5 (reproduce hard/soft, paridad, restrict, no-regresion) contra BD real | Cobertura de los previews, hoy inexistente |
| `object-manager/tests/unit/resolvers/instance.resolver.test.js` | Agregar TC-7: guard de `deleteInstance` para alias RT parseable que resuelve a base sin modelo Prisma | Cobertura puntual del guard que el refactor debe preservar |
| `object-manager/docs/features/delete-cascade.md` | Documentar que los previews resuelven el alias RT al base a paridad con el borrado | Doc oficial del comportamiento observable |
| `object-manager/docs/features/record-types.md` | Nota: los entrypoints de borrado/preview resuelven el alias RT al objeto base antes de aplicar la politica | Doc oficial |

## Tasks

### Session 1 — Reproduce (RED) -> helper + previews (GREEN) -> verify + doc [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S1.T3, S1.T4]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Escribir los tests de integracion que reproducen el crash (RED) contra el codigo ACTUAL: TC-1 (`deleteImpactPreview` sobre `rt__Scheme__levelscheme` sin ref externa) y TC-2 (`softDeleteImpactPreview` sobre el mismo alias). Ambos ROJO reproducible (`PrismaClientValidationError`) contra codigo actual, tenant UPU | REQ-FIX-01 | developer | — | object-manager/tests/integration/delete-impact-preview-rt-alias.integration.test.js | TC-1/TC-2 ROJO reproducible contra codigo actual (BD real); si salen verde el diagnostico esta mal, revisar | git revert | DET-5, DET-7, RULE-core-034 | done | 1 |
| S1.T2 | Crear el helper `resolveRecordTypeToBaseObject({ prisma, objectType })` (parseRecordTypeFileName + introspeccion `core_ObjectDefinition` case-insensitive, no string-munging); aplicarlo en `deleteImpactPreview` y `softDeleteImpactPreview` antes de invocar el motor; refactorizar los dos delete-paths que hoy duplican el bloque inline —`deleteBulkInstances` (:6004) y `deleteInstance` (:4303)— para consumirlo, preservando en el call-site de `deleteInstance` su guard de existencia de modelo (:4315-4318). DET-40: auditar 1:1 que el helper replica cada bloque inline | REQ-FIX-01, REQ-REGRESSION-01 | developer | S1.T1 | object-manager/src/graphql/resolvers/helpers/resolveRecordTypeToBaseObject.js, object-manager/src/graphql/resolvers/instance.resolver.js | TC-1/TC-2 pasan a VERDE contra BD real | git revert | DET-5, DET-8, DET-40, RULE-core-043, RULE-core-035 | done | 1 |
| S1.T3 | Completar cobertura: TC-3 (paridad conteo alias==base con los mismos ids), TC-4 (alias con referencia entrante viva -> `status: "restricted"`, no error), TC-5 (base sin RT, preview no-op sin regresion), TC-7 (guard de `deleteInstance`: alias RT parseable que resuelve a base sin modelo Prisma -> `Object type <alias-original> not found`). Correr la suite nueva + `hard-delete-cascade.integration.test.js` + `scenario-delete-cascade.integration.test.js` completa contra BD real (tenant UPU) y verificar independientemente (DET-33) que no hay regresion | REQ-FIX-01, REQ-REGRESSION-01 | reviewer | S1.T2 | object-manager/tests/integration/delete-impact-preview-rt-alias.integration.test.js, object-manager/tests/unit/resolvers/instance.resolver.test.js | TC-3/4/5/7 VERDE + suites `hard-delete-cascade` y `scenario-delete-cascade` VERDE contra BD real, evidencia runtime real | git revert | DET-7, DET-13, DET-33, DET-40, RULE-dev-test-real-shape-not-mocked | done | 1 |
| S1.T4 | Actualizar la doc oficial del repo up1 (DET-37 dim1): en `delete-cascade.md` y `record-types.md` documentar que los previews resuelven el alias RT al objeto base a paridad con el borrado | REQ-FIX-01 | developer | S1.T2 | object-manager/docs/features/delete-cascade.md, object-manager/docs/features/record-types.md | doc refleja el comportamiento nuevo; sin refs a ids internos DKC | git revert | DET-16, DET-37 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions` del ticket con Template de Gate; quality review (DET-23); verificar acceptance checkpoints con evidencia runtime real; confirmar que el commit no incluye artefactos de sync y que los commits llevan el id `UPONE-1608` (DET-19/DET-27); decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + acceptance verificado con evidencia real + sin artefactos de sync + id de commit correcto | (no aplica) | DET-13, DET-19, DET-20, DET-23, DET-27, DET-33 | done | 1 |

## Constraints

- RULE-core-043 (must): el nombre de un RecordType es un alias de presentacion — resolver a base antes de aplicar la politica de borrado. Es la regla que gobierna el fix (nacio de UPONE-1479, el path que este ticket lleva a paridad).
- RULE-core-035 (must): resolver el nombre del objeto/modelo de proyecciones RT por introspeccion case-insensitive, nunca por transformacion de string. El helper usa `core_ObjectDefinition.findFirst({ mode: 'insensitive' })`, no `startsWith('rt__')`.
- RULE-core-034 (must): codigo destructivo/persistencia con proyecciones RT requiere integration tests contra BD real; el Prisma mockeado no es evidencia. Los previews hoy no tienen cobertura — el guard autoritativo es integracion contra tenant UPU.
- DET-40 (auditoria de reemplazo): refactorizar `deleteBulkInstances` (:6004) y `deleteInstance` (:4303) para consumir el helper reenruta dos code paths — enumerar 1:1 lo que hacia cada bloque inline (parse, introspeccion del casing, reasignacion, no-op si null, y en `deleteInstance` el guard de existencia de modelo :4315-4318 que el helper NO absorbe) y verificar que el helper + call-site lo replica, antes de dar el refactor por hecho. Las suites `hard-delete-cascade` y `scenario-delete-cascade` existentes respaldan los paths reales (TC-6), y TC-7 fija el guard especifico de `deleteInstance`.
- RULE-dev-004 (core work policy): `layer: core`, todo el trabajo va en una rama (`UPONE-1608` o la de la epica UPONE-1267); merge a develop gated por revision del team up1. El cierre DKC no implica merge.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Tenant real UPU (BD real) con mod `curriculum-mapping` | internal | La resolucion depende de introspeccion `core_ObjectDefinition` + casing real de columnas de la proyeccion | Sin BD real, el unit mockeado da falso verde (los previews no tienen cobertura hoy) |
| `parseRecordTypeFileName` (`services/fileParsing.js:173`) | internal | Primitiva que ancla la deteccion del alias | Estable; ya la usa `deleteBulkInstances` |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El refactor de `deleteBulkInstances` o `deleteInstance` altera el borrado real | medium | borrado en bloque/singular roto | DET-40 auditoria 1:1 + suites `hard-delete-cascade` y `scenario-delete-cascade` VERDE antes y despues (TC-6); TC-7 fija el guard especifico de `deleteInstance`; el helper replica el bloque exacto |
| Falso verde de unit mockeado (previews sin cobertura) | high | el crash reaparece silencioso | guard autoritativo = integracion contra BD real (DET-33); crash reproducido en ROJO antes del fix |
| Sobre-resolver un objeto que no es alias | low | preview de un base cambia de comportamiento | `parseRecordTypeFileName` devuelve `null` para no-alias; helper no-op; TC-5 lo verifica |

## Open questions

- (ninguna — H1 y H2 confirmadas en el intake, verificadas multi-capa contra codigo en develop)

## Decisions

### DEC-LOCAL-01: extraer la resolucion a un helper compartido y migrar los cuatro call-sites vs duplicar el bloque inline en cada preview
- **Contexto**: la resolucion alias->base existe hoy inline y **duplicada** en dos paths de borrado (`deleteBulkInstances:6004` y `deleteInstance:4303`, este ultimo con un guard extra de existencia de modelo); los dos previews la necesitan y hoy no la tienen
- **Drivers**: una sola fuente de verdad REAL (evitar drift entre los 4 call-sites), mantenibilidad, blast radius del refactor, el warning explicito del intake
- **Opcion elegida**: extraer a `resolveRecordTypeToBaseObject` y hacer que los 4 call-sites (2 previews — nuevo — + los 2 delete-paths) lo consuman. `deleteInstance` conserva su guard en el call-site (el helper solo resuelve el nombre)
- **Alternativas**: (a) duplicar el bloque inline en cada preview — descartada: drift garantizado, contradice el warning del intake y RULE-core-043. (b) migrar solo `deleteBulkInstances` y dejar `deleteInstance` inline — descartada: NO consolida (helper + 1 copia inline = mismas 2 implementaciones que hoy); la claim "una sola fuente de verdad" seria inexacta (hallazgo del juez B, iteracion 1)
- **Consecuencias**: gana consistencia y una unica implementacion testeable de la resolucion; a cambio toca (por refactor) los dos paths de borrado real, mitigado con DET-40 + la suite de integracion existente que cubre singular y bulk
- **Session**: design (refinada en la iteracion 1 del spec-judge)

## Technical reference

- `instance.resolver.js`: `deleteImpactPreview` (1467; invoca `buildDeleteImpactPlan` en 1480), `softDeleteImpactPreview` (1506; invoca `buildSoftDeleteImpactPreview` en 1512), `deleteBulkInstances` (bloque de resolucion inline 6004-6014 — fuente del helper), `deleteInstance` (bloque inline duplicado 4303-4319, con guard de existencia de modelo 4315-4318)
- `helpers/deleteImpactPlan.js`: `buildDeleteImpactPlan`, `buildSoftDeleteImpactPreview` (motor de impacto — no se toca)
- `services/fileParsing.js:173`: `parseRecordTypeFileName(filename)` → `{ rtName, baseObjectLower }` | `null` (regex `rt__(.+)__(.+)$`)
- Suites de borrado existentes (regresion del refactor): `object-manager/tests/integration/hard-delete-cascade.integration.test.js`, `object-manager/tests/integration/scenario-delete-cascade.integration.test.js`
- Consumidor front (best-effort, no se toca): `layout/src/layouts/RecordList/RecordList.vue`
- Fuente del reporte: `mods/curriculum-mapping/docs/BUG-core-harddelete-cascade-recordtype.md` (seccion "Sintoma relacionado")

## Acceptance checkpoints

- [x] **Funcional**: TC-1/TC-2 pasan (los dos previews devuelven plan valido sobre alias RT, sin excepcion); TC-3 (paridad de conteo); TC-4 (restrict, no error). Evidencia: `npx vitest run tests/integration/delete-impact-preview-rt-alias.integration.test.js` -> 5/5 GREEN contra UPU.
- [x] **Tests** (DET-37 dim4): reproduce (TC-1/2) + paridad/restrict/no-regresion (TC-3/4/5) + `hard-delete-cascade` + guard `deleteInstance` (TC-7), corridos contra BD real cuando aplica. `scenario-delete-cascade` queda BLOCKED externo por drift de schema (`Scenario.active` no existe en Prisma generado actual) antes de entrar a delete.
- [x] **Rules**: resolucion anclada en introspeccion (no string `rt__`); DET-40 auditoria de reemplazo del refactor de `deleteBulkInstances` y `deleteInstance` cubierta.
- [x] **Integration**: borrado real sin regresion; objeto base sin RT sin cambio. Evidencia: `delete-impact-preview-rt-alias` + `hard-delete-cascade` -> 28/28 GREEN.
- [x] **Sin artefactos de sync commiteados**: el fix no toca objects/JSON ni corre codegen/sync; staging debe limitarse a source/tests/docs del ticket.
- [ ] **Commits/PR con id `UPONE-1608`** (DET-19/DET-27): rama de la epica/ticket, prefijo del id externo en cada commit
- [ ] **Docs oficiales** (DET-37 dim1): `delete-cascade.md` y `record-types.md` actualizados
- [ ] **Planning-completeness / necessity-assessment / parallelization**: entries registradas

## Archiving

Usar `/dkc-archive-spec` cuando deje de ser fuente de verdad. No borrar manualmente.
