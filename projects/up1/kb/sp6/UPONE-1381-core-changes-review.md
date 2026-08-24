# UPONE-1381 (P4) — Cambios en `object-manager` (core) para revisión del team core

> **Para**: team core / reviewers de `object-manager`.
> **Rama**: `feat/UPONE-1381-enum-transitions` (aún sin mergear a `develop`).
> **Contexto**: P4 unifica el flujo de estados de `Curriculum`, `Activity` y `Offering(Syllabus)` bajo el **motor de transiciones enum de core** (ya existente) y **retira el motor de workflow relacional a medida del mod** `curriculum-design`. Al retirar ese workflow, una capacidad que vivía en él —el **gate de versionado** ("desde qué estado se puede versionar")— quedaba huérfana. Este PR la **reubica a core** de forma genérica. Ese es el 90% del cambio de core; el resto es exposición GraphQL y validación en codegen.

---

## TL;DR

- **Un solo cambio de lógica de core**: `version-from-source.js` gana una rama para gatear el versionado de **objetos de estado-simple** (sin workflow) vía una config declarativa `versionableFromStates`, en vez de vía `WorkflowStatus.allowsVersioning`.
- **Es opt-in y backward-compatible**: un objeto que no declara `versionableFromStates` versiona como hoy; un objeto workflow-backed (`initialStateField`) no cambia su comportamiento.
- **El motor de transiciones (`enforceEnumTransitions`) NO se tocó** — se reutiliza tal cual. Blast radius acotado.
- **No es un capricho del mod**: el gate de versionado es comportamiento **transversal de plataforma**. Dejarlo en el mod habría significado reconstruir en el mod un candado que core ya sabe aplicar — la deuda que este sprint elimina.

---

## Alcance del cambio en core

| Archivo | Tipo | Qué cambia | Riesgo |
|---|---|---|---|
| `src/graphql/resolvers/helpers/version-from-source.js` | **lógica (hand-written)** | Nueva rama de gate por `versionableFromStates` para objetos estado-simple | **Medio** — es el core de la revisión |
| `src/services/codegen/helpers/validate-versioning.js` | **validación codegen (hand-written)** | Valida el shape de `versionableFromStates`/`stateField` + exclusión mutua con `initialStateField` | Bajo — fail-fast en build |
| `src/graphql/typeDefs/dynamic.js` | generado | Expone `status`/`lifecycleStatus` en el schema GraphQL de Activity/Offering/RTs | Bajo — aditivo |
| `src/graphql/typeDefs/mods.js` | generado | −114 líneas: retiro de los typedefs del workflow del mod | Bajo — retiro de tipos ya sin consumidores |
| `prisma/{BASEMODEL,UPU}/schema.prisma` | generado | +21 c/u: campos enum nuevos (`status`/`lifecycleStatus`) | Migración — ver "Qué revisar" |
| `objects/business/Base/{activity,curriculum,offering}.json` | config (sync del mod) | Declaran `transitions` + `versioning.versionableFromStates` | Bajo — datos declarativos |

> Los archivos **generados/sync** (prisma, dynamic.js, mods.js, object JSONs) son consecuencia del codegen + sync sobre la config declarada; la revisión de lógica se concentra en los **dos hand-written** de arriba.

---

## Cambio central — `version-from-source.js`

### Qué hace hoy (antes de P4)

`prepareVersionData` decide si una fuente puede versionarse. El discriminante es `needsWorkflow = !!initialStateField`:

- **Objetos workflow-backed** (declaran `initialStateField`, ej. `Activity` → `currentStatusId`): el gate es `source.currentstatus.allowsVersioning` (lo decide `WorkflowStatus`).
- **Objetos estado-simple** (no declaran `initialStateField`, ej. `Curriculum` pre-P4): **no había gate** — versionaban desde cualquier estado.

### Qué agrega P4

Una rama nueva `else if` para el caso estado-simple **cuando declara `versionableFromStates`**:

```js
// version-from-source.js — prepareVersionData
const { linkageField, versionField, initialStateField, versionableFromStates, stateField } = versioningConfig;
const needsWorkflow = !!initialStateField;
// ...
if (needsWorkflow) {
  // sin cambios — gate por WorkflowStatus.allowsVersioning (comportamiento idéntico)
  if (!source.currentstatus?.allowsVersioning) throw new Error('SOURCE_NOT_VERSIONABLE');
  if (!source.workflow?.initialStatusId)       throw new Error('WORKFLOW_HAS_NO_INITIAL_STATUS');
} else if (Array.isArray(versionableFromStates) && versionableFromStates.length > 0) {
  // NUEVO (UPONE-1381): gate declarativo para objetos estado-simple sin workflow.
  const gateField = stateField || 'status';
  if (!versionableFromStates.includes(source[gateField])) {
    throw new Error('SOURCE_NOT_VERSIONABLE');
  }
}
```

### Por qué es necesario

`Activity` guardaba su gate de versionado **dentro del workflow relacional del mod** (vía `WorkflowStatus.allowsVersioning`). P4 **retira ese workflow**. Sin reubicar el gate, `Activity`/`Curriculum` versionarían **desde cualquier estado** → se pierde el candado de negocio ("solo se versiona desde `Approved`/`Active`"). Esta rama traslada la política **desde el workflow del mod a la config declarativa del versionado**, sin depender de tablas de workflow.

### Cómo aporta a la historia

Es la pieza que hace que el retiro del workflow del mod sea **sin regresión funcional**: el comportamiento observable ("no puedo versionar un borrador") se preserva, pero ahora lo aplica core leyendo `versionableFromStates` del JSON — declarativo, sin infraestructura de workflow.

### Por qué en core y no solo en el mod

- `version-from-source.js` es el **versionador de toda la plataforma**, no de curriculum-design. Cualquier objeto que versione por estado simple (presente o futuro) se beneficia del mismo gate declarativo.
- La alternativa mod-only sería **interceptar/duplicar** la decisión de versionado desde un resolver del mod — exactamente el patrón a-medida que este sprint viene a **eliminar**. Reintroducirlo en el mod es deuda nueva disfrazada.
- El gate es **opt-in**: es una extensión aditiva del contrato de `versioning`, no un cambio de la ruta existente. Objetos sin `versionableFromStates` no ven diferencia.

---

## Guardarraíl en codegen — `validate-versioning.js`

Para que un error de configuración **falle en build y no en runtime**, el validador de codegen ahora chequea (todo aditivo):

- **V3b** — `versionableFromStates`, si está presente: array no vacío de strings; el campo gateado (`stateField`, default `"status"`) **debe existir** en `properties`; si ese campo declara `enum`, cada estado listado debe pertenecer a él.
  > Motivo (hallazgo de review): un typo en `stateField` pasaría build y en runtime `source[typo]` sería `undefined` → **todo versionado lanzaría `SOURCE_NOT_VERSIONABLE` sin señal**. El check lo corta en codegen.
- **V3c** — **exclusión mutua**: un objeto es workflow-backed (`initialStateField`) **o** estado-simple con gate declarativo (`versionableFromStates`), **nunca ambos**. Si coexistieran, `needsWorkflow` gana en runtime y `versionableFromStates` quedaría muerto en silencio (justo el escenario de la migración de `Activity` fuera del workflow). Codegen aborta y fuerza una migración limpia.

Esto sube la robustez del contrato de `versioning` para **todos** los objetos versionables, no solo los de este sprint.

---

## Exposición GraphQL — `dynamic.js` (generado)

Aditivo: expone los campos enum nuevos en el schema:

```graphql
type Activity   { ...  status: String  ... }
type Offering   { ...  lifecycleStatus: String  ... }
type rt__Course__activity   { ...  status: String  ... }
type rt__Service__Activity  { ...  status: String  ... }
```

`Offering` usa un campo **propio** `lifecycleStatus` (no el `status` de engagement, que pertenece a uengagement y el sync bloquea tocar) — modela otro eje (autoría vs disponibilidad).

---

## Lo que NO se tocó (blast radius)

- **`enforceEnumTransitions`** (`instance.resolver.js:135`, `:3961`, `:4146`) — el guard del motor de transiciones enum se **reutiliza sin cambios**. P4 solo declara `properties.transitions` en el JSON de los objetos; el codegen los persiste a `core_FieldDefinition` y el guard existente los aplica.
- La rama `needsWorkflow` de `version-from-source.js` — **idéntica**. Los objetos workflow-backed que aún existan no cambian de comportamiento.

---

## Backward-compatibility

- Un objeto de estado-simple **sin** `versionableFromStates` versiona desde cualquier estado, **como hoy** (opt-in).
- Un objeto **con** `initialStateField` sigue por la rama workflow, sin cambios.
- V3c impide el estado ambiguo (ambos declarados) en build-time.
- El número de versión (`max(linaje)+1`) y el reset al `static_default` del enum **no cambian**.

---

## Qué revisar / cómo probar

1. **`version-from-source.js`**: que la rama `else if` no altere el flujo `needsWorkflow`; que `SOURCE_NOT_VERSIONABLE` se lance solo cuando `source[stateField] ∉ versionableFromStates`.
2. **Migración de schema** (`prisma/*`): los campos enum nuevos (`status` en Activity, `lifecycleStatus` en Offering) — verificar que la migración es aditiva y no destructiva sobre datos existentes.
3. **`validate-versioning.js`**: correr codegen con un JSON que declare **ambos** (`initialStateField` + `versionableFromStates`) → debe abortar (V3c); con un `stateField` inexistente → debe abortar (V3b).
4. **Regresión de versionado existente**: objetos que hoy versionan sin gate no deben empezar a fallar.
5. **Cobertura**: la suite de core en la rama incluye unit de `version-from-source` + `validate-versioning` y la suite de codegen; contrastar que estén verdes en el entorno del reviewer (no confiar en el reporte de la rama).

---

## Resumen del "por qué core"

| | Alternativa mod-only | Este PR (core) |
|---|---|---|
| Dónde vive el gate | resolver a medida en el mod que intercepta el versionado | config declarativa `versionableFromStates` leída por el versionador de core |
| Deuda | reintroduce el patrón a-medida que el sprint elimina | elimina el acoplamiento al workflow; capacidad genérica de plataforma |
| Alcance | solo curriculum-design | cualquier objeto estado-simple que versione |
| Riesgo runtime | duplicación de lógica de versionado, drift | ruta única de core, opt-in, validada en build |

El cambio de core es **mínimo, aditivo y opt-in**, y es lo que permite retirar el workflow del mod **sin perder** el candado de versionado. Hacerlo en el mod habría sido más código, más acoplado y contrario al objetivo del sprint (un solo motor mantenido por core).
