---
id: SPEC-object-manager-hu4-versioning-declarative
project: up1
ticket: TICKET-038
status: done
---

# SPEC — HU-4: bloque `versioning` declarativo en el JSON del objeto (codegen valida; el registry ya persiste)

# SPEC — HU-4: bloque `versioning` declarativo en el JSON del objeto (codegen valida; el registry ya persiste)

## Executive summary — lo que estas aprobando

> *Diseñada para revision rapida. El detalle tecnico vive en Requirements y Tasks. Si te basta el Executive summary para decidir, ese es el objetivo.*

**Que se quiere**: que un dev de mod declare en el JSON del objeto (`metadata.versioning = { linkageField, versionField, versionStrategy, auditSourceField?, initialStateField? }`) la **mecanica** de versionamiento de ese tipo — que campo enlaza versiones, cual guarda el numero, con que estrategia — sin escribir codigo, y que el codegen lo **valide** con feedback claro si esta mal declarado. Verificado contra el codigo real de `UPONE-1206`, la **persistencia ya existe**: HU-0j (033) creo la columna `versioningConfig` + `syncVersioningConfigToRegistry`, y HU-2 (037) abrio el gate a `(versioning || prefillFrom)`. Por eso HU-4 se concentra en lo que falta: **la capa de validacion** (estructura + cross-ref reflexivo + warnings de politica + error de estrategia fuera de alcance).

**Decisiones criticas que necesitan tu OK** (racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| A | `versionStrategy` SOLO `increment` en SP3; `user-provided`/`semver` → **error** con mensaje "fuera de alcance" (DEC-LOCAL-01) | La epica 1206 fija `increment` como unica strategy. Rechazar las otras como "fuera de SP3" (no "valor invalido") evita que un dev crea que es un typo. `user-provided` (UI + ordering por linaje) y `semver` (parsing) son trabajo SP4. |
| B | `linkageField` validado como FK reflexivo: `properties[linkageField].isForeignKey === true` Y `references === json.title` (DEC-LOCAL-02) | Es el invariante que encadena versiones. Hoy `previousVersionId` en Activity es string plano; sin esta validacion un linkageField mal declarado fallaria silenciosamente al construir el linaje. |
| C | Split warning/error por el invariante mecanica-vs-politica: campos de **politica** (`allowedFromStates`, `initialStateValue`) → **warning** (no abortan); malformacion estructural y strategy fuera de alcance → **error** (abortan codegen) (DEC-LOCAL-03) | La politica vive en `WorkflowStatus.allowsVersioning` + FK de entrada del `Workflow`. Warning (no error) permite migracion suave de configs viejas que aun los declaren. |
| D | Alcance = validacion + tests con fixtures/metadata inyectada; **NO** se declara `versioning` en un objeto real (activity.json) en esta HU (DEC-LOCAL-04) | Declarar en activity.json exige convertir `previousVersionId` en FK reflexivo (cambio de modelo, IMP-5/HU-0e aplicado al JSON) — es activacion downstream, no validacion. HU-0j ya valida persistencia con `metadataLoader` inyectable; HU-4 reusa ese patron. |

**Riesgos principales y como los mitigamos**:

- **Regresion codegen en 16+ tenants** (HU-4 inserta un validador nuevo en la cadena de build) → REQ-PRESERVE-07 + gate ⚑ fuerte S2: `git diff prisma/*/schema.prisma` vacio (ningun objeto declara `versioning` aun, asi que el diff DEBE ser vacio) + smoke `select 1` en UPU.
- **El validador aborta codegen por un bloque valido (falso positivo)** → suite de unit tests por REQ (S1.T3, S3.T3) cubre validos + invalidos; el validador solo corre sobre objetos que declaran `metadata.versioning` (ausente → no valida → sin efecto).
- **El cross-ref reflexivo no resuelve el nombre propio del objeto** → DEC-LOCAL-02 fija `json.title` como fuente del nombre (consistente con `coreSchema.title` usado como modelName en `generatePrismaSchema.js:673`).

**Que NO se hace**: implementar la persistencia (ya existe en `syncVersioningConfigToRegistry`, 033+037); `user-provided`/`semver` (SP4); leer `versioning` en runtime (HU-3); declarar `versioning` en objetos reales / volver `previousVersionId` reflexivo (activacion downstream, ver OQ-1).

**Tamaño estimado**: 4 sessions (~1-2 SP). La mas riesgosa es **S2** (cross-ref reflexivo + confirmacion de persistencia + regresion codegen multi-tenant).

**Como vas a saber que funciona**: (a) un bloque `versioning` valido pasa el codegen; (b) un bloque sin `linkageField`/`versionField`/`versionStrategy` lo aborta con error claro indicando archivo+campo; (c) `versionStrategy: "semver"` aborta con "fuera de alcance SP3"; (d) un `linkageField` que no es FK reflexivo aborta; (e) `versionField` no-integer con `increment` aborta; (f) declarar `allowedFromStates` emite warning pero NO aborta; (g) un objeto (fixture) con `versioning` valido queda persistido en `versioningConfig.versioning` tras el sync.

## Purpose

Cablear la **capa de validacion** del bloque `metadata.versioning` en el codegen de `object-manager`. El codegen valida la estructura del bloque (requeridos/opcionales/tipos), exige que `linkageField` sea FK reflexivo del propio objeto, restringe `versionStrategy` a `increment` (rechazando `user-provided`/`semver` como fuera de alcance SP3), y emite warning (no error) para campos de politica obsoletos (`allowedFromStates`/`initialStateValue`). La persistencia al registry (`core_ObjectDefinition.versioningConfig.versioning`) ya esta entregada por HU-0j/033 + el gate abierto en HU-2/037 — HU-4 la confirma, no la implementa. Actor: dev de mod que activa versionamiento de un tipo por configuracion. Valor: cierra la capa declarativa de versionamiento de SP3 (epica UPONE-1206) sobre los ladrillos de HU-0e/HU-0j.

## Requirements

### REQ-01: Validacion estructural del bloque `versioning` en codegen

> **Que cambia**: si declaras `metadata.versioning` sin alguno de los requeridos (`linkageField`, `versionField`, `versionStrategy`), o con un tipo equivocado, el codegen falla con un error claro en vez de persistir un bloque incompleto.
> **Por que**: hoy `versioning` se persiste opaco sin validar; un bloque incompleto recien explotaria al construir el linaje en runtime.

El sistema MUST validar `metadata.versioning` en build-time cuando esta presente: los tres campos requeridos (`linkageField`, `versionField`, `versionStrategy`) MUST estar presentes y ser strings no vacios; los opcionales (`auditSourceField`, `initialStateField`), si presentes, MUST ser strings no vacios. El bloque MUST ser un objeto (no array, no escalar). Un bloque invalido MUST producir error de codegen indicando archivo + campo. Si `metadata.versioning` esta ausente, la validacion MUST no tener efecto (sin cambio respecto a hoy).

<details><summary>Scenarios de validacion</summary>

#### Scenario: bloque completo valido
- **GIVEN** `metadata.versioning` con `linkageField`, `versionField`, `versionStrategy: "increment"`
- **WHEN** se ejecuta `npm run codegen`
- **THEN** pasa OK

#### Scenario: falta un requerido
- **GIVEN** `metadata.versioning` sin `versionStrategy`
- **WHEN** codegen
- **THEN** falla con error: `versioning.versionStrategy is required in <archivo>`

#### Scenario: bloque no es objeto
- **GIVEN** `metadata.versioning: "increment"` (string, no objeto)
- **WHEN** codegen
- **THEN** falla con error indicando que `versioning` debe ser un objeto

#### Scenario: objeto sin versioning (no-op)
- **GIVEN** un objeto sin `metadata.versioning`
- **WHEN** codegen
- **THEN** pasa OK, sin warnings ni errores de versioning

</details>

### REQ-02: `linkageField` debe ser FK reflexivo del mismo objeto

> **Que cambia**: el `linkageField` que declares (ej. `previousVersionId`) debe ser un campo del mismo objeto declarado como FK que apunta a si mismo (`isForeignKey: true`, `references: <ese objeto>`). Si no lo es, el codegen falla.
> **Por que**: es lo que encadena una version con su anterior; un linkageField que no es FK reflexivo rompe el linaje silenciosamente.

El sistema MUST validar que `properties[linkageField]` del mismo objeto exista, tenga `isForeignKey === true` y `references === json.title` (el propio objeto). Si el campo no existe, no es FK, o referencia a otro objeto, MUST producir error de codegen indicando archivo + campo + el problema concreto.

<details><summary>Scenarios de validacion</summary>

#### Scenario: linkageField reflexivo valido
- **GIVEN** un fixture `Activity` con `versioning.linkageField: "previousVersionId"` y `properties.previousVersionId: { isForeignKey: true, references: "Activity" }`
- **WHEN** codegen
- **THEN** pasa OK

#### Scenario: linkageField no es FK
- **GIVEN** `linkageField: "previousVersionId"` con `properties.previousVersionId: { type: "string" }` (sin isForeignKey)
- **WHEN** codegen
- **THEN** falla con error: `versioning.linkageField "previousVersionId" debe ser FK reflexivo (isForeignKey + references: Activity) en <archivo>`

#### Scenario: linkageField referencia a otro objeto
- **GIVEN** `linkageField: "workflowId"` con `references: "Workflow"` (no reflexivo)
- **WHEN** codegen
- **THEN** falla con error indicando que `references` debe ser el propio objeto

#### Scenario: linkageField inexistente
- **GIVEN** `linkageField: "noSuchField"` no declarado en `properties`
- **WHEN** codegen
- **THEN** falla con error indicando que el campo no existe en el objeto

</details>

### REQ-03: `versionField` con `increment` debe ser tipo entero

> **Que cambia**: con `versionStrategy: "increment"`, el `versionField` que apuntes debe declararse `"type": "integer"` en el JSON. Si es string u otro tipo, el codegen falla.
> **Por que**: el increment es numerico auto-incremental; un versionField no-entero hace el increment indefinido.

El sistema MUST validar que, cuando `versionStrategy === "increment"`, `properties[versionField]` exista y tenga `type === "integer"`. Si el campo no existe o no es `integer`, MUST producir error de codegen indicando archivo + campo. (Nota: el JSON declara `"type": "integer"`; `Int` es el tipo Prisma resultante.)

<details><summary>Scenarios de validacion</summary>

#### Scenario: versionField integer + increment (valido)
- **GIVEN** `versionStrategy: "increment"`, `versionField: "version"`, `properties.version: { type: "integer" }`
- **WHEN** codegen
- **THEN** pasa OK

#### Scenario: versionField string + increment (rechazado)
- **GIVEN** `versionStrategy: "increment"`, `versionField: "version"`, `properties.version: { type: "string" }`
- **WHEN** codegen
- **THEN** falla con error: `versioning.versionField "version" debe ser type:"integer" para increment en <archivo>`

#### Scenario: versionField inexistente
- **GIVEN** `versionField: "noSuchField"` no declarado en `properties`
- **WHEN** codegen
- **THEN** falla con error indicando que el campo no existe

</details>

### REQ-04: `versionStrategy` solo `increment` en SP3 (user-provided/semver fuera de alcance)

> **Que cambia**: declarar `versionStrategy: "user-provided"` o `"semver"` falla el codegen con un mensaje que dice "fuera de alcance SP3", no "valor invalido".
> **Por que**: la epica 1206 fija `increment` como unica strategy; las otras son SP4. El mensaje claro evita que el dev lo lea como typo.

El sistema MUST aceptar `versionStrategy === "increment"` y MUST rechazar con error cualquier otro valor. Para `"user-provided"` y `"semver"` el error MUST indicar explicitamente que estan fuera de alcance de SP3 (diferidos a SP4), distinguiendolos de un valor desconocido.

<details><summary>Scenarios de validacion</summary>

#### Scenario: increment aceptado
- **GIVEN** `versionStrategy: "increment"`
- **WHEN** codegen
- **THEN** pasa OK

#### Scenario: user-provided rechazado por alcance
- **GIVEN** `versionStrategy: "user-provided"`
- **WHEN** codegen
- **THEN** falla con error: `versioning.versionStrategy "user-provided" esta fuera de alcance de SP3 (solo "increment"; user-provided/semver diferidos a SP4) en <archivo>`

#### Scenario: semver rechazado por alcance
- **GIVEN** `versionStrategy: "semver"`
- **WHEN** codegen
- **THEN** falla con error analogo indicando fuera de alcance SP3

#### Scenario: valor desconocido rechazado
- **GIVEN** `versionStrategy: "foo"`
- **WHEN** codegen
- **THEN** falla con error indicando strategy desconocida (solo "increment" en SP3)

</details>

### REQ-05: Warning (no error) para campos de politica obsoletos

> **Que cambia**: si declaras `allowedFromStates` o `initialStateValue` dentro de `versioning`, el codegen emite un warning explicando que la politica vive en `WorkflowStatus`/`Workflow` — pero NO aborta.
> **Por que**: la politica se movio fuera del bloque; el warning permite migracion suave de configs viejas sin romper el build.

El sistema MUST emitir warning (via `console.warn`, sin abortar el codegen) cuando `metadata.versioning` declara `allowedFromStates` y/o `initialStateValue`. El warning MUST indicar que esos campos son obsoletos y que la politica vive en `WorkflowStatus.allowsVersioning` + el FK de entrada del `Workflow`. La presencia de estos campos MUST NOT hacer fallar la validacion estructural del resto del bloque.

<details><summary>Scenarios de validacion</summary>

#### Scenario: allowedFromStates emite warning
- **GIVEN** `versioning` valido + `allowedFromStates: ["draft"]`
- **WHEN** codegen
- **THEN** pasa (no aborta) y emite warning citando `WorkflowStatus.allowsVersioning`

#### Scenario: initialStateValue emite warning
- **GIVEN** `versioning` valido + `initialStateValue: "draft"`
- **WHEN** codegen
- **THEN** pasa (no aborta) y emite warning citando el FK de entrada del `Workflow`

#### Scenario: ambos campos obsoletos + bloque por lo demas valido
- **GIVEN** `versioning` valido + ambos campos obsoletos
- **WHEN** codegen
- **THEN** pasa con 2 warnings; la validacion estructural del resto no se ve afectada

</details>

### REQ-06: El bloque queda persistido en `versioningConfig.versioning` tras el sync

> **Que cambia**: nada nuevo de codigo — se CONFIRMA que un objeto con `versioning` valido queda persistido en `core_ObjectDefinition.versioningConfig.versioning` tras `npm run codegen`.
> **Por que**: la persistencia la entrego HU-0j (033) + el gate abierto en HU-2 (037). HU-4 cierra el AC verificandola, no reimplementandola.

El sistema MUST persistir el bloque `versioning` validado en `core_ObjectDefinition.versioningConfig.versioning` (shape `{ versioning: <obj|null>, prefillFrom: <obj|null> }`), reusando `syncVersioningConfigToRegistry` existente. HU-4 MUST NOT modificar la logica de persistencia; solo agrega un test que confirma el caso `versioning`-presente via `metadataLoader` inyectado.

<details><summary>Scenarios de validacion</summary>

#### Scenario: versioning valido persistido
- **GIVEN** un fixture con `metadata.versioning` valido (metadataLoader inyectado)
- **WHEN** corre `syncVersioningConfigToRegistry`
- **THEN** su fila tiene `versioningConfig: { versioning: {...}, prefillFrom: null }`

</details>

### REQ-PRESERVE-07: Cero regresion en codegen multi-tenant

> **Que cambia**: nada para los 16+ tenants. Como ningun objeto declara `versioning` todavia, regenerar no altera ningun schema y el validador no se dispara sobre objetos reales.
> **Por que**: HU-4 inserta un validador nuevo en la cadena de build; debe ser inerte sobre objetos sin la key.

El sistema MUST regenerar `prisma/*/schema.prisma` de los 16+ tenants sin cambios (diff vacio) tras introducir el validador. El validador MUST no ejecutar logica sobre objetos que no declaran `metadata.versioning`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: git diff vacio
- **GIVEN** el validador `validate-versioning.js` cableado en el codegen
- **WHEN** `npm run codegen` + `git diff prisma/*/schema.prisma`
- **THEN** diff vacio; smoke `select 1 from core_ObjectDefinition` OK en UPU

</details>

### REQ-08: Documentacion de la capacidad declarativa

> **Que cambia**: queda documentado para futuros adoptantes como declarar `versioning`, que valida el codegen, y la nota de que la politica vive fuera del bloque.
> **Por que**: la capacidad es para devs de mod que no estuvieron en el sprint.

El sistema MUST documentar el bloque `versioning` en `object-manager/docs/versioning-capability.md`: shape, campos requeridos/opcionales con defaults, reglas de validacion (reflexivo, integer, strategy), la nota "la politica vive en `WorkflowStatus` + FK de entrada del `Workflow`", y un ejemplo.

## Artifact (METASPEC-json-object)

> **SIN cambio de SDL ni de schema DB**. El bloque `versioning` declarativo vive en `metadata` del JSON del objeto (artefacto JSON-object) y se persiste en la columna `versioningConfig` del registry (ya creada por HU-0j). HU-4 solo agrega la **capa de validacion** en el codegen.

**Shape de `metadata.versioning`** (artefacto JSON-object, declarativo):

| key | type | required | description |
|-----|------|----------|-------------|
| linkageField | string | si | Campo FK reflexivo del mismo objeto que enlaza con la version anterior (validado: `isForeignKey` + `references: <SameObject>`) |
| versionField | string | si | Campo que guarda el numero de version (con `increment` debe ser `type:"integer"`) |
| versionStrategy | string | si | Estrategia de versionamiento. SP3: solo `"increment"` |
| auditSourceField | string | no (default `versionSourceId`) | Campo del audit que registra el origen |
| initialStateField | string | no (default `currentStatusId`) | Campo de estado seteado al valor inicial del workflow |

**NO permitido en SP3**: `allowedFromStates`, `initialStateValue` → **warning** (politica vive en `WorkflowStatus`/`Workflow`); `versionStrategy: "user-provided" | "semver"` → **error** (fuera de alcance, SP4).

**Shape persistido en `core_ObjectDefinition.versioningConfig`** (registry, HU-0j — sin cambio):

```json
{ "versioning": { "linkageField": "previousVersionId", "versionField": "version", "versionStrategy": "increment", "auditSourceField": "versionSourceId", "initialStateField": "currentStatusId" }, "prefillFrom": null }
```

## Tasks

### Session 1 — validacion estructural del bloque `versioning` [tipo: auto] [tier: T2]

parallel_groups: []  <!-- secuencial: helper core (REQ-01+03+04) -> invocacion+wrapper -> tests -->

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `validate-versioning.js` (analogo a `validate-prefill-from.js`): `validateVersioning(block, json, fileLabel) -> string[]`. Cubre REQ-01 (requeridos/opcionales/tipos, bloque es objeto), REQ-03 (versionField type:"integer" cuando strategy increment), REQ-04 (strategy solo increment; user-provided/semver con mensaje "fuera de alcance SP3"). Mas `validateAllVersioning(jsonFiles) -> string[]` | REQ-01, REQ-03, REQ-04 | developer | — | object-manager/src/services/codegen/helpers/validate-versioning.js (nuevo) | unit: completo ok, falta requerido rechazado, no-objeto rechazado, versionField no-integer rechazado, semver/user-provided rechazados por alcance | borrar archivo nuevo | DET-1, DET-2, DET-8, DET-16 | done | 1 |
| S1.T2 | Cablear en codegen: `validateVersioningInAllObjects(jsonFiles)` que agrega errores y hace `throw` para abortar (patron `validatePrefillFromInAllObjects`); invocar tras `validatePrefillFromInAllObjects(registryJsonFiles)` (~`generatePrismaSchema.js:1195`). Inerte si el objeto no declara `versioning` | REQ-01, REQ-PRESERVE-07 | developer | S1.T1 | object-manager/src/services/codegen/generatePrismaSchema.js | unit/manual: objeto sin versioning no dispara; objeto con bloque invalido aborta | git revert de la invocacion + wrapper | DET-5, DET-8, DET-11 | done | 1 |
| S1.T3 | Unit tests S1: REQ-01 (estructura), REQ-03 (integer), REQ-04 (strategy) — validos + invalidos con assertion del mensaje de error | REQ-01, REQ-03, REQ-04 | developer | S1.T2 | object-manager/tests/unit/services/codegen/validate-versioning.test.js (nuevo) | vitest run del archivo, verde | borrar test nuevo | DET-7 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2): quality review standard, persistir, decidir continue | — | reviewer | S1.T3 | tickets/ticket-038.md | gate persistido + tests S1 verdes | — | DET-20, DET-23, DET-27, DET-29 | done | 1 |

### Session 2 — cross-ref reflexivo + persistencia confirmada [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: []  <!-- secuencial: cross-ref -> test persistencia -> regresion codegen -->

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Agregar a `validate-versioning.js` la validacion cross-ref de `linkageField`: el campo existe en `json.properties`, `isForeignKey === true` y `references === json.title`. Error claro con archivo+campo+problema (no existe / no FK / referencia a otro objeto) | REQ-02 | developer | S1.GATE | object-manager/src/services/codegen/helpers/validate-versioning.js | unit: reflexivo ok, no-FK rechazado, referencia ajena rechazada, campo inexistente rechazado | git revert del bloque cross-ref | DET-5, DET-8, DET-16 | done | 2 |
| S2.T2 | Unit test de persistencia (REQ-06): fixture con `metadata.versioning` valido via `metadataLoader` inyectado → `versioningConfig.versioning` poblado. NO modificar `syncVersioningConfigToRegistry` (solo confirmar) | REQ-06 | developer | S2.T1 | object-manager/tests/unit/services/codegen/syncVersioningConfigToRegistry.test.js, object-manager/tests/unit/services/codegen/validate-versioning.test.js | vitest: caso versioning-presente persiste; REQ-02 scenarios verdes | borrar/revert test | DET-7, DET-8 | done | 2 |
| S2.T3 | Regresion codegen: regenerar 16+ tenants, `git diff prisma/*/schema.prisma` vacio (ningun objeto declara versioning); smoke `select 1 from core_ObjectDefinition` en UPU | REQ-PRESERVE-07 | reviewer | S2.T2 | object-manager/prisma/*/schema.prisma | git diff vacio + smoke OK | — (idempotente) | DET-7, DET-13 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T2, ⚑ fuerte): quality review standard foco cross-ref + persistencia, regresion codegen vacia, decidir continue | — | reviewer | S2.T3 | tickets/ticket-038.md | gate persistido + git diff vacio + persistencia confirmada | — | DET-20, DET-23, DET-27, DET-29 | done | 2 |

### Session 3 — warnings de politica + cierre de errores de estrategia [tipo: auto] [tier: T1]

parallel_groups: []  <!-- secuencial: warnings -> tests -->

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Agregar a `validate-versioning.js` el warning (no error) para `allowedFromStates`/`initialStateValue`: `console.warn` citando `WorkflowStatus.allowsVersioning` + FK de entrada del `Workflow`. NO abortar; no afectar la validacion estructural del resto | REQ-05 | developer | S2.GATE | object-manager/src/services/codegen/helpers/validate-versioning.js, object-manager/src/services/codegen/generatePrismaSchema.js | unit: allowedFromStates emite warning sin abortar; initialStateValue idem; ambos + bloque valido pasa | git revert del bloque warning | DET-8, DET-16 | done | 3 |
| S3.T2 | Unit tests S3: REQ-05 (warnings, capturar `console.warn` con spy) + cierre de cobertura de mensajes de error de REQ-04 (semver/user-provided distinguidos de valor desconocido) | REQ-05, REQ-04 | developer | S3.T1 | object-manager/tests/unit/services/codegen/validate-versioning.test.js | vitest, scenarios REQ-05 verdes + spy de warning | borrar tests | DET-7 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier T1): quality review light, decidir continue | — | reviewer | S3.T2 | tickets/ticket-038.md | gate persistido + tests warnings verdes | — | DET-20, DET-23, DET-27, DET-29 | done | 3 |

### Session 4 — doc + cierre [tipo: auto] [tier: T1]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Documentar la capacidad en `versioning-capability.md`: shape, requeridos/opcionales+defaults, reglas de validacion (reflexivo, integer, strategy), nota "la politica vive en WorkflowStatus + FK de entrada del Workflow", ejemplo | REQ-08 | scribe | S3.GATE | object-manager/docs/versioning-capability.md (nuevo) | doc presente y consistente con el codigo | git revert | DET-16 | done | 4 |
| S4.T2 | Quality review final + commits granulares DET-27 (object-manager UPONE-1206 prefijo UPONE-1210-S{N} + deckard up1-sp3-w2) | — | reviewer | S4.T1 | object-manager/, deckard/projects/up1/ | suite verde, commits con prefijo UPONE-1210-S{N} | git reset commits locales | DET-13, DET-27 | done | 4 |
| **S4.GATE** | Gate de cierre Session 4 (tier T1): validacion reforzada DET-30, teach-close (DET-22), status closed | — | reviewer | S4.T2 | tickets/ticket-038.md | teach-close.html validado + acceptance checkpoints | — | DET-20, DET-22, DET-30 | done | 4 |

## Technical reference

- **Codegen sync (persistencia, NO tocar)**: `object-manager/src/services/codegen/generatePrismaSchema.js:2492` — `syncVersioningConfigToRegistry`. Gate `(versioning || prefillFrom)` en `:2511-2520`. Fase 3 del codegen.
- **Validador precedente (patron a replicar)**: `object-manager/src/services/codegen/helpers/validate-prefill-from.js` — `validateX(block,json,label)->string[]` + `validateAllX(jsonFiles)`. Wrapper+abort: `validatePrefillFromInAllObjects` en `generatePrismaSchema.js:99-114`. Punto de invocacion: `:1193-1195`.
- **jsonFiles shape**: `collectRegistryJsonFiles()` (`:54`) empuja `{ file: relPath, json }`. El nombre propio del objeto = `json.title` (consistente con `coreSchema.title` como modelName, `:673`).
- **Shape de un FK**: `properties[x].isForeignKey === true` + `properties[x].references === "<ObjectTitle>"` (ej. `activity.json:96-97` workflow → references "OrgUnit").
- **versionField integer**: el JSON declara `"type": "integer"` (ej. `activity.json:47-48` version). `Int` es el tipo Prisma resultante.
- **Registry column**: `object-manager/prisma/UPU/schema.prisma:28` — `versioningConfig Json?`.
- **metadataLoader inyectable (test)**: `syncVersioningConfigToRegistry(objectTypes, prismaClient, metadataLoader)` — 3er arg para inyectar fixtures en test (default `getMetadataFromBaseFile`).

## Constraints

- **RULE-dev-004**: codigo core → rama de la epica (`UPONE-1206`); merge a develop gated por team up1, no por el cierre DKC.
- **critical_rule up1 (config.yaml)**: "Toda query DEBE filtrar por tenantId" → la validacion es build-time (no toca queries runtime); el test de persistencia usa el `prismaClient` ya tenant-scoped del sync existente.
- **DEC-LOCAL-04 (037)**: persistir `versioning` lo cubre HU-4 — HU-2 explicitamente lo dejo fuera de su alcance. HU-4 confirma que el gate abierto en HU-2 (`versioning || prefillFrom`) efectivamente lo persiste.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-object-manager-track-0-prerequisitos-clonacion (TICKET-033) | internal | HU-0j (`versioningConfig` + `syncVersioningConfigToRegistry`) y HU-0e (FK reflexivo / IMP-5) cerrados. HU-4 confirma persistencia y valida el reflexivo | bajo — cerrado y verificado en codigo |
| SPEC-object-manager-hu2-prefillfrom-declarative (TICKET-037) | internal | Abrio el gate de persistencia a `(versioning || prefillFrom)`; aporto el patron `validate-prefill-from.js` que HU-4 replica | bajo — cerrado y verificado en codigo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Regresion codegen en 16+ tenants | low | high | REQ-PRESERVE-07 + gate ⚑ fuerte S2: validador inerte sin la key + `git diff` vacio |
| Falso positivo: el validador aborta un bloque valido | medium | medium | suite por REQ (validos+invalidos) en S1.T3/S2.T2/S3.T2; validador solo corre con `metadata.versioning` presente |
| El cross-ref no resuelve el nombre propio del objeto | low | medium | DEC-LOCAL-02: usar `json.title` (consistente con `coreSchema.title` modelName); test con fixture reflexivo |
| Confundir warning con error en campos de politica | low | medium | DEC-LOCAL-03: split explicito — politica=warning (console.warn), estructura/strategy=error (throw); test con spy de warning |

## Open questions

- **OQ-1**: ¿La **activacion real** (declarar `metadata.versioning` en un objeto de produccion como `Activity`, lo que exige convertir `previousVersionId` en FK reflexivo via IMP-5/HU-0e aplicado al JSON) entra en SP3 o se difiere? Decision pragmatica tomada (DEC-LOCAL-04): HU-4 entrega la **validacion** con fixtures/metadata inyectada; la activacion en objeto real es cambio de modelo y se trata como HU/ticket aparte. Residual para confirmacion del dev al cierre.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: `versionStrategy` solo `increment` en SP3; otras → error "fuera de alcance"
- **Contexto**: el AC fija `increment` como unica strategy en SP3; `user-provided` y `semver` son epica 1206 → SP4.
- **Drivers**: feedback claro al dev — rechazar `semver`/`user-provided` como "fuera de alcance" (no "valor invalido") comunica que son features futuras, no un typo.
- **Opcion elegida**: aceptar solo `increment`; mensaje de error diferenciado para `user-provided`/`semver` (fuera de SP3) vs valor desconocido.
- **Alternativas**: (a) aceptar las tres y validar solo forma — descartada: dejaria pasar config sin soporte runtime; (b) mensaje generico para todo no-increment — descartada: pierde la señal de "diferido a SP4".
- **Consecuencias**: el dev que intente semver/user-provided sabe que es SP4; trivial de relajar en SP4 (ampliar el enum aceptado).
- **Session**: design.

### DEC-LOCAL-02: `linkageField` validado como FK reflexivo via `json.title`
- **Contexto**: el AC exige que `linkageField` sea FK reflexivo (`references: <SameObject>`); hay que resolver el nombre propio del objeto.
- **Drivers**: el codegen ya usa `coreSchema.title` como nombre del modelo (`:673`); `collectRegistryJsonFiles` entrega el `json` completo.
- **Opcion elegida**: validar `properties[linkageField].isForeignKey === true` Y `references === json.title`.
- **Alternativas**: (a) derivar el nombre del filename — descartada: el filename puede diferir del title (casing); (b) no validar reflexividad, solo existencia del campo — descartada: el AC lo pide y un linkage no reflexivo rompe el linaje.
- **Consecuencias**: validacion self-contained (todo en el mismo json); sin dependencia de orden con otros validadores.
- **Session**: design.

### DEC-LOCAL-03: Split warning/error por el invariante mecanica-vs-politica
- **Contexto**: hay campos que deben rechazarse (estructura mala, strategy fuera de alcance) y campos que solo deben advertirse (politica movida fuera).
- **Drivers**: la politica (`allowedFromStates`/`initialStateValue`) se movio a `WorkflowStatus`/`Workflow`; configs viejas pueden aun declararla → warning permite migracion suave.
- **Opcion elegida**: malformacion estructural + strategy fuera de alcance → `error` (throw, aborta); campos de politica obsoletos → `warning` (console.warn, no aborta).
- **Alternativas**: (a) todo error — descartada: rompe el build de configs en migracion sin valor; (b) todo warning — descartada: dejaria pasar bloques estructuralmente rotos a runtime.
- **Consecuencias**: el dev limpia los campos obsoletos a su ritmo; los errores reales abortan temprano.
- **Session**: design.

### DEC-LOCAL-04: Alcance = validacion + fixtures; activacion en objeto real diferida
- **Contexto**: no hay objetos que declaren `versioning` aun; declararlo en `Activity` exige `previousVersionId` reflexivo (cambio de modelo).
- **Drivers**: HU-4 es "codegen valida + persiste"; HU-0j ya prueba persistencia con `metadataLoader` inyectable — no requiere objeto real.
- **Opcion elegida**: validar + testear con fixtures/metadata inyectada; activacion real → OQ-1 (ticket aparte).
- **Alternativas**: (a) activar en `Activity` ahora — descartada: arrastra el cambio de modelo de `previousVersionId` (HU-0e aplicado), ensancha el alcance y el riesgo; (b) no testear persistencia — descartada: es un AC.
- **Consecuencias**: alcance acotado y de bajo riesgo; activacion queda trazada en OQ-1.
- **Session**: design.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..REQ-06 pasan
- [ ] **Estructura**: bloque incompleto / no-objeto aborta con error claro (REQ-01)
- [ ] **Reflexivo**: `linkageField` no-FK o referencia ajena aborta (REQ-02)
- [ ] **Tipo**: `versionField` no-integer con increment aborta (REQ-03)
- [ ] **Strategy**: `user-provided`/`semver` abortan con "fuera de alcance SP3" (REQ-04)
- [ ] **Warning**: `allowedFromStates`/`initialStateValue` emiten warning sin abortar (REQ-05)
- [ ] **Persistencia**: fixture con `versioning` valido → `versioningConfig.versioning` poblado (REQ-06)
- [ ] **Regresion**: codegen 16 tenants sin cambios (gate ⚑ S2)
- [ ] **Docs**: `versioning-capability.md` presente (REQ-08)
- [ ] **Teach**: teach-close generado (DET-22)

## Archiving

Cuando este ticket cierre, este spec vive en `core/`. Mover a `_archive/` solo si una version superior lo reemplaza (no contemplado en este ticket).
