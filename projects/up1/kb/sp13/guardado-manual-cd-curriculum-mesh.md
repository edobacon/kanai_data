---
id: DOC-kb-sp13-guardado-manual-cd-curriculum-mesh
project: up1
type: doc
module: curriculum-design
tags:
  - sp13
  - curriculum-design
  - guardado-manual
  - borrador
  - curriculum-mesh
  - malla
  - plan
---

# Guardado manual en cd: plan para CurriculumMesh (malla curricular)

Plan de implementación del guardado manual (borrador, Guardar, Descartar) para el componente CurriculumMesh de curriculum-design. Verificado contra código real el 2026-10-13, rama develop (cd 6e2988f). Aplica las decisiones de [[guardado-manual-cd-decisiones-resueltas]]. Contexto común y patrón de referencia en [[guardado-manual-cd-contexto-core-y-referencia-tributacion]]; plan global y tickets en [[guardado-manual-cd-plan-de-accion]].

## En una frase

La malla hoy escribe a la base con cada arrastre, alta, edición o borrado, mediante unas 15 rutas de código que terminan en `refetch()`. Pasarla a guardado manual exige un borrador de entradas y bloques, una mutation de conjunto `savePlanMeshSet` que aplique todo de forma atómica (patrón de tributación), y que los guards de cliente trabajen sobre "lo persistido más el borrador".

## Dónde vive y cómo se monta

- Componente: `mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue` (2932 líneas) más módulos de lógica pura y composables.
- Se monta en `default_Curriculum_edit.json` como `curriculum-mesh` con `enableEdit: true` y `planId: {{parentId}}`, en la misma página que `competency-alignment-grid` (tributación), que ya tiene su propio borrador y su propia barra.
- También aparece en `default_Activity_view.json` y en el modal "Ver en la malla" (`planEntry_mesh_view`) en modo lectura.
- Ningún otro mod lo importa (verificado).
- Nota: el comentario de cabecera del Element dice "Sólo lectura, sin mutations" y está desactualizado.

## Glosario específico

- **planEntry**: una asignatura (Activity) colocada en un período del plan, con `period` y `position`.
- **Bloque**: grupo de requisito (`requirement` de tipo Group) que agrupa electivas o modulares. Vive en la base como registro propio.
- **Obligatoria / electiva / modular**: tipos de alta de asignatura en la malla.
- **Alta guiada**: agrega la asignatura destino más los prerrequisitos que le faltan.
- **Guard de prerrequisitos**: validación en cliente que avisa si una asignatura se coloca antes que sus prerrequisitos.
- **Plan Draft**: solo un plan con `status === 'Draft'` es editable (server fail-closed, cliente `EDITABLE_STATUSES`).
- **Vista efectiva**: lista de entradas que resulta de aplicar los cambios del borrador sobre lo persistido.

## Estado actual: inventario de escrituras

Todas en el Element, vía `apolloClient.mutate`, sobre el objeto `planEntry` (objectType en CME:516; mutations declaradas en CME:535-597).

| Gesto | Función | Qué escribe | Atómico | Después |
|---|---|---|---|---|
| Arrastrar entre columnas | `onDragEnd` L825, `persistPeriodPositionUpdates` L769 | un `updateInstance` secuencial por entrada afectada con `{period, position}` | No (admitido en L759) | aplica local, sin refetch; error: `refetch()` |
| Editar entrada (modal) | `onEditSave` L1178 | un `updateInstance` con diff parcial | Sí (1 write) | `refetch()` |
| Editar con bloque nuevo | `onEditSaveNewBlock` L1216 | `createInstance` del bloque, luego `onEditSave` | No: si falla el segundo, el bloque queda huérfano | `refetch()` |
| Quitar entrada | `onDeleteConfirm` L1349 | `deleteInstance` (permitido) o `deletePlanEntriesBatch(ids)` (cascada) | Batch sí | `refetch()` |
| Alta obligatoria | `createObligatoriaEntries` L1417 | N `createInstance` secuenciales, `startPosition` desde `nextPosition(entries)` | No | `refetch()` |
| Alta electiva | `createElectivaEntries` L1458 | bloque nuevo + N `planEntry`; en bloque existente, `diffBlockSelection` con deletes y creates | No, rollback manual del bloque (L1581) | `refetch()` |
| Alta modular | `persistModularAdd` L1811 | bloque si es nuevo, `createPlanEntriesBatch` (atómico, `period` null), luego borra electivas | Batch sí; el borrado no comparte transacción (L1808) | `refetch()` |
| Alta guiada | `onConfirmGuidedAdd` L1874 | destino más prerrequisitos faltantes en un batch | Batch sí | `refetch()` |

Fuera del componente: "Agregar/Quitar período" (L700, 710) es solo vista (`viewPeriodCount`) y no persiste en `Curriculum.totalPeriods`. Las categorías (`requirementCategory`) se editan en otro modal apilado.

Patrón de errores actual: `mutationError` en una alerta y `refetch()` en casi todo camino. El único optimismo es el arrastre (`applyLocalPositionUpdates` L803). No hay rollback del lado cliente.

## Estado actual: lecturas que dependen de lo persistido

Todas parten del ref `entries` (`useCurriculumMesh.ts`, `fetchPolicy: 'network-only'`, L188-253) y de los árboles de requisitos de las Activity (`meshTrees`):

- Guard de prerrequisitos al alta: `checkPrereqsForBatch` (CME:1671) con `listPrereqs` y `findMissingPrereqsForBatch` (`prereqCheck.logic.ts:134`). En modular corre además `resolveGuidedChainAsync` (CME:1902).
- Impacto de borrado: `classifyDeletion` (`deletionImpact.logic.ts:260`, CME:1335). Bloquea si un árbol de requisitos falló al cargar (CME:1327).
- Scan de violaciones: `useMeshPrereqScan` (L86), computed sobre `entries`; desactivado en modular (CME:1649).
- `deriveLevel`/`groupByLevel`, `columns`, `summary`, filtros y `periodDiscrepancy`: computed sobre `entries` (CME:672-687). El nivel modular es solo cliente y no se persiste.
- Los árboles de requisitos pertenecen a las Activity, no al plan: no cambian con el borrador. Lo que cambia es `entries`.

La lógica pura ya opera sobre `MeshEntry[]` sin tocar la base: basta alimentarla con la vista efectiva.

## Estado actual: guards del servidor y helpers reutilizables

- Alta única: `sectionValidation.resolver.js:205-217` (plan Draft, unicidad `(planId, activityId)`, forma). Edición única: `polymorphicUpdate.resolver.js:765`. Borrado único: `requirementCategoryDelete.resolver.js:91,97`.
- Batches existentes `createPlanEntriesBatch`, `deletePlanEntriesBatch`, `movePlanEntry`: RBAC explícito con `checkObjectPermissions`, validación antes de abrir la transacción. El batch de alta publica evento y DataLog después del commit.
- Helpers reutilizables en `logic/helpers/`: `planEntryPlanStatusGuard`, `planEntryUniquenessGuard`, `planEntryShapeGuard`, `planEntryDeletionRequirementGuard`, `planEntryMoveDestinationGuard`, `planEntryMoveRenumber`, `planEntryPlacements`. El nuevo guardado los reusa y no reescribe reglas.
- `movePlanEntry` renumera de forma atómica pero **ningún archivo del front lo usa** (verificado). Por decisión D1 no se usa como puente: varios arrastres acumulados serían N llamadas no atómicas.
- No se usa aislamiento Serializable en planEntry. No existe `@@unique` sobre `(planId, period, position)` ni `(planId, activityId)`: la unicidad es solo aplicativa.

## Diseño (decidido)

### Modelo del borrador

Patrón snapshot/draft/diff del composable genérico (ver documento de contexto):

- **Clave de fila**: id del `planEntry` para filas persistidas; id temporal (`tmp:<n>`) para filas nuevas. Una asignatura retirada y vuelta a agregar conserva el id del snapshot (misma lógica que `upsertRow` de tributación, L131).
- **Campos editables**: `activityId`, `period`, `position`, `blockId` y los atributos que hoy edita `EditEntryModal` (a confirmar leyendo `editEntryModal.logic.ts`).
- **Bloques**: los bloques nuevos son objetos virtuales del borrador con id temporal. No se crean en la base hasta Guardar. Un bloque existente solo cambia por sus `planEntry`.
- **Vista efectiva**: `effectiveEntries = persistido + patches`. Todos los computed y guards leen `effectiveEntries` en lugar de `entries`.
- **Posiciones**: `recalcPeriodPosition` se aplica sobre `effectiveEntries` en cada gesto.
- **Sin operaciones inútiles**: agregar y luego quitar la misma asignatura no genera operación (diff vacío).

### Guardar: `savePlanMeshSet` (decisión D1)

- Una mutation de conjunto con el patrón de tributación (`upsertCompetencyAlignmentSetValidated`): payload con `planId`, entradas del borrador, bloques nuevos con id temporal y `knownIds`.
- Valida antes de abrir la transacción: tope de filas, RBAC por operación efectiva (crear, modificar, borrar), plan Draft, y reusa los helpers de guards (unicidad, forma, rango de período, requisitos satisfacibles). Los guards de borrado y unicidad se evalúan sobre el **estado final**, no sobre el intermedio.
- Aplica altas, cambios y bajas por diferencia dentro de una transacción. Retira solo lo que está en `knownIds` y ya no viene. Renumera posiciones según el orden del borrador (`planEntryMoveRenumber`).
- Devuelve el mapeo de ids temporales a ids reales (patrón del árbol de competencias) y publica evento y DataLog después del commit.
- Un id del payload que ya no existe en la base rechaza todo el guardado con código tipado y el cliente ofrece recargar (decisión D5).
- Esto elimina los rollbacks manuales de bloque y los huérfanos de hoy.

### Descartar y avisos

- Descartar restaura `draft = snapshot`. Pide confirmación solo si hay cambios (D6), con `ConfirmationModal`. Como los bloques nuevos no se crean hasta Guardar, no quedan residuos.
- Barra Guardar/Descartar visible solo si `editable` (plan Draft y `enableEdit`), con indicador de cambios sin guardar, como `cag-savebar`.
- Las acciones que hoy hacen `refetch()` pasan a modificar el borrador; el refetch solo ocurre al guardar, al descartar y al cambiar de plan. Los sortables dejan de deshabilitarse mientras "persiste".
- `beforeunload` desde el composable genérico (D7). Confirmación al cambiar de plan con cambios. Los avisos de modal y de ruta quedan al core.
- Si el plan deja de ser Draft durante la edición, el servidor rechaza; el cliente pasa a solo lectura sin perder el borrador de forma silenciosa (mejora sobre `PLAN_LOCKED` de tributación).

### Concurrencia (D5)

Semántica de los precedentes: id obsoleto rechaza y se recarga; edición simultánea de la misma fila, gana la última escritura. Las posiciones no entran en conflicto porque el servidor renumera según el borrador. Sin firma de snapshot.

## Casos límite

- Borrar una asignatura con dependientes: `classifyDeletion` sobre la vista efectiva puede discrepar del servidor, que valida sobre el estado final; el servidor decide y el rechazo vuelve con el motivo.
- Mover período: el cliente solo avisa; el servidor valida rango y plan Draft. Posiciones 0-based; el renumerado afecta origen y destino.
- Alta electiva sobre un bloque nuevo y luego descartar: no queda bloque.
- Alta modular que borra electivas: patch compuesto en el borrador; en el servidor va en la misma transacción.
- Períodos agregados vacíos: no sobreviven hoy (`totalPeriods`). Fuera de alcance.
- Hallazgo preexistente (no corregido): el guard de borrado de la malla no menciona tributaciones. Verificar si lo cubre la base de datos o una cascada antes de M3.

## Interacción con la grilla de tributación en la misma página

- La tributación lee los `planEntry` persistidos desde el servidor (`alignmentView.resolver.js`), por lo tanto no ve el borrador de la malla (decisión D8). No hay acoplamiento entre los dos borradores.
- Dos barras e indicadores en la misma página pueden confundir; se coordina en V1 con un contenedor de acciones común o esperando el contrato del core.

## Plan por fases (esfuerzo orientativo en puntos)

Rangos para calibrar, no compromisos. No incluyen el kit del core. La numeración corresponde a los tickets del plan.

| Fase | Ticket | Contenido | Esfuerzo | Riesgo | Validación |
|---|---|---|---|---|---|
| M0 | dentro de G0 | Spike: leer los modales, definir campos editables, verificar el borrado con tributaciones | 2-3 | Bajo | Respuestas registradas |
| M3 | M3 | Backend `savePlanMeshSet`: guards reutilizados, `knownIds`, mapeo de ids, id obsoleto, transacción, evento y DataLog | 10-18 | Medio-alto | Integración: rollback total, RBAC por operación, plan no Draft, unicidad, borrado que rompe requisitos, id obsoleto |
| M1 | M1 | Front: borrador de entradas (arrastre, quitar, alta obligatoria), vista efectiva, `refetch` reemplazado por patches, barra y confirmación | 13-21 | Medio | Lógica del borrador y componente: guardar, error con borrador conservado, descartar |
| M4 | M4 | Alta electiva y modular con bloque virtual y alta guiada sobre el borrador | 13-21 | Alto | Bloque nuevo, cambio de bloque, cadena guiada |
| M5 | dentro de V1 | Avisos de salida, coordinación con tributación, documentación y verificación humana | 5-8 | Bajo | Checklist |

Total orientativo del componente: 43 a 71 puntos. M1 depende de G1 y de M3 (ya no se puede entregar el arrastre antes que el backend).

## Criterios de aceptación propuestos

1. Ninguna acción de la malla escribe a la base hasta pulsar Guardar.
2. Descartar devuelve la malla al estado cargado y no deja registros nuevos en la base (incluidos bloques), con confirmación si hay cambios.
3. El indicador de cambios sin guardar refleja el diff real, y un cambio revertido a mano limpia el indicador.
4. Guardar con éxito deja la base igual al borrador; con error no pierde el borrador y permite reintentar.
5. Los guards de prerrequisitos y de impacto de borrado usan la vista efectiva.
6. Si el plan deja de ser Draft, la malla pasa a solo lectura sin perder el borrador de forma silenciosa.
7. No quedan `refetch()` por gesto en el flujo de edición.
8. Un id obsoleto en el payload rechaza el guardado con código tipado y recarga.

## Fuera de alcance

- Persistir períodos vacíos (`Curriculum.totalPeriods`).
- Cambios en los árboles de requisitos de las Activity.
- El modal de categorías (`requirementCategory`).
- El contrato de participación del core (UPONE-1931).

## Pendientes de verificación

- Lectura completa de `AddEntryModal.ts`, `EditEntryModal.ts`, `DeleteEntryModal.ts`, `PrereqBlockModal.ts` y `RequirementsModal.ts` (no leídos en profundidad; se asumen presentacionales porque todo el I/O está en el Element).
- Cómo cargan `useBlockOptions` y `useActivityPicker` los bloques y asignaturas que ya están en el borrador.
- Si los watchers (`CME:1111`, `useMeshPrereqScan.ts:94`) deben incluir actividades agregadas localmente.
- Qué cubre el borrado de un `planEntry` con tributaciones.

## Vigencia

Depende de `logic/planEntry-*`, de los helpers de guards, del layout `default_Curriculum_edit.json` y de `alignmentView.resolver.js` (cm). Re-verificar antes de iniciar cada fase.

## Documentos relacionados

- [[guardado-manual-cd-decisiones-resueltas]]
- [[guardado-manual-cd-contexto-core-y-referencia-tributacion]]
- [[guardado-manual-cd-plan-de-accion]]
- [[guardado-manual-cd-composite-section-tree]]
- [[guardado-manual-cd-requirement-editor]]
- [[guardado-manual-cd-componentes-menores]]
