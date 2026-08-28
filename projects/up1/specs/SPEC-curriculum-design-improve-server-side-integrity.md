---
id: SPEC-curriculum-design-improve-server-side-integrity
project: up1
ticket: TICKET-061
status: done
---

# Enforcement server-side de reglas de integridad (MCP-readiness curriculum-design)

# Enforcement server-side de reglas de integridad (MCP-readiness curriculum-design)

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements / Tasks. Si te basta el summary para decidir, ese es el objetivo.*

**Que se quiere**: el mod `curriculum-design` tiene 4 reglas de integridad de negocio que hoy solo respeta el frontend (advisory rojo) o nadie. Mientras la web fue el unico cliente, alcanzo. Ahora que el MCP (servidor que opera el mod via API GraphQL) va a escribir datos, ese piso desaparece: la API puede crear/publicar datos invalidos sin freno. Este cambio baja esas reglas al backend del mod — aguas abajo de todos los clientes — sin tocar el core de la plataforma.

**Decisiones criticas que necesitan tu OK** (racional en secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Enforzar en CADA escritura (no solo al publicar) — I1 `≤` por write + `===` al publicar; I2 por write | El MCP escribe incrementalmente; validar solo al publicar dejaria una ventana de datos invalidos persistidos |
| 2 | Comparacion exacta con enteros, sin tolerancia de floats (D-F) | Codegen mapea `weight` a `Int?`; usar floats+epsilon seria complejidad sin valor |
| 3 | Validacion de update se integra en `polymorphicUpdate.resolver.js` existente; create en archivo nuevo (constraint H7) | Dos `*.resolver.js` del mod no pueden exportar el mismo campo `Mutation` (colision de scanner) |
| 4 | Helper de suma unico compartido front/back (D-A), con fallback duplicar+paridad si el build frontend no importa de `logic/` | Evita que front y back diverjan en la regla de suma |
| 5 | I5 (unicidad de `AcademicProgram.code`) se implementa declarativo con backstop `@@unique` ya existente, pero queda como pregunta abierta a negocio | Es regla INFERIDA (DET-4), no confirmada por Confluence |

**Riesgos principales y como los mitigamos**:

- **Romper el create/update de otros objetos al introducir el wrapper** → validate-then-delegate: solo Modality/EvaluationComponent se validan; el resto delega al generic sin tocar nada. TC de no-regresion (TC-9) obligatorio.
- **Romper `transitionActivityValidated` (mutation critica)** → el `===` de publish se agrega como check adicional gateado por categoria `Published`; tests de transicion (valido publica, invalido bloquea, estados previos no exigen arbol).
- **Divergencia front/back en la suma** → un solo helper compartido; si el build no importa de `logic/`, test de paridad que falla si divergen.

**Que NO se hace en este ticket**:

- Unicidad de `Activity.code` (ex-I3): descope — choca con versionado y es inferida. Backlog B3.
- Registro real en el repo `mcp` (`registry.ts`): se documenta el `ObjectContract` objetivo; la transcripcion queda en backlog B2.
- Cambios en core de la plataforma: cero.

**Tamano estimado**: 3 sessions, ~5-7h efectivas. La mas riesgosa es S2 (toca `transitionActivityValidated`).

**Como vas a saber que funciona**:

- Creo/edito un EvaluationComponent cuyos hijos exceden el padre → la API lo rechaza (hoy lo acepta).
- Transiciono a Published un Activity con pesos que no suman 100 → la API lo rechaza listando los nodos invalidos.
- Creo una 2da Modality `isDefault=true` del mismo dueño → rechazada.
- Creo un 2do Workflow default (misma institucion+scope) → rechazado por el indice.
- Creo un 2do AcademicProgram con el mismo `(institutionId, code)` → rechazado.
- Creo/edito objetos que NO son Modality/EvaluationComponent → siguen funcionando igual.

---

## Purpose

Endurecer server-side, dentro del mod `curriculum-design`, 4 reglas de integridad de dominio (suma ponderada de evaluaciones, unicidad de Modality default, unicidad de Workflow default, unicidad de codigo de AcademicProgram) mas una query read-only de validacion, dejando el mod MCP-ready. La validacion vive en los resolvers del mod (override por spread, sin tocar core), de modo que cualquier cliente — web, MCP, API directa — queda forzado por igual.

## Requirements

### REQ-IMPROVE-01: Suma ponderada de evaluaciones (I1)

> **Que cambia**: cuando creas/editas un EvaluationComponent hijo cuyo peso (sumado a sus hermanos) supera el peso del padre, la API lo rechaza. Y al transicionar el Activity a un estado publicado, si algun padre no suma exactamente lo de sus hijos, la transicion se bloquea listando los nodos invalidos.
> **Por que**: hoy esta regla solo la pinta el frontend en rojo; un cliente MCP/API puede persistir y publicar pesos invalidos sin freno.

El sistema MUST rechazar, en cada escritura (`createInstance`/`updateInstance`) de un `rt__EvaluationComponent__curricularsection`, un peso que haga `suma(hijos directos) > peso(padre)`.
El sistema MUST rechazar la transicion de un Activity a un estado de categoria `Published` si existe algun nodo padre del arbol de evaluacion donde `suma(hijos directos) !== peso(padre)`.
El sistema MUST leer la categoria via `transition.toStatus.category` (NO hardcodear el id del estado).
El sistema MUST usar comparacion entera exacta (sin tolerancia de floats), por D-F.

**Actor**: system (vía cliente web/MCP/API)
**Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: write que excede el padre
- **GIVEN** un EvaluationComponent padre con weight=100 y un hijo con weight=100
- **WHEN** se crea/edita un 2do hijo con weight=10 (suma 110 > 100)
- **THEN** la mutation lanza error de dominio `EVALUATION_WEIGHT_EXCEEDS_PARENT`

#### Scenario: publish con suma incompleta
- **GIVEN** un Activity con arbol de evaluacion donde un padre suma 90 (no 100)
- **WHEN** se transiciona a un estado de categoria Published
- **THEN** la transicion lanza `EVALUATION_WEIGHT_MISMATCH` listando los nodos invalidos (expected vs actual)

#### Scenario: estados intermedios no exigen arbol completo
- **GIVEN** un arbol en armado (suma parcial ≤ padre, no === aun)
- **WHEN** se transiciona a un estado NO-Published (ToDo/InReview)
- **THEN** la transicion procede sin exigir `===`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intentar publicar via API un Activity con pesos que no suman 100 y recibir el error con los nodos invalidos.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | publish invalido | arbol suma 90 | transicion a Published | bloqueo | throw EVALUATION_WEIGHT_MISMATCH |
| 2 | write excede | padre 100, hijos 100 | +hijo 10 | bloqueo | throw EVALUATION_WEIGHT_EXCEEDS_PARENT |
| 3 | publish valido | arbol === 100 | transicion a Published | OK | sin error |
| 4 | intermedio | arbol parcial | transicion a InReview | OK | sin error |

### REQ-IMPROVE-02: Unicidad de Modality default (I2)

> **Que cambia**: crear o marcar una 2da Modality como `isDefault=true` para el mismo dueño es rechazado por la API.
> **Por que**: la regla "solo un default por dueño" hoy no tiene enforcement; cross-table, no se cubre con indice.

El sistema MUST rechazar, en cada `createInstance`/`updateInstance` de un `rt__Modality__curricularsection` con `isDefault=true`, la operacion si ya existe otra Modality `isDefault=true` del mismo dueño (`ownerId` + `recordType` en la `CurricularSection` base).

**Actor**: system
**Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: 2da default rechazada
- **GIVEN** una Modality default existente para el owner X
- **WHEN** se crea/marca otra Modality default del mismo owner X
- **THEN** lanza `MODALITY_DOUBLE_DEFAULT`

#### Scenario: cambiar el default
- **GIVEN** una Modality default A para owner X
- **WHEN** se desmarca A y se marca B como default (en operaciones separadas o una que primero desmarca)
- **THEN** OK — solo una queda default

</details>

#### Acceptance
**El usuario puede verificar que funciona**: crear via API 2 Modality default del mismo dueño y recibir rechazo en la segunda.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | 2da default | una default existe | crear/marcar otra mismo owner | bloqueo | throw MODALITY_DOUBLE_DEFAULT |
| 2 | cambiar default | una default existe | marcar otra tras desmarcar | OK | sin error |

### REQ-IMPROVE-03: Unicidad de Workflow default (I4)

> **Que cambia**: crear un 2do Workflow `isDefault=true` para la misma institucion + scopeType es rechazado a nivel BD.
> **Por que**: regla de Confluence sin enforcement; los 3 campos viven en la misma tabla → indice unico parcial.

El sistema MUST crear, vía el seed del mod (`seed/_data-indexes.js`), un indice unico parcial sobre `Workflow (institutionId, scopeType) WHERE isDefault = true`, idempotente.

**Actor**: system
**Layers**: database

<details><summary>Scenarios de validacion</summary>

#### Scenario: 2do default rechazado por indice
- **GIVEN** el indice unico parcial creado y un Workflow default para (inst A, scope S)
- **WHEN** se inserta otro Workflow default para (inst A, scope S)
- **THEN** PostgreSQL rechaza por violacion de unique index

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras `npm run sync`, insertar 2 Workflow default mismo (inst, scope) y recibir error de constraint.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | indice bloquea | indice creado, 1 default | 2do default mismo (inst,scope) | bloqueo | unique violation |
| 2 | idempotencia | indice ya existe | re-run seed | no-op | sin error |

### REQ-IMPROVE-04: Forma declarativa de unicidad de AcademicProgram.code (I5)

> **Que cambia**: el JSON de AcademicProgram declara `uniqueScopedBy: ["institutionId"]` en `code`, haciendo la unicidad scoped visible/declarativa (MCP-ready). El `@@unique([institutionId, code])` ya existente es el backstop.
> **Por que**: hoy la unicidad esta solo en el constraint DB, no en la forma declarativa que el contrato MCP referencia.

El sistema MUST declarar `uniqueScopedBy: ["institutionId"]` en el campo `code` de `objects/AcademicProgram.json` (o en `metadata`, segun donde el codegen/enforcement config-driven lo lea — verificar en execute).
El sistema MUST preservar el `uniqueConstraints: [["institutionId", "code"]]` existente como backstop.

> ⚠️ **INFERIDO (DET-4)**: la unicidad de `code` es inferida, no confirmada por Confluence ("codigo institucional" ≠ "unico"). Se implementa con backstop seguro; queda Open question para negocio/PO.

**Actor**: system
**Layers**: config, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: duplicado rechazado
- **GIVEN** `uniqueScopedBy` declarado + un AcademicProgram (inst A, code "ING-CIV")
- **WHEN** se crea otro (inst A, code "ING-CIV")
- **THEN** rechazado con error legible

</details>

#### Acceptance
**El usuario puede verificar que funciona**: crear via API 2 AcademicProgram con el mismo (institutionId, code) y recibir rechazo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | dup rechazado | uniqueScopedBy declarado | crear duplicado (inst,code) | bloqueo | error de unicidad |

### REQ-IMPROVE-05: Query read-only `validateActivityEvaluations` (D-C)

> **Que cambia**: el MCP/API puede preguntar "¿el arbol de evaluacion de este Activity es valido?" sin intentar publicar.
> **Por que**: permite a un cliente chequear ANTES de transicionar, en vez de descubrir el rechazo al publicar.

El sistema MUST exponer una query GraphQL read-only `validateActivityEvaluations(activityId: ID!)` que devuelva los nodos invalidos (`{ id, expected, actual }[]`) del arbol de evaluacion del Activity.

**Actor**: system (cliente MCP/API)
**Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: arbol invalido
- **GIVEN** un Activity con arbol invalido
- **WHEN** se llama `validateActivityEvaluations(activityId)`
- **THEN** devuelve la lista de nodos invalidos con expected/actual

#### Scenario: arbol valido
- **GIVEN** un Activity con arbol valido
- **WHEN** se llama la query
- **THEN** devuelve lista vacia

</details>

#### Acceptance
**El usuario puede verificar que funciona**: llamar la query sobre un Activity invalido y ver los nodos reportados.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | query invalido | arbol invalido | llamar query | lista nodos | [{id,expected,actual}] |
| 2 | query valido | arbol valido | llamar query | vacio | [] |

### REQ-IMPROVE-06: Documentar el ObjectContract objetivo (B2)

> **Que cambia**: queda documentado el `ObjectContract` objetivo (mapping §6 de la guia MCP) para los objetos afectados.
> **Por que**: cuando el repo `mcp` este disponible, la registracion sea transcripcion directa.

El sistema SHOULD documentar, en el mod (`docs/`) o en el ticket, el `ObjectContract` objetivo (allowlist + contrato + tool para `validateActivityEvaluations`) para los objetos afectados. La registracion real en `mcp/src/contracts/registry.ts` queda diferida (backlog B2).

**Actor**: dev
**Layers**: config (doc)

### REQ-PRESERVE-01: Single source de la suma front/back (D-A)

> **Que cambia**: la regla de suma ponderada vive en un solo helper compartido (`logic/helpers/weightedSum.js`); el componente frontend lo wrappea.
> **Por que**: si front y back implementan la regla por separado, divergen.

El sistema MUST mantener una unica fuente de verdad del algoritmo de suma (`computeInvalidNodes`). Si el build del frontend no puede importar desde `logic/`, MUST haber un test de paridad que falle si las dos copias divergen.

<details><summary>Scenarios de validacion</summary>

#### Scenario: paridad front/back
- **GIVEN** el mismo arbol de evaluacion
- **WHEN** se computa invalidez en front y back
- **THEN** identico resultado (misma logica entera)

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | paridad | mismo arbol | compute front vs back | igual | mismo set de nodos invalidos |

### REQ-PRESERVE-02: Create/update de otros objetos no afectado

> **Que cambia**: nada — los objetos que no son Modality/EvaluationComponent siguen pasando por el CRUD generic sin cambios.
> **Por que**: el wrapper toca un path caliente (create/update de instancias); no debe alterar el resto.

El sistema MUST delegar al `createInstance`/`updateInstance` generic sin alteracion para todo objectType que NO sea `rt__Modality__curricularsection` ni `rt__EvaluationComponent__curricularsection`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: objeto no en scope
- **GIVEN** el wrapper de validacion activo
- **WHEN** se crea/edita un objeto que no es Modality ni EvaluationComponent
- **THEN** se comporta exactamente como antes (delega al generic)

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | delega | wrapper activo | crear objeto fuera de scope | sin cambio | mismo resultado que generic |

### REQ-PRESERVE-03: Publish/transicion valida sigue funcionando

> **Que cambia**: nada para arboles validos — publicar un Activity con pesos correctos sigue funcionando.
> **Por que**: el enforcement no debe introducir falsos positivos.

El sistema MUST permitir la transicion a Published de un Activity con arbol de evaluacion valido (`=== ` en todos los padres) sin error, y MUST preservar las 8 validaciones de gobernanza existentes de `transitionActivityValidated`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: publish valido intacto
- **GIVEN** un Activity con arbol valido y transicion legal
- **WHEN** se transiciona a Published
- **THEN** OK + history creada + evento emitido (comportamiento pre-existente)

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | gobernanza intacta | transicion ilegal | transicionar | bloqueo previo | error de gobernanza existente (no el nuevo) |

## Tasks

> Numeracion continua (DET-20): sin sessions previas → plan arranca en S1.

### Session 1 — Wrapper de validacion de dominio de secciones + I2 (Modality default) [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Baseline + helper validador de Modality default: documentar que hoy el backend no valida (TC-baseline) y crear `logic/helpers/modalityDefault.js` (puro: dado prisma+ownerId+recordType+selfId, retorna el conflicto si existe otra default) | REQ-IMPROVE-02 | developer | — | mods/curriculum-design/logic/helpers/modalityDefault.js | vitest unit del helper | git revert | DET-1, DET-2, DET-11 | done | 1 |
| S1.T2 | Nuevo `logic/sectionValidation.resolver.js` exportando `sectionValidationMutation = { createInstance }`: para `rt__Modality__curricularsection` valida I2 (via helper) y delega a `generic.createInstance`; para cualquier otro objectType delega sin tocar (validate-then-delegate). Agregar codes a `errors.js` (`MODALITY_DOUBLE_DEFAULT`) | REQ-IMPROVE-02, REQ-PRESERVE-02 | developer | S1.T1 | mods/curriculum-design/logic/sectionValidation.resolver.js, mods/curriculum-design/logic/errors.js | vitest unit (delega vs valida) | git revert | DET-5, DET-8, DET-10, DET-11, RULE-curriculum-design-003 | done | 1 |
| S1.T3 | Integrar I2 en el `updateInstance` existente de `polymorphicUpdate.resolver.js` (constraint H7: no archivo nuevo): antes del write, si objectType es Modality y `isDefault=true`, validar via helper | REQ-IMPROVE-02 | developer | S1.T1 | mods/curriculum-design/logic/polymorphicUpdate.resolver.js | vitest unit del wrapper update | git revert | DET-5, DET-8, RULE-curriculum-design-003 | done | 1 |
| S1.T4 | Tests I2 + no-regresion: 2da default rechazada (create+update), cambiar default OK, objeto fuera de scope delega sin cambio | REQ-IMPROVE-02, REQ-PRESERVE-02 | developer | S1.T2, S1.T3 | mods/curriculum-design/tests/ | vitest run del mod verde + arranque object-manager | git revert | DET-7, DET-13 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket (Template de Gate), quality review (DET-23), validacion T2, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision documentada + commits granulares | (no aplica) | DET-20, DET-23, DET-27 | pending | 1 |

### Session 2 — I1 suma ponderada (write ≤ + publish === + query) [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Helper `logic/helpers/weightedSum.js` (ESM puro): `computeInvalidNodes(tree)` exacto enteros + `childrenExceedParent(parent, children)` para el `≤` por write. Agregar codes a `errors.js` (`EVALUATION_WEIGHT_EXCEEDS_PARENT`, `EVALUATION_WEIGHT_MISMATCH`) | REQ-IMPROVE-01 | developer | S1.GATE | mods/curriculum-design/logic/helpers/weightedSum.js, mods/curriculum-design/logic/errors.js | vitest unit del helper | git revert | DET-1, DET-2 | done | 2 |
| S2.T2 | Single-source front/back (D-A): el componente `validateWeightedSum.ts` wrappea el helper de S2.T1. Si el build frontend no importa de `logic/` → fallback duplicar + test de paridad. Registrar la decision tomada (import vs duplicar) | REQ-PRESERVE-01 | developer | S2.T1 | mods/curriculum-design/modsComponents/CompositeSectionTree/validateWeightedSum.ts, mods/curriculum-design/tests/ | vitest paridad front/back | git revert | DET-5, DET-16 | done | 2 |
| S2.T3 | I1 `≤` por write: agregar a `createInstance` (sectionValidation.resolver.js) + `updateInstance` (polymorphicUpdate) para `rt__EvaluationComponent__curricularsection`, reusando el wrapper de S1 | REQ-IMPROVE-01 | developer | S2.T1 | mods/curriculum-design/logic/sectionValidation.resolver.js, mods/curriculum-design/logic/polymorphicUpdate.resolver.js | vitest unit (write excede rechazado) | git revert | DET-5, DET-8, RULE-curriculum-design-003 | done | 2 |
| S2.T4 | I1 `===` al publicar: en `transitionActivityValidated`, si `transition.toStatus.category === 'Published'`, cargar el arbol de evaluacion del Activity y validar `computeInvalidNodes` exacto; throw con nodos invalidos. Leer category, NO hardcodear id (D-B) | REQ-IMPROVE-01, REQ-PRESERVE-03 | developer | S2.T1 | mods/curriculum-design/logic/activity.resolver.js | vitest unit transicion (publish invalido bloquea, valido OK, intermedio no exige) | git revert | DET-5, DET-7, DET-8, RULE-curriculum-design-004 | done | 2 |
| S2.T5 | Query `validateActivityEvaluations(activityId)` (D-C): resolver read-only + schema GraphQL en el mod. `npm run sync` para regenerar typedef | REQ-IMPROVE-05 | developer | S2.T1 | mods/curriculum-design/logic/activity.resolver.js, mods/curriculum-design/logic/activity.schema.graphql | vitest unit query + sync OK | git revert | DET-2, RULE-mods-003 | done | 2 |
| S2.T6 | Tests I1 completos + regresion de transicion: TC-1..TC-4, paridad, gobernanza intacta | REQ-IMPROVE-01, REQ-PRESERVE-01, REQ-PRESERVE-03 | developer | S2.T3, S2.T4, S2.T5 | mods/curriculum-design/tests/ | vitest run del mod verde + arranque object-manager | git revert | DET-7, DET-13 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3)** — persistir, quality review (DET-23), regresion T3 (incluye smoke de transicion), commits granulares, decidir | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4, S2.T5, S2.T6 | ticket | gate persistido + regresion verde + commits | (no aplica) | DET-20, DET-23, DET-27 | done | 2 |

### Session 3 — I4 (indice) + I5 (uniqueScopedBy) + regresion + doc [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S3.T1, S3.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | I4: extender el builder de `seed/_data-indexes.js` para soportar `unique: true` + `where: "..."` y agregar el indice `Workflow (institutionId, scopeType) WHERE isDefault=true`. Idempotente (`CREATE UNIQUE INDEX IF NOT EXISTS`) | REQ-IMPROVE-03 | developer | S2.GATE | mods/curriculum-design/seed/_data-indexes.js | seed run + verificar indice en pg_indexes; 2do default rechazado | git revert + DROP INDEX | DET-8, RULE-mods-008 | done | 3 |
| S3.T2 | I5: declarar `uniqueScopedBy: ["institutionId"]` en `code` de `objects/AcademicProgram.json` (verificar donde lo lee el enforcement config-driven). Preservar `uniqueConstraints` backstop. `npm run sync` | REQ-IMPROVE-04 | developer | S2.GATE | mods/curriculum-design/objects/AcademicProgram.json | sync OK + crear duplicado rechazado | git revert | DET-2, RULE-mods-003, RULE-mods-008 | done | 3 |
| S3.T3 | Regresion completa del mod (suite entera) + verificar 0 duplicados pre-existentes no rotos | REQ-PRESERVE-02, REQ-PRESERVE-03 | reviewer | S3.T1, S3.T2 | mods/curriculum-design/tests/ | vitest run completo verde + arranque object-manager | (no aplica) | DET-7, DET-13, DET-14 | done | 3 |
| S3.T4 | Documentar el `ObjectContract` objetivo (B2): allowlist + contrato + tool `validateActivityEvaluations` para los objetos afectados, en `docs/` del mod | REQ-IMPROVE-06 | developer | S3.T1, S3.T2 | mods/curriculum-design/docs/ | doc presente + refs validas | git revert | DET-16 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — persistir, quality review, regresion T2, commits, cierre del ciclo de implementacion → request-close | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4 | ticket | gate persistido + suite verde + commits | (no aplica) | DET-20, DET-23, DET-27 | done | 3 |

## Constraints

- RULE-curriculum-design-003: las escrituras de workflow van por mutations `*Validated` — aplica a la integracion en `transitionActivityValidated`.
- RULE-curriculum-design-004: `transitionActivityValidated` es el coordinador atomico de transicion — el `===` de publish se agrega como check adicional sin romper las 8 validaciones existentes.
- RULE-mods-003: `npm run sync` tras agregar query/typedef (S2.T5) y tras cambiar el JSON (S3.T2).
- RULE-mods-008: el seed crea indices/FK con scope mod estricto (S3.T1).
- DET-7: cada cambio tiene test de regresion. DET-8: rollback documentado por task.
- Patron resolver-override (`docs/patterns/resolver-override.md`): el mod gana por spread al final; un campo `Mutation` no puede exportarse desde dos archivos (H7).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| object-manager `instance.resolver.js` (generic) | internal | el create/update wrapper delega al generic | si el generic cambia su firma, el delegate se desincroniza (mitigado: validate-then-delegate no replica logica) |
| `npm run sync` (Phase 8 seed + codegen) | internal | aplica indice (I4) y regenera typedef (query D-C) | si el sync falla, el indice/typedef no se aplican |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Wrapper de create/update rompe otros objetos | medium | high | validate-then-delegate (solo Modality/EvaluationComponent); TC-9 no-regresion |
| Romper `transitionActivityValidated` | medium | high | check `===` adicional gateado por categoria Published; tests de transicion (valido/invalido/intermedio) |
| Divergencia front/back en la suma | low | medium | helper unico; fallback test de paridad |
| I5 enforcement config-driven falla silencioso si no se lee `uniqueScopedBy` | medium | medium | backstop `@@unique` ya existente; verificar en execute donde se lee (ref memoria scoped-uniqueness config-driven) |
| TOCTOU en I2 (race de 2 defaults concurrentes) | low | low | aceptable (0 duplicados UPU, baja concurrencia); documentado |

## Open questions

- [ ] **I5 inferido**: ¿la unicidad de `AcademicProgram.code` por institucion es regla de negocio real? Confluence dice "codigo institucional", no "unico". Confirmar con negocio/PO. Mientras: se implementa declarativo con backstop seguro.
- [x] ~~**D-A build import**~~: RESUELTO (S2.T2, ver DEC-LOCAL-03) → el frontend NO puede importar de `logic/` (tsconfig.include + sync separa modsComponents↔logic). Se aplicó fallback duplicar+paridad.

## Decisions

### DEC-LOCAL-01: Integrar validacion de update en polymorphicUpdate vs archivo nuevo
- **Contexto**: I1/I2 necesitan validar en `updateInstance`, pero ya existe un override de `updateInstance` en `polymorphicUpdate.resolver.js`.
- **Drivers**: el scanner del platform colisiona si dos `*.resolver.js` del mod exportan el mismo campo `Mutation` (H7, `docs/patterns/resolver-override.md`).
- **Opcion elegida**: integrar la validacion de update DENTRO de `polymorphicUpdate.resolver.js`; el create (sin override previo) va en archivo nuevo `sectionValidation.resolver.js`.
- **Alternativas**: archivo nuevo que re-exporte `updateInstance` → descartado (colision no determinista).
- **Consecuencias**: una sola fuente de `updateInstance`; `polymorphicUpdate` crece de responsabilidad (audit + validacion).
- **Session**: design.

### DEC-LOCAL-03: Single-source de la suma via paridad testeada, no import compartido (D-A fallback)
- **Contexto**: D-A pedía un solo helper compartido front/back. ¿El frontend importa `logic/helpers/weightedSum.js`?
- **Drivers**: `tsconfig.include` del mod cubre solo `modsComponents/**` (no `logic/`); y `npm run sync` separa los destinos — `modsComponents/` → suite (frontend), `logic/` → object-manager (backend). Un import `../../logic/` funciona en el árbol fuente pero **rompe el bundle del frontend post-sync** (logic/ no viaja con el frontend).
- **Opción elegida**: fallback de D-A — el algoritmo vive en ambos lados (`validateWeightedSum.ts` front + `logic/helpers/weightedSum.js` back) y un **test de paridad** (`tests/unit/weightedSum.parity.test.ts`) falla si divergen. Fuente única garantizada por contrato testeado.
- **Alternativas**: import directo desde `logic/` → descartado (rompe sync del frontend); mover el helper a un paquete compartido → over-engineering para una función pequeña.
- **Consecuencias**: dos copias, pero un test las ancla. Con pesos enteros (D-F) la tolerancia del front y el exacto del back coinciden.
- **Session**: S2.T2.

### DEC-LOCAL-02: Comparacion entera exacta sin tolerancia (D-F)
- **Contexto**: la regla de suma podria usar floats + epsilon (como el frontend hoy: 0.01).
- **Drivers**: codegen mapea `weight` a `Int?`; datos UPU enteros.
- **Opcion elegida**: comparacion `===` entera exacta en el backend.
- **Alternativas**: epsilon 0.01 (innecesario con enteros).
- **Consecuencias**: simple y determinista; si en el futuro `weight` pasa a Decimal, revisar.
- **Session**: design.

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Reglas de integridad enforzadas server-side | 0/4 | 4/4 | tests del mod + smoke API |
| Clientes no-web que pueden persistir datos invalidos | si | no | la validacion vive en el resolver (aguas abajo de todos) |

## Technical reference

- `logic/polymorphicUpdate.resolver.js`: override de `updateInstance` con `RT_PATTERN = /^rt__([a-zA-Z0-9_]+)__(curricularsection)$/`; delega al generic si no matchea (L471-474). Punto de integracion de I1≤/I2 en update.
- `logic/activity.resolver.js`: `transitionActivityValidated` — 8 validaciones de gobernanza + `$transaction` (update + history) + publish evento. Punto de integracion del `===` de publish (I1).
- `modsComponents/CompositeSectionTree/validateWeightedSum.ts`: `computeInvalidNodes(tree, tolerance)` — fuente del helper compartido (D-A).
- `seed/_data-indexes.js`: builder de `CREATE INDEX IF NOT EXISTS` desde el seed; extender para `UNIQUE` + `WHERE` (I4).
- `objects/AcademicProgram.json`: `metadata.uniqueConstraints: [["institutionId","code"]]` ya existe (backstop de I5).

## Rules discovered

(Se llena durante ejecucion.)

## Bugs found

(Se llena si se descubren.)

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-IMPROVE-01..05 pasan.
- [ ] **Tests**: TC-1..TC-9 del ticket escritos y pasando.
- [ ] **Rules**: mutations `*Validated` respetadas; `npm run sync` corrido tras cambios de schema/JSON.
- [ ] **Integration**: create/update de objetos fuera de scope no afectado; transicion valida intacta (regression).
- [ ] **Docs**: ObjectContract objetivo documentado (B2).
