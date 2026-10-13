---
id: DOC-kb-sp13-guardado-manual-cd-plan-de-accion
project: up1
type: doc
module: curriculum-design
tags:
  - sp13
  - curriculum-design
  - guardado-manual
  - borrador
  - plan
  - plan-de-accion
  - decisiones
  - UPONE-1931
---

# Guardado manual en cd: plan de acción, decisiones y desglose en tickets

Plan de acción para pasar los componentes custom de curriculum-design (cd) de autoguardado a guardado manual con borrador, Guardar y Descartar, como en tributación (cm). Consolida los planes por componente y aplica las decisiones resueltas en [[guardado-manual-cd-decisiones-resueltas]]. Verificado contra código real el 2026-10-13, rama develop (cd 6e2988f). Este documento es el punto de entrada; el detalle está en los documentos hermanos.

## En una frase

Tres componentes de cd escriben por su cuenta (malla, árbol de secciones y editor de requisitos), cinco no, y el core no permite que un componente participe del Guardar del formulario. Se construye un composable genérico de borrador (extraído de tributación), cada componente trae su barra Guardar/Descartar y una mutation atómica en el servidor siguiendo los patrones que ya existen en cm, y el adaptador queda listo para enchufarse al kit del core (UPONE-1931) cuando exista.

## Alcance

**Dentro:** los 8 componentes custom de `mods/curriculum-design/modsComponents/`: CurriculumMesh, CompositeSectionTree, RequirementEditor (cambian), y ColorPicker, ActivityStatusBadge, InstructionalTotalDisplay, ReglaUnificadaView, RichTextRenderer (sin cambio, documentados).

**Fuera:**
- El kit de guardado del core (UPONE-1931, K1 a K4), que es otro entregable.
- Los elementos genéricos del core (`FileFieldElement`, `ReferenceSelectElement`, `RecordPickerElement`): `components/` y `composables/` de cd son enlaces simbólicos a `layout/src`.
- El cambio de los árboles de requisitos, las reglas de peso del servidor y `Curriculum.totalPeriods`.

## Resumen por componente

| Componente | Escribe hoy | Hay que hacer | Documento |
|---|---|---|---|
| CurriculumMesh | Sí, ~15 rutas con `refetch()` | Borrador de entradas y bloques, mutation `savePlanMeshSet` de conjunto con `knownIds`, vista efectiva para los guards | [[guardado-manual-cd-curriculum-mesh]] |
| CompositeSectionTree | Sí, un commit por gesto | Árbol local con `_tempId`, mutation `saveCompositeSectionSet` con pesos sobre el estado final | [[guardado-manual-cd-composite-section-tree]] |
| RequirementEditor | Sí, multi-write sin transacción | Árbol de reglas local, mutation `saveRequirementSet`, bloqueo temprano si hay plan Active | [[guardado-manual-cd-requirement-editor]] |
| Cinco componentes menores | No | Nada en el componente; documentar excepciones del core | [[guardado-manual-cd-componentes-menores]] |

## Decisiones resueltas (resumen)

El detalle, los precedentes de código y lo que cambia si el PO revierte cada una están en [[guardado-manual-cd-decisiones-resueltas]].

| # | Decisión | Resolución |
|---|---|---|
| D1 | Servidor | Batch transaccional por componente: conjunto con `knownIds` (patrón de tributación) para la malla; árbol plano con `_tempId` y mapeo de ids (patrón del árbol de competencias de cm) para secciones y requisitos. La malla no usa `movePlanEntry` como puente |
| D2 | Core | Barra propia con composable genérico y adaptador; no esperar a UPONE-1931. `customEndpoint` queda como evolución en layouts dedicados |
| D3 | Fuera del borrador | Transición de estado, subida de archivos y "crear nuevo" quedan inmediatos. Todo borrado entra al borrador |
| D4 | Pesos | `<=` bloqueante en el servidor sobre el estado final; igualdad solo al publicar; cliente informativo; suma que no cierra como `warnings` |
| D5 | Concurrencia | Id obsoleto rechaza el guardado (patrón de cm) más `knownIds`; misma fila, gana la última. Sin firma de snapshot |
| D6 | Descartar | Con confirmación solo si hay cambios (desviación de tributación) |
| D7 | Salida | `beforeunload` en el composable genérico (desviación) y confirmación al cambiar de contexto interno |
| D8 | Caso 28 | Tributación ve solo lo persistido (lo lee del servidor) |
| D9 | Orden | Por riesgo, backends al inicio |

Hallazgo preexistente, no corregido: el guard de borrado de la malla no menciona tributaciones. Verificar si lo cubre la base de datos.

## Qué se resuelve y qué no

Se resuelve: que ningún gesto en estos componentes modifique la base hasta pulsar Guardar; que Descartar sea real; que un fallo no deje datos a medias; que los guards trabajen sobre lo que el usuario ve.

No se resuelve sin el core: un único Guardar para toda la página, y que el aviso de cierre de modal o de ruta sepa que hay un borrador (consultan el `isDirty` del formulario). Con `beforeunload` propio (D7) queda cubierta la recarga y el cierre de pestaña.

## Orden y dependencias

1. **Fase 0:** G0 (confirmar decisiones con el PO y cerrar los spikes).
2. **Fase 1:** G1 (composable genérico y barra) y R1 (exigencia del editor de requisitos, primera entrega visible).
3. **Fase 2, en paralelo:** backends R2, T1, M3. Dependen de patrones ya escritos y son independientes entre sí.
4. **Fase 3:** fronts R3, T2, T3 y el borrador de la malla (M1 y M2 fusionados).
5. **Fase 4:** M4 (electiva y modular), V1 (avisos, coordinación malla y tributación, documentación) y X1.

Dependencia dura: G1 antes de cualquier front; el backend de cada componente antes de su front.

## Desglose en tickets (revisado con las decisiones)

Cada ticket lleva sus criterios de aceptación de los documentos por componente y el análisis de impacto colateral (sin consumidores externos a cd).

| Ticket | Contenido | Esfuerzo | Depende de |
|---|---|---|---|
| G0 | Confirmar D3, D4, D5, D6 y D8 con el PO; spikes M0, T0, R0, X0 | 4-8 | nada |
| G1 | Composable genérico de borrador y barra, con `beforeunload` y confirmación de Descartar | 6-10 | G0 |
| R1 | RequirementEditor: borrador de exigencia y bloqueo temprano si el plan está Active | 3-5 | G1 |
| R2 | Backend `saveRequirementSet` (grupos, vías, hojas, reparentado, bajas) | 13-21 | G0 |
| R3 | RequirementEditor: borrador del árbol de reglas | 8-13 | G1, R2 |
| T1 | Backend `saveCompositeSectionSet` (patrón del árbol de competencias, pesos sobre estado final) | 10-18 | G0 |
| T2 | CompositeSectionTree: borrador del árbol con `_tempId` | 13-21 | G1, T1 |
| T3 | CompositeSectionTree: reordenamiento y vista previa de impacto sobre borrador | 5-8 | T2 |
| M3 | Backend `savePlanMeshSet` reusando los helpers de guards de `planEntry` | 10-18 | G0 |
| M1 | CurriculumMesh: borrador de entradas (arrastre, quitar, alta obligatoria) y vista efectiva | 13-21 | G1, M3 |
| M4 | CurriculumMesh: alta electiva y modular con bloque virtual y alta guiada | 13-21 | M1 |
| V1 | Avisos de salida, coordinación malla y tributación en la misma página, documentación del mod | 5-8 | M4, T3, R3 |
| X1 | Documentar excepciones del core y ticket Core Extension si se decide diferir `FileField`/`ReferenceSelect` | 3-5 | G0 |

Total orientativo: 108 a 179 puntos, sin el kit del core. Son rangos para calibrar, no compromisos. La numeración de fases dentro de cada documento por componente (M0 a M5, T0 a T4, R0 a R4, X0 a X2) corresponde a estos mismos entregables; en la malla, M1 y M2 de ese documento se fusionan en M1 y dependen de M3, según D1.

## Coordinación con UPONE-1931

- Los adoptantes ya figuran en la propuesta del kit (CompositeSectionTree, RequirementEditor, CurriculumMesh y tributación).
- Pedir al dueño del core el calendario del contrato K1/K2. Si llega antes del front, el adaptador del composable genérico se conecta ahí.
- Los pendientes de esa propuesta (Core Extension, subtareas, modal contra página completa, hook backend desde un mod) condicionan los avisos de salida.
- Cualquier cambio en `FileFieldElement` o `ReferenceSelectElement` es del core y se tramita con la skill de Core Extension.

## Análisis de impacto colateral

- **Consumidores de los componentes:** ninguno externo a cd. Las coincidencias en academic-scheduling, curriculum-mapping y up1-manager son comentarios; cm declara no importar CurriculumMesh. Verificado el 2026-10-13.
- **Layouts afectados:** `default_Curriculum_edit.json` (malla y tributación juntas), `default_Activity_edit.json` (editor de requisitos y evaluaciones) y `default_Offering_syllabus_edit.json` (por confirmar cuántas instancias del árbol). Las vistas son de solo lectura.
- **Mutations nuevas** (`savePlanMeshSet`, `saveCompositeSectionSet`, `saveRequirementSet`): requieren esquema GraphQL, RBAC, eventos y DataLog como los batches existentes, y deben figurar en `docs/reference/graphql-mutations.md` y en el contrato MCP del mod (`ai/contracts.js`).
- **Mutations existentes** (`createPlanEntriesBatch`, `deletePlanEntriesBatch`, `movePlanEntry`): no cambian; sus helpers se reusan.
- **Esquema de datos:** sin cambios previstos. Agregar una constraint o versión de fila se trata aparte.

## Estrategia de pruebas

- Lógica pura del borrador (diff, ids temporales, remapeo, cascada), siguiendo `competencyAlignmentDraft.logic.spec.ts`.
- Componente: guardar, error con borrador conservado, descartar con y sin cambios, barra ausente en modo lectura, cambio de contexto con borrador sucio, carga atrasada descartada.
- Integración backend: rollback total, `knownIds`, id obsoleto, RBAC por operación efectiva, plan no editable, tope de filas.
- Regresión de las mutations y guards existentes.
- Verificación humana por componente (agregar, editar, reordenar, borrar, descartar, recargar a mitad).

## Riesgos principales

- Tres backends nuevos con reglas hoy repartidas entre cliente y resolvers: riesgo de divergencia. Se mitiga reusando los helpers y probando contra los mismos casos.
- Pérdida de cambios por cierre de modal o navegación interna mientras no exista el contrato del core (la recarga y el cierre de pestaña quedan cubiertos por `beforeunload`).
- Dos borradores en la misma página (malla y tributación) con barras separadas. Se mitiga con un contenedor de acciones común o esperando K2.
- Estimaciones con rangos amplios porque no se leyeron los modales de la malla ni los helpers de requisitos.

## Criterios de aceptación globales

1. Ningún componente de la lista modifica la base antes de Guardar.
2. Descartar restaura el estado cargado sin dejar residuos.
3. Un fallo de Guardar conserva el borrador y no deja datos parciales.
4. El indicador de cambios sin guardar es consistente en cada componente.
5. Los guards (prerrequisitos, borrado, pesos, plan Active) siguen vigentes con el borrador.
6. Las excepciones (transición de estado, subida de archivos, crear desde selector) están documentadas.

## Qué no cierra este plan

- El Guardar único de la página y el aviso de modal y ruta, que dependen del core.
- El comportamiento de las instancias del árbol en el sílabo, hasta contarlas.
- El borrado de una asignatura con tributaciones, hasta verificarlo.

## Pendientes de verificación (consolidado)

- Lectura de los modales de la malla (`AddEntryModal`, `EditEntryModal`, `DeleteEntryModal`, `PrereqBlockModal`, `RequirementsModal`).
- Instancias del árbol de secciones en `default_Offering_syllabus_edit.json` y sus `recordType`.
- Lectura a fondo de `useReglaUnificada` y de los helpers de colapso de requisitos.
- Qué cubre el borrado de un `planEntry` con tributaciones.
- Edición en modal o en página completa.
- `onConfirm` de `RecordPicker` y el origen de la transición de estado.
- Cómo se comporta `submit: false` frente al Guardar de la Activity con barra propia.

Resuelto desde la versión anterior: `logic/helpers/weightedSum.js` existe en cd; cm lee los `planEntry` del servidor.

## Vigencia

Datos del 2026-10-13 sobre develop. Caducan si cambian `layout`, `object-manager`, los resolvers de `planEntry`, de pesos y de tributación, o avanza UPONE-1931. Re-verificar el documento del componente al iniciar cada ticket.

## Documentos relacionados

- [[guardado-manual-cd-decisiones-resueltas]]
- [[guardado-manual-cd-contexto-core-y-referencia-tributacion]]
- [[guardado-manual-cd-curriculum-mesh]]
- [[guardado-manual-cd-composite-section-tree]]
- [[guardado-manual-cd-requirement-editor]]
- [[guardado-manual-cd-componentes-menores]]
