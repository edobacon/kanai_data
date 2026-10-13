---
id: DOC-kb-sp13-guardado-manual-cd-composite-section-tree
project: up1
type: doc
module: curriculum-design
tags:
  - sp13
  - curriculum-design
  - guardado-manual
  - borrador
  - composite-section-tree
  - evaluaciones
  - pesos
  - plan
---

# Guardado manual en cd: plan para CompositeSectionTree (árbol de secciones y evaluaciones)

Plan de implementación del guardado manual (borrador, Guardar, Descartar) para el componente CompositeSectionTree de curriculum-design. Verificado contra código real el 2026-10-13, rama develop (cd 6e2988f). Aplica las decisiones de [[guardado-manual-cd-decisiones-resueltas]]. Contexto común en [[guardado-manual-cd-contexto-core-y-referencia-tributacion]]; plan global y tickets en [[guardado-manual-cd-plan-de-accion]].

## En una frase

El árbol escribe a la base con cada gesto, sin transacción, y el servidor valida los pesos contra lo ya escrito en cada write. Con un borrador local, la mutation `saveCompositeSectionSet` recibe el árbol plano con ids temporales (patrón del árbol de competencias de cm) y valida los pesos sobre el estado final, de modo que el orden de los gestos deja de importar.

## Dónde vive

- Componente: `modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue` (1327 líneas), con `useCompositeSectionTree.ts`, `buildPayloads.ts`, `buildTree.ts`, `CompositeSectionForm.ts`, `CompositeSectionView.ts`, `CompositeSectionNode.ts`, `validateWeightedSum.ts` y `useTreeKeyboardNav.ts`.
- Es un componente autónomo: sus propias mutations Apollo y su propio modal. No es un campo del formulario.
- Se usa en `default_Activity_edit.json` (lista de evaluaciones `evaluationList` con `"submit": false`) y en `default_Activity_view.json` con `enableEdit: false`. El layout `default_Offering_syllabus_edit.json` también declara varios elementos con `"submit": false` (L75 a L354); no se verificó cuáles son instancias de este componente (spike T0).
- Ningún otro mod lo importa (verificado).

## Glosario específico

- **Sección compuesta (CurricularSection)**: nodo del árbol. Cada nodo es una sección base más un record type 1:1 (evaluación, contenido, bibliografía, etc.).
- **Peso / métrica**: en evaluaciones, el porcentaje de un nodo. El servidor exige `suma(hijos) <= padre` (la raíz vale 100) y, al publicar, igualdad exacta.
- **`_tempId`**: id temporal de un nodo nuevo en el cliente. El servidor lo resuelve a un id real y devuelve el mapeo.
- **`knownIds`**: ids que el cliente conocía al cargar. El servidor solo retira lo que está en esa lista y ya no viene.
- **`deleteImpactPreview`**: consulta que informa cuántos nodos caen en cascada y si el borrado está restringido.

## Estado actual: inventario de escrituras

Cada gesto es un commit separado, sin transacción entre operaciones.

| Gesto | Función | Qué escribe | Después |
|---|---|---|---|
| Editar nodo | `submitForm` (CST ~620-690) | un `UPDATE_INSTANCE` con `objectType = relationName` (record type 1:1). Los campos base y del rt se separan con `splitFormData` y se unen con `buildUpdatePayload` (`buildPayloads.ts:22-31`) | aplica el cambio local (`applyEditToTree`, `useCompositeSectionTree.ts` ~190-232), sin refetch |
| Crear raíz o hijo | `submitForm` (~655) | un `CREATE_INSTANCE` sobre `relationName` con `ownerId`, `ownerType`, `parentId` y `position = max+1` (`buildPayloads.ts:45-47, 62-72`) | `refetch()` completo |
| Reordenar | `onReorder` (547-590) | N `UPDATE_INSTANCE` secuenciales con `{position}` sobre `baseObject`, diff por `computePositionUpdates` (`buildPayloads.ts:93-97`) | `refetch()`. Si falla a medias queda un orden parcial |
| Borrar | `confirmDelete` (~520-545) | un `DELETE_BULK_INSTANCES` con `[id]` sobre `baseObject`; cascada en el servidor | `refetch()` |

El reordenamiento lo disparan Sortable (raíz e hijos) y el teclado Shift+Flecha (`useTreeKeyboardNav.ts:208-240`).

Carga: query `ListCompositeSections`, `network-only`, límite 500, filtrada por `ownerType`, `ownerId` y `recordType`, orden por `position` (`useCompositeSectionTree.ts` ~105-118). Por encima de 500 nodos se trunca silenciosamente (`truncated`).

Estado local actual: no hay concepto de sucio; solo estado del modal (`modalState`, `viewState`, `deleteState`, `saving`, `saveError`).

## Estado actual: validación

- Cliente: `computeInvalidNodes` (`validateWeightedSum.ts:36-64`) marca padres donde `metric != suma(hijos)` con tolerancia 1e-6. Solo informativa: tooltip, nunca bloquea.
- Servidor (`docs/patterns/weighted-sum.md`): `suma(hijos) <= padre` en cada write (`EVALUATION_WEIGHT_EXCEEDS_PARENT`) e igualdad exacta al publicar (`EVALUATION_WEIGHT_MISMATCH`). Resolvers `evaluationWeight.js` y `activity.resolver.js`, query `validateActivityEvaluations`. Pesos enteros.
- Existe `logic/helpers/weightedSum.js` en cd como aritmética de paridad entre cliente y servidor (confirmado).
- Problema de fondo: el servidor valida cada write contra lo ya persistido. Pasar de 60/40 a 50/50 falla si se sube un peso antes de bajar el otro, aunque el estado final sea válido.

## Precedente que se copia: guardado del árbol de competencias de cm

`curriculum-mapping/logic/competencyTree-upsert.resolver.js` (`upsertCompetencyTreeValidated`):
- Payload plano con `parentId`; los nodos nuevos traen `_tempId` y pueden colgar de otros nodos nuevos del mismo guardado.
- `planTree` resuelve niveles y la escritura baja de a uno.
- Devuelve `nodes` (mapeo de id entrante o temporal a id real) y `warnings` que no bloquean (suma de pesos distinta de 100).
- Un grupo de hermanas que viene entero se renumera a 1..N respetando el orden recibido: sirve directamente para el reordenamiento.
- Rechaza todo el guardado si un id ya no existe; todo en una transacción.
Diferencia deliberada: cm borra de forma inmediata en una mutation aparte (`deleteCompetencyNodesValidated`). Aquí el borrado entra al borrador (decisión D3) porque el objetivo es un Descartar real.

## Diseño (decidido)

### Modelo del borrador

- Copia de trabajo del árbol (`workingTree`) con `_tempId` para nodos nuevos; el `parentId` de un hijo de un nodo nuevo apunta al `_tempId`.
- Operaciones puras: agregar, editar campos, mover y reordenar, borrar con cascada local. Mismo estilo que `upsertRow` y `removeRow` de tributación.
- Diff contra el snapshot: altas, bajas, modificaciones y cambios de posición, con clave por id.
- Borrado local con cascada: se calcula en el cliente la cascada de hijos persistidos y se descartan sin llamada los hijos creados en la misma sesión. `deleteImpactPreview` consulta lo persistido; se combina con el cálculo local.
- Reordenar es reordenar el array local; el servidor renumera el grupo de hermanas.

### Guardar: `saveCompositeSectionSet` (decisión D1)

- Payload: `ownerType`, `ownerId`, `recordType`, nodos con `_tempId` o id y `parentId`, y `knownIds`.
- Valida antes de abrir la transacción (RBAC por operación efectiva, tope de nodos, plan o Activity editable), aplica altas, cambios, bajas y posiciones en una transacción y valida los pesos sobre el **estado final** con `weightedSum.js` (`<=` bloqueante; igualdad solo al publicar, D4). La suma que no cierra vuelve como `warnings`.
- Un id del payload que ya no existe rechaza el guardado con código tipado y se ofrece recargar (D5). Los retiros se limitan a `knownIds`.
- Devuelve el mapeo de ids para que el cliente actualice sus referencias sin releer el árbol; publica evento y DataLog después del commit.
- Mantiene el guard de publicación: no cambia `EVALUATION_WEIGHT_MISMATCH` al publicar.

### Descartar y avisos

- Descartar restaura el árbol desde el snapshot, sin llamada al servidor, con confirmación solo si hay cambios (D6).
- `beforeunload` y confirmación al cambiar `ownerId` (hoy el watcher refetchea y perdería el borrador) (D7).
- Barra Guardar/Descartar con indicador de cambios sin guardar. El layout declara el elemento con `"submit": false`, por lo tanto el Guardar del formulario de la Activity no lo cubre; el spike T0 confirma cómo coexisten las dos barras y el Guardar de la Activity.

## Casos límite

- Pesos que suman 100 solo al final: se pueden guardar incompletos (`<=` al escribir, `===` al publicar); la validación de cliente sigue como advertencia.
- Peso mayor que el del padre: el cliente lo marca con `invalidNodes` y el servidor lo rechaza al guardar el conjunto.
- Hijo de un nodo nuevo: se resuelve con `_tempId` y el mapeo devuelto.
- Borrar un nodo con hijos creados en la misma sesión: se descartan sin llamada.
- Árbol truncado a 500 nodos: el reordenamiento renumera grupos de hermanas completos, así que con `truncated` se desactiva la edición o se sube el límite (se decide en T0).
- Actividad publicada (Active): el guard de publicación sigue vigente; el borrador no lo salta.
- Concurrencia: id obsoleto rechaza; misma fila, gana la última (D5).
- Instancias múltiples (evaluaciones y secciones de sílabo) con borradores propios en la misma página: coordinar indicadores y barras.

## Plan por fases (esfuerzo orientativo en puntos)

Rangos para calibrar, no compromisos. La numeración corresponde a los tickets del plan.

| Fase | Ticket | Contenido | Esfuerzo | Riesgo | Validación |
|---|---|---|---|---|---|
| T0 | dentro de G0 | Spike: contar instancias del componente por layout, convivencia con el Guardar de la Activity, tope de 500 nodos | 2-3 | Bajo | Respuestas registradas |
| T1 | T1 | Backend `saveCompositeSectionSet`: `_tempId`, estado final, `knownIds`, mapeo de ids, id obsoleto, RBAC, transacción, eventos | 10-18 | Medio | Integración: rollback total, orden irrelevante (60/40 a 50/50), RBAC, cascada de borrado, plan publicado, id obsoleto |
| T2 | T2 | Front: borrador del árbol (`_tempId`, diff, cascada local), reemplazo de mutations por patches, barra y confirmación | 13-21 | Alto | Lógica pura (diff, remapeo de ids, cascada), componente (guardar, error, descartar) |
| T3 | T3 | Reordenamiento (arrastre y teclado) sobre el borrador y vista previa de impacto combinada | 5-8 | Medio | Reorden sin llamadas; diff de posiciones |
| T4 | dentro de V1 | Avisos de salida, truncado, documentación y verificación humana | 5-8 | Bajo | Checklist |

Total orientativo del componente: 35 a 58 puntos. T2 depende de G1 y T1.

## Criterios de aceptación propuestos

1. Ninguna edición, alta, reorden ni borrado escribe a la base hasta pulsar Guardar.
2. Guardar aplica el conjunto completo de forma atómica; un fallo no deja nodos a medias.
3. Pasar de 60/40 a 50/50 en el borrador se guarda sin error, sin importar el orden de los gestos.
4. Descartar restaura el árbol cargado y no deja nodos en la base, con confirmación si hay cambios.
5. Un hijo de un nodo nuevo se guarda con el padre correcto.
6. El indicador de cambios sin guardar refleja el diff real.
7. La publicación de la Activity sigue exigiendo `===` 100 en cada nivel (`EVALUATION_WEIGHT_MISMATCH`).
8. Un id obsoleto en el payload rechaza el guardado con código tipado y recarga.

## Fuera de alcance

- Cambiar las reglas de peso del servidor (`<=` al escribir, `===` al publicar).
- El contrato del core (UPONE-1931).
- Aumentar o eliminar el tope de 500 nodos, salvo decisión en T0.

## Pendientes de verificación

- Lectura completa de `CompositeSectionForm.ts`, `CompositeSectionView.ts` y `CompositeSectionNode.ts` (solo se leyó lo necesario).
- Cuántas instancias del componente existen en `default_Offering_syllabus_edit.json` y con qué `recordType`.
- Cómo se comporta `submit: false` frente al Guardar de la Activity.

Resuelto desde la versión anterior: `logic/helpers/weightedSum.js` existe.

## Vigencia

Depende de `docs/patterns/weighted-sum.md`, de los resolvers `evaluationWeight.js` y `activity.resolver.js`, de `competencyTree-upsert.resolver.js` (cm) y de los layouts de Activity y sílabo. Re-verificar antes de iniciar T1.

## Documentos relacionados

- [[guardado-manual-cd-decisiones-resueltas]]
- [[guardado-manual-cd-contexto-core-y-referencia-tributacion]]
- [[guardado-manual-cd-plan-de-accion]]
- [[guardado-manual-cd-curriculum-mesh]]
- [[guardado-manual-cd-requirement-editor]]
- [[guardado-manual-cd-componentes-menores]]
