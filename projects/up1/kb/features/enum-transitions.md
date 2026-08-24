---
id: SPEC-features-007
project: up1
type: spec
module: features
category: features
fecha: 2026-07-16
ticket: UPONE-1381
tags: [up1, enum, transiciones, estado, status, versionado, versionableFromStates, AP-01, AP-02, AP-03, AP-04, curriculum-design]
sources:
  - object-manager/docs/enum-transitions.md (doc interno completo, 267 lineas)
  - object-manager/src/services/codegen/helpers/enum-transitions.js
  - object-manager/src/services/validation/enum-transition-guard.js
  - object-manager/src/graphql/resolvers/instance.resolver.js
  - object-manager/src/graphql/resolvers/helpers/version-from-source.js
  - object-manager/src/services/codegen/helpers/validate-versioning.js
  - layout/src/composables/useEnumTransitions.ts
  - layout/src/layouts/RecordDetail.vue
  - layout/src/layouts/RecordList.vue
  - layout/src/components/molecules/TableCell/TableCell.vue
  - layout/src/components/molecules/BulkTransitionPreview/
  - mods/curriculum-design/objects/activity.json
  - mods/curriculum-design/logic/helpers/documentDependents.js
  - mods/curriculum-design/logic/polymorphicUpdate.resolver.js
  - mods/curriculum-design/logic/curriculum-update.resolver.js
  - object-manager/src/graphql/resolvers/objectDefinition.resolver.js (getValidTransitions, previewBulkTransition)
---
# Transiciones de enum (UPONE-1381)

## Indice

1. [Que es y por que](#1-que-es-y-por-que)
2. [Las 4 capas: AP-01 a AP-04](#2-las-4-capas-ap-01-a-ap-04)
3. [Gate de versionado: versionableFromStates](#3-gate-de-versionado-versionablefromstates)
4. [Caso real: Activity en curriculum-design](#4-caso-real-activity-en-curriculum-design)
5. [Guard adicional: assertNoActiveDependentsOnRevert](#5-guard-adicional-assertnoactivedependentsonrevert)
6. [Capa UI: selector, edicion inline y bulk](#6-capa-ui-selector-edicion-inline-y-bulk)
7. [Limitaciones conocidas](#7-limitaciones-conocidas)

---

## 1. Que es y por que

`properties.transitions` es un motor generico que declara, dentro de un campo
enum del JSON de un objeto, qué transiciones de valor a valor están permitidas.
Reemplaza, para casos que no necesitan configuración por institución, al motor
relacional `WorkflowTransition` del mod curriculum-design (estados como
entidades `WorkflowStatus`, referenciadas por FK).

| | `properties.transitions` | `WorkflowTransition` |
|---|---|---|
| Qué es | Restricción declarativa sobre un campo enum | Grafo relacional de workflow (Learning Assurance v1.10) |
| Modelo | Vive en `core_FieldDefinition.properties`, sin tablas nuevas | Objetos `Workflow` / `WorkflowStatus` / `WorkflowTransition` |
| Estado | Un valor de enum (string) | Una entidad `WorkflowStatus` referenciada por FK |
| Configuración | Build-time, versionada junto al mod, igual para todos los tenants | Runtime, configurable por institución (multi-tenant) |
| Aplica sobre | Campo enum | Campo FK |

Ambos motores conviven porque aplican a shapes de campo distintos (enum vs FK).
El caso real de este documento (Activity, seccion 4) reemplazó `WorkflowTransition`
por `properties.transitions` justamente porque el estado de Activity no necesitaba
configuración por tenant, solo una máquina de estados fija versionada con el mod.

Doc interno completo (formato JSON, comportamiento detallado de las 4 capas,
tests): `object-manager/docs/enum-transitions.md` (267 lineas). Este documento
resume el motor para el KB y agrega el caso real de Activity/Curriculum, que el
doc interno no cubre.

---

## 2. Las 4 capas: AP-01 a AP-04

El motor se construyó en 4 capas incrementales, cada una con su propio ticket:

### AP-01 (build-time, codegen)

Valida el shape de `transitions` y lo persiste en
`core_FieldDefinition.properties.transitions`.

- `object-manager/src/services/codegen/helpers/enum-transitions.js:75-204`
  (`validateEnumTransitions`, `extractEnumTransitions`).
- `enum-transitions.js:216-242` (`reconcileFieldProperties`): si el JSON deja
  de declarar `transitions` para un campo, el codegen lo elimina de la BD (no
  queda stale).
- Aplica a campos **base**. Los campos `ext__` no pasan por este pre-pass: un
  `transitions` declarado ahi queda como no-op silencioso (ver seccion 7).

### AP-02 (runtime, enforcement)

Enforcea la máquina de estados en `updateInstance`, después de auth y antes de
`prisma.update()`.

- `object-manager/src/graphql/resolvers/instance.resolver.js:136-212`
  (`enforceEnumTransitions`).
- `object-manager/src/services/validation/enum-transition-guard.js:1-90`
  (`evaluateTransition`, guard puro y síncrono).
- Cableado en los dos paths de escritura (base y RecordType) y también en
  `updateBulkInstances`.

Semántica del guard para un campo enum gobernado:

| Escenario | Resultado |
|---|---|
| `new === old` (sin cambio) | Skip, no se evalúa nada |
| `from` null (asignación inicial) | Skip, no es una transición guardada |
| `to` null (limpiar el campo) | Skip, no es una transición guardada |
| Transición no declarada | Rechaza |
| Transición declarada, `conditions` no cumplida | Rechaza |
| Transición declarada, `conditions` cumplida | Enforcea `requiredCapabilities` (OR entre candidatas) y procede |

**Emisión de eventos `onTransition`** (implementado, dormido): una transición puede declarar `onTransition` con ids de evento. Cuando la transición gobernada tiene éxito, `enforceEnumTransitions` arma `pendingEvents` desde `chosen.onTransition` y `emitTransitionEvents` (`instance.resolver.js:221-267`) los resuelve por id (`loadEvents`), encola un job en BullMQ y publica al canal Redis del mod. Es comportamiento real, no un stub, pero hoy **ningún objeto declara `onTransition`** (grep sin hits), así que no se dispara.

### AP-03 (UI, selector)

Ver seccion 6.

### AP-04 (editor visual)

Editor visual de transiciones en `up1-manager`, restringido a campos enum
**custom** (`isBaseField=false`). Los campos base gobiernan sus transiciones
por el JSON del objeto (AP-01) y el codegen los reconcilia; los campos custom
no pasan por ese loop, asi que las transiciones declaradas via editor
sobreviven a cualquier `codegen` sin necesitar un marcador de provenance.
División limpia de propiedad entre AP-01 y AP-04.

---

## 3. Gate de versionado: versionableFromStates

`versionableFromStates` es el sucesor declarativo de
`WorkflowStatus.allowsVersioning` para objetos que ya no dependen de un
workflow relacional. Se declara en `metadata.versioning` junto a `stateField`
(default `"status"`), y es **mutuamente excluyente** con `initialStateField`:
el codegen aborta si un objeto declara ambos.

- Validación build-time:
  `object-manager/src/services/codegen/helpers/validate-versioning.js:106-150`.
- Runtime: `object-manager/src/graphql/resolvers/helpers/version-from-source.js:89-101`
  lanza `SOURCE_NOT_VERSIONABLE` si el estado actual del registro fuente no está
  en la lista declarada.

En el caso de Activity (seccion 4), `versionableFromStates` es
`["Approved", "Active"]`: solo se puede versionar un programa aprobado o vigente,
nunca uno en borrador, en revisión, deprecado o archivado.

---

## 4. Caso real: Activity en curriculum-design

UPONE-1381 reemplazó el motor de workflow relacional (`currentStatusId` hacia
`WorkflowStatus`, retirado en S6/S7 del mod) por `properties.transitions` sobre
el campo `status` de `Activity`. El enum tiene 6 estados: `Draft`, `InReview`,
`Approved`, `Active`, `Deprecated`, `Archived`. Declarado en
`mods/curriculum-design/objects/activity.json:134-150`; el gate de versionado
en el mismo archivo, dentro de `metadata.versioning`.

8 transiciones declaradas, cada una con su capability requerida:

| From | To | Capability requerida | requiresComment |
|---|---|---|---|
| Draft | InReview | (ninguna) | no |
| InReview | Approved | `activity:approve` | no |
| InReview | Draft | (ninguna) | si |
| Approved | Active | `activity:publish` | no |
| Approved | Draft | (ninguna) | no |
| Active | Deprecated | `activity:deprecate` | si |
| Active | Draft | `activity:revert` | si |
| Deprecated | Archived | `activity:archive` | no |

`requiresComment` está declarado como metadata en el JSON, pero **aún no está
enforzado** por el motor de enum de core: hoy no existe UI de transición
manual que lo consuma; queda como dato disponible para un futuro sistema de
cambio manual de estado.

`versionableFromStates: ["Approved", "Active"]` vive junto a estas
transiciones en el mismo bloque `metadata.versioning`, con
`requiredCapability: "activity:version"` para la operación de versionado en si.

Contenido relacionado: `Curriculum` y `Offering` siguen el mismo patrón de
motor de estado dentro del mod (ver `objects/curriculum.json`); esta sección
documenta `Activity` como el caso de referencia porque concentra las 8
transiciones y el gate de versionado en un solo objeto.

---

## 5. Guard adicional: assertNoActiveDependentsOnRevert

El evaluador de `conditions` de AP-02 es puro y síncrono (no consulta otras
tablas), asi que no puede expresar una regla como "no revertir si hay
matriculados activos". Esa regla de negocio cross-objeto vive en un guard
separado, ejecutado **antes** del guard genérico de AP-02:

- `mods/curriculum-design/logic/helpers/documentDependents.js:103-135`
  (`assertNoActiveDependentsOnRevert`), con la configuración de qué cuenta
  como dependiente en `DEPENDENT_CONFIG:44-69`.
- Bloquea la transición `Active` a `Draft` cuando el documento (`Activity`,
  `Offering` o `Curriculum`) tiene matriculados activos.
- Se invoca desde `polymorphicUpdate.resolver.js:679` y
  `curriculum-update.resolver.js:93`, antes de que el resolver llegue al path
  que dispara `enforceEnumTransitions`.

Distinción importante: el contenido del plan (secciones, requisitos) **no**
cuenta como dependiente para este guard. Solo las matrículas operacionales
(estudiantes inscritos activamente) lo activan.

---

## 6. Capa UI: selector, edicion inline y bulk

La UI nunca evalúa fórmulas ni permisos en el cliente: consume las mismas
queries que resuelve el guard de AP-02 en el backend. Esas queries son
`getValidTransitions` (`object-manager/src/graphql/resolvers/objectDefinition.resolver.js:528`)
y `previewBulkTransition` (`:602`): calculan en el servidor las transiciones
válidas para un registro (o el plan de bulk con los omitidos), reusando el
mismo motor de AP-02.

- Composable: `layout/src/composables/useEnumTransitions.ts:1-297`
  (`fetchValidTransitions`, `fetchBulkPreview`, mas los helpers puros
  `buildTransitionItems` y `buildBulkApplyPlan`).
- Selector en formulario: `layout/src/layouts/RecordDetail.vue:3055-3131`,
  enriquece cualquier enum a un select con las transiciones válidas, sea
  `native:true` o `false`.
- Edición inline en tabla (parte del reboot de AP-04 sobre `TableCell`):
  `layout/src/components/molecules/TableCell/TableCell.vue:700-761`.
- Bulk edit adaptativo con preview de registros omitidos:
  `layout/src/layouts/RecordList.vue:3165-3233` junto con
  `layout/src/components/molecules/BulkTransitionPreview/`.
- Mock para Storybook: `layout/src/utils/mockApolloClient.ts:21-155`.

**Fail-soft**: si el query de transiciones válidas falla, el selector cae al
enum completo. Esto no abre una brecha de seguridad porque AP-02 sigue
rechazando en el backend cualquier transición inválida (defensa en capas).

**Cambio de UI en Activity**: antes de este trabajo, el estado se mostraba con
un badge de solo lectura (`activity-status-badge`). Ahora es un select
editable, configurado en
`config/layouts/default_Activity_edit.json:40-45` y
`default_Activity_view.json:99`, con ancho `container:4` (un tercio del
formulario). En el estado actual del código (verificado 2026-07-20) el campo
`status` queda **antes** de "Vigente" (`isCurrent`) en ambos layouts: un commit
posterior (UPONE-1393, ajeno a AP-04) revirtió el reorden "tras Vigente" que se
había pedido. Ademas `default_Activity_view.json` tiene hoy una entrada
`"status"` **duplicada** en su array `elements` (lineas 28 y 30): artefacto del
merge de reorden, a corregir en código (ver follow-ups).

---

## 7. Limitaciones conocidas

- **Path-finding multi-salto en bulk**: el preview de bulk no sugiere el
  siguiente estado alcanzable cuando el destino elegido no es directo desde el
  estado actual de un registro.
- **Campos `ext__` (extended)**: un `transitions` declarado en un campo
  `ext__<CLIENT>__<objeto>.json` no pasa por AP-01 (ese codegen no registra
  `core_FieldDefinition` para campos extended). Queda como no-op silencioso:
  el campo se vuelve columna del modelo Prisma `ext__`, pero la metadata
  `transitions` no se persiste, no se valida y no aparece en
  `getObjectFields`. El soporte para extended queda fuera de AP-01 por
  arquitectura; se cubriria, si hiciera falta, por el path del editor (AP-04).
- **`requiresComment` sin enforcement runtime**: declarado como metadata en el
  JSON (ver seccion 4), pero el motor de enum de core todavia no lo exige. Lo
  lee el MCP; lo consumirá un futuro sistema de cambio manual de estado.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-07-16 | Documento inicial: resumen del motor de transiciones de enum (AP-01 a AP-04), gate de versionado y caso real de Activity/curriculum-design, basado en `object-manager/docs/enum-transitions.md` y codigo fuente citado (UPONE-1381) |
