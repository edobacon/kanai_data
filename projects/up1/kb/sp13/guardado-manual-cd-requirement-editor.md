---
id: DOC-kb-sp13-guardado-manual-cd-requirement-editor
project: up1
type: doc
module: curriculum-design
tags:
  - sp13
  - curriculum-design
  - guardado-manual
  - borrador
  - requirement-editor
  - requisitos
  - plan
---

# Guardado manual en cd: plan para RequirementEditor (requisitos de una asignatura)

Plan de implementación del guardado manual (borrador, Guardar, Descartar) para el componente RequirementEditor de curriculum-design. Verificado contra código real el 2026-10-13, rama develop (cd 6e2988f). Aplica las decisiones de [[guardado-manual-cd-decisiones-resueltas]]. Contexto común en [[guardado-manual-cd-contexto-core-y-referencia-tributacion]]; plan global y tickets en [[guardado-manual-cd-plan-de-accion]].

## En una frase

El editor crea y borra requisitos mediante varias escrituras seguidas sin transacción, y el servidor bloquea cualquier write si la asignatura está en un plan activo. Con un borrador local, la mutation `saveRequirementSet` recibe el árbol plano con ids temporales (patrón del árbol de competencias de cm), lo aplica de forma atómica, y la edición se bloquea desde el inicio si hay plan Active en lugar de descubrirlo al guardar.

## Dónde vive

- Componente: `modsComponents/RequirementEditor/RequirementEditorElement.vue` (1291 líneas), con `requirementEditor.logic.ts`, `requirementCreate.logic.ts`, `requirementFamilies.logic.ts`, `useAffectedPlans.ts` y `affectedPlans.logic.ts`. Reusa `useReglaUnificada` y el árbol de `ReglaUnificadaView`.
- Es autónomo, con sus propias mutations Apollo y permisos RBAC propios (`canCreate/canModify/canDelete`, RQE ~531-535, `requirementPermissions.logic.ts`).
- Se monta en `default_Activity_edit.json` (L41-47) con `"submit": false`, en la pestaña "Requisitos" (capability `requirement:view`).
- Ningún otro mod lo importa (verificado).

## Glosario específico

- **Requisito (requirement)**: regla que condiciona tomar una asignatura. Es un árbol de grupos y hojas.
- **Group (AND/OR)**: nodo que combina requisitos. Un Group OR con `minToSatisfy = K` modela "K de N".
- **Hoja**: condición concreta (haber aprobado una asignatura, un mínimo numérico).
- **Vía**: rama alternativa (Group AND bajo un OR). `NEW_VIA` indica crear una vía nueva.
- **Electivo (pool)**: Group OR con K de N cursos.
- **Exigencia (`isHardRule`)**: si el requisito es obligatorio o recomendado.
- **Plan afectado**: plan (Curriculum) donde está la Activity; si está Active, bloquea escrituras.
- **`_tempId`**: id temporal de un nodo nuevo en el cliente; el servidor lo resuelve y devuelve el mapeo.

## Estado actual: inventario de escrituras

Mutations declaradas en RQE:427-445: `CREATE_INSTANCE`, `UPDATE_INSTANCE` y `DELETE_INSTANCE` (con `objectType: 'requirement'`).

| Gesto | Función | Qué escribe | Después |
|---|---|---|---|
| Agregar | `submitAdd` (RQE ~770-885) | varios writes secuenciales vía `createFn`/`updateFn` (`requirementCreate.logic.ts`): `executeConditionCreate` (1 hoja), `executeConditionCreateBatch` (N hojas bajo la misma vía), `executeElectiveCreate` (pool `Group(OR, minToSatisfy=K)` más N hojas). `resolveTargetGroup` (L~105-135) puede crear el `Group(OR)` contenedor y un `Group(AND)` de vía nueva, y hacer un `UPDATE` que reparenta una hoja existente | `refetch()`. Rollback manual best-effort en el catch (L~861-880) |
| Editar exigencia | `confirmEditExigencia` (~915-935) | un `UPDATE_INSTANCE` sobre `rt__<kind>__requirement`, solo `isHardRule` | `refetch()` |
| Borrar | `confirmDelete` (~960-980) | `computeDeleteCascade` (`requirementEditor.logic.ts:214`) calcula en cliente la hoja y los Group ancestros que quedan vacíos; luego N `DELETE_INSTANCE` secuenciales bottom-up | `refetch()`. El servidor aborta en el primer delete si el guard de plan Active bloquea |

No hay reordenamiento ni transacción en este componente.

## Estado actual: validación

- Cliente, antes de escribir: `validateComplete` (campos requeridos), pisos numéricos (`min`/`exclusiveMin`), electivo con al menos 2 cursos y `1 <= K <= N` (RQE ~770-790, 815-830).
- Servidor: `requirementActivityGuard.js` (citado en `affectedPlans.logic.ts:1-11`) bloquea la escritura si la Activity está en un `Curriculum` con estado en `PUBLISHED_PLAN_STATUSES` (Active). Los planes Draft solo se listan como impacto.
- `useAffectedPlans` hace dos queries `network-only` (`ListPlanEntriesByActivity` y `ListCurriculaByIds`, límite 200); `partitionAffectedPlans` separa publicados y editables. La alerta es informativa; el bloqueo real es del servidor.
- Dependencia del estado persistido: `executeX` recibe `tree.value` para decidir si ya existe un OR o una vía.
- No hay validación tipo weighted-sum en este componente.

## Diseño (decidido)

### Modelo del borrador

- Árbol local de requisitos (`workingTree`) con `_tempId` para grupos y hojas nuevos, derivado del árbol de `useReglaUnificada`.
- Operaciones puras: agregar condición, agregar por lote, agregar electivo, editar exigencia, borrar con cascada. `computeDeleteCascade` ya es lógica pura y se extiende a nodos no persistidos.
- `resolveTargetGroup` corre sobre el borrador, sin leer estado fresco, para decidir si ya existe el OR o la vía y si hay que envolver una hoja. La decisión queda reflejada en el payload y no se recalcula en el servidor con otro resultado.
- Diff contra el snapshot: grupos y hojas nuevos, borrados, reparentados y cambios de `isHardRule`.
- Bloqueo temprano: `affectedPlans.published` deshabilita la edición al abrir cuando hay plan Active.

### Guardar: `saveRequirementSet` (decisión D1)

- Payload plano: `activityId`, nodos con `_tempId` o id y `parentId`, y `knownIds` (patrón de `upsertCompetencyTreeValidated`, más el retiro por `knownIds` de tributación).
- El servidor valida antes de abrir la transacción: guard de plan Active, RBAC por operación efectiva, forma final (ningún Group vacío, `1 <= K <= N`, mínimo 2 cursos en electivo). Aplica altas, reparentados, cambios y bajas en una transacción y devuelve el mapeo de ids.
- Un id del payload que ya no existe rechaza el guardado con código tipado y recarga (D5).
- Elimina el rollback manual de grupos y las vías vacías que se evalúan como satisfechas por vacuidad.
- Debe reproducir la lógica de `resolveTargetGroup` y los efectos de `collapseSingleVia`/`pruneEmptyGroups` (hoy post-proceso de render).

### Descartar y avisos

- Descartar restaura el árbol desde el snapshot, sin llamada, con confirmación solo si hay cambios (D6). Todo borrado entra al borrador (D3).
- `beforeunload` y aviso al cambiar de pestaña de la Activity con borrador sucio (D7). El componente vive en una pestaña; los avisos de modal y de ruta quedan al core.
- `"submit": false` del layout: el Guardar del formulario de la Activity no lo cubre. El spike R0 confirma cómo coexisten las dos barras.

## Casos límite

- Electivo K de N con cursos que cambian entre el borrador y el commit: el servidor revalida K entre 1 y N sobre el estado final.
- Vía nueva contra existente (`NEW_VIA`) y reparentado de hojas sueltas: la decisión de envolver o reusar un grupo se toma en el borrador.
- Borrar una hoja que deja una vía vacía: la cascada incluye ids temporales de nodos nuevos.
- Plan Active: la edición se bloquea al abrir. Si el estado cambia durante la edición, el servidor rechaza y el cliente pasa a solo lectura sin perder el borrador de forma silenciosa.
- Concurrencia: id obsoleto rechaza; misma fila, gana la última (D5).
- Asignatura en varios planes: los planes Draft solo se listan como impacto; el aviso se muestra antes de editar.

## Plan por fases (esfuerzo orientativo en puntos)

Rangos para calibrar, no compromisos. La numeración corresponde a los tickets del plan.

| Fase | Ticket | Contenido | Esfuerzo | Riesgo | Validación |
|---|---|---|---|---|---|
| R0 | dentro de G0 | Spike: leer `useReglaUnificada`, `requirementFamilies.logic.ts` y los helpers de colapso; confirmar guard de Active y `submit:false` frente al Guardar de la Activity | 2-3 | Bajo | Respuestas registradas |
| R1 | R1 | Barra Guardar/Descartar y borrador de la exigencia (`isHardRule`) como primera entrega, con bloqueo temprano si el plan está Active | 3-5 | Bajo | Componente: guardar, descartar, bloqueo |
| R2 | R2 | Backend `saveRequirementSet`: grupos, vías, hojas, reparentado, bajas, guard de Active, forma final, mapeo de ids, transacción, eventos | 13-21 | Medio-alto | Integración: rollback total, plan Active, K de N, vía vacía, RBAC, id obsoleto |
| R3 | R3 | Front: borrador del árbol (`_tempId`, `resolveTargetGroup` local, cascada de borrado local, diff) y reemplazo de las secuencias de mutations | 8-13 | Alto | Lógica pura (agregar, lote, electivo, borrar, reparentar), componente |
| R4 | dentro de V1 | Avisos de salida, documentación y verificación humana | 3-5 | Bajo | Checklist |

Total orientativo del componente: 29 a 47 puntos. R1 depende de G1; R3 depende de G1 y R2.

## Criterios de aceptación propuestos

1. Ninguna alta, edición ni borrado escribe a la base hasta pulsar Guardar.
2. Guardar aplica todo el conjunto de forma atómica; no quedan Groups huérfanos ni vías vacías.
3. Si la asignatura está en un plan Active, la edición se bloquea al abrir, no al guardar.
4. Descartar restaura el árbol cargado sin dejar registros, con confirmación si hay cambios.
5. Un electivo guardado cumple `1 <= K <= N` y mínimo 2 cursos.
6. El indicador de cambios sin guardar refleja el diff real.
7. Un id obsoleto en el payload rechaza el guardado con código tipado y recarga.

## Fuera de alcance

- Cambiar el modelo de requisitos o el evaluador de requisitos.
- El árbol de solo lectura `ReglaUnificadaView`.
- El contrato del core (UPONE-1931).

## Pendientes de verificación

- Lectura a fondo de `useReglaUnificada`, `requirementFamilies.logic.ts` y de cómo `collapseSingleVia`/`pruneEmptyGroups` afectan lo guardado.
- Cómo se comporta `submit: false` frente al Guardar de la Activity.
- Si la edición abre en modal o en página completa.

## Vigencia

Depende de `requirementActivityGuard.js`, `requirementCreate.logic.ts`, `competencyTree-upsert.resolver.js` (cm) y del layout de Activity. Re-verificar antes de iniciar R2.

## Documentos relacionados

- [[guardado-manual-cd-decisiones-resueltas]]
- [[guardado-manual-cd-contexto-core-y-referencia-tributacion]]
- [[guardado-manual-cd-plan-de-accion]]
- [[guardado-manual-cd-curriculum-mesh]]
- [[guardado-manual-cd-composite-section-tree]]
- [[guardado-manual-cd-componentes-menores]]
