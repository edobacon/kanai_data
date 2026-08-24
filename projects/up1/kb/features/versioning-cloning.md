---
id: SPEC-features-002
project: up1
type: spec
module: features
category: features
tags: [up1, versioning, cloning, previousVersionId, prefillFrom, deepClone, polymorphicChildren, createInstance, curriculum-design, activity, curriculum, epic-UPONE-1206]
fecha: 2026-07-16
sources:
  - object-manager/objects/business/Base/activity.json, curriculum.json
  - mods/curriculum-design/objects/activity.json, curriculum.json
  - mods/curriculum-design/capabilities.json
  - object-manager/src/graphql/resolvers/instance.resolver.js
  - object-manager/src/graphql/resolvers/helpers/prefill-from-source.js
  - object-manager/src/graphql/resolvers/helpers/version-from-source.js
  - object-manager/src/graphql/resolvers/helpers/deep-clone-polymorphic.js
  - object-manager/src/graphql/resolvers/helpers/deep-clone-direct.js
  - object-manager/src/graphql/resolvers/helpers/derive-created-via.js
  - object-manager/src/services/codegen/helpers/validate-versioning.js
  - object-manager/src/services/codegen/generatePrismaSchema.js
  - object-manager/docs/versioning-capability.md, prefill-capability.md, polymorphic-children.md
  - layout/src/layouts/RecordList.vue, layout/src/composables/useCreateRowAction.ts
  - layout/lang/es/RecordList.i18n.json
  - mods/curriculum-design/config/layouts/default_Activity_view.json, default_Curriculum_list.json, default_AcademicProgram_list.json
  - Jira UPONE-1206 (epica), UPONE-1217, UPONE-1219
---

# Versionado y clonacion de objetos en uP1 (as-built)

> Este documento describe lo que **ya esta shippeado en produccion** (mod `curriculum-design`, sobre `Activity` y `Curriculum`). Las specs `core/spec-track-0-prerequisitos-clonacion.md` y `core/SPEC-object-manager-hu1-prefillfrom-createinstance.md` fueron la propuesta previa (draft); la seccion 5 detalla que quedo igual y que cambio en la implementacion final.

## Indice

1. [Que es: versionado vs clonacion](#1-que-es-versionado-vs-clonacion)
2. [Versionado](#2-versionado)
3. [Clonacion](#3-clonacion)
4. [UI: modal de confirmacion y botones](#4-ui-modal-de-confirmacion-y-botones)
5. [Relacion con las specs draft previas](#5-relacion-con-las-specs-draft-previas)

---

## 1. Que es: versionado vs clonacion

Son dos capacidades relacionadas pero distintas. Confundirlas lleva a un diseño incorrecto:

| | **Clonar** (primitivo transversal) | **Versionar** (semantica de dominio, construida sobre clonar) |
|---|---|---|
| Que hace | Pre-llena una instancia nueva con los campos de otra (`source`) | Clona + encadena linaje + numera + resetea al estado inicial |
| Como se activa | `data.prefillFrom = { source }` | `data.prefillFrom = { source }` **+** `data.asNewVersion = true` |
| Linaje | No | Si, FK reflexiva (`previousVersionId`) apunta al source |
| Numero de version | No | Si, `version` se incrementa |
| Estado del resultado | Hereda el del source (salvo `exclude`) | Se resetea al estado inicial (workflow) o al `static_default` del enum (estado-simple) |
| A quien sirve | Cualquier objeto/mod | Objetos con ciclo de vida versionable (hoy: `Activity`, `Curriculum`) |

Ninguna de las dos capacidades tiene una mutation GraphQL propia. Ambas corren dentro de la mutation generica `createInstance(objectType, data)` (`object-manager/src/graphql/resolvers/instance.resolver.js`), disparadas por dos directivas ortogonales que viajan **dentro** de `data` (no son argumentos GraphQL, no hay cambio de SDL):

- `data.prefillFrom = { source, exclude?, deepClone? }`: clonacion.
- `data.asNewVersion = true`: versionado (requiere `prefillFrom.source`; sin el, error `AS_NEW_VERSION_REQUIRES_PREFILL`).

`useCreateRowAction.ts:9-11` (`layout/src/composables/useCreateRowAction.ts`) lo resume asi en el codigo: *"Two orthogonal flags compose two use cases over a single primitive"*.

---

## 2. Versionado

### 2.1 Campos del modelo

`previousVersionId` es la FK reflexiva que encadena una version con su anterior. Declarada en el JSON del objeto:

```json
// mods/curriculum-design/objects/activity.json:90-98
"previousVersionId": {
  "type": "string",
  "isForeignKey": true,
  "references": "Activity",
  "targetField": "id",
  "description": "Version anterior del mismo programa..."
}
```

Mismo patron en `mods/curriculum-design/objects/curriculum.json:141-149` (`references: "Curriculum"`).

`version` es un entero autoincremental (`activity.json:77-83`, `curriculum.json:128-134`, `static_default: "1"`). El unique constraint compuesto se declara en `metadata.uniqueConstraints`:

```json
// activity.json:48 y curriculum.json:40
"uniqueConstraints": [["previousVersionId", "version"]]
```

El codegen lo traduce a un `@@unique` de Prisma (`object-manager/src/services/codegen/generatePrismaSchema.js:518-533` para objetos base). Impide que dos versiones del mismo linaje (mismo `previousVersionId`) compartan numero de `version`, como red de seguridad ante versionados concurrentes.

`versionSourceId` **no es una columna persistida** del objeto (no aparece en `properties` de `activity.json` ni de `curriculum.json`, ni en el `schema.prisma` generado). Es un valor **transient**, computado por `deriveCreatedVia` (`object-manager/src/graphql/resolvers/helpers/derive-created-via.js:17-25`):

```js
if (asNewVersion === true) {
  return { createdVia: 'version', versionSourceId: prefillFrom?.source ?? null };
}
```

Se calcula solo para poblar el evento de auditoria (DataLog) que registra "esta creacion nace de un versionado, cuyo origen es X". Es distinto del linaje real (`previousVersionId`, que si vive en la tabla). El campo `auditSourceField: "versionSourceId"` en `metadata.versioning` (`activity.json:43`) documenta el nombre convencional para ese proposito, pero el runtime de versionado actual no lo lee de vuelta (confirmado: no hay ninguna columna `versionSourceId` en `object-manager/prisma/UPU/schema.prisma`).

### 2.2 Gate `versionableFromStates`

Declarado bajo `metadata.versioning` en el JSON del objeto:

```json
// activity.json:39-47
"versioning": {
  "linkageField": "previousVersionId",
  "versionField": "version",
  "versionStrategy": "increment",
  "auditSourceField": "versionSourceId",
  "stateField": "status",
  "versionableFromStates": ["Approved", "Active"],
  "requiredCapability": "activity:version"
}
```

Mismo bloque en `curriculum.json:44-51` (`versionableFromStates: ["Approved", "Active"]`, `requiredCapability: "curriculum:version"`).

Es un gate **opt-in** para objetos de "estado-simple" (sin workflow relacional): si el estado actual del source no esta en la lista, la mutation lanza `SOURCE_NOT_VERSIONABLE`. Se valida en build-time (rechaza el codegen si el campo no existe en `properties` o si sus valores no pertenecen al enum declarado) por `object-manager/src/services/codegen/helpers/validate-versioning.js:106-136`, y es **mutuamente excluyente** con `initialStateField` (la via workflow-backed): la linea 138-149 del mismo archivo aborta el codegen si un objeto declara ambos. El gate para objetos aun respaldados por workflow relacional usa en cambio `WorkflowStatus.allowsVersioning` (columna de politica en BD, no en el JSON).

### 2.3 El helper que crea una nueva version

No hay resolver/mutation dedicado a versionar. La logica pura vive en `object-manager/src/graphql/resolvers/helpers/version-from-source.js`, funcion `prepareVersionData` (lineas 29-129), invocada por `createInstance` cuando `data.asNewVersion === true`. En orden:

1. **Guard RT** (linea 46-48): rechaza `asNewVersion` sobre un RecordType (`rt__X__base`) con `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE` (el path RT hace writes fuera de la transaccion atomica, no es seguro versionarlo hoy).
2. **Lee el source** (linea 71-75), con `include` de `currentstatus`/`workflow` solo si el objeto es workflow-backed (`needsWorkflow = !!initialStateField`, linea 60). Si no existe, `PREFILL_SOURCE_NOT_FOUND`.
3. **Valida el gate**: via `allowsVersioning` (objetos workflow-backed, lineas 78-88) o via `versionableFromStates` (objetos estado-simple como `Activity` y `Curriculum`, lineas 89-100). Ambas rutas lanzan `SOURCE_NOT_VERSIONABLE`.
4. **Calcula el numero de version** como el **maximo del linaje completo + 1**, no `source.version + 1` (funcion `maxVersionInLineage`, lineas 138-175): recorre hacia atras por `linkageField` hasta la raiz y hacia adelante por BFS de hijos que apuntan a instancias ya visitadas, para tolerar versionar desde una version intermedia sin colisionar numeros.
5. **Retorna** una copia de `data` con `version = maxVersion + 1` y `previousVersionId = source.id` (mas el estado inicial del workflow si aplica). No muta el `data` recibido.

La validacion de la capability (`activity:version`, `curriculum:version`) ocurre en el caller (`instance.resolver.js`), antes de invocar este helper. Cuando `asNewVersion` esta activo, todo el conjunto de writes (padre + hijos clonados) corre dentro de una `$transaction` con nivel `Serializable`, a diferencia del path de create normal, que no usa transaccion (comportamiento legado preservado para no romper a los ~64 callers existentes de `createInstance`).

### 2.4 Cadena de version (`getVersionChain`) y relacion con BR-VER-001

Query GraphQL dedicada para leer el linaje completo: `getVersionChain(objectType, instanceId)` (SDL en `object-manager/src/graphql/typeDefs/static.js:1111`, resolver en `object-manager/src/graphql/resolvers/instance.resolver.js:2850`). `instanceId` puede ser cualquier instancia del linaje, no necesariamente la raiz; el resolver reconstruye la cadena completa (mismo patron backward + BFS forward que `maxVersionInLineage`).

`BR-VER-001` aparece documentada como comentario de test en `object-manager/tests/unit/resolvers/deleteImpactPlan.test.js:375`: describe la regla de que borrar un registro que tiene un sucesor de version (otro registro cuyo `previousVersionId` apunta a el) debe bloquear el delete en modo `Restrict`, para no romper el linaje. No existe hoy un catalogo formal de reglas de negocio (`BR-*`) fuera de ese comentario ad-hoc; se documenta aqui para que quede trazado.

### 2.5 Tab "Versiones" en el layout

Declarado en `mods/curriculum-design/config/layouts/default_Activity_view.json:90-96` (tab `label: "Versiones"`, `requiredCapability: "activity:view"`), que referencia el elemento `versionsList` (lineas 461-508 del mismo archivo). Es un `record-list` embebido **filtrado por `code`** (`"filters": [{ "field": "code", "operator": "EQUALS", "value": "{{record.code}}" }]`, linea 472-474) ordenado por `version` descendente, **no** una consulta a `getVersionChain`. El row action `create-new-version` del propio tab (linea 478-497) es el que dispara el versionado (`prefillFromCurrent: true` + `asNewVersion: true` + `confirmCascade: true`, gateado por `visibilityConditions: status in [Approved, Active]`).

> Nota de drift: `mods/curriculum-design/.ai/PATTERNS.md:631` describe la tab "Versiones" como consumidora de `getVersionChain`. Grep sobre `layout/`, `suite/` y `mods/curriculum-design/` no encontro ningun consumidor real de esa query fuera de `object-manager`; la tab usa el filtro por `code` descrito arriba. Es documentacion desactualizada a corregir en ese archivo, no un bug de codigo.

---

## 3. Clonacion

### 3.1 Capabilities `*:clone`

Todas declaradas en `mods/curriculum-design/capabilities.json`:

| Capability | Linea | Objeto |
|---|---|---|
| `bibliographyreference:clone` | 104 | Referencia bibliografica |
| `curricularsection:clone` | 109 | Seccion curricular (todos los RecordType polimorficos, incluida Modalidad y CustomSection) |
| `academicprogram:clone` | 114 | Programa academico (carrera) |
| `curriculum:clone` | 124 | Curriculum (Plan/Minor) |

No existe `activity:clone`: `Activity` solo versiona (via `activity:version`), no se clona como registro standalone. Tampoco existe `academicprogram:version`: `AcademicProgram` solo clona.

### 3.2 El flujo de clonar

Al igual que versionar, no hay resolver dedicado: `createInstance` con `data.prefillFrom = { source, exclude?, deepClone? }`. Dos piezas del helper `object-manager/src/graphql/resolvers/helpers/prefill-from-source.js`:

- `applyPrefillFromSource` (lineas 136-178): busca el `source` con el client Prisma tenant-scoped (`prisma[model].findUnique`), copia sus campos escalares excluyendo `PREFILL_DEFAULT_EXCLUDE = ['id', 'createdAt', 'updatedAt', 'createdBy']` (linea 20) mas el `exclude` declarado, y deja que lo explicito en `data` pise al source (linea 176-177).
- `resolveEffectivePrefillFrom` (lineas 79-120): combina la politica declarativa persistida en el registry (`core_ObjectDefinition.versioningConfig.prefillFrom`) con la directiva runtime. `source` siempre viene del runtime (nunca se declara que instancia clonar); `exclude`/`deepClone` se unen (union declarativo + runtime). Activacion gateada por presencia de `source`: sin el, ni se lee el registry ni se activa el prefill, preservando el comportamiento de los ~64 callers existentes que no clonan.

### 3.3 Que copia y que no

Config declarativa de `exclude` bajo `metadata.prefillFrom` de cada objeto:

```json
// activity.json:35-38
"prefillFrom": {
  "exclude": ["status", "previousVersionId", "versionLabel"],
  "deepClone": ["sections"]
}

// curriculum.json:41-43
"prefillFrom": {
  "exclude": ["version", "previousVersionId", "versionLabel", "status"]
}
```

`code` **no** aparece en ninguna lista de exclude declarativa: la exclusion de `code` al clonar (para forzar que el usuario lo reescriba, por ser unico) no es un mecanismo del registry sino de **UI** (row action `uniqueFields`, ver 4.2). El registry solo excluye por defecto identidad/auditoria (`id`, `createdAt`, `updatedAt`, `createdBy`) mas lo declarado arriba (estado y linaje, que no tiene sentido heredar al clonar/versionar).

### 3.4 Hijos polimorficos y directos

`Activity` y `Curriculum` declaran `polymorphicChildren` bajo `metadata` (shape `{name, object, via, ownerTypeValue, recursiveBy}`), ej. `activity.json:12-27` para `sections` (`CurricularSection`, via `ownerType/ownerId`, `recursiveBy: "parentId"`) y `requirements`. `Curriculum` ademas declara `directChildren` (relacion 1-N por FK simple, sin owner polimorfico): `planEntries` (fk `planId`) y `requirementCategories` (fk `curriculumId`), `curriculum.json:28-38`.

El helper `object-manager/src/graphql/resolvers/helpers/deep-clone-polymorphic.js`, funcion `deepClonePolymorphicChildren` (lineas 315-397), hace `findMany` por `ownerType/ownerId`, recorre en orden topologico via `recursiveBy` (self-ref) y remapea cada hijo al nuevo padre. Retorna un `Map<oldId, {newId, type}>` (lineas 313, 380): el equivalente implementado de la "Opcion A: Map simple" que la spec draft `spec-track-0-prerequisitos-clonacion.md` (REQ-S1-DECISION) recomendaba, con un campo `type` adicional no anticipado en esa decision, necesario para que el remap de hijos derivados filtre por tipo.

Los hijos con **referencias cruzadas entre si** (ej. `CurricularLink` conecta dos `CurricularSection` por `sourceSectionId`/`targetSectionId`) se declaran en `polymorphicChildrenDerived` (`activity.json:28-34`) y su remapeo lo ejecuta `applyDerivedRemap` (mismo archivo, lineas 108-192), ya generalizado en el core: no requiere un hook por-mod.

---

## 4. UI: modal de confirmacion y botones

### 4.1 `confirmCascade`

Prop booleana de un row action, tipada en `layout/src/types/recordlist.ts:275-278`. Consumida en `layout/src/layouts/RecordList.vue:2975-2976`:

```js
if (action.confirmCascade) {
  const approved = await confirmCascadeOperation(action, item);
  if (!approved) return;
}
```

`confirmCascadeOperation` (lineas 3553-3566) resuelve el label del verbo y arma el modal, cuyo template esta en las lineas 861-883 (`$t('recordList.confirmCascade.title', ...)`). Ejemplo de uso real: el row action `create-new-version` de `Activity` lo activa (`default_Activity_view.json:489`, `"confirmCascade": true`); el equivalente en `Curriculum` lo declara en `false` explicito (`default_Curriculum_list.json:29`). Versionar un Curriculum no dispara modal, diferencia de UX entre ambos objetos a revisar con el equipo si no es intencional (no es un bug de codigo, es una decision de configuracion por objeto).

### 4.2 `cloneTitle` (i18n) y las dos estrategias de clon

`cloneTitle` es una key de i18n (`layout/lang/es/RecordList.i18n.json:192`, `"cloneTitle": "{{action}}: {{name}}"`, equivalente en `en/` y `pt/`), usada en `RecordList.vue:2870` para titular el modal de clon pre-llenado (ej. "Duplicar: Calculo I").

Hay **dos estrategias de UI** segun si el objeto tiene un campo unico que colisiona al clonar:

**A) Con modal (`cloneStrategy: "prefilledModal"`)**: usada por `academicprogram:clone`, `curriculum:clone`, `curricularsection:clone` (ej. `default_AcademicProgram_list.json`, `default_Curriculum_list.json`). El click **no** dispara `createInstance` de inmediato: `RecordList.vue:2833-2888` aplana el registro fuente, excluye el set de identidad (`id`, `createdAt`, `updatedAt`, `createdBy`, mas relacionales como `parentId`/`sourceId`/`position`) sumado a `uniqueFields` del action, y abre un modal de create pre-llenado titulado con `cloneTitle`. Solo al guardar (usuario completa el campo unico, ej. `code`) se dispara `createInstance` real, lo que evita colisiones de unique constraint a mitad de operacion.

**B) Sin modal, directo (`prefillFromCurrent: true`)**: usada por versionado y por objetos sin conflicto de unicidad (`version` se autocalcula, no lo escribe el usuario). Handler en `layout/src/composables/useCreateRowAction.ts`, funcion `createCreateHandler` (lineas 99-157): arma `data` via `buildCreateData` (lineas 76-85: `data.prefillFrom = {source: rowId}` si `prefillFromCurrent`, `data.asNewVersion = true` si aplica), llama `createInstance` directo por Apollo, muestra un toast (`versionCreated`/`cloneCreated`) y redirige segun `redirectTo`.

---

## 5. Relacion con las specs draft previas

| Pieza propuesta en `core/spec-track-0-prerequisitos-clonacion.md` | Estado en produccion |
|---|---|
| Columna `versioningConfig Json?` en `core_ObjectDefinition` | Implementada, forma identica: `object-manager/prisma/UPU/schema.prisma:38` (`versioningConfig Json?`) |
| Funcion `syncVersioningConfigToRegistry` en Fase 3 del codegen | Implementada con el mismo nombre: `object-manager/src/services/codegen/generatePrismaSchema.js:3029-3083`. Shape persistido: `{ versioning, prefillFrom }` |
| Bloque declarativo `polymorphicChildren` bajo `metadata` | Implementado, mismo nombre y ubicacion (`activity.json:12-27`, `curriculum.json:12-27`). Se sumaron dos bloques no anticipados en el draft: `polymorphicChildrenDerived` (remap de FKs cruzadas entre hijos) y `directChildren` (relaciones 1-N simples) |
| Resolver `deepClone` con mapa `oldId->newId` (REQ-06) | Implementado, pero no como resolver/mutation dedicado: es un helper invocado dentro de `createInstance` cuando `data.prefillFrom.deepClone` esta presente. El mapa retornado lleva un campo `type` adicional (`Map<oldId, {newId, type}>`), no un mapa plano id-a-id |
| Decision recomendada A (Map simple) del REQ-S1-DECISION | Confirmada: la implementacion usa un `Map`, no una clase ni callbacks inyectables (opciones B/C descartadas) |

De `core/SPEC-object-manager-hu1-prefillfrom-createinstance.md` (HU-1): la decision central del draft (`DEC-LOCAL-02`, extender `data.prefillFrom` existente en vez de agregar un argumento GraphQL nuevo) se mantuvo intacta en produccion; no hay cambio de SDL en `createInstance` hasta hoy.

**Que quedo pendiente o diverge**:

- Ninguna de las dos specs draft anticipaba el mecanismo de **versionado** (`asNewVersion`, `version-from-source.js`, `versionableFromStates`) ni la tab "Versiones" del layout: ambos llegaron en tickets posteriores (UPONE-1209 HU-3, UPONE-1381 P4) fuera del alcance de esos dos documentos.
- El draft no distinguia **dos estrategias de UI** (modal pre-llenado vs. clon directo); la implementacion real las separo segun si el objeto tiene un campo unico en conflicto.
- La documentacion `mods/curriculum-design/.ai/PATTERNS.md:631` describe la tab "Versiones" consumiendo `getVersionChain`, lo cual no coincide con el codigo real (la tab filtra por `code`); es drift de documentacion, no del draft en si.
- El `versionSourceId` mencionado en `metadata.versioning.auditSourceField` no se materializo como columna persistida, sino como campo transient de auditoria (`derive-created-via.js`); el draft no distinguia este matiz.

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-07-16 | Documento inicial as-built de versionado y clonacion, basado en codigo fuente de object-manager, layout y mods/curriculum-design (epica UPONE-1206, tickets UPONE-1217/1219) |
