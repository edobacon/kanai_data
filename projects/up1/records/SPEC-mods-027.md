---
id: SPEC-mods-027
project: up1
type: doc
module: mods
tags:
  - curriculum-design
  - learning-assurance
  - mod
  - activity
  - curriculum
  - delete-cascade
  - versioning
  - datalog
  - rbac
  - enum-transitions
---

# Ejemplo real: mod curriculum-design

> Este documento es el resumen "ejemplo de mod" de `curriculum-design`, en el mismo formato que `example-uengagement.md`. La doc detallada (requirements, business rules, capacidades, historial de decisiones) vive en la carpeta propia del KB: [`specs/up1/curriculum-design/`](../curriculum-design/INDEX.md), NO se duplica aqui.

Guia practica que recorre el mod de produccion `curriculum-design` (rama `feat/UPONE-1382-hard-delete-cascade`), el mod mas central de up1: modela el agregado Programa de Asignatura y el agregado Curriculo/Carrera de la linea de producto Learning Assurance.

## Indice

1. [Vision general](#1-vision-general)
2. [Objetos de negocio (16 base + 13 RecordTypes)](#2-objetos-de-negocio-16-base--13-recordtypes)
3. [Estados y transiciones (UPONE-1381)](#3-estados-y-transiciones-upone-1381)
4. [Versionado y clonacion (UPONE-1270/1271)](#4-versionado-y-clonacion-upone-12701271)
5. [Delete en cascada (UPONE-1382)](#5-delete-en-cascada-upone-1382)
6. [DataLog: tab Historial](#6-datalog-tab-historial)
7. [RBAC: capabilities.json + gating por tab](#7-rbac-capabilitiesjson--gating-por-tab)
8. [Componentes Vue propios](#8-componentes-vue-propios)
9. [Doc detallada](#9-doc-detallada)
10. [Tooling del repo: pre-push quality guard (UPONE-1445)](#10-tooling-del-repo-pre-push-quality-guard-upone-1445)
11. [Malla modular (UPONE-1539)](#11-malla-modular-upone-1539)
12. [Fixes de seed y de RBAC de layout (UPONE-1538, UPONE-1503)](#12-fixes-de-seed-y-de-rbac-de-layout-upone-1538-upone-1503)

---

## 1. Vision general

| Aspecto | Detalle |
|---------|--------|
| Nombre en sidebar | **Curriculum Design** |
| Repo/carpeta | `mods/curriculum-design/` (repo git propio, rama activa `feat/UPONE-1382-hard-delete-cascade`) |
| Dominio | Diseno curricular: programas de asignatura (silabos), curriculos/planes de estudio, carreras, malla curricular, requisitos y biblioteca institucional |
| Tenants habilitados | 1 (`UPU`), a diferencia de uEngagement (12 tenants) |
| Roles en `app.json` | Ninguno declarado (sin campo `roles`; el gating es 100% por capability, no por rol de app) |
| Objetos propios | 16 base + 13 RecordTypes = 29 definiciones |
| Layouts | 58 (`config/layouts/`) |
| Componentes Vue custom | 6 (`ActivityStatusBadge`, `ColorPicker`, `CompositeSectionTree`, `CurriculumMesh`, `IconPicker`, `RichTextRenderer`) |
| Resolvers custom | 12 archivos `*.resolver.js` (mas `errors.js` y `helpers/`) |
| Capabilities RBAC | 45 |
| Idiomas | 3 (es completo: 24 archivos; en/pt parciales: 3-4 archivos cada uno) |
| Tests | 34 archivos de integracion (`tests/integration/`) |

Fuente: `config/app.json:1-11`, listado de archivos en `objects/*.json` y `objects/RecordTypes/*.json`, `config/layouts/` (conteo), `logic/*.resolver.js`, `capabilities.json` (conteo de `"name"`), `lang/{en,es,pt}/` (conteo por carpeta).

### Posicionamiento: 1 de 3 apps de Learning Assurance

```text
Curriculum Design  ->  Curriculum Mapping  ->  Learning Assessment
Que ensenamos y        Esta alineado con        Lo estan logrando
como lo organizamos?   lo que prometimos?       los estudiantes?
(sin requisito previo) (requiere Design)        (requiere Design+Mapping)
```

Curriculum Design es el punto de partida del ciclo: define que se ensena y como se organiza, antes de medir si los estudiantes lo logran. Fuente: `specs/up1/curriculum-design/overview.md` (seccion "Posicionamiento").

### config/app.json

```json
{
  "name": "curriculum-design",
  "label": "Curriculum Design",
  "icon": "bi-journal-text",
  "iconBg": "#0EA5E9",
  "order": 10,
  "tenants": { "UPU": {} },
  "version": "0.1.0",
  "defaultObjects": ["Activity", "BibliographyReference", "AcademicProgram", "Offering", "Curriculum", "core_DataLog"],
  "up1ModelVersion": 1
}
```

Fuente: `config/app.json:1-11`. `defaultObjects` expone `core_DataLog` explicitamente (a diferencia de otros mods): el tab Historial del mod es de primera clase, no un agregado incidental.

---

## 2. Objetos de negocio (16 base + 13 RecordTypes)

El mod declara **16 objetos base** mas **13 RecordTypes**, agrupados en 4 agregados. Fuente: `objects/*.json`, `objects/RecordTypes/*.json` (listado de archivos).

### Agregado: Programa de asignatura (silabo)

`Activity` (archivo `objects/activity.json`, minuscula por convencion historica) es la entidad raiz: define nombre, codigo, creditos, nivel, idioma e identidad de la asignatura, con `recordType` (`Course` = academico gobernado, `Service` = servicio de engagement sin governance). Su programa completo cuelga como hijos polimorficos:

```text
Activity (recordType: Course | Service)
- polymorphicChildren: sections -> CurricularSection (ownerType=Activity, recursivo por parentId)
- polymorphicChildren: requirements -> requirement (ownerType=activity, recursivo por parentId)
- polymorphicChildrenDerived: CurricularLink (via sourceSectionId/targetSectionId, remapeado a sections)
```

Fuente: `objects/activity.json:12-34`.

`CurricularSection` es un base abstracto sin campos propios significativos: el contenido vive en 1 de 8 RecordTypes (`Modality`, `LearningOutcome`, `Content`, `Session`, `Bibliography`, `EvaluationComponent`, `CustomSection`, `GraduationProfile`), discriminados por `recordType` y anidables entre si via `parentId` (patron Composite). Puede colgar de `Activity`, `Offering` o `Curriculum` (owner polimorfico). Fuente: `objects/CurricularSection.json:30-42`, `objects/RecordTypes/rt__*__curricularsection.json` (8 archivos).

`CurricularLink` vincula 2 `CurricularSection` del mismo owner con semantica pedagogica (`DEVELOPS`, `EVALUATES`, `COVERS`, `USES`, `CUSTOM`). Fuente: `objects/CurricularLink.json:35-40`.

`BibliographyReference` es un catalogo institucional independiente (solo `rawCitation` es requerido, resto opcional): una referencia puede ser usada por N cursos sin duplicarse. Fuente: `objects/BibliographyReference.json:9,17-31`.

### Agregado: Curriculo y carrera

```text
AcademicProgram (carrera, ej. "Ingenieria Civil")
- CRUD plano, sin workflow ni versionado, unico por (institutionId, code)
- polymorphicChildren: curricula -> Curriculum (ownerType=AcademicProgram)

Curriculum (contenedor curricular tipado por recordType: Plan | Minor)
- owner polimorfico (AcademicProgram | Institution) via ownerType/ownerId
- versionable (previousVersionId, cadena de linaje), ver seccion 4
- polymorphicChildren: sections (CurricularSection) + requirements
- directChildren: planEntries (planEntry.planId) + requirementCategories (requirementCategory.curriculumId)

Offering (compartido con uengagement) + recordType=Syllabus
- el "Silabo" concreto es un Offering con recordType=Syllabus, activityId -> Activity{Course}
```

Fuente: `objects/AcademicProgram.json:12-19`, `objects/Curriculum.json:12-39`, `objects/Offering.json:32-47`.

`AcademicProgram` distingue el rol de gobierno/ejecucion por la FK que apunta a la unidad (`governanceUnitId` vs `executionUnitId`), no por un `recordType` en `OrgUnit` (ese spine organizacional lo canoniza uEngagement). Fuente: `objects/AcademicProgram.json:10`.

### Agregado: Malla curricular

```text
planEntry (coloca una Activity en un periodo de un Curriculum)
- planId -> Curriculum, activityId -> Activity
- categoryId -> requirementCategory (onDelete: Restrict)
- credito efectivo heredado de Activity.credits si "credits" es null

requirementCategory (linea de formacion: Nucleo, Electivos, etc.)
- curriculumId -> Curriculum
- minCredits/maxCredits (rango de creditos de la linea)

requirement (arbol de reglas Composite: prerrequisito, electivo, umbral)
- owner polimorfico (curriculum | activity | offering, lowercase)
- recordType: Group | RecordState | MetricThreshold (enum extensible)
- parentId (self-FK, anida solo bajo recordType=Group)
```

Fuente: `objects/planEntry.json:19-46`, `objects/requirementCategory.json:16-44`, `objects/requirement.json:24-53`.

### Agregado: Inscripciones de estudiante

`ProgramEnrollment` (inscripcion de un `Student` a un `AcademicProgram`, unico por `[studentId, programId]`) y `PlanEnrollment` (asignacion de un `Curriculum` especifico a una `ProgramEnrollment`, unico por `[programEnrollmentId, curriculumId]`) modelan la matricula del estudiante y su plan vigente. Ambos con `enableDataLog: true`. Fuente: `objects/ProgramEnrollment.json:11,54-58`, `objects/PlanEnrollment.json:11,57-63`.

### Agregado: Perfil de egreso (GraduationProfile, UPONE-1379)

`GraduationProfile` es uno de los 8 RecordTypes de `CurricularSection` (`rt__GraduationProfile__curricularsection.json`), pero implementa un patron distinto al resto: **un unico bloque narrativo de perfil de egreso por `Curriculum`**. Puntos clave (UPONE-1379; requisito de negocio UPONE-1267):

- Para habilitarlo, el ticket **amplio el enum `ownerType` de `CurricularSection`** de `["Activity","Offering"]` a `["Activity","Offering","Curriculum"]` (antes un `Curriculum` no podia poseer secciones) y agrego el bloque `polymorphicChildren` `sections` en `Curriculum.json`.
- Campos propios del RT (todos opcionales): `narrativeIntro`, `isLinkedToCompetencyProfile` (flag informativo en v1, sin binding real), `lastReviewDate`. v1 es deliberadamente no estructurado (sin matriz de competencias; diferido a v2).
- **Unicidad por guard de dominio, no por schema**: como `name` es editable, el `uniqueScopedBy` del base no basta. Se agrego `logic/helpers/graduationProfileUniqueness.js` (`assertSingleGraduationProfile`), invocado desde `logic/sectionValidation.resolver.js`, que rechaza un segundo perfil por Curriculum (`GRADUATION_PROFILE_PERSONALISED_ERROR`). Limitacion aceptada: race TOCTOU entre creates concurrentes.
- **Dev-only en SP7**: existen layouts CRUD y wiring (embebido en `default_Curriculum_{edit,view}` como lista asociada con `canCreateInitialData`), pero el usuario final no lo crea/edita desde la UI; se aprovisiona por seed (`seed/_data-graduation-profile.js`). Reusa las capabilities genericas `curricularsection:{view,modify,create}`, sin capability propia.

Es un patron reusable: "hijo singleton de un owner polimorfico, forzado por guard de dominio".

### Subsistema Workflow relacional (UPONE-1099): RETIRADO en UPONE-1459

`workflow`, `workflowStatus`, `workflowTransition` y `workflowTransitionHistory` eran 4 objetos de un motor de workflow relacional (UPONE-1099) que `Activity` consumia via `currentStatusId`. Desde UPONE-1381/P4, `Activity` migro al motor nativo de enum transitions de core (seccion 3), dejando el subsistema como codigo muerto. En **UPONE-1459 / TICKET-114** se retiro por completo: los 4 objetos, sus resolvers `createWorkflow*Validated` + schemas graphql, los error codes `WORKFLOW_*` y el seed de workflow se eliminaron del mod y del core; SS-423 habia removido antes la ultima FK externa (uEngagement). El drop de tablas/columnas se materializa al regenerar el schema (aplicado en UPU, los demas tenants en deploy). `N8nWorkflow` (up1-manager) es un objeto n8n distinto, no relacionado.

---

## 3. Estados y transiciones (UPONE-1381)

`Activity`, `Curriculum` y `Offering{Syllabus}` gestionan su estado con el motor Enum Transitions de core: el campo `status`/`lifecycleStatus` declara un enum cerrado mas un array `transitions` (`from`, `to`, `requiredCapabilities` opcional, `requiresComment` opcional), validado por `enforceEnumTransitions` en `updateInstance`.

`Activity.status` tiene 6 estados: `Draft -> InReview -> Approved -> Active -> Deprecated -> Archived`, con reversos gobernados (`Active -> Draft` requiere `activity:revert` mas comentario). `Curriculum.status` replica el mismo enum de 6 estados sin exigir comentario en los reversos. `Offering.lifecycleStatus` (solo para `recordType=Syllabus`) usa un enum mas chico de 4 estados (`Draft -> InReview -> Active -> Archived`) y es un eje independiente del `status` de disponibilidad que posee uEngagement sobre el mismo objeto compartido.

```json
"transitions": [
  { "from": "Draft", "to": "InReview" },
  { "from": "InReview", "to": "Approved", "requiredCapabilities": ["activity:approve"] },
  { "from": "InReview", "to": "Draft", "requiresComment": true },
  { "from": "Approved", "to": "Active", "requiredCapabilities": ["activity:publish"] },
  { "from": "Approved", "to": "Draft" },
  { "from": "Active", "to": "Deprecated", "requiredCapabilities": ["activity:deprecate"], "requiresComment": true },
  { "from": "Active", "to": "Draft", "requiredCapabilities": ["activity:revert"], "requiresComment": true },
  { "from": "Deprecated", "to": "Archived", "requiredCapabilities": ["activity:archive"] }
]
```

Fuente: `objects/activity.json:134-150`, `objects/Curriculum.json:110-127`, `objects/Offering.json:58-73`.

El flag `requiresComment` en algunas aristas es metadata declarada pero aun no enforzada por el motor de enum de core: la lee el MCP, y sera consumida por un futuro sistema de cambio manual de estado (hoy no hay UI de transicion manual libre, la UI usa el selector inline sobre las aristas permitidas). Fuente: `objects/activity.json:140`.

Detalle completo del motor (las 4 capas AP-01 a AP-04, el guard `assertNoActiveDependentsOnRevert`, la capa UI de selector/bulk): [`specs/up1/features/enum-transitions.md`](../features/enum-transitions.md).

---

## 4. Versionado y clonacion (UPONE-1270/1271)

`Activity` y `Curriculum` son versionables: metadata `versioning` declara `linkageField: previousVersionId`, `versionField: version` (auto-incremental), `versionStrategy: increment`, `stateField: status` y `versionableFromStates` (solo se puede versionar desde `Approved` o `Active`), gateado por una capability propia (`activity:version`, `curriculum:version`).

```json
"versioning": {
  "linkageField": "previousVersionId",
  "versionField": "version",
  "versionStrategy": "increment",
  "stateField": "status",
  "versionableFromStates": ["Approved", "Active"],
  "requiredCapability": "activity:version"
}
```

Fuente: `objects/activity.json:39-47`, `objects/Curriculum.json:44-51`.

El mod distingue 2 mecanismos de "copiar un registro" segun haya o no una unicidad que el usuario deba resolver:

- Mecanismo A, versionar (`prefillFromCurrent: true` + `asNewVersion: true`): create inmediato sin modal, encadena el linaje (mismo `code`, `version` incrementa). Usado por el row action "Crear nueva version" de `Activity`/`Curriculum`.
- Mecanismo B, clonar/duplicar (`cloneStrategy: "prefilledModal"` + `uniqueFields`): abre un modal prellenado salvo el/los campos unicos, que el usuario completa. Usado por `AcademicProgram` (`uniqueFields: ["code"]`, capability `academicprogram:clone`) y por "Duplicar" en `Curriculum` (raiz nueva de linaje, sin `previousVersionId`).

Fuente: `docs/patterns/clone-strategies.md:21-33`, `objects/AcademicProgram.json:21-25`.

La UI muestra el tab "Versiones" en el detalle de `Activity` (`record-list` filtrado por `code` igual al del registro actual, ordenado por `version` descendente). Fuente: `config/layouts/default_Activity_view.json:461-478`.

El detalle transversal de versionado + clonado vive en [features/versioning-cloning.md](../features/versioning-cloning.md); el gate `versionableFromStates` esta documentado en [enum-transitions.md](../features/enum-transitions.md) (seccion 3) y las estrategias especificas del mod en `docs/patterns/clone-strategies.md`.

---

## 5. Delete en cascada (UPONE-1382)

`AcademicProgram`, `Curriculum`, `Activity` y `Offering` declaran su grafo de hijos (`polymorphicChildren`, `directChildren`, `polymorphicChildrenDerived`) para que el motor generico de borrado del object-manager pueda calcular y ejecutar un delete en cascada seguro, sin huerfanos.

```text
AcademicProgram --polymorphicChildren--> Curriculum
Curriculum      --polymorphicChildren--> CurricularSection, requirement
Curriculum      --directChildren-------> planEntry (planId), requirementCategory (curriculumId)
Activity/Offering --polymorphicChildren-> CurricularSection, requirement
```

Fuente: `objects/AcademicProgram.json:12-19`, `objects/Curriculum.json:12-39`, `objects/activity.json:12-34`, `objects/Offering.json:7-29`.

El motor vive en `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js` y separa calculo de ejecucion:

- `buildDeleteImpactPlan` (linea 946): recorre declarativamente el grafo desde la metadata del objeto (incluida la cadena de versiones via `versioning.linkageField`). Es de solo lectura: produce un `DeleteImpactPlan` con `nodes`, `edges`, `restrictions` y `deleteOrder` (orden topologico inverso, hijos primero). Si detecta una referencia externa bloqueante marca `plan.status = 'restricted'`.
- `executeDeletePlan` (linea 1279): consume ese plan. Si esta `restricted`, aborta sin tocar la base de datos (atomicidad, ningun delete parcial). Si es `cascade`, toma un snapshot pre-delete de cada nodo (para DataLog) y ejecuta todos los deletes de `deleteOrder` dentro de una unica `prisma.$transaction`.
- `cascadeDeleteIfApplicable` (linea 1517) es el entry point que usan los resolvers de instancia: primero un gate (`objectDeclaresChildren`, linea 1501) que devuelve al path generico si el objeto no declara hijos, luego llama a `buildDeleteImpactPlan` y, si no esta restringido, a `executeDeletePlan`.

Fuente: `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js:1-33,946,1279,1501-1530`.

**El `onDelete: Restrict` de `planEntry.categoryId` no es consumido por este motor generico**: la deteccion de restricciones del motor busca referencias entrantes por convencion de nombre (`${objectLower}Id`, por ejemplo `requirementCategoryId`), y el campo real en `planEntry` se llama `categoryId`, asi que el walk generico no lo detecta. Por eso el mod resuelve la proteccion en 2 capas independientes: la constraint Prisma `onDelete: Restrict` como backstop de base de datos, y un guard de dominio (`assertNoEntriesForCategory` en `logic/helpers/categoryGuard.js`) que corre antes del delete en `logic/requirementCategoryDelete.resolver.js` y devuelve el mensaje amigable ("reasigna primero") que el error generico de FK no daria. Fuente: `objects/planEntry.json:41-46`, `logic/helpers/categoryGuard.js`, `logic/requirementCategoryDelete.resolver.js`.

En la UI, `CompositeSectionTree` expone el boton eliminar por nodo con un preview de la cascada (`deleteImpactPreview`) antes de ejecutar `deleteBulkInstances`, y las listas embebidas de secciones/categorias tienen row action de delete equivalente. Fuente: `docs/guides/composite-section-tree.md` (prop `enableDelete`), commits `fe1e3ea` y `8f7ef4c` en la rama del mod.

Detalle completo del contrato `DeleteImpactPlan`, la deteccion de `Restrict`, la auditoria por nodo y como declararlo en un mod nuevo: [`specs/up1/features/delete-cascade.md`](../features/delete-cascade.md).

---

## 6. DataLog: tab Historial

`AcademicProgram`, `Curriculum`, `Activity`, `Offering`, `ProgramEnrollment` y `PlanEnrollment` declaran `metadata.enableDataLog: true`. Cada create/update/delete (incluidas las transiciones de estado, que son un update de `status`) genera una fila en `core_DataLog` via el decorator de core `withDataLog` (cadena `withEventPublish -> withObjectAuth -> withDataLog -> [resolver]`), sin que el mod tenga que invocarlo explicitamente.

```json
"filters": [
  { "field": "historyKey", "operator": "EQUALS", "value": "Activity:{{parentId}}" }
]
```

Fuente: `config/layouts/default_Activity_view.json:441` (mismo patron en `default_Curriculum_view.json:51-55`, `default_AcademicProgram_view.json:57`, `default_Offering_syllabus_view.json:38,54`). El tab "Historial" es un `record-list` sobre `core_DataLog` filtrado por `historyKey = "{Objeto}:{{parentId}}"`, con drill-in al layout `datalog_entry_view`, gateado por la capability `core_datalog:view` (ver seccion 7).

**Atribucion del hijo polimorfico**: al editar una `CurricularSection` (Modality, LearningOutcome, etc.) o un `CurricularLink`, la entrada de `core_DataLog` se atribuye al padre (`parentObject`/`parentId`) con el `recordType` del hijo (`childRecordType`), de forma que aparece en el Historial del padre. Lo resuelve `withDataLog` via `resolveAttribution`, leyendo `metadata.polymorphicChildren` sin hardcode (el mismo bloque de metadata que usa el motor de delete en cascada de la seccion 5).

Fuente: `docs/user-guide/audit-events.md:27-38`.

**Nota historica**: el subsistema bespoke `ChangeLog` del mod (resolver `auditCapture`, flow n8n `audit-capture`, mutation `recordAuditEvent`) fue retirado (UPONE-1380); la auditoria se consolido en el `core_DataLog` generico. Fuente: `docs/user-guide/audit-events.md:15-18`.

Detalle del shape de `core_DataLog`, el flujo completo del decorator y el invariante de override para resolvers custom que hacen writes propios: [`specs/up1/features/datalog.md`](../features/datalog.md).

---

## 7. RBAC: capabilities.json + gating por tab

`capabilities.json` declara **45 capabilities**. A diferencia de uEngagement (un unico prefijo `mod/uengagement:*`), la gran mayoria de las capabilities de curriculum-design son object-level sin prefijo `mod/` (`activity:view`, `curriculum:publish`, `requirement:delete`, etc., convencion `RULE-mods-037`); solo 4 capabilities conservan el prefijo legacy `mod/curriculum-design:*` (`view`, `edit`, `approve`, `publish`, de la epoca previa al workflow platform).

```json
{
  "name": "activity:revert",
  "description": "Revertir un programa de asignatura vigente (Active) a Draft: des-publicacion gobernada via el motor de enum de core...",
  "riskLevel": "high"
}
```

Fuente: `capabilities.json:98-102`.

**Patron por objeto**: cada objeto versionable/transicionable expone una familia `view / create|modify / delete` (riesgo bajo/medio/alto) mas capabilities dedicadas por arista de estado (`approve`, `publish`, `deprecate`, `archive`, `revert`, todas `riskLevel: high`) y por accion de copia (`version`, `clone`, riesgo medio). Fuente: `capabilities.json` (familias `activity:*`, `curriculum:*`, `offering:*`, `planentry:*`, `requirementcategory:*`, `requirement:*`).

**RBAC granular por tab (UPONE-1393)**: un tab de `RecordDetail` declara `requiredCapability`; si el usuario no la tiene, el tab (y sus `elements`) se oculta. Ejemplos concretos:

```json
{ "label": "Malla curricular", "requiredCapability": "planentry:view" },
{ "label": "Líneas de formación", "requiredCapability": "requirementcategory:view" },
{ "label": "Historial", "requiredCapability": "core_datalog:view" }
```

Fuente: `config/layouts/default_Curriculum_view.json:33-44` (tabs `requirementCategories` y `planEntries`), `config/layouts/default_Activity_view.json:83-89` (tab `history`), `config/layouts/default_Activity_edit.json:31-37` (6 tabs de secciones polimorficas, todos con `requiredCapability: "curricularsection:view"`).

**Discrepancia detectada**: `capabilities.json` declara una capability `activity:audit` ("Ver el tab Historial del activity con audit log de cambios"), pero el layout real (`default_Activity_view.json:83-89`) gatea el tab "Historial" con `core_datalog:view`, no con `activity:audit`. Es un remanente de la migracion a `core_DataLog` (UPONE-1380): la capability sigue declarada en el RBAC pero no la usa ningun layout vigente. No se corrige en este documento (es solo lectura de KB); queda como hallazgo para un follow-up de limpieza del mod.

Detalle del modelo general de RBAC (object-level vs field-level, contextos, `withAuth`): [`specs/up1/features/rbac.md`](../features/rbac.md).

---

## 8. Componentes Vue propios

6 componentes propios en `modsComponents/` (uEngagement, en contraste, no tiene ninguno):

| Componente | Proposito |
|-----------|-----------|
| `CompositeSectionTree` | Arbol jerarquico recursivo (Vueform element) para renderizar cualquier RecordType de `CurricularSection` con CRUD inline, drag&drop (Sortable.js), validacion de ponderaciones sumativas y delete por nodo con preview de cascada |
| `CurriculumMesh` | Vista de malla curricular por periodos: coloca/mueve `planEntry` en la grilla del `Curriculum`, valida prerrequisitos y bloques electivos |
| `ActivityStatusBadge` | Badge del `status` de `Activity` (colores por estado del enum de 6 estados) |
| `ColorPicker` | Vueform element para el campo `color` de `requirementCategory` (linea de formacion) |
| `IconPicker` | Vueform element para el campo `icon` (bootstrap-icons) |
| `RichTextRenderer` | Renderer sanitizado para el contenido de `CustomSection` (`contentType: richText`) |

Fuente: listado de directorios `modsComponents/*/`. El mas central es `CompositeSectionTree`: cubre 7 de los 8 RecordTypes de `CurricularSection` (todos salvo `GraduationProfile`, dev-only). Uso real en `default_Activity_view.json` (props `ownerType`, `recordType`, `relationName`, `enableEdit`, `enableDelete`). Fuente: `docs/guides/composite-section-tree.md`.

---

## 9. Doc detallada

Este documento es el resumen "de conjunto". El detalle vive en `specs/up1/curriculum-design/` (documentacion de negocio, no de codigo):

| Archivo/carpeta | Contenido |
|-----------------|-----------|
| [`overview.md`](../curriculum-design/overview.md) | Posicionamiento en Learning Assurance, 8+ areas funcionales, 66 capacidades de negocio (`CAP-CUR-001`..`066`) |
| [`programa-de-asignatura.md`](../curriculum-design/programa-de-asignatura.md) | Detalle del agregado `Activity`/`CurricularSection` (alcance CAP-CUR-014..022) |
| [`business-rules/`](../curriculum-design/business-rules/) | Reglas de negocio por dominio (`BR-VER-*` versionado, `BR-WKF-*` workflow, `BR-TAX-*` taxonomia, `BR-INT-*` integridad, etc.) |
| [`capabilities/`](../curriculum-design/capabilities/) | 1 archivo por capacidad de negocio (`CAP-CUR-014`..`022`), distinto de `capabilities.json` (que es RBAC tecnico) |
| [`INDEX.md`](../curriculum-design/INDEX.md) | Indice maestro del KB de negocio del mod |

Para documentacion tecnica del codigo (patrones obligatorios, arquitectura interna, guias de componentes, referencia de errores/mutations), el mod tiene su propio `docs/` en `mods/curriculum-design/docs/` (indice en `docs/INDEX.md`), distinto del KB de negocio de `specs/`.

## 10. Tooling del repo: pre-push quality guard (UPONE-1445)

El mod instala un hook `.husky/pre-push` (`package.json` → `"prepare": "husky"`) que corre en cada `git push`:

1. **Guarda de rama (bloqueante)**: aborta el push directo a `develop`/`master`/`main` (el cambio debe ir por PR).
2. **Lint (eslint) sobre los archivos del rango del push**: warn-only, no bloquea.
3. **Typecheck (`vue-tsc --noEmit`) del mod completo**: warn-only, no bloquea.

Solo la guarda de rama aborta. Lint y typecheck son advisory porque el baseline del mod aun no esta verde. Escape hatch consciente: `git push --no-verify`.

---

## 11. Malla modular (UPONE-1539)

Feature grande (9 sessions, S1 a S9) que agrega un segundo modo de progresion a `Curriculum`, en paralelo al modo secuencial por periodos que ya existia.

`progression` es un campo de `rt__Plan__curriculum` (solo se usa en el RecordType `Plan`, no en `Minor`): enum cerrado `["Sequential", "Modular"]`, default `Sequential`. `planEntry.period` paso a ser `not_null: false`: en un plan secuencial la UI sigue asignando el periodo por columna, pero en un plan modular el periodo queda nulo porque el orden lo deriva el grafo de prerrequisitos, no una columna fija. Fuente: `objects/RecordTypes/rt__Plan__curriculum.json:11-18`, `objects/planEntry.json:61-66`.

**Lock server-side**: una vez creado el plan, `progression` no se puede cambiar si el plan ya tiene entradas (`hasPlanEntries`); el guard corre en el resolver de update, no solo en el layout. Fuente: `logic/curriculum-update.resolver.js` (commit `48f3685`, "conditional progression lock server-side (reject change only if plan has entries)").

**Dos mutations GraphQL nuevas, atomicas via `tx` directo** (no pasan por el CRUD generico): `createPlanEntriesBatch` (`logic/planEntry-batch.resolver.js`) y `deletePlanEntriesBatch` (`logic/planEntry-delete-batch.resolver.js`). Ambas usan `tx.planEntry.create`/`delete` dentro de `context.prisma.$transaction`: si una entrada falla, la transaccion completa revierte.

**Derivacion de nivel por grafo de prerrequisitos**: la logica pura vive en `deriveLevel` + `groupRequirementsByTiming` (S3), consumida por el componente `CurriculumMesh` para agrupar visualmente las entradas por nivel en modo modular en vez de por periodo.

**Borrado seguro con clasificador allow/cascade/block**: `deletePlanEntriesBatch` se apoya en un clasificador de dependencia reversa (S9) que, para cada entrada a borrar, resuelve si el borrado es directo (`allow`), arrastra otras entradas que dependen transitivamente de ella (`cascade`) o queda bloqueado porque alguna dependencia no tiene camino alternativo satisfacible (`block`). La UI muestra un modal de 3 estados antes de confirmar.

### Dos follow-ups con la misma causa de fondo

Bypassear el CRUD generico con `tx` directo gana atomicidad pero pierde, de fabrica, todo lo que el CRUD generico da gratis: RBAC declarativo, emision de eventos y auditoria DataLog. Ambos follow-ups de UPONE-1539 consistieron en restituir a mano lo que el bypass se salto:

- **Creditos en cero en co-agregados**: el chequeo de prerrequisito del batch guiado contaba 0 creditos para los cursos que se agregaban junto con el curso principal (co-added), lo que bloqueaba falsamente un `MetricThreshold` gateado por creditos. Corregido en `modsComponents/CurriculumMesh/prereqCheck.logic.ts` (commit `69c48bf`), sumando los creditos reales de los cursos co-agregados.
- **Gap de auditoria DataLog**: las mutations de batch no generaban ninguna fila de historial porque el `tx` directo bypasea el decorator `withDataLog` que el CRUD generico aplica automaticamente (ver seccion 6). Se restituyo con auditoria manual post-commit en `logic/planEntryDataLog.js`, invocado desde ambos resolvers de batch tras el `$transaction`. Ver [`BUG-curriculum-design-017`](../../bugs/curriculum-design/bug-curriculum-design-017.md) y [`DECISION-032`](../../decisions/DECISION-032-planentry-batch-direct-tx.md).

### Dato para planificacion: cero trabajo preparatorio de InstructionalComponent

En esta ventana (2026-08-03 a 2026-08-17) no hubo ningun commit ni referencia a `InstructionalComponent` (el objeto de piezas de dictado planificado para un sprint futuro), ni a `Modality`, `CurricularSection` u horas de modalidad. UPONE-1539 es ortogonal a ese trabajo: opera sobre `planEntry` y `Curriculum`, no toca el agregado de secciones curriculares. Ese trabajo arranca de cero cuando se planifique.

---

## 12. Fixes de seed y de RBAC de layout (UPONE-1538, UPONE-1503)

**UPONE-1538**: el seed de planes (`seed/_data-curriculum.js`) sembraba `progression: "Credits"`, un valor que nunca existio en el enum de la seccion 11 (`["Sequential", "Modular"]`). Corregido a `Sequential` en 20 planes (commit `72ce0d3`). El hueco de fondo sigue abierto: nada valida los valores de enum de un seed contra la definicion del objeto antes de insertarlos; un typo o un enum viejo en un seed pasa silenciosamente. Ver [`BUG-curriculum-design-018`](../../bugs/curriculum-design/bug-curriculum-design-018.md).

**UPONE-1503**: `config/layouts/AcademicProgram_list_gestor.json` declaraba en su `roles[]` el id de un rol interno del paquete de permisos en vez del rol institucional real. El sync autocrea el homonimo del rol interno en cada tenant, pero no lo asigna a nadie: la vista quedaba inalcanzable para cualquier usuario, sin ningun error visible en el camino (commit `e47f793`, corregido a `Coordinador`). Ver [`RULE-curriculum-design-048`](../../rules/curriculum-design/RULE-curriculum-design-048.md).

### Drift conocido en la doc del mod

`docs/guides/icon-picker.md` (doc propia del mod, no se duplica aqui) sigue listando `iconPicker.spec.ts`/`iconPickerA11y.spec.ts` como tests del mod, pero esos tests se eliminaron del repo al migrar `IconPicker` a core (UPONE-1504, ver seccion 8 de `example-up1-manager.md`); el `updated` del frontmatter tambien quedo desactualizado. Registrado aqui como drift conocido, no corregido en esta pasada (fuera de los 3 archivos asignados a esta actualizacion).

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-07-16 | Documento inicial: guia de ejemplo basada en el mod `curriculum-design` en la rama `feat/UPONE-1382-hard-delete-cascade` |
| 2026-07-20 | UPONE-1379 (perfil de egreso GraduationProfile: patron singleton por owner con guard de dominio); UPONE-1445 (pre-push quality guard, seccion 10); conteo de tests 35→34 |
| 2026-08-17 | UPONE-1539 (malla modular: progression Sequential/Modular con lock server-side, planEntry.period opcional, batch mutations atomicas via tx, derivacion de nivel por grafo de prerrequisitos, borrado con clasificador allow/cascade/block, seccion 11) y sus dos follow-ups (creditos-cero en co-agregados, gap de auditoria DataLog); UPONE-1538 (fix de seed con enum invalido) y UPONE-1503 (fix de rol interno en layout, seccion 12); registrado drift conocido en `docs/guides/icon-picker.md`; confirmado que no hubo trabajo preparatorio de `InstructionalComponent`/`Modality`/`CurricularSection` en esta ventana |
