---
id: DOC-kb-sp6-analisis-por-punto
project: up1
type: doc
---

# SP6 — Análisis por punto (evidencia, colisión y opciones)

> Detalle de cada uno de los 5 puntos del listado base. Rutas relativas a los repos co-ubicados en `/Users/edobacon/Workspace/uplanner/up1/`:
> - core object-manager → `object-manager/` (repo `object-manager.git`)
> - core layout → `layout/` (repo `layout.git`)
> - mod → `mods/curriculum-design/`
>
> Toda ruta:línea citada es **CONFIRMADA** por lectura de código salvo marca explícita de INFERIDO.
>
> **Mapeo de dominio (confirmado 2026-07-03):** Programa académico = `AcademicProgram` · Plan de estudio/Currículo = `Curriculum` (recordType Plan/Minor) · Programa de asignatura = `Activity` (recordType Course) · **Syllabus/Sílabo = `Offering` (recordType Syllabus)**, NO el Currículo (ver Q4 en `preguntas-abiertas.md`).

---

## Punto 1 — Extensiones a la malla: requisitos de asignatura

**Qué es.** Editor de prerrequisitos/correquisitos de un curso (`requirement` con `ownerType=activity`) como árbol: pestaña "Requisitos" en el detalle de `Activity`, modal de alta en 2 pasos, visualización Composite, y modal de alerta de impacto en planes.

**Origen / backlog.** Coincide con **S7-01** (`../sp5/SP6-backlog-diferidos.md`), Épica D emergente (D1+D3). En SP5 se modeló/persistió `requirement` (MC-03); SP6 agrega el editor FE.

**Estado en código.**
- Objeto: `mods/curriculum-design/objects/requirement.json` (+ RecordTypes).
- Specs DKC relacionadas: `SPEC-curriculum-design-requirement-composite-tree`, `SPEC-curriculum-design-requirement-active-plan-guard`.
- Guard de dominio ya existente: `mods/curriculum-design/logic/helpers/requirementActivityGuard.js` (bloquea editar/crear `requirement` si la Activity dueña está en un Curriculum `status=Active`).

**Colisión con core.** Ninguna. Es componente FE + lógica de árbol mod-only, con patrón precedente `CompositeSectionTree`.

**Clasificación: C — mod puro.**

**Opciones / notas.**
- Reusar `CompositeSectionTree` como patrón del árbol.
- El modal de impacto comparte la query "planes afectados" con la validación restrictiva (MC-09 de SP5).
- Sin motor de evaluación (solo edición/persistencia del árbol) — el degree-audit sigue fuera de alcance.

---

## Punto 2 — Secciones de datos curriculares configurables (Plan, Syllabus)

**Ambigüedad de terminología (bloqueante para estimar).** "Secciones de datos configurables" admite dos lecturas con costo radicalmente distinto:

### Lectura A — tabs/grupos de UI configurables → **B, barato (core ya lo da; confirmado en uso)**
- Core interpreta `layoutConfig.tabs` de forma **genérica para cualquier objeto** en `layout/src/layouts/RecordDetail.vue` (~2580-2625): tabs de tipo grupo (`elements`), `associatedLayout` (embebe otro layout), `multiSelectPicker`, con RBAC por tab (`tabConfig.requiredCapability`, ~2591) y ocultamiento de tabs vacíos (~2660-2700).
- El `layoutConfig` es JSON libre en el objeto de layout `object-manager/objects/up1/layout/up1_layen_layout.json`.
- **Verificación en el propio mod (2026-07-03):**
  - `Curriculum` (Plan de estudio) **YA usa `layoutConfig.tabs`**: `config/layouts/default_Curriculum_view.json` y `_edit.json` con 3 tabs — General (`elements` campos), Líneas de formación (`elements: ["requirementCategoriesList"]`, record-list embebido), Malla curricular (`elements: ["planEntriesMesh"]`, componente `curriculum-mesh`). **Patrón en producción.**
  - `Offering`/Syllabus **NO usa tabs hoy**: `config/layouts/default_Offering_syllabus_view.json` es `layoutConfig.schema` plano (un solo formulario).
- → Bajo esta lectura, para **Curriculum** es extender el `tabs` existente, y para **Offering/Syllabus** es escribir `tabs` nuevos con el mismo patrón que Curriculum ya prueba. **Solo config de layout**, sin tocar core ni objeto nuevo.

### Lectura B — modelo de contenido estructurado tipo `CurricularSection` → **A, caro (mod)**
- `mods/curriculum-design/objects/CurricularSection.json` NO son "secciones de UI": es el **modelo de contenido del sílabo de una Activity** — polimórfico por `recordType` (`CurricularSection.json:48`: LearningOutcome, Modality, Session, EvaluationComponent, Content, Bibliography, CustomSection, ApprovalCondition), jerárquico (`parentId` self-FK), con owner polimórfico (`ownerType` Activity|Offering) y clonado (`prefillFrom.deepClone`, `CurricularSection.json:26`).
- FE dedicado: `mods/curriculum-design/modsComponents/CompositeSectionTree/` + N layouts `config/layouts/default_rt__*__curricularsection_{create,edit,view}.json`.
- Lógica de negocio propia: guard de suma ponderada de evaluación en `logic/activity.resolver.js:172-188` (bloquea publicación si el árbol no cuadra).
- → Si "secciones de datos configurables para Plan/Syllabus" significa un modelo así para `Curriculum`/`Syllabus`, es **modelo de dominio nuevo** que tocaría casi todos los layouts + el componente de árbol. Acoplamiento **medio-alto**.

### ⚠️ Resuelto por la fuente (Confluence CAP-CUR-012/012b, Must)

La página "Curriculum Design" define un **modelo dual de secciones** — NO es config de tabs:
- **Estructurales** (estándar de plataforma, "no eliminables", esquema fijo): datos generales, resultados de aprendizaje, componentes de evaluación, contenidos, sesiones, condiciones de aprobación. La institución solo configura visibilidad/obligatoriedad.
- **Complementarias** (configurables por institución): "agregar, renombrar, reordenar o desactivar"; tipos "texto, texto enriquecido, lista, tabla, archivo adjunto, JSON"; anidamiento sin límite; permisos por rol (BR-PRM-001).

**Clasificación (corregida): la presentación de estructurales = B (config de tabs, barato); el motor de secciones complementarias = feature nueva (probablemente core/layout), Alto ~8-13 SP.** El punto 2 tiende a la lectura cara. Detalle en `validacion-jira-confluence.md` §3.

---

## Punto 3 — Extensión del historial de cambios (los 4 objetos)

**El caso más claro de duplicación core ↔ mod.**

> **Confirmación del Sprint Review SP5 (autoritativa).** Klaus Molt presentó el registro de cambios genérico de core: *"sistema de registro de cambios (logs) automatizado e independiente por tenant, que permite rastrear acciones en todos los objetos y es aplicable incluso a funciones personalizadas"* → **es el `DataLog` de abajo**. Esteban lo confirmó como pospuesto a SP6 (*"el historial de cambios"*). Y hay action item explícito: *"[Klaus Molt] Coordinar con el equipo de mods los detalles para automatizar la actualización de cambios"* — el canal formal para reconciliar nuestro `ChangeLog`. **Dirección definida: core es dueño del genérico; SP6 = extender + migrar/coordinar.**

### Core SÍ tiene un audit genérico (`DataLog`)
- Objeto de negocio: `object-manager/objects/business/Base/datalog.json` — registra `objectName`, `recordId`, `action` (CREATE/UPDATE/DELETE/BULK_*/IMPORT), `changes` (diff/snapshot), `userId`.
- Decorator genérico: `object-manager/src/events/decorators/withDataLog.js` — envuelve create/update/delete/bulk/import de **cualquier** objeto (cadena `withEventPublish → withObjectAuth → withDataLog → resolver`).
- **Flag de config por objeto:** `metadata.enableDataLog` (ON por defecto; opt-out con `false`) — `withDataLog.js:5-6,63-70,80`. Ejemplo: `object-manager/objects/tenants/UPU/Base/person.json:11`.
- TypeDef: `object-manager/src/graphql/typeDefs/dynamic.js:380`. Tests: `tests/unit/events/withDataLog.test.js`, `tests/integration/dataLog.integration.test.js`.
- (Aparte, `core_SchemaAuditLog` en `objects/core/core_SchemaAuditLog.json` + `src/services/auditService.js:177,220` audita el **meta-schema**, no datos de negocio — no aplica aquí.)

### Nosotros construimos `ChangeLog` bespoke (acoplamiento ALTO)
- Objeto: `mods/curriculum-design/objects/changeLog.json` — campos propios del dominio: `entityType` (discriminador abierto), `action` (Create|Update|Delete|StateTransition|MADSSync|Import|Restore), `source` (DirectEdit|Workflow|ChangeRequest|MADS|Import|SystemCalculation), `field/oldValue/newValue` (con hash+truncate >10KB), `changeRequestId`, `workflowTransitionHistoryId` (FK real), `sourceRefId/Name/Type` (consolidar cambios de hijos al Activity padre), `versionSourceId` (linaje de versionado).
- Resolver: `mods/curriculum-design/logic/auditCapture.resolver.js` (951 líneas). `recordAuditEvent` (única mutation que escribe, línea 329). Whitelist cerrada `ENTITY_TYPE_MAP = {Activity, CurricularSection, CurricularLink}` (100-104). Consolidación de hijos al padre ("L40", 456-521). Handlers create/update/delete/**transition** (626-900); el de transition lee `workflowTransitionHistory` → **acopla con el punto 4**.
- Disparo: `events/Activity-*.json`, `CurricularSection-*.json`, `CurricularLink-*.json` → `withEventPublish.js` (core) → Redis Pub/Sub → flow n8n `flows/audit-capture.json` → mutation `recordAuditEvent`.
- FE: sin componente Vue custom — RecordList genérico con `config/layouts/default_ChangeLog_list.json` + tab "Historial" en `default_Activity_view.json:360-389`.
- Patrón: `docs/patterns/append-only-audit.md` (append-only por convención; el enforcement real —trigger PG— está pendiente a nivel plataforma).
- **Whitelist hardcodeada en 3 sitios** que se mantienen a mano (resolver, regex n8n, doc) + 807 líneas de tests de integración fijan el contrato.

### Colisión y opciones
`ChangeLog` **no es** un audit genérico: es un diseño a medida del árbol Activity→CurricularSection, acoplado a workflow y a n8n. Opciones:
- **(i) Extender `ChangeLog` a los 4 objetos** (mod): agregar entradas al `ENTITY_TYPE_MAP` + eventos + flow. Mantiene semántica rica; sigue siendo bespoke; sube el acoplamiento.
- **(ii) Migrar a `DataLog` genérico** (core): activar `enableDataLog` en los 4 objetos. Barato de activar, pero **se pierde** la consolidación al padre, `source`, `versionSourceId`, y el vínculo con transiciones de workflow → habría que decidir si eso se sacrifica o se reimplementa sobre `DataLog`.
- **(iii) Coexistencia**: `DataLog` para los objetos nuevos (Plan/AcademicProgram/Syllabus) y `ChangeLog` para Activity/CurricularSection. Dos sistemas paralelos — deuda.

**Clasificación: A — duplicación real.** Pieza más cara de tocar. Ver `preguntas-abiertas.md` Q1/Q2.

---

## Punto 4 — Configuración de flujo de trabajo (enums) (Plan, Activity-act., Syllabus)

**El de mayor riesgo estratégico: core NO tiene motor de workflow; lo somos nosotros.**

> **⚠️ Corrección tras verificar el código (2026-07-03).** En el Sprint Review, Klaus y Nelson presentaron *"reglas lógicas para campos enum... flujos de estado válidos"*. **Pero esa capacidad NO existe hoy en core:** core solo valida que el valor de un enum esté en la lista permitida (`object-manager/src/graphql/resolvers/instance.resolver.js:3066` y `:3907`), sin reglas estado→estado, sin catálogo de estados, sin historial. No hay `transitions` en el schema de FieldDefinition ni commit/rama de core con esa capacidad. **Todo el motor de transiciones vive en el mod.** Lo presentado por Klaus corresponde al trabajo del mod, no a un genérico de core separado.
> - **Decisión (dev): promover el motor de workflow del mod a core.** Como core no tiene nada genérico en qué basarse, "que core regule" significa levantar el motor del mod a plataforma → categoría **A** para todos (Plan, AcademicProgram, Activity, Syllabus).

### No existe workflow ni motor de transiciones genérico en core
- No hay motor de estados en `object-manager` core. `core_ObjectDefinition.json` no tiene metadata tipo `workflowEnabled`/`statusField`.
- Lo único que core hace con enums es **validar el valor** contra la lista permitida (`instance.resolver.js:3066` en create, `:3907` en update: `value is not allowed. Valid values: ...`). **No hay lógica de transición estado→estado.**
- El schema de FieldDefinition **no** soporta declarar transiciones; no hay commit ni rama de core con esa capacidad (verificado en `develop`).
- El core sí conoce el workflow **para versionar**: `object-manager/src/graphql/resolvers/helpers/version-from-source.js` gatea la lógica de estado por `initialStateField` (ver `SPEC-core-implement-version-without-workflow` / TICKET-074). Pero ese es el punto de acople, no el motor.

### El motor de workflow vive 100% en el mod (acoplamiento ALTO)
- Objetos: `mods/curriculum-design/objects/{workflow,workflowStatus,workflowTransition,workflowTransitionHistory}.json`. `Workflow.scopeType` es enum **cerrado** (`curriculumPlan|activity|competencyNode|changeRequest|booking`); extenderlo "requiere migración Prisma".
- Resolvers `*Validated` (el CRUD genérico auto-generado sigue como "puerta trasera" pero se salta las validaciones):
  - `logic/workflow.resolver.js` — `createWorkflowValidated:54` (partial-unique de `isDefault`, transacción Serializable).
  - `logic/workflowTransition.resolver.js` — `createWorkflowTransitionValidated:47`.
  - `logic/workflowTransitionHistory.resolver.js` — `createWorkflowTransitionHistoryValidated:72`.
  - `logic/activity.resolver.js` — `transitionActivityValidated:70` (coordinador atómico: 8 validaciones + insert en history + publish, en una transacción) y `updateActivityValidated:283` (rechaza cambios directos a `currentStatusId`).
  - `logic/helpers/getInitialStatus.js`.
- FKs a workflow: `objects/activity.json:125-142` (`workflowId`, `currentStatusId` readOnly). **`AcademicProgram.json:9` y `Curriculum.json:85` declaran explícitamente que NO usan workflow** ("v1 CRUD plano"; "enum simple ... NEEDS CLARIFICATION: confirmar enum simple vs workflow formal").
- FE: `modsComponents/ActivityStatusBadge/` (componente Vueform custom que hace fetch propio de `workflowStatus` y mapea `category`→color).
- Seed UPU: `seed/_data-workflow-objects.js` (414 líneas) + `_data-workflow-activate.js`. Siembra 9 statuses, **5 workflows** (`activity-standard`, `activity-fast`, `curriculumPlan-standard`, `competencyNode-standard`, `changeRequest-standard`), 21 transiciones, 5 history demo.

### Dato revelador
**3 de los 5 `scopeType` sembrados (`curriculumPlan`, `competencyNode`, `changeRequest`) NO tienen consumidor real hoy** — el mod fue diseñado para ser el motor de workflow **de facto de la plataforma**, anticipando extender a Curriculum/etc.

### Decisión: promover el motor a core

Como core no tiene motor propio, "basarnos en core y que eso regule todo" significa **levantar el motor del mod a core** como capacidad de plataforma. Activity y los nuevos objetos (Plan, AcademicProgram, Syllabus) lo consumen desde ahí.

**¿Lo del mod es aplicable desde core?** Sí. El modelo ya fue diseñado genérico (plantillas por institución, catálogo de estados reutilizable, grafo de transiciones, historial append-only — estilo Jira) y **ya está presente en el árbol de object-manager** (`objects/business/Base/workflow*.json`). Lo que falta para que core lo regule de forma genérica:
- **Abrir el `scopeType`** (hoy enum cerrado → cada objeto nuevo exige migración Prisma) a config-driven.
- **Un flag "usa workflow" por objeto** en la definición (core_ObjectDefinition no lo tiene).
- **Mover el coordinador de transición** (`transitionActivityValidated`: update atómico + insert en history + publish) al camino genérico de core; el hook `initialStateField` del versionado ya es la costura de integración.
- **Generalizar el FE** `ActivityStatusBadge` a un badge de estado por objeto.

**Esfuerzo: Alto ~8-13 SP** — relocalizar + generalizar `scopeType` + opt-in por objeto + reconectar + migrar Activity a consumir el genérico + review del team core (RULE-dev-004). Es "levantar y generalizar", no construir de cero (buena parte del modelado ya existe).

**Clasificación: A — migración/promoción a core.** Es el mayor driver de esfuerzo del listado.

---

## Punto 5 — Configuración de eliminación estándar (los 4 objetos)

### Core ya cubre lo genérico (hard-delete + protección de FKs)
- `deleteInstance` genérico: `object-manager/src/graphql/resolvers/instance.resolver.js:3551` (cadena con event/auth/dataLog). `deleteBulkInstances` ~5057.
- **Protección de referencias automática** por introspección de FKs Prisma: `object-manager/src/services/referenceValidationService.js` ("FULLY DYNAMIC: discovers FK relationships..."), usada en `deleteBulkInstances` (~5225, `validateBulkDelete`). No requiere config por objeto.
- `onDelete` (Cascade/Restrict) configurable por campo en el JSON del objeto — honrado en `object-manager/src/.../generatePrismaSchema.js:414,636,706,786,976`.

### No hay soft-delete genérico
- Sin flag tipo `enableSoftDelete`/`deletedAt` a nivel `core_ObjectDefinition`. El soft-delete es ad-hoc por mod: ej. `softDeleteInstructorAvailability` (mod uengagement, `object-manager/src/graphql/typeDefs/mods.js:800`, usa un `active` boolean propio); `WorkflowStatus.status` Active/Archived (catálogo del mod curriculum-design).

### Lo nuestro (acoplamiento MEDIO)
- `mods/curriculum-design/logic/requirementCategoryDelete.resolver.js` (74 líneas) — **override del `deleteInstance` genérico de TODO el sistema** (monkeypatch: gana sobre el generic por orden de spread; internamente `if (objectType !== 'requirementCategory') return`).
- Backstop en DB: `objects/planEntry.json:41-45` (`onDelete: Restrict` en `categoryId`).
- Guard puro: `logic/helpers/categoryGuard.js` (`assertNoEntriesForCategory` → error `REQUIREMENT_CATEGORY_HAS_ENTRIES`).

### Enfoque decidido (dev): eliminación SIN huérfanos

El objetivo no es solo "poder borrar", es **no dejar huérfanos**. Grafo de dependencias levantado (2026-07-03):

- Protección genérica de core (`referenceValidationService` + `onDelete`) **solo cubre FKs reales de DB**.
- Único `onDelete` declarado hoy en el mod: `planEntry.categoryId → requirementCategory = Restrict` (`objects/planEntry.json:45`).
- **Gap real — referencias polimórficas** (`ownerType/ownerId`, `entityType/entityId`), que NO son FKs reales → la DB no las protege:
  - Borrar `Curriculum` → huérfanos `planEntry`, `requirementCategory`, `requirement(owner=curriculum)`.
  - Borrar `Activity` → huérfanos `Offering`, `planEntry`, `CurricularSection(owner=Activity)`, `requirement(owner=activity)`.
  - Borrar `AcademicProgram` → huérfanos `Curriculum` (owner polimórfico).
  - Borrar entidad auditada → `changeLog`/`workflowTransitionHistory` (polimórficos) huérfanos.
- Cadenas de versión (`previousVersionId` self-FK): borrar versión intermedia rompe el linaje.

### Solución propuesta (2 frentes)
1. **FKs reales:** declarar `onDelete` correcto en los 4 objetos (Restrict para padres; Cascade para hijos poseídos). Config por campo, ya soportada por core.
2. **Referencias polimórficas (el gap):** la DB no puede → o generalizamos el guard del mod (`categoryGuard.js`), **o (recomendado, Q1) core aprende ownership polimórfico** declarado en el JSON y su guard de borrado lo cubre — capacidad de plataforma, no monkeypatch por mod.

**Clasificación (afinada): B para FKs reales (config); el gap de huérfanos polimórficos → recomendado CORE (Q1).** Pendiente: semántica Restrict/Cascade por relación + si incluye soft-delete.

---

## Anexo — Estado real del versionado (contexto para el punto 4 y el backlog)

`SPEC-core-implement-version-without-workflow` (TICKET-074, cerrado 2026-06-18):
- **Resuelto (H-7):** versionar un Curriculum ya no crashea. El helper de core `prepareVersionData` hizo el workflow **opcional** (gatea por `!!initialStateField`); Curriculum (enum simple) versiona sin workflow, activity (con workflow) sin regresión.
- **Abierto (H-3 / frente #2):** que la v2 arrastre su extensión `rt__Plan__curriculum` atómicamente → backlog **B1 / TICKET-056**.
- **Abierto (S7-03):** deep-copy de hijos (categorías, requirements, planEntries) al versionar/clonar.

→ El "versionado" del backlog SP6 **no está intacto ni cerrado**: está a medias, y el pedazo abierto es **trabajo de core** (rama de épica, review del team up1, RULE-dev-004).
