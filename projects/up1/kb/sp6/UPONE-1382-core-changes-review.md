# UPONE-1382 (P5) — Cambios en CORE (`object-manager` + `layout`) para revisión del team core

> **Para**: team core / reviewers de `object-manager` y `layout`.
> **Rama**: `feat/UPONE-1382-hard-delete-cascade` (en los 3 repos; aún sin mergear a `develop`).
> **Alcance de este doc**: SOLO los cambios de **core** (workspaces `object-manager` y `layout`), commiteados y **hand-written** (no los archivos regenerables por sync/codegen). La declaración de metadata de hijos, layouts, resolvers y componentes del mod `curriculum-design` (fuente que el sync propaga a core) quedan fuera; este documento valida qué se agregó al motor genérico de la plataforma.
> **Contexto**: P5 cierra una inconsistencia del borrado genérico. UP1 ya sabía borrar una instancia, validar FKs reales y borrar sus capas RT/ext, y el clonado/versionado ya recorría hijos polimórficos vía `metadata.polymorphicChildren`. El **borrado** no consumía esa misma metadata: borrar un padre con hijos polimórficos (`ownerType`/`ownerId`) dejaba huérfanos porque la DB no puede aplicar integridad sobre relaciones no-FK. Este cambio agrega a core un **motor declarativo de borrado en cascada** (preview, restrict, delete atómico, auditoría por nodo) y su render dinámico en el modal de confirmación.

---

## TL;DR

- **Un motor nuevo, aislado**: `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js` (archivo nuevo). Construye un grafo de impacto de borrado (read-only), detecta referencias externas que deben bloquear, y ejecuta el delete en orden topológico dentro de una sola transacción.
- **Es opt-in por metadata y backward-compatible**: solo entran al motor los objetos que declaran hijos (`polymorphicChildren` / `directChildren` / `polymorphicChildrenDerived`). Un objeto sin hijos declarados sigue por su path genérico de siempre, sin costo extra.
- **Wiring acotado**: `deleteInstance`, `deleteBulkInstances` y la query nueva `deleteImpactPreview` (todo en `instance.resolver.js`) llaman al motor. El único cambio de comportamiento en el path viejo es un early-intercept condicionado al gate de metadata.
- **DataLog por nodo** (opción C): el motor audita cada nodo borrado (padre + cada hijo, snapshot per-node) y `withDataLog` se hace flag-aware para no duplicar la entrada raíz.
- **Lado layout**: `CriticalWarningModal.vue` y `RecordList.vue` consumen `deleteImpactPreview` para mostrar el conteo dinámico de hijos y bloquear la confirmación cuando el impacto es `Restrict`. Sin hardcodeos por objeto.
- **Blast radius**: el path viejo de borrado (RT/ext del registro objetivo, `validateBulkDelete` de FK reales) no se reemplaza; el motor se antepone solo para objetos con hijos declarados.

---

## Alcance del cambio en core

### `object-manager` (backend)

| Archivo | Tipo | Qué cambia | Riesgo |
|---|---|---|---|
| `src/graphql/resolvers/helpers/deleteImpactPlan.js` | **lógica (nuevo, ~1531 líneas)** | Motor completo: `buildDeleteImpactPlan` (read-only), `detectRestrictions`, `executeDeletePlan` (tx), `writeDeleteDataLog`, `cascadeDeleteIfApplicable`, `objectDeclaresChildren` (gate) | **Alto** — es el corazón de la revisión |
| `src/graphql/resolvers/instance.resolver.js` | **lógica (hand-written, +102)** | Wiring del motor a `deleteInstance` / `deleteBulkInstances`; resolver de `deleteImpactPreview`; flag `context._deleteHandledByMotor` tras `executed: true` | **Medio** — toca 2 mutaciones core compartidas |
| `src/graphql/typeDefs/static.js` | **typedef (hand-written, +39)** | Tipo `DeleteImpactPreview` + query `deleteImpactPreview` (SDL estático, no generado) | Bajo — aditivo |
| `src/events/decorators/withDataLog.js` | **decorator (hand-written, +16)** | Flag-aware: si el motor ya auditó (`_deleteHandledByMotor`), sale sin re-loguear el registro raíz | Bajo — guard aditivo |
| `tests/unit/resolvers/deleteImpactPlan.test.js` | **test (nuevo, +1619)** | Unit del motor (build/detect/execute, casing, guards) | n/a |
| `tests/integration/hard-delete-cascade.integration.test.js` | **test (nuevo, +407)** | Matriz destructiva contra BD real de tenant + regresión del motor | n/a |
| `docs/features/delete-cascade.md` | **doc (nuevo)** | Documentación del motor (contrato, gate, Restrict, atomicidad, DataLog) | n/a |
| `docs/features/{bulk-mutations,datalog,event-system}.md`, `docs/guides/object-definitions.md`, `docs/versioning-capability.md` | doc | Actualización para reflejar el motor y `onDelete` por campo | n/a |

> **Excluido de la revisión (regenerable por sync/codegen)**: `src/graphql/typeDefs/mods.js` (regenerado), `prisma/{BASEMODEL,UPU}/schema.prisma`, `src/graphql/typeDefs/dynamic.js`, `objects/business/**` (sync desde el mod). Su cambio es consecuencia de la config declarativa que vive en el mod, no lógica de plataforma.

### `layout` (component library)

| Archivo | Tipo | Qué cambia | Riesgo |
|---|---|---|---|
| `src/components/organisms/Modal/CriticalWarningModal.vue` | **componente (hand-written, +107)** | Bloque de impacto dinámico (loading / cascade con conteo por tipo / restrict con lista); `itemName` en la pregunta del cuerpo; `isConfirmDisabled` bloquea en Restrict/loading | Medio — organism compartido |
| `src/layouts/RecordList.vue` | **layout (hand-written, +106)** | Query `deleteImpactPreview`, `loadDeleteImpact` con token anti-carrera, guard de confirmación en Restrict, lectura de `errors[]` del bulk | Medio — layout central |
| `lang/{es,en,pt}/RecordList.i18n.json` | **i18n (hand-written, +7 c/u)** | Keys nuevas (`confirmQuestion`, `impactLoading`, `impactCascadeHeader`, `impactRestrictedHeader`, `impactRestrictedHint`, `impactRestrictedFallback`); retiro de `deleteConfirm` | Bajo |
| `docs/features/recordlist.md`, `.ai/CONTEXT.md` | doc | Documentación del preview dinámico y auto-bloqueo Restrict | n/a |

> **Excluido (regenerable por sync)**: todo `src/modsComponents/**` de layout (sincronizado desde los mods).

---

## Cambio central — `deleteImpactPlan.js` (motor nuevo)

El motor separa **calcular** de **ejecutar**. Tres piezas públicas:

### 1. El gate — solo objetos con hijos declarados entran

`objectDeclaresChildren(objectType, tenant, options)` chequea si el objeto declara al menos uno de `polymorphicChildren` / `directChildren` / `polymorphicChildrenDerived`. `cascadeDeleteIfApplicable` lo usa: si el objeto **no** declara hijos, devuelve `{ applied: false }` y el caller sigue su path genérico de siempre. Así un objeto sin hijos no paga el costo de recorrer el grafo, y el blast radius del cambio queda contenido a los objetos que opt-in por metadata.

> Única excepción deliberada: la query `deleteImpactPreview` corre el motor para cualquier objeto (declare hijos o no), porque un objeto sin hijos igual puede tener referencias externas que deben bloquear, y el path singular no revalida eso por su cuenta.

### 2. `buildDeleteImpactPlan(...)` — read-only, arma el plan

Recorre el grafo sin tocar la DB y devuelve:

| Campo | Contenido |
|-------|-----------|
| `status` | `'cascade'` (se puede borrar) o `'restricted'` (bloqueado) |
| `nodes` | cada registro alcanzable: padres solicitados (`deleteMode: 'requested'`) + hijos/nietos/derivados (`deleteMode: 'cascade'`) |
| `edges` | relaciones que conectan nodos, con `semantics: 'cascade'` o `'restrict'` |
| `restrictions` | referencias externas y cadenas de versión que bloquean |
| `deleteOrder` | orden topológico inverso (cascade por `depth` descendente, luego los `requested`) que el delete real itera |
| `summary` | conteos `byObjectType` / `byRecordType` + `cascadeNodes` |
| `warnings` | metadata incompleta u otros gaps detectados durante el walk |

El walk recorre `polymorphicChildren` (vía `ownerType`/`ownerId`, con self-ref recursivo), `directChildren` (FK simple) y `polymorphicChildrenDerived` (filas que referencian al padre vía una lista de campos `via`). Cada nodo trae su `projectionStack` (capas `ext__`/`rt__`/base a borrar, resueltas por **introspección case-insensitive** del cliente Prisma) y su `historyKey` (atribución al padre para DataLog).

### 3. `detectRestrictions(...)` — bloqueo genérico por convención

Al final del walk, para cada nodo busca referencias entrantes **desde fuera del subárbol**: FK por convención (`<objectLower>Id`), custom fields `core_FieldDefinition` con `fieldType: 'reference'`, relaciones polimórficas (`ownerType`/`ownerId`) y cadenas de versión (`previousVersionId` de un sucesor). La detección es **genérica por convención de nombres**, no una lista hardcodeada de mods cross-referenciados: un modelo de engagement o de cualquier mod futuro bloquea con el mismo código.

Si hay al menos una restriction, `plan.status = 'restricted'`. Los mensajes son **user-facing con nombres semánticos** (`label`/`labelPlural` de `core_ObjectDefinition`, no ids ni nombres técnicos de modelo):

> «Programa de Ingeniería» está en uso por 3 Currículos. Resuélvelo antes de eliminar.

### 4. `executeDeletePlan(...)` — atómico, sin borrado parcial

- Si `plan.status === 'restricted'`: devuelve `{ deletedIds: [], executed: false, errors: [...restrictions] }` **sin tocar la DB**. El caller propaga las restrictions y no intenta borrado parcial.
- Si `plan.status === 'cascade'`: un único `prisma.$transaction` borra cada nodo de `plan.deleteOrder` (capa por capa según su `projectionStack`). Si cualquier delete falla dentro de la transacción, rollback completo: no queda un subárbol a medio borrar.

`cascadeDeleteIfApplicable(...)` encapsula gate + build + execute; la llaman `deleteInstance` (`requestedIds: [id]`) y `deleteBulkInstances` (`requestedIds: idValues`).

---

## Wiring — `instance.resolver.js`

- **`deleteInstance`**: antes de su lógica RT/ext de siempre, intenta `cascadeDeleteIfApplicable`. Si el status es `restricted`, lanza un `Error` con el mensaje semántico. Tras `executed: true`, marca `context._deleteHandledByMotor = true`.
- **`deleteBulkInstances`**: mismo intercept; ante Restrict **no lanza**, devuelve `errors[]` por id con `type: 'DELETE_RESTRICTED'` (contrato que la UI consume). Este es el path real de las listas.
- **`deleteImpactPreview`** (resolver nuevo): llama `buildDeleteImpactPlan` directo (sin gate), mapea `plan.summary.cascadeNodes` a `totalCount` y expone `byObjectType`/`byRecordType`/`restrictions`/`warnings`.

## Auditoría — DataLog por nodo (opción C)

`executeDeletePlan` escribe en `core_DataLog` una entrada `DELETE` **por cada nodo** de `plan.deleteOrder` (no una sola por el padre): `objectName`, `recordId`, `action: 'DELETE'`, `changes` (snapshot pre-delete + `historyKey`), `parentObject`/`parentId` (atribución al padre inmediato) y `childRecordType`. `writeDeleteDataLog` es **best-effort y post-commit**: un fallo de auditoría nunca revierte un delete ya confirmado.

Para no duplicar la entrada del registro raíz, `withDataLog` (que envuelve `deleteInstance`, no el bulk) se hizo **flag-aware**: si `context._deleteHandledByMotor` está set, sale sin re-loguear. Objetos sin hijos polimórficos conservan `withDataLog` como hoy.

---

## Lado `layout` — preview dinámico y auto-bloqueo Restrict

El modal no tiene lógica por objeto; recibe el impacto ya calculado y lo renderiza.

- **`RecordList.vue`**: al abrir el `CriticalWarningModal` (`confirmDeleteRow`), dispara `loadDeleteImpact([id])` que corre `deleteImpactPreview` (`fetchPolicy: 'no-cache'`). Un **token monotónico** (`deleteImpactToken`) descarta respuestas obsoletas si el usuario cambia de fila antes de que resuelva el preview previo (evita conteos cruzados). En la confirmación (`handleCriticalDeleteConfirm`) hay un guard extra que corta si el status es `restricted`, y tras el bulk lee `data.deleteBulkInstances.errors` para no mostrar éxito ante un Restrict devuelto (no lanzado). El preview es best-effort: si falla, se permite confirmar porque el delete real revalida y aborta atómico.
- **`CriticalWarningModal.vue`**: props nuevas (`impactLoading`, `impactStatus`, `impactCount`, `impactByType`, `impactRestrictions`, `itemName`). Tres estados de render: cargando, cascada (header con conteo + lista por tipo ordenada desc), restrict (alert con lista de referencias o fallback traducido). `isConfirmDisabled` bloquea el botón en Restrict o mientras carga, además del typed-confirm ya existente. El **nombre** de lo que se elimina va en la pregunta del cuerpo (`confirmQuestion`, envuelve con `overflow-wrap: anywhere`), no en el botón (que con nombres largos desbordaba).

---

## Lo que NO se tocó (blast radius)

- **`validateBulkDelete` / `referenceValidationService`**: el path viejo de FK reales sigue intacto. El motor se antepone solo para objetos con hijos declarados; para el resto, `deleteBulkInstances` valida y borra como antes.
- **Borrado de RT/ext del registro objetivo** en `deleteInstance`/`deleteBulkInstances`: sin cambios para objetos sin metadata de hijos.
- **`withDataLog`** para objetos sin cascada: comportamiento idéntico; el guard solo actúa cuando el flag está set.
- **Codegen de `onDelete`** (`generatePrismaSchema.js`): la cláusula `@relation(onDelete: ...)` a nivel constraint de DB es independiente de este motor y no se modificó. Los dos mecanismos son complementarios: el motor bloquea a nivel aplicativo con mensaje semántico antes de que la DB evalúe el constraint.

---

## Backward-compatibility

- Un objeto **sin** hijos declarados borra exactamente como hoy (gate `objectDeclaresChildren` devuelve false, `applied: false`).
- `deleteInstance` sigue lanzando ante error; `deleteBulkInstances` sigue devolviendo `errors[]` por id (el contrato solo suma `type: 'DELETE_RESTRICTED'`).
- La query `deleteImpactPreview` es puramente aditiva (read-only, no altera ninguna mutación).
- El bloqueo de la UI ante Restrict es best-effort en el cliente; la autoridad sigue en el backend (el delete real revalida y aborta atómico), así que un cliente viejo que no lea `errors[]` no produce borrado parcial.

---

## Qué revisar / cómo probar

1. **Gate**: confirmar que `objectDeclaresChildren` es el único punto de entrada al motor desde las mutaciones, y que un objeto sin metadata de hijos no cambia de comportamiento.
2. **`deleteImpactPlan.js`**: el orden de `deleteOrder` (hijos por `depth` desc antes que los `requested`); resolución case-insensitive del `projectionStack` (base/`rt__`/`ext__`); que `detectRestrictions` solo cuente referencias **externas al subárbol** (no falso-Restrict por referencias internas).
3. **Atomicidad**: forzar un fallo dentro del `$transaction` y verificar rollback total (sin subárbol parcial).
4. **DataLog**: una entrada por nodo, sin duplicar el raíz (flag `_deleteHandledByMotor`); atribución (`parentObject`/`parentId`/`childRecordType`/`historyKey`) reconstruible aunque la fila ya no exista; fallo de auditoría no revierte el delete.
5. **Restrict**: cadena de versión (`previousVersionId`), FK cross-mod entrante y referencia polimórfica externa deben bloquear con mensaje semántico (label, no id).
6. **Layout**: token anti-carrera al cambiar de fila rápido; que el botón quede deshabilitado en Restrict/loading; que `errors[]` del bulk se muestre y no dispare notificación de éxito.
7. **Regresión**: objetos que hoy borran sin cascada no deben empezar a fallar.

---

## Validación ejecutada (evidencia de la rama)

> Contrastar en el entorno del reviewer; no confiar solo en el reporte de la rama (DET-33).

- **Matriz destructiva contra BD real** (`hard-delete-cascade.integration.test.js`): casos de cascade, Restrict (cadena de versión, FK cross-mod, referencia polimórfica) y auditoría DataLog contra tenant seed (UPU). Este fue el filtro decisivo: **la matriz de integración contra BD real cazó 7 bugs de runtime que los unit mockeados daban por verdes** (enum `core_DataLogAction` en UPPERCASE, ausencia de columna, casing de FK `ActivityId` vs `activityId`, casing de subtree-key en RT no uniforme, entre otros). Learn registrado: los unit con Prisma mockeado no prueban correctitud de nombres de modelo/FK ni casing; para código destructivo con proyecciones RT/ext se exige integración real.
- **Unit del motor** (`deleteImpactPlan.test.js`): build/detect/execute, casing, guards fuera del happy path (snapshot ausente, no-op, best-effort DataLog).
- **Dual-judge (DET-35, T3 exhaustive)** en el gate de core: 2 rondas de jueces ciegos en paralelo. Ronda 1 confirmó por ambos el race del preview; hallazgos single-judge (casing raíz, depth derivado, gate del preview) verificados reales contra schema/DB. Ronda 2 halló casing RT no uniforme (`rt__Service__Activity`) y gate del preview sin barrera para el path singular. Todos corregidos y cubiertos por regresión. Veredicto **APPROVED**.
- **Suites re-corridas por el orquestador** (no self-report del agente): integración y unit verdes; `git status` de cada submódulo verificado post-commit para descartar contaminación cruzada.
- **Fixes de UX/legibilidad posteriores** (misma rama): el nombre a eliminar se movió del botón a la pregunta del cuerpo (desbordaba con nombres largos), y los mensajes de Restrict pasaron de ids/nombres técnicos a nombres semánticos (lookup case-insensitive de `label`/`labelPlural`). Verificados por smoke visual + integración.

---

## Resumen del "por qué core"

| | Alternativa mod-only | Este cambio (core) |
|---|---|---|
| Dónde vive la cascada | override de `deleteInstance` por mod (patrón monkeypatch "el último gana", ej. `requirementCategoryDelete.resolver.js`) | motor genérico que lee la misma metadata declarativa que ya consume el clonado/versionado |
| Integridad polimórfica | la DB no protege `ownerType`/`ownerId`; cada mod la re-implementa | detección genérica por convención, una sola ruta mantenida por core |
| Deuda | reintroduce el override a-medida que el sprint viene a eliminar | retira el override; capacidad transversal de plataforma |
| Restrict cross-mod | lista hardcodeada de modelos referenciados | genérico por nombre; engagement es un ejemplo, no un caso especial |
| Riesgo runtime | drift entre mods, huérfanos silenciosos | opt-in por metadata, atómico, validado contra BD real |

El cambio de core es **aislado (archivo nuevo), opt-in por metadata y atómico**, y es lo que permite retirar los overrides de borrado del mod sin perder integridad. Hacerlo por mod habría sido más código, más acoplado y contrario al objetivo del sprint (un solo motor de borrado mantenido por core, simétrico con el motor de clonado/versionado que ya existe).
