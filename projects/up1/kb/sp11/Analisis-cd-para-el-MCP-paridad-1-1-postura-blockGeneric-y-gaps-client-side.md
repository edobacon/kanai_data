---
id: DOC-kb-sp11-Analisis-cd-para-el-MCP-paridad-1-1-postura-blockGeneric-y-gaps-client-side
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - paridad-1a1
  - genericWriteAllowed
  - client-side
  - analisis
---

# Analisis cd para el MCP: paridad 1:1, postura blockGeneric y gaps client-side

Analisis de sp11 de curriculum-design (cd) para el MCP de up1, con el mismo esquema que el ticket de cm: gobernanza, logica client-side, workflow de guardado, esfuerzo y viabilidad mod-only. Verificado contra codigo real (3 relevamientos, file:line).

## 0. Encuadre: cd es el opuesto de cm, pero N0 NO implica 1:1

cd es N0: sus reglas viven en los OVERRIDES del CRUD generico (`sectionValidation.resolver.js` create, `polymorphicUpdate.resolver.js` update, `requirementCategoryDelete.resolver.js` delete), asi que el `createInstance`/`updateInstance`/`deleteInstance` generico YA pasa por la validacion. Por eso el MCP generico respeta las reglas de cd sin bloqueo. Opuesto a cm (N1, el generico saltea).

PERO N0 solo cubre las reglas que ESTAN server-side. La revision del frontend encontro **4 reglas de negocio que viven solo en el cliente**, y esas se saltean tanto el generico como las tools. Consecuencia contraintuitiva: **cd necesita MAS trabajo de resolver que cm para el 1:1 real** (4 gaps vs 1), aunque necesita MENOS trabajo de tools (ya tiene 4, y el resto es reproducible por generico).

## 1. Estado y tools de dominio existentes

cd ya expone 4 tools (fichas declarativas, `mods/curriculum-design/ai/tools.js`):
- `cd_validate_activity_evaluations` (query): valida que el arbol de evaluacion de un curso sume, sin mutar.
- `cd_create_formtemplate_for_activity` (mutation): crea y linkea un FormTemplate.
- `cd_add_plan_entries_batch` (mutation `createPlanEntriesBatch`): alta atomica de N planEntry.
- `cd_remove_plan_entries_batch` (mutation `deletePlanEntriesBatch`): borrado atomico de N planEntry.

`ai/index.js` declara `objects` (Activity:Course, planEntry) y `notExposed` (curricula, planes, programas, bibliografia, version chain), ambos decorativos (no gatean nada).

## 2. Postura blockGeneric: genericWriteAllowed (opt-out), no governedObjects

En cd el generico ES el mismo codigo que aplica la regla (N0), asi que el genérico es un camino de escritura seguro. Grep de `governedObjects|genericWriteAllowed|blockGenericMutation` en `mods/curriculum-design/` -> cero: cd no declara nada hoy. Lo que corresponde declarar (rama `origin/UPONE-1758`):
- **`genericWriteAllowed`** para los 13 objetos propios (los que tienen `.json` en `objects/`): activity, planEntry, requirement, requirementCategory, CurricularSection, Curriculum, Offering, AcademicProgram, BibliographyReference, CurricularLink, InstructionalComponentType, PlanEnrollment, ProgramEnrollment.
- **`governedObjects`**: cero. No hay objeto de cd cuya regla viva en una mutation separada inalcanzable por el generico.
- El gate de completitud (`validate-governed-objects.js`) es opt-in: si cd declara genericWriteAllowed de uno, debe decidir los 13. Declararlos todos como genericWriteAllowed es la contraparte de cd en el lockstep de blockGeneric (analogo a los governedObjects de cm, pero al reves).

Mantener el generico ABIERTO (genericWriteAllowed) es lo que permite que el agente reproduzca las orquestaciones multi-mutation de la malla via generico (ver seccion 4). Bloquearlo obligaria a construir tools para todo.

### 2.1 Clasificacion por objeto (N0/sin-regla)
- N0 en create/update: activity (`sectionValidation.resolver.js:233-242`, `polymorphicUpdate.resolver.js:439-456,751-755`), planEntry (`:202-221`, `:756-760`), requirementCategory (`:166-172`, `:403-421`), requirement (`:173-201`, `:745-750`), CurricularSection (dispatch por RT), Curriculum (`:334`, `:741-743`), Offering (solo recordType Syllabus, `:243-269` + `offeringGuard.js`).
- Sin-regla (catalogos/relaciones): AcademicProgram, BibliographyReference, CurricularLink, InstructionalComponentType, PlanEnrollment, ProgramEnrollment.
- DELETE sin override encontrado para: Activity, Curriculum, CurricularSection, Offering (ver preguntas abiertas, seccion 5).

## 3. Paridad 1:1 con la UI: revision client-side (17 reglas)

11 server-tambien, 6 UX puro, **4 CLIENT-ONLY (gaps reales de 1:1)**:

1. **Motor de prerrequisitos/correquisitos/umbral de creditos en el ALTA de planEntry** (el mayor). Cliente: `CurriculumMesh/evaluateRequirementTree.logic.ts` + `prereqCheck.logic.ts:41-168`, aborta el alta (`CurriculumMeshElement.vue:1713`). Server: NO existe guard en create (`sectionValidation.resolver.js:202-221`, `planEntry-batch.resolver.js:154-160` solo validan Plan Draft/unicidad/forma). El evaluador SI existe server-side pero cableado solo al BORRADO (`planEntryDeletionRequirementGuard.js`). **Impacto: `cd_add_plan_entries_batch` (tool YA existente) puede insertar cursos violando prerrequisitos, estado que la UI nunca permite.** Portabilidad ALTA: el twin server (`evaluateRequirementTree.js`) y el loader (`requirementTreeLoader.js`) ya existen; falta cablearlos como guard de CREATE, analogo al de delete.
2. **Ensamblado estructural del arbol de requisitos "por vias"** (OR contenedor -> AND por via -> hojas). Cliente: `RequirementEditor/requirementCreate.logic.ts` (`ensureOrContainer`, `resolveTargetGroup`, `createViaGroup`). Server: ningun resolver valida la FORMA del arbol (solo ciclos y estado de plan por create/update individual). Impacto: un caller MCP puede crear estructuras que el evaluador interpreta distinto a la intencion. Portabilidad MEDIA: exponer una mutation de dominio (`createRequirementCondition`) que porte esa logica.
3. **Consistencia K<=N** en pool K-de-N (`minToSatisfy` <= hijos normativos). Cliente: `deriveMinToSatisfy` (`curriculumMesh.logic.ts:557-561`), K>N solo se reporta, no bloquea. Server: ningun guard valida K<=N (schema solo exige `minToSatisfy>=1`). Impacto: se persiste un requisito imposible. Portabilidad ALTA: invariante simple en el dispatch de requirement.
4. **Cascada de borrado de Groups vacios** (`requirementEditor.logic.ts:214-238`, `computeDeleteCascade`). Server: no borra Groups huerfanos por su cuenta. Impacto: borrar la hoja por MCP deja Groups vacios (higiene de datos, no seguridad); divergencia de resultado UI vs MCP. Portabilidad MEDIA: post-delete cleanup en `requirementCategoryDelete.resolver.js`.

Las 11 server-tambien incluyen: estado Draft del plan, recalculo de posicion en move, forma minima de planEntry, unicidad (planId,activityId), deteccion de ciclos (ya server, incluso el mod la replico para no abrir un gap que el MCP ya cerraba), bloqueo en plan Active, RBAC, requeridos por familia (schema), y la evaluacion de requisitos para el BORRADO. Las 6 UX puro: nivel derivado modular, wizard de alta, selector de bloque, filtros/chips, labels, prune/collapse de render.

## 4. Workflow de guardado: orquestacion multi-mutation reproducible por generico

A diferencia de cm (cada Guardar = 1 mutation), la UI de cd ORQUESTA varias mutations del lado cliente, a menudo NO atomicas (8 flujos: alta obligatoria/electiva, drag&drop de mover, editar creando bloque, Requirement Editor con Groups+hojas+cascada). Pero como el generico es seguro (N0), el agente los reproduce llamando el generico en secuencia, igual que la UI, con la misma (no)atomicidad.

- **Tools batch existentes = 1:1 fieles** para alta/borrado atomico de planEntry (mismas mutations que la UI: modular add, cascade delete).
- **`movePlanEntry`**: mutation atomica dedicada (renumera posicion/periodo) que la UI NO usa (hace loop no atomico) y que NO esta expuesta como tool. Un agente que mueva una materia hoy replica el loop generico no atomico. Exponerla como tool seria una mejora de atomicidad (opcional).
- **Requirement Editor: sin ninguna tool de dominio.** Su orquestacion (Groups+hojas+reparent+cascada) solo es reproducible por generico documentando el orden y el rollback. Relacionado con los gaps client-only #2 y #4.
- **Transicion de estado de Activity** (Draft/InReview/Approved/Active/Deprecated/Archived): reproducible con `up1_update_object(Activity,{status})`; el gate de pesos al publicar (`assertActivityEvaluationsOnPublish`, solo Approved->Active) corre server-side. Usar `cd_validate_activity_evaluations` antes. No necesita tool dedicada.
- **Curriculum**: status Draft/Active viaja en el payload de `updateCurriculumWithRecordType`, sin mutation de publish aparte.
- **Sin autosave ni persistencia UI-only**: todo dirty tracking/optimistic es de form.

Veredicto guardado: la granularidad de tools alcanza; 0 flujos REQUIEREN tool compuesta (el generico N0 reproduce las orquestaciones). Mejoras opcionales de ergonomia/atomicidad: exponer `movePlanEntry` y tools del Requirement Editor.

## 5. Preguntas abiertas (confirmar con el equipo, no decididas aca)
- **Delete sin override** para Activity/Curriculum/CurricularSection/Offering: no se encontro guard en `requirementCategoryDelete.resolver.js`. Puede ser intencional (apoyado en constraints de DB como backstop, patron defense-in-depth documentado) o guard faltante. Confirmar antes de declarar todo genericWriteAllowed.
- **movePlanEntry vs update generico**: el `updateInstance` generico sobre `position`/`period` de una sola planEntry NO pasa por `computeMoveRenumbering`/`assertValidMoveDestination`. No confirmado como bug (no hay unique constraint en `(planId,period,position)`). A decidir si se cablea o se documenta.

## 6. Estado del sync (corregido)
Los dos huecos (Activity CREATE, Offering CREATE) del commit `a70c3ab` / PR #63 estan cerrados Y SINCRONIZADOS a object-manager (diff byte a byte idéntico al 2026-09-14). No hay sync pendiente (corrige una nota previa de memoria).

## 7. Esfuerzo para 1:1 real
| Fase | Que | SP |
|---|---|---|
| F1 Postura blockGeneric | declarar genericWriteAllowed de los 13 + resolver las 2 preguntas abiertas | 1 + decisiones |
| F2 Cerrar gaps client-only (resolver, mod-owned) | prereq-on-ADD (cablear el evaluador existente al create) ~2-3; K<=N ~0.5-1; ensamblado por vias (mutation de dominio) ~2-3; cascada Groups vacios ~1 | 5 - 8 |
| F3 Tools/ergonomia (opcional) | exponer movePlanEntry, tools del Requirement Editor | 2 - 4 |
| **Total** | (F3 opcional) | **~6 a 13 SP** |

Nucleo obligatorio para 1:1 de integridad: F1 + prereq-on-ADD + K<=N ~= 4 a 6 SP. El resto (ensamblado por vias, cascada, tools) es mejora incremental.

## 8. Viabilidad mod-only
- **Es viable dejar cd 1:1 con trabajo mod-only**: la postura genericWriteAllowed es config (`ai/`), y los 4 gaps se cierran en los resolvers propios de cd (`logic/`, mod-owned), que ademas al ser N0 cierran UI + MCP + cross-client a la vez. No requiere tocar el motor del MCP ni el core de object-manager.
- cd ya reproduce el guardado por generico (N0) + tools batch; el gap real no es de tools sino de las 4 reglas client-only, sobre todo el prereq-on-ADD, que es un hueco de correctitud REACHABLE HOY via `cd_add_plan_entries_batch`.
- Comparado con cm: cd necesita mas resolver (4 gaps) y menos tools; cm necesita mas tools (exponer escritura) y menos resolver (1 gap). Ambos mod-only.

Ver el ticket de cm (Camino 1), la decision de camino cm, la propuesta a core y el reporte de blockGeneric (todos sp11).
