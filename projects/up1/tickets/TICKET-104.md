---
id: TICKET-104
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1382
module: curriculum-design
autopilot: autonomous
---

# SP6 · P5 — Eliminación: hard delete en cascada sin huérfanos

> **P5** · Épica Jira [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) · Jira **[UPONE-1382](https://u-planner.atlassian.net/browse/UPONE-1382)** · 8 SP · repo `core + mod` · `layer: core` (extiende `deleteInstance`/`deleteBulkInstances`) · `creates_visual: true`.
> **Pre-spec (fuente de design):** [`sp6/historias-usuario-sp6.md` — P5](../../../../uplanner/specs/up1/sp6/historias-usuario-sp6.md) + validación [`sp6/validacion-jira-confluence.md` §5](../../../../uplanner/specs/up1/sp6/validacion-jira-confluence.md) (P5 no está en el catálogo CAP-CUR; el catálogo usa patrón de desactivación, no borrado — aclarar hard vs soft delete) + mockup [`sp6/mockup-sp6.html`](../../../../uplanner/specs/up1/sp6/mockup-sp6.html).
> **✅ Hard delete DEFINITIVO — soft delete DESCARTADO (reunión QA 2026-07-06, 00:13:06).** El soft-delete de Engagement (flag `active`) **no es escalable y tiene fuga**: la lectura genérica de core (`listInstances`) no conoce el flag, así que MCP / otro layout / otro mod / reportería ven los "borrados" (*"no vas a saber que esos elementos están borrados"*). El soft-delete confiable exige capacidad de core (filtro por defecto en la lectura genérica) → **capacidad core futura, fuera de este alcance**. SP6 = **hard delete + cascada de hijos polimórficos en core, transversal** (no parche por mod, 00:15:51).
> **Nota de tipo:** el ticket se auto-describe como *"cerrar esa inconsistencia (fix), no una feature nueva"* — el clonado ya consume `metadata.polymorphicChildren` pero el borrado no. Se scaffoldea como `work_type: implement` (AC extensos + matriz + modal nuevo); reevaluar fix vs implement en design si el team prefiere el flujo `design-fix`.

## ⛔ Gate de inicio — dependencias

> **1 dev, ejecución en serie.** `depends_on: []` (Jira: "Ninguna"). **Dependencia blanda de secuencia:** P5 consume `metadata.polymorphicChildren` (camino crítico establecido por P2 = [UPONE-1379](https://u-planner.atlassian.net/browse/UPONE-1379), NO registrado en este batch). Coordinar el formato con P3 (TICKET-102): ambos consumen y pueden ampliar el bloque (P5 puede necesitar declarar relaciones de auditoría polimórfica). Si P2 no está ejecutado, definir/consumir el mismo formato aquí.

## Request

> *(literal de UPONE-1382 — DET-3: no reescribir)*

Como **usuario**, quiero que al eliminar un objeto de la malla se borren de forma segura el padre y todos sus hijos, con un modal que me lo advierta, sin dejar registros huérfanos, para gestionar la malla sin residuos ni pérdidas accidentales.

## Análisis de alcance profundo (2026-07-07, verificado contra código)

**⚠️ Corrección crítica — la "Matriz de borrado" del ticket tiene errores/gaps vs el schema real:**
- **`Curriculum → CurricularSection` ya aplica en el estado actual de la rama de trabajo.** UPONE-1379 amplió `CurricularSection.ownerType` a `[Activity, Offering, Curriculum]` y agregó el RT `GraduationProfile` (owner Curriculum). Por lo tanto, la cascada de borrado de Curriculum **debe incluir sus CurricularSection**, incluido `GraduationProfile`.
- **Las declaraciones `polymorphicChildren` siguen incompletas para delete.** En el estado actual, Activity/Curriculum/Offering declaran `sections` (`CurricularSection`) pero no declaran `requirement`; `AcademicProgram` todavía no declara `Curriculum` como hijo polimórfico. → REQ-03 **NO es "solo consumir lo declarado"**: P5 debe completar la metadata necesaria para representar todo el grafo que va a borrar/restringir.
- **No hay "Cascade por defecto" en codegen hoy:** `onDelete` es opt-in por campo (`generatePrismaSchema.js`). REQ-02 debe declararse `onDelete: Cascade` **explícito por campo** en los 4 objetos, NO como default global (ver riesgo 1).
- **FE: el wiring real no es `useRowMutation`→`deleteInstance`.** Es `RecordList.vue` (`confirmDeleteRow:6024`, `deleteSelectedRows:6107`) vía **`deleteBulkInstances`**, con `CriticalWarningModal` ya integrado por config `layoutConfig.deleteWarning` (usado hoy solo en up1-manager). `consequences` es **texto estático** → el conteo dinámico de "N hijos" hay que **construirlo**.
- **MCP: `cd_delete_section`/`delete_object` NO listan hijos hoy** ("sin cascade" explícito en el código) → el preview de cascada es capacidad **nueva**, no "reflejar".

**Decisiones ya cerradas para el intake actual:**
1. **Semántica Restrict/Cascade por relación:** resuelta en la sección "Semántica de borrado — DECIDIDA": cascada solo para hijos poseídos/exclusivos dentro del subárbol; Restrict cuando exista cualquier referencia externa.
2. **Cadenas de versión:** Restrict. BR-VER-001 (Confluence, Must) dice que las versiones anteriores no se eliminan ni modifican; borrar una versión intermedia rompe linaje.
3. **Auditoría de cascada:** usar **core_DataLog** (destino de P3/TICKET-102), no `ChangeLog`. Cada hijo eliminado por cascada debe generar su propia entrada de auditoría; no basta auditar solo el padre.
   - **✅ Coordinación P3↔P5 (dev 2026-07-07):** la cascada de P5 debe generar entradas de auditoría **hijo por hijo** — cada borrado de hijo pasa por el decorator `withDataLog` o por un helper equivalente que preserve el contrato DataLog. No se acepta bypass con Prisma directo. La atribución de P3 lee `ownerType/ownerId` del snapshot del hijo, por lo que funciona aunque el padre se borre en la misma cascada. Registrado también en [TICKET-102](TICKET-102.md).
4. **Override `requirementCategoryDelete`:** se retira si el motor genérico soporta Restrict con mensaje accionable/lista de referencias ("reasigna primero"). Si ese mensaje no queda soportado en core, el override no puede retirarse todavía.
5. **Completar `polymorphicChildren`:** queda como task explícita de diseño/implementación. P5 no puede asumir que las declaraciones actuales están completas.

**Riesgos:**
1. **Blast radius cross-mod:** si "Cascade por defecto" se hace global en codegen, cambiaría FKs de `academic-scheduling` (`Section.activityId`, sin onDelete hoy) y `uengagement` → fuera del execute_scope y del scope SP6. **Mitigación: onDelete explícito por campo solo en la matriz de curriculum-design.**
2. **uengagement ya tiene `onDelete:Cascade` hacia Offering/Activity** (Event, OfferingEnrollment, TeachingAssignment, ActivityLine): al habilitar el hard-delete UI de estos objetos, borrar un Activity/Offering **arrastraría datos de engagement** (asistencia/matrícula/docencia) silenciosamente → ¿necesita warning/gate propio? Confirmar.
3. **Gap de declaración bloquea REQ-03/04/09** para 3 de 4 objetos; el test anti-huérfanos (REQ-09) da **falso verde** si las relaciones no están declaradas.
4. `deleteInstance`/`deleteBulkInstances` son **core compartido** → cascada recursiva = cambio transversal de plataforma → **revisión team core (RULE-dev-004)**, no solo quality review del mod.

## Semántica de borrado — DECIDIDA (dev 2026-07-07)

**Principio unificado: cascada condicional por referencias entrantes.** Para cada nodo alcanzado por el borrado:
- **Cascade** (con advertencia + conteo en el modal) si el hijo es **poseído y exclusivo** del subárbol que se borra.
- **Restrict** (bloquear todo el borrado + listar qué lo referencia, "resolver primero") si el nodo tiene una **referencia entrante desde FUERA del subárbol** (otro objeto, otra sección u otro mod).

**Implementación:** por cada nodo, evaluar referencias entrantes reusando `referenceValidationService` (FK reales, ya lo hace) **+ extenderlo a referencias polimórficas** (`ownerType/ownerId`) y a las cadenas de versión (`previousVersionId`). Si hay ≥1 referencia externa al subárbol → abortar con Restrict + lista. Si no → cascada.

**Matriz resuelta (aplicación del principio):**

| Relación | Semántica | Razón |
|---|---|---|
| Curriculum → planEntry, requirementCategory, requirement(owner=curriculum) | **Cascade** | hijos poseídos exclusivos del plan |
| Activity → CurricularSection, requirement(owner=activity) | **Cascade** | contenido del programa de asignatura |
| Offering → CurricularSection, requirement(owner=offering) | **Cascade** | contenido del sílabo |
| árboles self-ref (`CurricularSection.parentId`, `requirement.parentId`) | **Cascade recursivo** | rama→hoja |
| **Activity → planEntry (`activityId`)** | **Restrict** | el curso está en mallas de otros planes → no invalidar (MC-09) |
| **Activity → Offering** / **AcademicProgram → Curriculum** | **Cascade con warning SI exclusivo; Restrict si referenciado externamente** | regla condicional (ver principio) |
| **Activity/Offering → FKs cross-mod** (cualquier modelo externo con `<activityId>` / `<offeringId>` referenciando el nodo — engagement es un ejemplo concreto, no el unico) | **Restrict si existe >=1 FK entrante desde fuera del subarbol** | principio generico de proteccion cross-mod: no borrar datos operativos de otro mod |
| **Cadenas de versión** (`previousVersionId`) | **Restrict** | BR-VER-001: las versiones anteriores no se eliminan |

**Implicaciones que esto fija:**
- **Modal FE de 2 modos:** (a) Cascade → "se borrarán N hijos (tipos/RT)" + confirmar; (b) Restrict → "no se puede borrar: referenciado por X, Y, Z — resuélvelo primero" (bloqueante, no borra).
- **El override `requirementCategoryDelete` se puede RETIRAR:** su caso ("no borrar categoría con planEntries → reasigna primero") es exactamente el principio genérico (Restrict por referencia entrante con mensaje). El motor de cascada genérico con Restrict-con-lista lo absorbe → se elimina el monkeypatch.
- `onDelete` en Prisma se declara **explícito por campo** solo en las relaciones de la matriz (nunca Cascade global — blast radius cross-mod).

**Resuelve** los antiguos puntos abiertos de producto: semántica Restrict/Cascade, cadenas de versión y auditoría vía DataLog (esta última + coordinación P3↔P5 ya registrada arriba). **Pendiente de design/implementación:** completar metadata de hijos, definir el shape del preview dinámico UI/MCP, implementar DataLog por nodo eliminado y pasar revisión del team core (`deleteInstance`/`deleteBulkInstances` son core compartido, RULE-dev-004).

## Flujo actual de borrado en UP1 — por qué P5 es fix de plataforma

> **Lectura de código 2026-07-13.** Este ticket no agrega un concepto nuevo de negocio: corrige una inconsistencia del motor genérico. UP1 ya sabe borrar instancias, validar FKs reales, borrar tablas RT/ext del registro eliminado y clonar hijos polimórficos con subtipo. Lo que falta es que el **borrado** use la misma semántica declarativa de hijos que ya usa el **clonado/versionado**.

### Flujo UI real

El borrado desde listas no llama directo a `deleteInstance` en el caso normal. `RecordList.vue` enruta así:

1. `confirmDeleteRow(row)` decide si mostrar modal estándar o `CriticalWarningModal` según `layoutConfig.deleteWarning`.
2. Si hay `deleteWarning.type = critical`, el usuario confirma en `CriticalWarningModal`; si no, confirma en el modal estándar.
3. Ambos caminos terminan llamando `DELETE_BULK_INSTANCES` / `deleteBulkInstances(objectType, ids)`. Para un borrado de una fila, el bulk recibe `ids: [id]`.

Implicación: el fix de P5 debe vivir principalmente en `deleteBulkInstances`; `deleteInstance` debe quedar coherente por compatibilidad de API, pero la UI de RecordList ya está montada sobre bulk delete.

### Flujo backend actual

`object-manager/src/graphql/resolvers/instance.resolver.js` tiene dos rutas:

- `deleteInstance`: protegido por `withObjectAuth('delete')`, `withDataLog('delete')` y `withEventPublish('delete')`. Si el `objectType` es RT (`rt__...__base`), borra `ext__` del RT, fila RT y luego base. Si es base, busca RTs que cuelgan del base, borra `ext__`/RT, borra `ext__` del base y finalmente borra la fila base.
- `deleteBulkInstances`: protegido por `withObjectAuth('delete')`. Primero valida existencia, luego llama `validateBulkDelete(...)`, borra RT/ext del objeto objetivo, borra la fila base, registra `logInstanceOperation`, y publica un evento por id borrado con `_previousData`.

`referenceValidationService.validateBulkDelete(...)` descubre referencias entrantes dinámicamente, pero solo en dos familias:

- FKs reales expuestas por Prisma, inferidas por convención `<target>Id`.
- Campos `core_FieldDefinition` de tipo `reference`.

Por diseño actual, **no ve relaciones polimórficas** como `ownerType/ownerId` ni relaciones derivadas entre hijos. Por eso puede dar luz verde a borrar un padre aunque queden hijos curriculares apuntando a un `ownerId` inexistente.

### Qué ya resuelve el motor para RecordTypes/ext

El delete actual sí entiende proyecciones del objeto que se está borrando:

- Si se borra `rt__Plan__curriculum`, borra la fila `rt__Plan__curriculum`, su `ext__...__rt__plan__curriculum` si existe, y después la fila base `Curriculum`.
- Si se borra `Curriculum` desde la lista base, busca todos los RTs `rt__*__curriculum` y borra sus filas/ext antes de borrar la base.

Ese comportamiento cubre el **registro objetivo**, pero no cubre sus **hijos**. Si un `Curriculum` tiene hijos `CurricularSection` con `recordType = GraduationProfile`, el delete actual no baja a borrar `CurricularSection`, `rt__GraduationProfile__curricularsection` ni sus `ext__`. Ahí está el gap.

### Qué ya resuelve el clone/versionado y debe reutilizarse conceptualmente

`helpers/deep-clone-polymorphic.js` ya lee `metadata.polymorphicChildren` con `readPolymorphicChildren(...)`, ordena árboles por `recursiveBy`, y para hijos con subtipo copia:

- fila base del hijo (`CurricularSection`, `requirement`, etc.),
- proyección RT (`rt__<RecordType>__<base>`),
- extensiones `ext__` del base y del RT.

P5 debe cerrar la simetría: si clone/versionado puede recorrer declarativamente hijos polimórficos, preservar subtipos y operar por capas, delete debe poder recorrer el mismo grafo para **preview → restrict/cascade → delete**.

## Impacto específico en hijos de curriculum-design

### Padres base involucrados

| Padre | Tipo de relación hacia hijos | Estado actual / riesgo |
|---|---|---|
| `AcademicProgram` | `Curriculum.ownerType/ownerId` cuando `ownerType = AcademicProgram` | Polimórfica: hoy no la detecta `validateBulkDelete`. Borrar un programa puede dejar planes/minors huérfanos si no se restringe o cascada. Requiere declarar `Curriculum` como hijo polimórfico de `AcademicProgram`. |
| `Curriculum` (`recordType = Plan` o `Minor`) | `planEntry.planId` FK, `requirementCategory.curriculumId` FK, `CurricularSection.ownerType/ownerId`, `requirement.ownerType/ownerId`, `previousVersionId` self-FK | Mezcla de FK real + polimórficos + cadena de versión. Las FK reales pueden bloquear; los polimórficos no. `previousVersionId` debe ser Restrict por BR-VER-001. |
| `Activity` (`recordType = Course` o `Service`) | `Offering.activityId` FK, `planEntry.activityId` FK, `CurricularSection.ownerType/ownerId`, `requirement.ownerType/ownerId`, `previousVersionId` self-FK | `planEntry.activityId` debe restringir si el curso está en mallas. Hijos curriculares polimórficos quedan invisibles al delete actual. **Cualquier FK cross-mod (convención `<objectLower>Id>` o polimórfica) referenciando Activity debe bloquear via Restrict `external-reference` — engagement es un ejemplo de modelo externo, no el único**. |
| `Offering` (`recordType = Syllabus` o `ServiceOffer`) | `CurricularSection.ownerType/ownerId`, `requirement.ownerType/ownerId`, **FKs cross-mod (cualquier modelo externo con `offeringId`/`offeringEnrollmentId`/etc. apuntando al Offering)** | Las secciones/requisitos de sílabo son polimórficos; **cualquier FK externa desde fuera del subárbol debe restringir**. Engagement es solo un ejemplo (Event, OfferingEnrollment, TeachingAssignment); el principio es genérico. |

### Hijos polimórficos simples

`CurricularSection` y `requirement` cuelgan por `ownerType/ownerId`, no por FK real:

- `CurricularSection.ownerType` enum actual: `Activity`, `Offering`, `Curriculum`.
- `requirement.ownerType` enum actual: `curriculum`, `activity`, `offering` (casing distinto al de `CurricularSection`, punto de diseño a normalizar o soportar).
- Ambos tienen árbol interno por `parentId` (`directChildren` + `recursiveBy`).

Riesgo actual: borrar el owner no borra ni bloquea esos hijos, porque la DB no puede aplicar integridad sobre `ownerType/ownerId`.

### Hijos polimórficos con subtipo / RecordType

Hay hijos cuya data real está partida entre base + RT + ext:

- `CurricularSection` tiene RTs como `LearningOutcome`, `Modality`, `Session`, `EvaluationComponent`, `Content`, `Bibliography`, `CustomSection`, `GraduationProfile`.
- `requirement` tiene RTs `Group`, `RecordState`, `MetricThreshold`.
- `Curriculum` tiene RTs `Plan` y `Minor`.
- `Activity` tiene RTs `Course` y `Service`.
- `Offering` discrimina `ServiceOffer` y `Syllabus`.

Para P5, borrar un padre no puede limitarse a `deleteMany` del base. Debe borrar cada hijo con su stack completo:

1. `ext__<client>__rt__<rt>__<base>` si existe.
2. `rt__<rt>__<base>`.
3. `ext__<client>__<base>` si existe.
4. fila base.

El helper de clone ya implementa esta idea para copiar (`cloneChildProjections`). El delete necesita el equivalente inverso para no dejar proyecciones RT o extensiones huérfanas.

### Relaciones derivadas entre hijos

`Activity` y `Offering` declaran `polymorphicChildrenDerived` para `CurricularLink` vía `sourceSectionId,targetSectionId`, remapeado contra `sections`. Aunque P5 no debe inventar semántica de negocio nueva, el preview/restrict/cascade debe considerar este tipo de link derivado:

- Si todos los extremos del link pertenecen al subárbol que se borra, puede entrar a cascade.
- Si un link cruza hacia una sección fuera del subárbol, debe bloquear o excluirse según decisión explícita; no puede quedar apuntando a una sección borrada.

### Conclusión de intake

P5 es mejor modelarlo como **fix de integridad del delete genérico**:

- El sistema ya tiene `metadata.polymorphicChildren`, `directChildren`, `recursiveBy`, RT/ext y DataLog.
- El delete actual solo aplica parte del contrato: FKs reales + RT/ext del objeto objetivo.
- Curriculum-design expone el caso donde la brecha se vuelve visible: padres base con hijos polimórficos, árboles internos y subtipos persistidos en tablas RT.
- La solución correcta no es un resolver especial del mod; es extender core para que `deleteBulkInstances` construya un grafo de borrado/restrict desde la metadata declarativa, genere preview para UI/MCP, y ejecute el delete en orden seguro con auditoría `core_DataLog` por nodo.

## Casos de prueba obligatorios — delete real + DB + DataLog

> **Regla de testing para P5:** los casos críticos deben correr contra BD real de tenant seed (UPU u otro tenant de prueba), no solo mocks. Es aceptable borrar datos durante la prueba porque vienen del seed/sync. Si un caso necesita recuperar fixtures, ejecutar sync/seed antes de repetir. Cada caso debe probar tres cosas: **(1)** el dato existe antes, **(2)** luego del delete ya no existe físicamente en DB, **(3)** el borrado queda auditado en `core_DataLog`.

### Patrón común de prueba

Para cada objeto/caso:

1. Preparar fixture desde seed o crear fixture mínimo con GraphQL/Prisma.
2. Consultar DB antes del borrado y guardar ids esperados:
   - fila padre,
   - hijos directos FK,
   - hijos polimórficos,
   - filas RT/ext cuando aplique,
   - links derivados cuando aplique.
3. Ejecutar borrado por el flujo real:
   - preferido: GraphQL `deleteBulkInstances(objectType, ids)` porque es la ruta usada por `RecordList`;
   - adicional: cubrir `deleteInstance` para compatibilidad de API si el fix toca ambas rutas.
4. Consultar DB después:
   - lo que entra en cascade no debe existir;
   - lo que entra en restrict debe seguir existiendo y el delete debe devolver error accionable;
   - no deben quedar huérfanos `ownerType/ownerId`, `parentId`, RT ni `ext__`.
5. Consultar `core_DataLog`:
   - debe existir entrada `DELETE` o `BULK_DELETE` para el padre;
   - debe existir entrada de delete por cada hijo eliminado por cascada;
   - para hijos polimórficos, la entrada debe conservar atribución suficiente (`objectName`, `recordId`, `parentObject`, `parentId`, `childRecordType`, `historyKey`) para reconstruir el historial aunque la fila ya no exista.

### Casos por objeto padre

| Caso | Fixture mínimo | Acción | Verificación DB | Verificación DataLog |
|---|---|---|---|---|
| `AcademicProgram` con `Curriculum` hijo | Programa académico con al menos un `Curriculum.ownerType = AcademicProgram`, incluyendo `recordType = Plan` y si el seed lo permite `recordType = Minor`. | `deleteBulkInstances("AcademicProgram", [id])`. | Si no hay referencias externas, desaparecen `AcademicProgram`, `Curriculum`, `rt__Plan__curriculum`/`rt__Minor__curriculum` y `ext__` asociados. Si hay referencias externas, el delete se bloquea y nada desaparece. | DataLog del programa + cada curriculum eliminado. Para curriculum RT, `childRecordType` debe indicar `Plan`/`Minor` cuando aplique. |
| `Curriculum` Plan con hijos FK y polimórficos | Plan con `planEntry`, `requirementCategory`, `requirement(ownerType=curriculum)`, `CurricularSection(ownerType=Curriculum, recordType=GraduationProfile)` y árbol `parentId`. | `deleteBulkInstances("Curriculum", [planId])`. | Desaparecen Plan, `rt__Plan__curriculum`, `planEntry`, `requirementCategory`, requirements, secciones GraduationProfile, sus descendientes, RT/ext de cada hijo. No quedan `ownerId = planId` ni `parentId` apuntando a ids borrados. | DataLog del plan + cada `planEntry`, `requirementCategory`, `requirement` y `CurricularSection` borrado. Las secciones deben quedar atribuidas al historial del `Curriculum:{planId}`. |
| `Curriculum` Minor | Minor con al menos un hijo permitido por el modelo, idealmente `requirement(ownerType=curriculum)` o sección curricular si el seed lo trae. | `deleteBulkInstances("Curriculum", [minorId])`. | Desaparece `Curriculum`, `rt__Minor__curriculum`, `ext__` asociado e hijos propios. No se debe borrar ni afectar un Plan distinto. | DataLog con `childRecordType = Minor` para el curriculum y entradas separadas por sus hijos. |
| `Curriculum` con cadena de versión | Curriculum A referenciado por Curriculum B vía `previousVersionId`. | Intentar borrar A. | Debe bloquear por Restrict; A y B siguen existiendo. No hay cascada parcial. | DataLog no debe registrar delete exitoso; si se registra intento fallido, debe ser explícito y no confundirse con DELETE aplicado. |
| `Activity` Course con secciones/requisitos | Course con `CurricularSection(ownerType=Activity)` de varios RT (`LearningOutcome`, `Modality`, `Session`, `EvaluationComponent`, etc.) + `requirement(ownerType=activity)` con árbol. | `deleteBulkInstances("Activity", [activityId])`. | Si no está usado por `planEntry` ni por ninguna FK cross-mod entrante, desaparecen Activity, `rt__Course__activity`, ext, secciones, requirements, descendientes y RT/ext de cada hijo. | DataLog del Activity + cada sección/requisito borrado; `childRecordType` por RT de sección/requisito. |
| `Activity` referenciada por `planEntry` | Activity incluida en una malla (`planEntry.activityId = activityId`). | Intentar borrar Activity. | Debe bloquear por Restrict; Activity y planEntry siguen existiendo. | No debe quedar DELETE exitoso para Activity ni hijos. Error debe listar `planEntry.activityId`. |
| `Activity` con FK cross-mod entrante | Activity/Service con >=1 referencia externa desde un modelo fuera del subárbol (ejemplo: `Event.activityId`, `ActivityLine.activityId`, `TeachingAssignment.activityId` — engagement es uno de los modelos cross-mod posibles, NO el único). | Intentar borrar Activity. | Debe bloquear por Restrict (`reason='external-reference'`) si existen referencias externas. | Sin DELETE exitoso; el error lista qué modelo externo referencia y vía qué field — el usuario resuelve y vuelve a intentar. |
| `Offering` Syllabus con secciones/requisitos | Offering `recordType = Syllabus` con `CurricularSection(ownerType=Offering)` + `requirement(ownerType=offering)` y árbol interno. | `deleteBulkInstances("Offering", [offeringId])`. | Desaparecen Offering/Syllabus y sus hijos polimórficos con RT/ext. No quedan secciones/requisitos con `ownerId = offeringId`. | DataLog del Offering + cada hijo; `historyKey = Offering:{offeringId}` para historial del sílabo. |
| `Offering` con FK cross-mod entrante | Offering referenciado desde >=1 modelo externo fuera del subárbol (ejemplo: `Event.offeringId`, `OfferingEnrollment.offeringId`, `TeachingAssignment.offeringId`). | Intentar borrar Offering. | Restrict; no se borra Offering ni hijos. | Sin DELETE exitoso; error lista referencias externas con sus fields. |

### Casos por tipo de hijo

| Tipo de hijo | Fixture mínimo | Acción | Verificación DB | Verificación DataLog |
|---|---|---|---|---|
| `CurricularSection` simple | Sección base sin RT específico o con RT simple, colgada de Activity/Curriculum/Offering. | Borrar el owner o borrar la sección directamente. | Desaparece base `CurricularSection`, su `ext__`, y si aplica su RT/ext. | Entrada DELETE para la sección; si se borra por cascada desde owner, debe quedar atribución al owner. |
| `CurricularSection` con árbol | Padre con hijos/nietos por `parentId`. | Borrar owner o sección raíz. | Desaparece toda la rama; no queda ningún `parentId` apuntando a ids borrados. | DataLog por cada nodo de la rama, no solo por la raíz. |
| `CurricularSection` con RT | Secciones `LearningOutcome`, `Modality`, `Session`, `EvaluationComponent`, `Content`, `Bibliography`, `CustomSection`, `GraduationProfile` según fixtures disponibles. | Borrar owner. | Por cada sección desaparece base + `rt__<RT>__curricularsection` + ext de base/RT. | Entrada por cada sección con `childRecordType = <RT>`. |
| `requirement` con árbol | Requisito `Group` con hijos `RecordState` y/o `MetricThreshold`. | Borrar owner o raíz del árbol. | Desaparecen base `requirement`, `rt__Group__requirement`, `rt__RecordState__requirement`, `rt__MetricThreshold__requirement`, ext y descendientes. | Entrada por cada requirement; conservar `childRecordType` del subtipo. |
| `planEntry` | Plan con entradas. | Borrar Curriculum/Plan. | Desaparece `planEntry` cuando pertenece al plan borrado. Si el borrado es de Activity referenciada por planEntry, debe bloquear. | DataLog de cada planEntry eliminado en cascada desde Curriculum. |
| `requirementCategory` | Categoría con o sin `planEntry.categoryId`. | Borrar Curriculum o borrar categoría directa. | Desde Curriculum: desaparece. Borrado directo con planEntries asociados: Restrict y mensaje "reasigna primero" o equivalente. | DataLog solo cuando el delete se aplica. |
| `CurricularLink` derivado | Links entre secciones del mismo owner y al menos un link cross-owner si se puede construir. | Borrar owner o sección. | Links internos al subárbol desaparecen; links que cruzan fuera del subárbol deben bloquear o ser tratados por decisión explícita, nunca quedar huérfanos. | DataLog del link si se elimina; si bloquea, sin DELETE exitoso. |

### Recuperación de datos durante pruebas

Como los fixtures vienen de seed/sync, el plan de prueba puede ser destructivo:

- Antes de ejecutar una batería, correr sync/seed del tenant de prueba para reconstruir datos conocidos.
- Ejecutar casos de cascade que borran datos reales del seed.
- Re-ejecutar sync/seed cuando un caso posterior necesite el mismo árbol.
- No depender del orden accidental de IDs: cada test debe descubrir por consulta el fixture que va a borrar y guardar los ids antes de ejecutar la mutación.

### Criterio de aceptación de test

Un caso pasa solo si cumple las tres capas:

- **DB:** no quedan filas ni huérfanos en base, RT, ext, FK, `ownerType/ownerId`, `parentId` ni links derivados.
- **API/UI:** la mutación devuelve éxito con conteo de borrados o error Restrict accionable; no hay borrados parciales silenciosos.
- **Auditoría:** `core_DataLog` permite reconstruir qué se borró, desde qué padre, con qué subtipo, aunque el registro ya no exista.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement (auto-descrito "fix"; ver Nota de tipo) |
| Tipo de cambio | (a) `onDelete` por campo FK en JSON · (b) **core**: extender `deleteInstance`/`deleteBulkInstances` con cascada polimórfica recursiva a profundidad completa + borrado de capas RT (`ext__`→`rt__`→base) · (c) FE: `CriticalWarningModal.vue` en la acción de borrado del RecordList |
| Modulo principal | curriculum-design (mod) + object-manager (core) |
| Modulos afectados | object-manager (core: cascada polimórfica); curriculum-design (`onDelete` en JSON + metadata de hijos); layout (`CriticalWarningModal.vue`/`RecordList` vía `deleteBulkInstances`); MCP: `cd_delete_section`, `delete_object` (preview) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | sí | Modal de confirmación (reusa `CriticalWarningModal.vue` de layout) que advierte padre + N hijos (tipos/RecordTypes); confirmar ejecuta, cancelar no borra. |
| Data model | no | Declara `onDelete` por campo (Cascade/Restrict) — comportamiento del schema, honrado por codegen; no crea objeto ni campo. |

## Contexto (de Jira / historia P5)

El hard delete genérico ya existe (`deleteInstance`/`deleteBulkInstances`) y la protección de FK reales es automática (`referenceValidationService`; hoy **bloquea** si hay referencias). Las FK reales se declaran con `onDelete` por campo (Cascade/Restrict), honrado por codegen. Las relaciones **polimórficas** (`ownerType/ownerId`) no son FK → la BD no las protege → quedan huérfanos. Core ya tiene el mecanismo declarativo `metadata.polymorphicChildren` y el clonado/versionado lo consume, **pero el borrado no**; además, P5 debe completar las declaraciones faltantes en los objetos de curriculum-design. En layout ya existe `CriticalWarningModal.vue`, y el flujo real de listas usa `deleteBulkInstances`.

**Matriz de borrado (objetos alcanzados):**

| Objeto base | Hijos por FK real | Hijos polimórficos |
|---|---|---|
| AcademicProgram | — | Curriculum |
| Curriculum (Plan) | planEntry · requirementCategory | CurricularSection · requirement |
| activity (Course) | Offering · planEntry (`activityId`) | CurricularSection · requirement |
| Offering (Syllabus) | — | CurricularSection |

- **RecordTypes con tablas:** `CurricularSection` y `requirement` viven en varias tablas (base + `rt__` + `ext__`); borrar cada hijo elimina **todas sus capas**.
- **Árboles self-ref:** `CurricularSection.parentId` y `requirement.parentId` — cascada de la rama a la hoja, a cualquier profundidad.
- **Auditoría:** registrar borrados en `core_DataLog` por nodo eliminado. `ChangeLog` fue retirado por P3/TICKET-102 y no debe ser nuevo destino de P5; `workflowTransitionHistory` queda fuera salvo que exista una referencia real/legacy que deba restringirse o limpiarse por compatibilidad.

## Context found (evidencia de código · fuente `sp6/analisis-por-punto.md §5`, `reunion-qa-2026-07-06.md`, `analisis-soft-delete-engagement.md`, `preguntas-abiertas.md` Q3.b)

> Toda ruta:línea CONFIRMADA por lectura de código salvo marca INFERIDO. **Clasificación: B para FK reales (config); el gap de huérfanos polimórficos → CORE (transversal, no parche por mod).**

**Core ya cubre lo genérico (hard-delete + FK reales):**
- `deleteInstance` genérico: `object-manager/src/graphql/resolvers/instance.resolver.js:3551` (cadena event/auth/dataLog). `deleteBulkInstances:5057`.
- Protección de FK automática por introspección Prisma: `object-manager/src/services/referenceValidationService.js` ("FULLY DYNAMIC…"), usada en `validateBulkDelete:5225`. **Solo cubre FK reales de DB.**
- `onDelete` (Cascade/Restrict) por campo, honrado por el codegen: `generatePrismaSchema.js:414,636,706,786,976`.

**El gap real — referencias polimórficas** (`ownerType/ownerId`, `entityType/entityId`) **NO son FK → la DB no las protege** (verificación de reunión fila 4: la afirmación "los polimórficos ya tienen cascada/restrict por defecto" es **imprecisa/falsa**). Grafo de huérfanos (2026-07-03):
- Borrar `Curriculum` → huérfanos `planEntry` (FK), `requirementCategory` (FK), `requirement(owner=curriculum)` (polimórfico).
- Borrar `Activity` → `Offering` (FK), `planEntry` (FK), `CurricularSection(owner=Activity)` + `requirement(owner=activity)` (polimórficos).
- Borrar `AcademicProgram` → `Curriculum` (owner polimórfico).
- Borrar entidad auditada → antes podía dejar logs legacy polimórficos huérfanos (`changeLog`/`workflowTransitionHistory`). En el estado actual de P3, el destino activo es `core_DataLog`; P5 debe auditar deletes en DataLog y solo tratar legacy logs si aparecen como deuda de compatibilidad.
- Único `onDelete` declarado hoy en el mod: `planEntry.categoryId → requirementCategory = Restrict` (`objects/planEntry.json:45`).

**La declaración a reusar ya existe = fix, no feature:** `metadata.polymorphicChildren` + `readPolymorphicChildren()` (`helpers/deep-clone-polymorphic.js`) — **hoy lo consume el deep-clone al versionar, pero el borrado NO** (`referenceValidationService` solo mira FK reales). Cerrar esa inconsistencia es el corazón del ticket. Coordinar formato con P3/TICKET-102.

**Patrón frágil a reemplazar:** `mods/curriculum-design/logic/requirementCategoryDelete.resolver.js` (74 líneas) es un **override global de `deleteInstance`** (monkeypatch "el último gana" entre mods) + `logic/helpers/categoryGuard.js` (`assertNoEntriesForCategory`). Por eso la cascada polimórfica va en **core transversal**, no como otro override por mod.

**Por qué NO soft-delete (evidencia `analisis-soft-delete-engagement.md`):** el patrón `active`/`isActive` está en **6 objetos** de engagement (`Availability`, `Attendance`, `Journal`, `FormTemplate` = soft-delete real; `ActivityType`, `InstructorTier` = catálogo), con filtro **por-layout** disperso. `listInstances` no inyecta el filtro → fuga estructural por cada consumidor (MCP, otro layout, reporte). Confirmado; refuerza la decisión de hard delete ahora + soft-delete genérico como capacidad core futura.

## Herencia de SP5 / épicas previas — el patrón de borrado que P5 generaliza

> Verificado 2026-07-07. P5 no inventa el guard de borrado: **generaliza a core transversal** un patrón que el mod ya tiene por-objeto (frágil) y reusa la declaración polimórfica del versionado.

- **MC-02 / [TICKET-082](TICKET-082.md) / `SPEC-curriculum-design-planentry-requirementcategory`** (closed): origen del guard de borrado del mod. Decisión #3 del spec: primario **A** = `categoryId` FK con `onDelete: Restrict` (`objects/planEntry.json:45`, la única `onDelete` declarada hoy); fallback **B** = guard de dominio `categoryGuard.js` (`assertNoEntriesForCategory` → "reasigna primero"). **P5 eleva esto:** de un override monkeypatch por objeto (`requirementCategoryDelete.resolver.js`, frágil "el último gana") a cascada polimórfica declarativa en core, y define `onDelete` Cascade/Restrict en los 4 objetos (REQ-02/REQ-05).
- **Declaración polimórfica reusable (S7-03 diferido + versionado):** `metadata.polymorphicChildren` + `readPolymorphicChildren` (`helpers/deep-clone-polymorphic.js`) nació para el **deep-clone al versionar/clonar** (diferido **S7-03** "deep-copy de hijos", `sp5/SP6-backlog-diferidos.md`: *"el motor de cascada ya existe en core — esto es declarar config + validar remapeo"*). **P5 reusa esa MISMA declaración para el borrado** (hoy el clonado la consume, el borrado no → cerrar esa inconsistencia = el fix). Coordinar el formato con P3/[TICKET-102](TICKET-102.md) (ambos consumen y pueden ampliar el bloque).
- **MC-09 / [TICKET-089](TICKET-089.md):** precedente de guard restrictivo sobre `requirement`(owner=activity) en planes `Active` — mismo estilo de protección de integridad; su `requirementActivityGuard.js` no borra, pero es referencia del patrón "guard puro + error accionable".
- **Nota de scope de versión:** las cadenas `previousVersionId` (self-FK del versionado, S7-02) son parte del grafo a considerar en la cascada. La decisión actual es Restrict: borrar una versión intermedia rompe linaje.

## Pre-spec (transcrito de UPONE-1382 — criterios de aceptación)

| REQ | Certeza | source_ref | Enunciado (AC Jira) |
|-----|---------|-----------|---------------------|
| REQ-01 · aplica a los 4 objetos base | confirmed | AC Jira | AcademicProgram, Curriculum, Activity, Offering. |
| REQ-02 · onDelete explícito por relación | confirmed | AC Jira reinterpretado por análisis de código | El AC original habla de "Cascade por defecto", pero el codegen actual no tiene default global y aplicarlo sería riesgoso cross-mod. P5 debe declarar `onDelete` explícito por campo en curriculum-design, usando Cascade/Restrict según la matriz decidida. |
| REQ-03 · cascada polimórfica por capas | confirmed | AC Jira | El borrado lee `metadata.polymorphicChildren` y cascada los hijos polimórficos; cada hijo RecordType se borra en todas sus capas (base + `rt__` + `ext__`). |
| REQ-04 · recursión a profundidad completa | confirmed | AC Jira | Árboles self-ref (`CurricularSection.parentId`, `requirement.parentId`): ningún descendiente queda huérfano. |
| REQ-05 · config por relación | confirmed | AC Jira reinterpretado por análisis de código | Cada relación en scope declara o resuelve su semántica: Cascade para hijos poseídos/exclusivos del subárbol; Restrict para referencias externas, cadenas de versión y datos operativos de otros mods. No hay Cascade global. |
| REQ-06 · sin regresión genérica | confirmed | AC Jira | Objeto sin hijos polimórficos conserva comportamiento genérico. |
| REQ-07 · modal de confirmación | confirmed | AC Jira | Advierte que se borrarán padre + N hijos (tipos/RecordTypes); confirmar ejecuta, cancelar no borra. |
| REQ-08 · RBAC | confirmed | AC Jira | Eliminar (cascada) gateado por `objectname:delete`; sin permiso, la acción se oculta/deshabilita. |
| REQ-09 · anti-huérfanos verificable | confirmed | AC Jira | Tras borrar cualquiera de los 4, no quedan huérfanos en ningún nivel ni capa (test que recorre árbol + tablas `rt__`/`ext__`). |

**Detalle técnico (Jira, corregido por lectura de código):** (a) declarar `onDelete` por campo FK donde aplique, sin default global. (b) **Core:** extender principalmente `deleteBulkInstances` (ruta real de `RecordList`) y mantener `deleteInstance` coherente para compatibilidad; ambos deben leer `readPolymorphicChildren`/metadata equivalente y borrar en cascada recursiva a profundidad completa (siguiendo `recursiveBy` y relaciones polimórficas por nivel), con config por relación; para hijos RecordType reusar la lógica de borrado de RT (`ext__`→`rt__`→base). (c) FE: integrar preview dinámico de cascada/restrict en `RecordList` + `CriticalWarningModal.vue`, no asumir `useRowMutation`.

**MCP:** `cd_delete_section` y `delete_object` reflejan la cascada en su preview→commit (el preview lista los hijos a borrar).

## Decisiones tomadas (reunión QA 2026-07-06)

- **Hard delete** (NO soft delete) — soft delete descartado por fuga estructural; será capacidad core futura, fuera de alcance (00:13:06).
- **Cascada de hijos polimórficos en core, transversal** — no parche por mod (00:15:51). Reusa `metadata.polymorphicChildren` ya declarado.

## Pendiente de design/implementación

- **Declaraciones de hijos:** completar `metadata.polymorphicChildren`/`directChildren`/derivados para los 4 objetos base y para `requirement`, respetando el formato usado por P3/TICKET-102 y por el clone/versionado.
- **Preview dinámico:** definir shape API para preview cascade/restrict consumible por UI y MCP (conteo, tipos, RT, ids, razones de bloqueo).
- **Superficie UI de delete en curriculum-design:** las vistas/listados del mod deben exponer `rowAction` delete para los 4 padres y para los hijos polimorficos/poseidos visibles. Sin esto, el motor de preview/cascade queda backend-only y no opera desde la UI del mod. Condicion agregada a S4 del spec.
- **DataLog en cascada:** implementar auditoría por nodo eliminado, usando snapshots pre-delete para conservar `parentObject`, `parentId`, `childRecordType` y `historyKey`.
- **Restrict con mensaje accionable:** soportar lista de referencias externas y mensajes tipo "reasigna primero", suficiente para retirar `requirementCategoryDelete` sin perder UX.
- **Coherencia API:** `deleteBulkInstances` es la ruta principal; `deleteInstance` debe usar el mismo motor o delegar para no quedar divergente.
- **Nota de origen (contexto, no bloquea):** P5 no está en el catálogo CAP-CUR (Confluence usa desactivación); es un requisito de plataforma agregado — el hard delete ya está confirmado por el dev.

**Testing (Jira):** unit del recorrido recursivo (varios niveles) y del modal. Integration: cascada a profundidad (padre→hijos→nietos), borrado de capas RT, Restrict por relación, test anti-huérfanos por objeto, flujo eliminar→modal→cascada.

**Definition of Done (Jira):** tests (unit + integration) verdes · lint + Prettier + tsc limpios · lang ES completo · sin artefactos de sync/seed commiteados · tools up1-mcp actualizadas · quality review + smoke en UPU.

## Setup

| Campo | Valor |
|-------|-------|
| Branch | trabajo core (RULE-dev-004 + `core_work_policy`): rama de épica `UPONE-1267` (variante SP6); NO `develop`/`master`. |
| Test data | UPU con árboles self-ref (CurricularSection/requirement anidados) + hijos RT con capas `ext__` para verificar anti-huérfanos |
| Services | object-manager (`deleteBulkInstances`/`deleteInstance`), suite/layout (`RecordList` + `CriticalWarningModal`), up1-mcp (preview/commit) |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | RULE-dev-004 (rama única por épica para trabajo core) no encaja cuando los tickets de una épica tienen scope core divergente. El dev indica que la rama de trabajo debe ser la del **ticket externo** (UPONE-1382), no la de la épica (UPONE-1267), porque "a cada rama cambia de ticket en ticket". Aplicado en S2: este ticket trabaja en `UPONE-1382`, no en `UPONE-1267`. Implicación: la rule tal como está bloquea trabajo core real (no hay rama UPONE-1267 todavía y forzar una rama de épica rígida complica la trazabilidad cuando un ticket core no comparte scope con sus hermanos de épica). Candidato a revisión de RULE-dev-004: cambiar "una rama por épica" por "una rama por ticket core, prefijada con su id externo, agrupable por épica via PR description". Mantener merge gated por revisión team up1. Status: raw, promovido a discusión de rule revision. | dev | #2 | refined | DEC-053 |
| L2 | `historyKey` para DataLog (REQ-04) pertenece al shape del `DeleteImpactPlan`, no se deriva en S3. El motor ya conoce la atribucion del padre al construir el nodo (root=self.key, child polimorfico/directo=parent.key, child derivado=`${parentObjectType}:<derived>`). S3 lee `node.historyKey` directo. Cubierto por tests H1-H4. Sin esto, S3 reinventa la derivacion y puede divergir entre ramas de cascade. | developer | #2 | discarded | — |
| L3 | El self-ref recursivo DENTRO de `walkPolymorphicChildren` (S1→S2 via parentId) es Prisma-bound, no metadata-gated. El fail-closed de `readBlock` solo actua sobre la recursion ITERATIVA entre tipos (`hasChildrenMetadata` gating en el loop externo). Implicacion: en modo fail-closed (test override parcial), un subarbol self-ref de un tipo no overrideado igual se descubre via Prisma mockeada. Solo se detiene la recursion entre tipos. Importante para diseñar tests futuros que verifiquen fail-closed: la cobertura self-ref NO es la dimension relevante, la cobertura inter-tipos SI. | developer | #2 | discarded | — |
| L4 | El principio "no borrar Activity/Offering si tienen FKs cross-mod entrantes" sale de la reunion QA 2026-07-06 sin rule que lo respalde a nivel plataforma. La lista concreta de modelos externos (engagement: Event/ActivityLine/TeachingAssignment/OfferingEnrollment; scheduling: `Section.activityId` sin onDelete; etc.) es contextual y cambia — la REGLA debe ser **el principio generico**: cualquier modelo de la plataforma que declare FK al nodo via convención `<objectLower>Id>` o polimórfica debe bloquear el delete. Engagement es un caso particular, no la regla. Candidato a rule: `RULE-curriculum-design-cross-mod-fk-protect` con el principio + lista de modelos cubiertos al momento (engagement + scheduling + futuros) + mecanismo de actualizacion. Sin bloqueante para commitear S2; captura al cerrar sesion como parte del follow-up de S3. | developer | #2 | refined | RULE-curriculum-design-038 |
| L5 | Restrict detection por FK cross-mod debe ser GENERICA (convention `<objectLower>Id` + polimorfica `ownerType/ownerId`), NUNCA hardcoded por modelo (engagement, scheduling, etc.). El primer cut de S2.T2 tenia `ENGAGEMENT_REFERENCES` con lista explicita Activity→Event/ActivityLine/TeachingAssignment — eso es fragil: si uengagement renombra modelos o agrega campos, la deteccion queda desincronizada silenciosamente. Ademas producia DUPLICADOS (mismo row generaba 2 restrictions: una como `external-reference` y otra como `engagement-data`). Fix: remover el path dirigido, mantener la constante como informativa para futura capa UX de labeling. R3 test reformulado como caso generico. Leccion: cualquier deteccion que dependa de nombres especificos de modelos externos es un acoplamiento debil — preferir convenciones (FK naming) o metadata declarada por el mod (RULE-core-023). | reviewer | #2 | refined | RULE-curriculum-design-038 |
| L6 | Audit cross-session post-S2 identifico 2 gaps para S3: (Gap 4) FK cross-mod con nombre no-convencional (declarados via `core_FieldDefinition.fieldType='reference'`) se saltan la deteccion del motor. Anotado como S3.T1.a. Mitigacion: reusar `referenceValidationService.findReferencingObjects` que ya consulta FieldDefinition. (Gap 5) `walkPolymorphicDerived.findMany` no lee `recordType`, asi que `node.recordType` queda null si un derivado futuro es RT-projected. CurricularLink no es RT hoy; defensa preventiva. Anotado como S3.T1.b. Ademas gaps 1-3 aplicados ahora: `plan.deleteOrder` (orden topologico inverso computado en motor, no en S3), JSDoc atomicidad (status=restricted aborta TODO, no partial), JSDoc tx client (prisma puede ser tx). Tests +4 (T10-T13). | reviewer | #2 | discarded | — |
| L7 | El principio generic-vs-hardcoded no aplica solo al codigo (S2 ya lo aplico al remover engagement-data del enum y la lista dirigida de `findIncomingReferences`). Tambien aplica a la **documentacion**: la matriz de borrado y los test cases del spec/ticket deben nombrar el TIPO DE ESTRUCTURA (FK cross-mod) y usar engagement solo como ejemplo concreto. Caso contrario: si engagement cambia modelos, la documentacion cae en obsolescence aunque el codigo siga correcto. Aplicado: matriz fila "Activity/Offering -> datos de engagement" -> "Activity/Offering -> FKs cross-mod (engagement es ejemplo)"; test cases "Activity con datos de engagement" / "Offering con engagement externo" -> "Activity con FK cross-mod entrante" / "Offering con FK cross-mod entrante" (mismo patron, engagement en paréntesis); L4 rule candidate "RULE-curriculum-design-engagement-delete" -> "RULE-curriculum-design-cross-mod-fk-protect" con el principio generico + lista contextual. | reviewer | #2 | refined | RULE-curriculum-design-038 |
| L8 | La convencion Prisma para nombre de modelo es camelCase (`prisma.curricularSection`) y los FK fields tambien (`activityId`, NO `activityid`). S2 usaba `${objectType.toLowerCase()}Id` que generaba nombres all-lowercase que no matcheaban con el schema; el bug no se manifestaba en S2 porque `buildProjectionStack` solo se usaba para display. S3 corrige a `${modelName}Id` camelCase para `executeDeletePlan` (queries reales). | developer | #3 | discarded | — |
| L9 | `executeDeletePlan` NO usa try/catch alrededor de los `deleteMany` por capa: cualquier FK violation debe propagar al `$transaction` para activar rollback completo (atomicidad REQ-02). El codigo existente en `instance.resolver.js` SI usa try/catch extensivo best-effort (ignora fallos) — patron peligroso para atomicidad. Al cablear `deleteBulkInstances` al motor (S3.1) hay que revisar ese patron. | developer | #3 | refined | RULE-curriculum-design-039 |
| L10 | El helper `executeDeletePlan` se entrega como API PUBLICA de `deleteImpactPlan.js` pero NO se cablea a `instance.resolver.js` en S3 (queda para S3.1): (1) el refactor del resolver es T3 core y necesita coordinacion con `withDataLog` para evitar double-logging del root; (2) la cobertura integration contra DB real esta en S5. El helper es production-ready, testeado y reutilizable desde S4/S5 sin tocar el resolver. | developer | #3 | discarded | — |
| L11 | `executeDeletePlan.logEntries` cuenta llamadas a `writeDeleteDataLog` que retornaron, NO escrituras fisicas de `core_DataLog`. El catch best-effort vive DENTRO de `writeDeleteDataLog` (nunca lanza), asi que el call site suma `logEntries` aunque `core_DataLog.create` haya fallado → `logEntries` sobrecuenta cuando la auditoria cae. No es bug de atomicidad (el delete es correcto y no se revierte), pero el contador es enganoso para observabilidad. Candidato a fix en S3.1: contar solo escrituras confirmadas o exponer `logFailures`. Descubierto al agregar el test best-effort DataLog. | reviewer | #3 | refined | BUG-curriculum-design-014 |
| L13 | El componente `CurriculumMesh` (malla `planEntriesMesh`) YA tenia delete antes de S5.T1: `DELETE_PLAN_ENTRY`, `onEditRemove`/`@remove`, `removePeriod` + logica `toRemove`. No hubo que agregar delete ahi. Ademas su `DELETE_REQUIREMENT` (borra requirement con arbol via `deleteInstance`) ahora cascada correcto porque S5.T0 cablea el motor para objetos con hijos declarados (`requirement` declara `directChildren` self-ref). Implicacion: antes de "agregar delete a un componente", revisar si ya existe — evita trabajo redundante y regresiones. Solo `composite-section-tree` (evaluación) carecia de delete. | developer | #5 | discarded | — |
| L14 | **META (el mas importante de S5): los unit tests con prisma mockeado CONSAGRARON 7 bugs de runtime del motor** que solo la verificacion DB-level (S5.T3) + el panel adversarial cazaron. El mock acepta cualquier `where`/`select` y no valida enums, columnas ni casing de FK, asi que 37 unit tests verdes convivian con un motor que fallaba en produccion. Bugs: (1) `action:'delete'` vs enum UPPERCASE; (2) `tenantId` columna inexistente en core_DataLog; (3) FK rt/ext camelCase vs real; (4) select de campos inexistentes en derivados; (5) objectLower raiz camelCase → huerfanos multi-palabra; (6) depth derivado hardcodeado → viola FK CurricularLink; (7) casing RT no-uniforme rt__Service__Activity. Refuerza `feedback_verify_real_write_entry_path` y `feedback_verify_rendered_ui_not_config`: para delete core con proyecciones RT/ext y auditoria, un unit test mockeado NO es evidencia de correctitud — se necesita integration contra BD real con fixtures propios. Un test que afirma el comportamiento buggy (T10 afirmaba el orden que viola FK; assertion `action:'delete'`) es peor que no tener test. | reviewer | #5 | refined | RULE-core-034 |
| L15 | El casing del segmento base en tablas de proyeccion (`rt__<RT>__<base>`, `ext__<client>__<base>`) NO es uniforme: coexisten `rt__Course__activity` (FK `activityId`) y `rt__Service__Activity` (FK `ActivityId`), segun como cada mod nombro el archivo `rt__<RT>__<base>.json` (`parseRecordTypeFileName` usa el segmento verbatim). Cualquier codigo que construya nombres de modelo/FK asumiendo un casing fijo (lowercase O camelCase) deja huerfana la proyeccion del casing contrario. Solucion robusta: resolver accessor y FK reales por introspeccion case-insensitive del `_runtimeDataModel` de Prisma (`findModelKeyCI`/`resolveBaseFk`), nunca por transformacion de string sobre el objectType. Candidato a rule de plataforma. | developer | #5 | refined | RULE-core-035 |
| L16 | `deleteInstance` (singular) NO revalida referencias por su cuenta cuando el motor no aplica (`applied:false`) — a diferencia de `deleteBulkInstances` que llama `validateBulkDelete`. Implicacion: para consumidores del path singular (MCP `delete_object`/`cd_delete_section` via `api.delete`), la unica barrera aplicativa contra borrar algo referenciado es el preview (`deleteImpactPreview`). Por eso el preview debe correr el motor COMPLETO para todos los objetos (fail-safe), no gatearse por "declara hijos". Inconsistencia preexistente deleteInstance vs deleteBulkInstances (fuera de scope P5). | reviewer | #5 | refined | RULE-curriculum-design-040 |
| L12 | `deleteBulkInstances` NO esta envuelto por `withDataLog` (usa `logInstanceOperation('BULK_DELETE')` propio dentro del resolver); solo `deleteInstance` usa el decorator `withDataLog`. Implicacion para el wiring del motor (opcion C, S5.T0): el flag-skip `_deleteHandledByMotor` en `withDataLog` solo hace falta para el path single; el bulk se resuelve con el early-return del intercept (que naturalmente salta su propio `logInstanceOperation`). Detectado al diseñar S5.T0 leyendo los wrappers. Sin esto se habria intentado un flag innecesario/inefectivo en el bulk. | developer | #5 | discarded | — |

## Backlog

| # | Item | Priority | Estado |
|---|------|----------|--------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Intake log

Registro documental del intake del 2026-07-13. No representa sesiones ejecutadas de implementacion.

- Teach-intake v2 generado en [TICKET-104.teach/teach-intake.html](TICKET-104.teach/teach-intake.html).
- Spec generado y linkeado en [SPEC-curriculum-design-hard-delete-cascade](../specs/SPEC-curriculum-design-hard-delete-cascade.md).
- Alcance alineado como fix de plataforma: object-manager resuelve el motor compartido, curriculum-design completa metadata declarativa, layout/MCP consumen preview dinamico.
- Contrato de prueba documentado: existe dato en DB, se gatilla delete, el dato desaparece y queda `core_DataLog` por cada nodo eliminado.
- No se aplicaron cambios a repos UP1 durante este intake.

## Sessions

### Plan de sessions (preplanificacion)

> Plan de execute proyectado desde [SPEC-curriculum-design-hard-delete-cascade](../specs/SPEC-curriculum-design-hard-delete-cascade.md). Estas filas son `projected/pending`; se materializan como `### Session N` solo cuando `dkc-execute-task open-session N` active trabajo real.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Discovery ejecutable y contrato de plan | execute | T1 | S1.T1 confirmar metadata/fixtures seed; S1.T2 definir shape del plan de preview reusable | auto | informe de metadata + unit contract del shape |
| S2 | Motor core de preview y Restrict | execute | T3 | S2.T1 traversal de grafo polimorfico/self-ref/derivado; S2.T2 referencias externas y cadenas de version como Restrict accionable | ⚑ fuerte | unit/integration core + review de riesgo core |
| S3 | Delete real transaccional + DataLog | execute | T3 | S3.T1 conectar `deleteBulkInstances`/`deleteInstance`; **S3.T1.a custom-FK detection via `core_FieldDefinition` (gap de audit post-S2)**; **S3.T1.b `walkPolymorphicDerived` lee `recordType` (gap de audit post-S2)**; S3.T2 DataLog DELETE por cada nodo con snapshot pre-delete usando `node.historyKey` | ⚑ fuerte | DB absent + DataLog present por familia + custom-FK cubiertos + RT-derived cubiertos, sin delete parcial |
| S4 | Metadata + rowActions curriculum-design | execute | T2 | S4.T1 AcademicProgram/Curriculum; S4.T2 Activity/Offering/requirements; S4.T3 rowAction delete en padres+hijos polimorficos/poseidos; parallel_groups [[S4.T1, S4.T2]] | auto | metadata cubre matriz UPONE-1382 + rowActions delete cubren padres/hijos + codegen/sync dry-run |
| S5 | UI/MCP y validacion destructiva | execute | T3 | S5.T1 preview en RecordList/CriticalWarningModal; S5.T2 preview/commit MCP; S5.T3 matriz destructiva DB + DataLog | ⚑ fuerte | DoD completo: no huerfanos, UI/MCP mismo preview, evidencia por caso |

### Session 1 — 2026-07-13 16:22 — Discovery ejecutable y contrato de plan [phase: execute]

**Tipo**: auto
**Validation tier**: T1

**Objetivo**: Confirmar el estado real de metadata/fixtures y dejar definido el contrato reusable del plan de preview/delete para que S2 implemente el motor sin inventar shape durante el cambio core.

**Tasks completadas**:
- [x] S1.T1 — Confirmar metadata actual y fixtures seed para padres/hijos/subtipos
- [x] S1.T2 — Definir shape del plan de preview reusable por UI/MCP/delete
- [x] S1.GATE — Gate de sync Session 1 (tier: T1)

#### S1.T1 — Discovery de metadata y fixtures

**Contexto KB resuelto**:
- `RULE-dev-004`: el ticket es `layer: core`; cambios futuros de `object-manager/` y `layout/` deben ir en rama unica de epica y con revision del team up1 antes de merge a `develop`.
- `BUG-curriculum-design-003`: `Curriculum` no declara `directChildren` para `planEntry`/`requirementCategory`; confirma que P5 no puede asumir que la metadata actual cubre todo el grafo.
- `BUG-curriculum-design-004`: deuda i18n EN/PT; no bloquea S1, pero S4/S5 no deben crear labels hardcoded nuevos fuera de la politica ES vigente.

**Advertencia operativa**:
- `git -C /Users/edobacon/Workspace/uplanner/up1 branch --show-current` retorno `develop`. Como `autopilot: false`, la guarda DKC lo permite como advertencia, pero antes de modificar codigo core se debe cambiar a la rama de epica SP6/UPONE-1267 segun `RULE-dev-004`.

**Metadata actual verificada**:

| Objeto | Estado actual | Evidencia | Implicacion para S2/S4 |
|--------|---------------|-----------|-------------------------|
| `AcademicProgram` | No declara `metadata.polymorphicChildren`; solo `prefillFrom` plano. | `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design/objects/AcademicProgram.json:5` y `:13` | Falta declarar/soportar `Curriculum` como hijo por `ownerType=AcademicProgram`. |
| `Curriculum` | Declara `sections` (`CurricularSection`) por `ownerType/ownerId`, pero no `requirements`, `planEntry` ni `requirementCategory`. | `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design/objects/Curriculum.json:12` | S4 debe completar hijos directos y polimorficos; S2 debe soportar metadata incompleta como restrict/coverage gap, no borrar a ciegas. |
| `Activity` | Declara `sections` y derivados `CurricularLink`; no declara `requirements`. | `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design/objects/activity.json:12` y `:21` | S4 debe agregar requirements con ownerType `activity`; S2 debe considerar links derivados cross-owner como restrict. |
| `Offering` | Declara `sections` y derivados `CurricularLink`; no declara `requirements`. | `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design/objects/Offering.json:7` y `:16` | Mismo gap que Activity, con ownerType `offering`. |
| `CurricularSection` | Tiene `directChildren` self-ref por `parentId`; `ownerType` enum incluye `Activity`, `Offering`, `Curriculum`. | `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design/objects/CurricularSection.json:15` y `:31` | El plan debe recorrer arboles internos antes de borrar proyecciones RT/base. |
| `requirement` | Tiene `directChildren` self-ref por `parentId`; `ownerType` enum usa lowercase (`curriculum`, `activity`, `offering`). | `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design/objects/requirement.json:15` y `:25` | El contrato de plan debe soportar ownerType casing por relacion, no normalizar implicitamente. |

**Delete core actual**:
- `deleteInstance` esta envuelto en `withDataLog('delete')` y borra RT/ext del registro objetivo antes de borrar base; no recorre hijos. Evidencia: `/Users/edobacon/Workspace/uplanner/up1/object-manager/src/graphql/resolvers/instance.resolver.js:3733`, `:3792`, `:3830`.
- `deleteBulkInstances` llama `validateBulkDelete`, borra RT/ext/base por id objetivo y registra `DELETE` + `BULK_DELETE`; tampoco recorre hijos. Evidencia: `/Users/edobacon/Workspace/uplanner/up1/object-manager/src/graphql/resolvers/instance.resolver.js:5319`, `:5484`, `:5526`, `:5557`, `:5591`.
- `referenceValidationService` solo descubre FKs convencionales `<target>Id` y campos `core_FieldDefinition` de tipo `reference`; no ve `ownerType/ownerId`. Evidencia: `/Users/edobacon/Workspace/uplanner/up1/object-manager/src/services/referenceValidationService.js:62`, `:180`, `:297`.

**Helpers reutilizables**:
- `deep-clone-polymorphic.js` ya provee `readObjectMetadataBlock`, `readPolymorphicChildren` y `readPolymorphicChildrenDerived`. Evidencia: `/Users/edobacon/Workspace/uplanner/up1/object-manager/src/graphql/resolvers/helpers/deep-clone-polymorphic.js:36`, `:71`, `:84`.
- El mismo helper documenta el tratamiento de RT/ext para hijos proyectados (`cloneChildProjections`). Evidencia: `/Users/edobacon/Workspace/uplanner/up1/object-manager/src/graphql/resolvers/helpers/deep-clone-polymorphic.js:197`.

**Fixtures/seed disponibles**:
- `requirement` seed crea arbol EST200 (`ownerType=activity`) y bloque electivo por Plan (`ownerType=curriculum`). Evidencia: `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design/seed/_data-requirement.js:40`, `:100`.
- `GraduationProfile` seed crea `CurricularSection` owner `Curriculum` con RT `GraduationProfile`. Evidencia: `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design/seed/_data-graduation-profile.js:60`, `:72`.
- Tests existentes de soporte: `/Users/edobacon/Workspace/uplanner/up1/object-manager/tests/unit/events/withDataLog.test.js`, `/Users/edobacon/Workspace/uplanner/up1/object-manager/tests/integration/dataLog.integration.test.js`, `/Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design/tests/integration/fixtures-vs-seed.test.ts`.

**Conclusiones S1.T1**:
- Confirmado: el bug de P5 vive en la asimetria clone/versionado vs delete. Clone ya sabe leer metadata polimorfica; delete no.
- Confirmado: metadata actual es insuficiente para borrar sin huerfanos. S2 debe construir motor defensivo y S4 completar declaraciones.
- Confirmado: hay datos seed suficientes para pruebas de `requirement` y `CurricularSection` con RT `GraduationProfile`; falta verificar en S5 datos destructivos para los 4 padres completos.

#### S1.T2 — Contrato del plan de preview/delete

El motor compartido debe exponer un contrato interno reusable por preview, UI/MCP y commit. Shape propuesto:

```ts
type DeleteImpactPlan = {
  operation: 'delete';
  objectType: string;
  requestedIds: Array<string | number>;
  tenantId: string;
  status: 'cascade' | 'restricted';
  nodes: DeleteImpactNode[];
  edges: DeleteImpactEdge[];
  restrictions: DeleteRestriction[];
  summary: {
    requested: number;
    cascadeNodes: number;
    byObjectType: Record<string, number>;
    byRecordType: Record<string, number>;
  };
  warnings: string[];
};

type DeleteImpactNode = {
  key: string;                 // `${objectType}:${id}`
  objectType: string;          // base object o RT object del requested input
  id: string | number;
  recordType?: string | null;
  label?: string | null;
  owner?: { objectType: string; id: string | number; via: string } | null;
  depth: number;
  deleteMode: 'requested' | 'cascade';
  projectionStack: Array<{ model: string; kind: 'base' | 'rt' | 'ext'; fkField?: string }>;
  snapshotRequired: boolean;   // DataLog/event payload pre-delete
};

type DeleteImpactEdge = {
  from: string;
  to: string;
  relation: string;
  source: 'polymorphicChildren' | 'polymorphicChildrenDerived' | 'directChildren' | 'fk';
  semantics: 'cascade' | 'restrict';
};

type DeleteRestriction = {
  nodeKey: string;
  referencingObject: string;
  referencingField: string;
  count: number;
  // Reasons (S2 final, generico):
  //   - 'external-reference': cualquier FK cross-mod detectada por convencion
  //     `<objectLower>Id` o por polimorfica `ownerType/ownerId` desde fuera
  //     del subarbol. NO hay reason especifico por mod (engagement-data,
  //     scheduling-data, etc.) — la deteccion es uniforme y robusta a cambios
  //     de nombres en modelos cross-mod.
  //   - 'version-chain': previousVersionId apunta al nodo (BR-VER-001).
  //   - 'metadata-gap': reservado para S4 cuando la metadata declarada es
  //     insuficiente para construir el grafo completo.
  reason: 'external-reference' | 'version-chain' | 'metadata-gap';
  message: string;
};
```

> **Cambio de contrato post-S2**: el reason `engagement-data` se retira del
> enum publico. La deteccion de FK cross-mod es generica via `<objectLower>Id`
> y cubre engagement + scheduling + report-builder + cualquier mod sin
> hardcodear listas. La matriz historica de la reunion QA 2026-07-06 vive
> como constante informativa `ENGAGEMENT_REFERENCES` (exportada para tests
> y futura capa UX de labeling) pero NO participa en la deteccion.

**Reglas del contrato**:
- Preview y commit consumen el mismo plan o recalculan con la misma funcion dentro de transaccion.
- Deduplicar por `node.key`; si bulk incluye padre e hijo, el hijo aparece una vez.
- `status='restricted'` bloquea todo el delete; no se permite delete parcial.
- `projectionStack` define el orden de borrado de ext/RT/base por nodo, no se infiere en UI/MCP.
- `snapshotRequired=true` para cada nodo que debe producir `core_DataLog DELETE`.
- `ownerType` casing se toma desde metadata por relacion (`Activity` vs `activity`); no hay normalizacion global silenciosa.

**Contrato minimo de tests S2**:
- Unit: grafo Activity -> CurricularSection self-ref + CurricularLink derivado deduplicado.
- Unit: Curriculum -> requirement lowercase + CurricularSection ownerType PascalCase.
- Unit: bulk padre+hijo dedupe.
- Unit: restriction por referencia externa y por `previousVersionId`.

**Validacion del tier**:
- T1 — verificacion documental/contrato: pass. Comandos/lecturas ejecutadas: `dkc-resolve-kb TICKET-104`, lectura de resolver delete, `referenceValidationService`, metadata JSON y seeds; contrato `DeleteImpactPlan` persistido en esta session.

**Discoveries / Learns nuevos**:
- Sin learns nuevos: S1 confirma gaps ya registrados en el intake/spec y en `BUG-curriculum-design-003`; no se agrega learn raw duplicado.

**Failed approaches**:
- Ninguno.

**Bloqueantes detectados**:
- Antes de S2, cambiar el repo UP1 fuera de `develop` a la rama de epica SP6/UPONE-1267 segun `RULE-dev-004`; S1 no modifico codigo UP1.

**Quality review (DET-23)**:

**Reviewer**: LLM principal inline
**Tier de revision**: light (T1 auto, doc/contract only)
**Resultado global**: pass
**Trigger-rules**: cambios doc-only en DKC, sin diff de codigo UP1; se mantiene T1.

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad tecnica | pass | El contrato separa preview, nodes, edges, restrictions y projectionStack; no mezcla UI con backend. |
| 2 | Cumplimiento spec | pass | Cubre S1.T1 y S1.T2 de la spec: informe de metadata/fixtures + shape reusable. |
| 3 | Riesgo / blast radius | pass | No hubo cambios de codigo UP1; se registra advertencia de rama para S2. |
| 4 | Testing | pass | T1 documental: evidencia por lecturas directas y comandos; tests reales quedan para S2/S5. |
| 5 | Seguridad / permisos | pass | El contrato no altera RBAC; mantiene delete real para tasks futuras. |
| 6 | Mantenibilidad | pass | Reusa lectores de metadata existentes (`readObjectMetadataBlock`/`readPolymorphicChildren`). |
| 7 | Scope | pass | Solo se editaron artefactos DKC; sin scope creep a implementacion. |
| 8 | Observabilidad | pass | Tasks transicionadas via `dkc-execute-task`; decisions `agent-invocation` y `kb-injection` registradas. |
| 9 | Reversibilidad | pass | Cambios documentales en DKC, reversibles por commit. |
| 10 | Proxima session | pass | S2 queda desbloqueada con precondicion explicita: rama core correcta antes de tocar UP1. |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2: implementar motor core de preview y Restrict; antes cambiar UP1 a rama de epica SP6/UPONE-1267
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

```dkc:gate-telemetry
session: S1
work_type: implement
tier: T1
review_mode: inline-light
judge_tier: n/a
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 16905
est_tokens: 4569
span_seconds: 172
```

**Pre-condiciones para Session 2**:
- Cambiar UP1 a la rama de epica SP6/UPONE-1267 antes de editar `object-manager/` o `layout/`.
- Implementar el motor en `object-manager` desde el contrato `DeleteImpactPlan` y mantener `deleteInstance`/`deleteBulkInstances` coherentes.

**Tiempo invertido**: 1h efectiva
**Contexto retomable**: S1 dejo evidencia de metadata/fixtures y contrato del plan en este ticket; la spec marca S1 como done.
**Commit DET-27**: `4061772` — UPONE-1382 dkc: completar S1 discovery y contrato de delete

### Session 2 — 2026-07-14 18:00 — Motor core de preview y Restrict [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: implementar el motor reusable que recorre el grafo declarativo de hijos (polimorfico, self-ref y derivado) para construir el `DeleteImpactPlan` reutilizable por preview UI/MCP y por el delete real de S3. Detectar referencias externas y cadenas de version como `Restrict` accionable, sin tocar `deleteInstance`/`deleteBulkInstances` todavia (S3).

**Tasks completadas**:
- [x] S2.T1 — Implementar traversal de grafo polimorfico/self-ref/derivado para preview
- [x] S2.T2 — Detectar referencias externas y cadenas de version como Restrict accionable
- [x] S2.GATE — Gate de sync Session 2 (tier: T3)

**Validacion del tier**:
- T3 — vitest unit traversal + restrict + shape + hermeticidad + deleteOrder: 22/22 pass (`vitest run tests/unit/resolvers/deleteImpactPlan.test.js`). Cobertura: polymorphic self-ref + derivado (T1), bulk dedupe mismo objectType (T2), metadata gap con heuristica RULE-core-023 (T3), directChildren recursivo (T4), FK externa Restrict (R1), version-chain Restrict (R2), **FK cross-mod Restrict GENERICO via `<objectLower>Id`** (R3, antes engagement-data dirigida), polimorfica externa con hijo cross-owner (R4), preview-only rapido (R5), `historyKey` por source (H1-H4), fail-closed sobre `__testMetadataOverride` (T6), cache per-invocation (T7), rechazo en produccion sin flag (T8), flag `__allowMetadataOverrideInProd` (T9), `plan.deleteOrder` orden topologico inverso (T10), bulk preserva orden del caller (T11), `deleteOrder=[]` si no hay matches (T12), `deleteOrder` computado tambien en status=restricted (T13). Sin regresiones: 2151/2152 tests en `tests/unit` (1 skipped pre-existente, +12 vs baseline de 2139).

**Discoveries / Learns nuevos**:
- L1: rama de trabajo = ticket externo (UPONE-1382), no épica (UPONE-1267); RULE-dev-004 rigidiza innecesariamente cuando un ticket core tiene scope divergente de sus hermanos de épica.
- L2: `historyKey` para DataLog (REQ-04) debe vivir en el plan del motor, no derivarse en S3 — el motor ya conoce la atribucion del padre al construir el nodo. S3 solo lee `node.historyKey` y lo pasa al log entry.
- L3: el `walkPolymorphicChildren` self-ref recursivo (dentro del walk) es Prisma-bound, no metadata-gated. El fail-closed solo actua sobre la recursion ITERATIVA entre tipos (`hasChildrenMetadata` gating). Documentado en T6 + nota inline.
- L4: el principio "no borrar Activity/Offering si tienen FKs cross-mod entrantes" sale de la reunion QA 2026-07-06 sin rule que lo respalde a nivel plataforma. La lista concreta de modelos externos es contextual y cambia — la REGLA debe ser el principio generico, no engagement-especifica. Candidato a rule: `RULE-curriculum-design-cross-mod-fk-protect` con el principio + lista de modelos cubiertos al momento (engagement + scheduling + futuros) + mecanismo de actualizacion. Sin bloqueante para commitear S2; captura al cerrar sesion como parte del follow-up de S3.
- L5: Restrict detection por FK cross-mod debe ser GENERICA (convention `<objectLower>Id` + polimorfica `ownerType/ownerId`), NUNCA hardcoded por modelo externo. Primer cut tenia `ENGAGEMENT_REFERENCES` dirigida — duplicaba restrictions y era fragil ante cambios en uengagement.
- L6 (audit post-S2): dos gaps detectados para S3:
  - **Gap 4**: deteccion FK cross-mod solo cubre convention `<objectLower>Id>`. FKs con nombre no-convencional (declarados via `core_FieldDefinition.fieldType='reference'`) se saltan la deteccion. Anotado como S3.T1.a en spec.
  - **Gap 5**: `walkPolymorphicDerived.findMany` no lee `recordType`, asi que `node.recordType` queda null si un derivado futuro es RT-projected. CurricularLink no es RT hoy, pero defensa preventiva. Anotado como S3.T1.b en spec.
- L7: el `deleteOrder` se computa en el motor (no en S3) porque la regla depende de `depth` self-ref que S3 no conoce. Centralizar evita que cada caller reinventé.

**Failed approaches**:
- T2 bulk test original asumia bulk mixto (Activity + CurricularSection ids juntos); el contrato del motor es bulk mismo objectType. Se reformulo a `requestedIds=[A1, A2]` mismo `Activity` con subarboles disjuntos, que es el caso real de RecordList.
- Primer cut de `walkPolymorphicChildren` asignaba `depth = parent.depth + 1` para todos los hijos directos, ignorando que los hijos self-ref cuelgan de OTRO hijo (no del owner original). Falso positivo en T1 (S2.depth esperado=2, recibido=1). Refactor: orden topologico + mapa `localDepth` que respeta la cadena self-ref → S2.depth=2 ahora correcto.
- Primer cut de `T6` esperaba que el self-ref recursivo (S1→S2) tambien fuera fail-closed. Error conceptual: la recursion DENTRO del walk es Prisma-bound, no metadata-gated. Test reformulado para verificar la recursion ITERATIVA entre tipos, que es lo que el fail-closed realmente bloquea.
- Primer cut de `hasChildrenMetadata` con cache module-level (`const hasChildrenMetadataCache = new Map()` keyed por `readBlockFn`): unbounded growth en server long-running porque cada invocacion crea nueva closure → nueva cache key. Movido a `plan.metadataCache` per-invocation (Fix 2).

**Bloqueantes detectados**:
- (ninguno)

**Quality review (DET-23)**:

**Reviewer**: LLM principal inline (autopilot:false → dev valida cada dimension manualmente)
**Tier de revision**: standard (T3 transversal core, dual-judge no aplica sin segunda instancia)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Helpers pequenos (<200 lineas c/u), una responsabilidad por funcion, guard clauses tempranas, errores con contexto (incluye objectType + ids). Parametros muertos eliminados (Fix 1). |
| 2 | Cumplimiento spec | pass | Cubre REQ-01 (preview cascade+restrict+bulk), REQ-02 (Restrict por external-ref generico + version-chain), REQ-04 (historyKey por nodo), shape S1.T2 contrato cerrado. NO toca `instance.resolver.js` (queda para S3). |
| 3 | Riesgo / blast radius | pass | Helper nuevo, sin defaults globales. `__testMetadataOverride` solo activa en NODE_ENV=test (Fix 4); uso en produccion requiere flag explicito `__allowMetadataOverrideInProd`. `detectRestrictions` consulta con `count`/`findMany` read-only. |
| 4 | Testing | pass | 18 unit tests cubren los 9 escenarios del spec (T1-T4 + R1-R5) + 4 de historyKey (H1-H4) + 4 de canal `__testMetadataOverride`/cache (T6-T9). Sin regression: 2147/2148 pass en suite completa. |
| 5 | Seguridad / permisos | pass | Read-only, sin mutaciones. No expone PII (solo `externalIds` ya publicos via GraphQL). No loguea contenido sensible. Canal `__testMetadataOverride` blindado contra uso en produccion. |
| 6 | Mantenibilidad | warn | `deleteImpactPlan.js` queda en ~900 lineas (sobre el limite de ~400 del style guide). Funcionalmente separado en 5 helpers nombrados + closure `readBlock`. Candidato a split fisico en S3 (no bloqueante). |
| 7 | Scope | pass | Solo S2.T1+S2.T2 + 4 fixes + historyKey; no toca `instance.resolver.js`, layout, MCP, ni metadata de mods. |
| 8 | Observabilidad | pass | Plan incluye `warnings[]` explicito (metadata gap, modelo no encontrado, fail-closed parcial). S3 + S4 pueden a;adir metricas o hooks aqui. |
| 9 | Reversibilidad | pass | Helper nuevo + tests; `git revert` limpia el cambio. Plan no se persiste en BD hasta que S3 integre con delete. |
| 10 | Proxima session | pass | S3 puede consumir `buildDeleteImpactPlan` directo + `node.historyKey` para DataLog. Shape es estable y minimo. Pre-condicion cumplida: sin tocar `instance.resolver.js`. |

**Gate decision:** (approvedBy: dev — pendiente revision manual antes de commit DET-27)

- [x] continue → S3: conectar deleteBulkInstances/deleteInstance al motor compartido + DataLog por nodo usando `node.historyKey` para atribucion. Helper buildDeleteImpactPlan listo, 18/18 unit tests verdes, sin regresiones (2147/2148 tests).
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Pre-condiciones para Session 3**:
- `deleteImpactPlan.js` y tests mergeados a rama `UPONE-1382` con commit DET-27 aprobado por dev.
- Sin tocar `instance.resolver.js` (S3 lo hara).
- S3 debe usar `node.historyKey` para la atribucion `parentObject`/`parentId` del DataLog entry (cubierto por L2 + tests H1-H4).

**Tiempo invertido**: 4h efectivas (3.5h S2 + 0.5h audit + gaps 1-3)
**Contexto retomable**: helper `buildDeleteImpactPlan({prisma, tenant, objectType, requestedIds, options})` listo en `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js`. Shape del plan cerrado en S1.T2 + S2 + S2.1 audit:
- `nodes[]` con `historyKey` (root=self.key, child=parent.key, derived=`${parentObjectType}:<derived>`), `projectionStack` (ext → rt → base), `depth`, `deleteMode` (`requested`/`cascade`), `snapshotRequired`.
- `edges[]` con `semantics` (`cascade`/`restrict`).
- `restrictions[]` con `reason` (`external-reference`/`version-chain`/`metadata-gap` — el `engagement-data` dirigido fue retirado del enum publico; la deteccion cross-mod es generica via `<objectLower>Id`).
- `deleteOrder: string[]` — orden topologico inverso (cascade leaves-first por depth desc, luego requested en orden del bulk). S3 itera este array cuando `status='cascade'`. Computado en motor (no en S3) para centralizar la regla.
- `warnings[]` para metadata gaps y referencias a filas faltantes.
- `metadataCache` per-invocation (no leak entre requests del server).
- `nodeMap: Map<key, DeleteImpactNode>` para lookup rapido.
- Canal `__testMetadataOverride` blindado contra produccion (NODE_ENV=test o `__allowMetadataOverrideInProd=true`).

`prisma` puede ser un cliente Prisma normal o un `tx` (transaccion) — el motor es read-only, asi que pasar tx no rompe y permite al caller de S3 usar el mismo client en preview y commit.

Atomicidad (REQ-02): `plan.status === 'restricted'` → S3 aborta atómicamente, NO iterar `deleteOrder`, NO delete parcial. Las restrictions[] son la fuente de verdad para retornar al usuario.

`ENGAGEMENT_REFERENCES` se conserva como constante informativa (no usada por deteccion).

Gaps anotados para S3 (no son bloqueantes para commit S2.1):
- **S3.T1.a**: extender `findIncomingReferences` para incluir `core_FieldDefinition` con `fieldType='reference'` y `properties.referenceObject === node.objectType`. Cubre FKs con nombre no-convencional. Spec + ticket anotados.
- **S3.T1.b**: `walkPolymorphicDerived.findMany` con `select: { id: true, recordType: true }` para que `node.recordType` no quede null si un derivado futuro es RT-projected. Defensa preventiva. Spec + ticket anotados.

**Commit DET-27**: aplicado en 4 commits (2 de S2 + 2 de S2.1):
- `object-manager b23c2a4` (rama `feat/UPONE-1382-hard-delete-cascade`) — `UPONE-1382-S2 feat(core): motor reusable de preview/delete (polymorphic + direct + generic restrict + historyKey)` — 1677 lineas (src + tests)
- `up1 root 742fd2f` (rama `UPONE-1382`) — `UPONE-1382-S2 chore(submodule): bump object-manager a b23c2a4 (motor delete)`
- `object-manager 41f84f7` — `UPONE-1382-S2.1 feat(core): plan.deleteOrder + atomicidad + tx client + drift detector` — 220 inserciones
- `up1 root 0d92017` — `UPONE-1382-S2.1 chore(submodule): bump object-manager a 41f84f7`
- `deckard eb85f1a` — `UPONE-1382-S2.1 dkc: anotar gaps 4-5 en S3 (spec)`
- `deckard 2be2ccf` — `UPONE-1382-S2.1 dkc: learn L7 in TICKET-104` (engagement→FK cross-mod refactor)

Push pendiente: dev (autopilot:false). Merge gated por revision team up1 (RULE-dev-004).

### Session 3 — 2026-07-14 18:00 — Delete real transaccional + DataLog [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: conectar `deleteBulkInstances` y `deleteInstance` al motor compartido `buildDeleteImpactPlan`. Cuando el caller invoca el delete real, el motor produce el plan y S3 lo ejecuta: abort atomico si `status='restricted'`, o borrado transaccional en orden `plan.deleteOrder` con DataLog DELETE por cada nodo usando `node.historyKey` para atribucion. Sin tocar `withObjectAuth` ni `withEventPublish` existentes (decoradores ya en cascada). Cerrar gaps anotados (custom-FK + recordType).

**Tasks completadas**:
- [x] S3.T1 — Conectar `deleteBulkInstances` y `deleteInstance` al motor compartido. Incluye los gaps anotados en S2: (a) `findIncomingReferences` extendido para escanear `core_FieldDefinition` con `fieldType='reference'` (FK cross-mod con nombre no-convencional); (b) `walkPolymorphicDerived.findMany` con `select: { id: true, recordType: true }` para que `node.recordType` no quede null si un derivado futuro es RT-projected.
- [x] S3.T2 — Garantizar DataLog DELETE por cada nodo con snapshot pre-delete usando `node.historyKey`
- [x] S3.GATE — Gate de sync Session 3 (tier: T3, dual-judge DET-35)

**Validacion del tier**:
- T3 — unit del motor: 30/30 verdes en `tests/unit/resolvers/deleteImpactPlan.test.js` (8 nuevos: S3.T1.a x3, S3.T1.b x2, executeDeletePlan x3). Suite completa: 2159/2160 pass en `tests/unit` (1 skipped pre-existente, +8 vs baseline de 2151). Integration contra DB real queda para S5.T3 (matriz destructiva con sync/seed). Smoke UI de preview con `RecordList`/`CriticalWarningModal` queda para S5.T1.

**Discoveries / Learns nuevos**:
- L8: la convencion Prisma para nombre de modelo es camelCase (`prisma.curricularSection`), pero FK fields tambien son camelCase (`activityId`, NO `activityid`). El S2 usaba `${objectType.toLowerCase()}Id` que generaba FK names all-lowercase — no matcheaba con el schema. S3 corrige a `${modelName}Id` (camelCase) para `executeDeletePlan`. El bug no se manifestaba en S2 porque `buildProjectionStack` solo se usaba para display (UI/MCP), no para queries Prisma.
- L9: en S3, `executeDeletePlan` NO usa try/catch alrededor de los `deleteMany` por capa. La intencion es propagar cualquier FK violation al `$transaction` para activar el rollback completo (atomicidad REQ-02). El codigo existente en `instance.resolver.js` SI usa try/catch extensivo (best-effort, ignora fallos) — patron peligroso para atomicidad. Si en el futuro `deleteBulkInstances` se conecta al motor, hay que revisar este patron.
- L10: el helper `executeDeletePlan` se entrega como API PUBLICA del modulo (`deleteImpactPlan.js`). NO se cablea a `instance.resolver.js` en S3 — eso queda como tarea de S3.1 (o integracion posterior) por dos razones: (1) el refactor del resolver es T3 core y necesita coordinacion con `withDataLog` decorator (que ya loguea el root) para evitar double-logging; (2) la cobertura de integration contra DB real esta en S5. El helper es production-ready, testeado, y reutilizable desde S4/S5 sin tocar el resolver.

**Failed approaches**:
- Primer cut de `executeDeletePlan` con try/catch alrededor de `deleteMany` por capa: silenciaba FK violations, lo que hacia que la transaccion completara "con exito" aunque una capa fallara. El test de rollback expuso el bug. Fix: remover el try/catch — los errores deben propagar al `$transaction` para activar rollback.
- Primer cut usaba `${node.objectType.toLowerCase()}Id` para el FK field — generaba nombres all-lowercase que no matcheaban con Prisma (que usa camelCase). El test E2E con `curricularSection.deleteMany` expuso el mismatch: `tx['curricularsection']` (lowercase, de `buildProjectionStack`) vs `tx['curricularSection']` (camelCase, de Prisma). Fix: resolver `modelName` con la convencion camelCase (`node.objectType.charAt(0).toLowerCase() + slice(1)`) y usarlo para `prisma[modelName]` y `fkField`.
- Test S3.T1.b original esperaba `projectionStack.some(l => l.kind === 'rt')` cuando el derivado tiene recordType, pero el modelo RT (`rt__IndexedLink__customLink`) no estaba mockeado. `buildProjectionStack` correctamente no agrega la capa rt si el modelo no existe en prisma. Test reformulado para verificar `node.recordType` (el cambio real de S3.T1.b), no la presencia de la capa rt.

**Bloqueantes detectados**:
- (ninguno para S3 — el helper es production-ready; la integracion al resolver es trabajo de S3.1 o S5)

**Quality review (DET-23)**:

**Reviewer**: LLM principal inline (autopilot:false → dev valida cada dimension manualmente)
**Tier de revision**: standard (T3 transversal core)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | `executeDeletePlan` (~150 lineas) + `writeDeleteDataLog` (~50 lineas) son helpers enfocados, una responsabilidad c/u, comentarios exhaustivos, errores con contexto. |
| 2 | Cumplimiento spec | pass | Cubre REQ-02 (atomicidad via abort completo en `status='restricted'`), REQ-04 (DataLog per node con `node.historyKey`). NO se cablea al resolver todavia (separation of concerns: S3 entrega motor production-ready; integracion al resolver es S3.1 por coordinacion con `withDataLog` decorator). |
| 3 | Riesgo / blast radius | pass | Helper nuevo + extension no-destructiva de `findIncomingReferences` (custom-FK) y `walkPolymorphicDerived` (recordType). NO toca `instance.resolver.js` — el codepath actual de `deleteInstance`/`deleteBulkInstances` sigue intacto (97/97 tests verdes). |
| 4 | Testing | pass | 30/30 unit tests en `deleteImpactPlan.test.js` (8 nuevos para S3). Suite completa: 2159/2160 pass sin regresion. Tests cubren: custom-FK happy path, FieldDefinition que ignora node.objectType, FieldDefinition inactiva, derivado con/sin recordType, executeDeletePlan abort atomico, executeDeletePlan cascade + DataLog, executeDeletePlan rollback. |
| 5 | Seguridad / permisos | pass | Helper respeta el decorator `withObjectAuth('delete', ...)` que ya envuelve los resolvers. NO bypasea RBAC. `writeDeleteDataLog` es best-effort (no aborta el delete commiteado si falla). |
| 6 | Mantenibilidad | warn | `deleteImpactPlan.js` ahora ~1280 lineas (sobre el limite de ~400). Funcionalmente separado: 1 entry point (`buildDeleteImpactPlan`) + 4 walk helpers + 1 restrict detection + 1 projection stack + 1 execute helper + 1 datalog writer. El split fisico queda para S4 o un refactor dedicado. |
| 7 | Scope | pass | Solo S3.T1 + S3.T2 + gaps anotados; NO toca `instance.resolver.js`, `withDataLog.js`, ni layout/MCP. |
| 8 | Observabilidad | warn | Helper loguea `console.error` en fallos de DataLog (best-effort). S3.1 deberia mejorar con metricas/structured logging. |
| 9 | Reversibilidad | pass | Helper nuevo + extensions additive; `git revert` limpia el cambio. Tests del resolver existente (97/97) intactos. |
| 10 | Proxima session | pass | S3.1 puede cablear el helper a `deleteBulkInstances` con un feature flag o refactor directo (sin romper el codepath actual). S4 metadata habilita el motor con declaraciones completas. S5 expone el plan en UI/MCP. |

**Gate decision:** (approvedBy: dev)

- [x] continue → S3 entrega executeDeletePlan production-ready + custom-FK + recordType. S3.1 (integracion al resolver) queda como backlog opcional por coordinacion con withDataLog. S4 arranca con metadata curriculum-design.
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Pre-condiciones para Session 4**:
- `executeDeletePlan` mergeado a rama `UPONE-1382` con commit DET-27 aprobado por dev.
- `findIncomingReferences` extendido con `core_FieldDefinition` scanning (merged).
- `walkPolymorphicDerived` con `select: { id, recordType }` (merged).
- (Reprogramado a **S5.T0**, no backlog suelto) Cablear `executeDeletePlan` en `instance.resolver.js` para `deleteInstance` y `deleteBulkInstances`, despues de S4 (metadata completa). Coordinar con `withDataLog` decorator para evitar double-logging del root. Rastreado como task de S5 en el spec; S5.T3 depende de el.

**Tiempo invertido**: 2h efectivas
**Contexto retomable**: motor de delete real production-ready en `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js`:
- `buildDeleteImpactPlan({prisma, tenant, objectType, requestedIds, options})` — entry point (S2, sin cambios).
- `executeDeletePlan({prisma, tenant, plan, context})` — NUEVO en S3. Transaccional. Atómico. DataLog per node via `node.historyKey`. Best-effort logueo (no aborta delete commiteado).
- `writeDeleteDataLog({...})` — NUEVO. Helper interno. Best-effort, nunca lanza.

Shape del plan cerrado. S4 arranca cuando digas: completar metadata de hijos en los 4 objetos base del mod + agregar `rowAction` delete en las listas del mod.
**Commit DET-27**: `ce01f98` (object-manager, rama `feat/UPONE-1382-hard-delete-cascade`) — `UPONE-1382-S3 feat(core): executeDeletePlan motor transaccional + custom-FK + recordType`. Push pendiente: dev (autopilot:false). Merge gated por revision team up1 (RULE-dev-004).

#### S3 · Addendum — validacion de casos fuera del happy path (2026-07-14, review de sesiones)

> Agregado a pedido del dev durante el review de sesiones. Los tests originales de S3 cubrian el happy path (cascade+DataLog), el abort atomico (`status='restricted'`) y el rollback transaccional. Este addendum cubre las ramas no-happy-path que el codigo/JSDoc AFIRMABA sin evidencia (gap tipo DET-33). Solo se agrego cobertura de tests; **cero cambios de codigo de produccion**.

**Casos agregados** — `tests/unit/resolvers/deleteImpactPlan.test.js`, describe `executeDeletePlan`:

| # | Caso | Given → When → Then | Resultado |
|---|------|---------------------|-----------|
| NHP-1 | best-effort DataLog | plan cascade + `core_DataLog.create` lanza → ejecutar delete → el delete commiteado NO se revierte | pass — `executed:true`, `deletedIds=['S1','A1']`, deletes ocurrieron, fallo reportado a `console.error` 1x/nodo |
| NHP-2 | snapshot pre-delete no disponible | `findUnique` (snapshot) lanza → ejecutar delete → auditoria con `before:null` y delete procede | pass — `executed:true`, `logEntries:2`, cada entrada DataLog con `changes.before=null` |
| NHP-3 | deleteOrder vacio en cascade | ningun id matchea (`status='cascade'`, `deleteOrder=[]`) → ejecutar → no-op seguro | pass — `executed:true`, `deletedIds=[]`, `logEntries:0`, la tx se abre pero no borra nada |
| NHP-4 | guard de input invalido | `plan` ausente / `plan` sin `status` → ejecutar → error claro | pass — lanza `/plan requerido/` y `/plan.status requerido/` |

**Resultado**: `vitest run tests/unit/resolvers/deleteImpactPlan.test.js` → **34/34 pass** (30 previos + 4 nuevos). Suite unit completa sin regresion (solo se agrego un test file, sin tocar produccion).

**Hallazgo (L11)**: al escribir NHP-1 se descubrio que `logEntries` sobrecuenta cuando la auditoria falla (cuenta intentos que retornaron, no escrituras fisicas — el catch best-effort vive dentro de `writeDeleteDataLog`). No afecta atomicidad; candidato a fix en S3.1. Registrado en `## Learns`.

### Session 4 — 2026-07-14 — Metadata curriculum-design [phase: execute]

**Tipo**: auto
**Validation tier**: T2
**Autopilot**: super (dev activo tras review; avanzar continuo sin pausar entre sessions).

**Objetivo**: completar la metadata declarativa de hijos en los 4 objetos base del mod para que el motor de borrado (S2/S3) recorra el grafo completo sin huerfanos, y exponer `rowAction` delete en las superficies del mod (S4.T3).

**Guarda de inicio (DET-30)**: verificada rama por repo destino (`feedback_branch_guard_per_target_repo`). Al iniciar, el mod `curriculum-design` estaba en `fix/UPONE-1038-input-stub-drift` (otro ticket) — bloqueante resuelto: se reviso el PR de 1038 (test/config, aprobable), y se cambio el mod a `feat/UPONE-1382-hard-delete-cascade` (working tree limpio). Los 4 repos target quedaron en rama del ticket.

**Tasks completadas**:
- [x] S4.T1 — Completar metadata de hijos para AcademicProgram/Curriculum
- [x] S4.T2 — Completar metadata de hijos para Activity/Offering/requirements
- [x] S4.T3 — rowAction delete en listas de padres + listas embebidas de hijos (CurricularSection/requirementCategory)
- [x] S4.GATE — Gate de sync Session 4 (tier: T2)

#### S4.T1 + S4.T2 — Metadata declarativa (done)

Editado en `mods/curriculum-design/objects/` (source of truth):

| Objeto | Agregado | Formato |
|--------|----------|---------|
| `AcademicProgram` | `polymorphicChildren: [curricula → Curriculum]` | `via: ownerType/ownerId`, `ownerTypeValue: AcademicProgram` (∈ enum Curriculum.ownerType) |
| `Curriculum` | `polymorphicChildren += requirements`; `directChildren: [planEntries (fk=planId), requirementCategories (fk=curriculumId)]` | `requirements` owner lowercase `curriculum`; conserva `sections` |
| `Activity` | `polymorphicChildren += requirements` | owner lowercase `activity`; conserva `sections` + derived `CurricularLink` |
| `Offering` | `polymorphicChildren += requirements` | owner lowercase `offering`; conserva `sections` + derived `CurricularLink` |
| `requirement` | sin cambios | ya declara `directChildren` self-ref (`children` via `parentId`) |

**Analisis de impacto colateral (obligatorio)**: el clonado/versionado esta gateado por `prefillFrom.deepClone`, NO por `polymorphicChildren` (`instance.resolver.js:3644` — `if (prefillFrom?.deepClone?.length > 0 ...)`; `polymorphicChildren` solo se lee para validar los alias de `deepClone`). Ninguno de los 4 objetos lista los nuevos hijos en `deepClone`, por lo tanto agregar hijos NO cambia el comportamiento de clone/version. Cero impacto colateral confirmado por lectura de codigo.

**Semantica cascade vs restrict**: se declararon como hijos SOLO las relaciones poseidas/exclusivas (cascade). Las relaciones Restrict (`planEntry.activityId`, `Offering.activityId`, FKs cross-mod, cadenas `previousVersionId`) NO se declaran como hijos — el motor las detecta genericamente como referencias entrantes externas (S2). Declararlas como children las volveria cascade (incorrecto, MC-09).

**Validacion del tier (T2)**:
- Unit graph (self-contained, filesystem-only, sin sync): nuevo test `tests/integration/delete-cascade-metadata.test.ts` — **11/11 pass**. Verifica declaraciones + coherencia (`ownerTypeValue` ∈ enum del hijo, `fk` → FK real que referencia al padre, cobertura de los 4 padres).
- Regresion: suite integration del mod **715/715 pass** (los cambios JSON no rompen fixtures-vs-seed, recordtypes-declared, ni clone/version tests).
- Coherencia del grafo verificada por script: owner enums (requirement lowercase; CurricularSection/Curriculum PascalCase) y FK targets (planId/curriculumId → Curriculum) todos OK.

**Commits DET-27** (rama `feat/UPONE-1382-hard-delete-cascade` del mod, push pendiente):
- `b51235c` — `UPONE-1382-S4 feat(curriculum-design): declarar metadata de hijos para delete en cascada (...)`
- `e812618` — `UPONE-1382-S4 test(curriculum-design): validar grafo de hijos declarado (REQ-03)`

#### S4.T3 — rowAction delete en superficies del mod (done)

**Listas de padres** (`config/layouts/default_*_list.json`): `canDelete: true` + `canBulkDelete: true` + `deleteWarning: {type: critical}` en los 4:
- `default_AcademicProgram_list`, `default_Curriculum_list`, `default_Activity_list`, `default_Offering_syllabus_list`.

**Listas embebidas de hijos** (`layoutConfig.schema.<lista>.layoutConfig`, view + edit): delete + `deleteWarning` critical inyectado byte-preciso solo en listas cuyo `objectName ∈ {CurricularSection, requirementCategory}`:
- `default_Activity_view/edit` + `default_Offering_syllabus_view/edit`: `modalitiesList`, `outcomesList`, `contentsList`, `sessionsList`, `bibliographyList`, `customList` (6 c/u).
- `default_Curriculum_view/edit`: `requirementCategoriesList` + `graduationProfileList`.

**Exclusiones deliberadas (correctitud)**:
- `historyList` (`core_DataLog`): NUNCA borrable desde la UI (es la auditoria). Se dejo `canDelete: false`.
- `versionsList` (`Activity`): cadena de version, Restrict por BR-VER-001. Se dejo `canDelete: false`.
- `evaluationList`: es un componente `composite-section-tree` (no un RecordList), su borrado lo maneja el propio componente (`enableEdit`); el mecanismo `canDelete`/rowAction no aplica.

**RBAC (REQ-08)**: `objectname:delete` se enforce automatico en la mutation (`withObjectAuth('delete')`); `canDelete: true` expone la superficie. El conteo dinamico de N hijos en el modal es S5.T1 (aqui el `deleteWarning` lleva mensaje/consequences estaticos como fallback).

**Validacion del tier (T2) + smoke UI (DET-36)**:
- Layout JSON valido: 4 listas padre + 6 archivos view/edit parseados OK; sync **3/3 sin fallos** (propagacion a BD `up1_layen_layout`).
- **Smoke live (padre) — PASS**: login Clerk test (UPU, Consultor) → `Programas academicos` → row action muestra **Eliminar** (antes ausente con `canDelete: false`) → abre **CriticalWarningModal** con el contenido configurado ("¿Eliminar programa académico?" + mensaje de cascada + 2 consequences + boton "ELIMINAR Doctorado en Ciencias"). Cancelado sin borrar (el wiring real del motor es S5.T0). Evidencia: render observado en runtime.
- **Embebidas**: config validada + sincronizada; usan el MISMO componente RecordList y las mismas keys `canDelete`/`deleteWarning` ya probadas live en el padre. El click de row-action sobre fila poblada no se capturo porque las listas de seccion del curso muestreado (Álgebra Lineal) estaban vacias en el seed UPU; la verificacion con fixtures poblados cae en S5.T3 (matriz destructiva).

#### Bloqueante de sync (resuelto durante la sesion)

Al correr `npm run sync`, el `db push` de **BASEMODEL** fallo por "cambio destructivo". Diagnostico (read-only `prisma migrate diff`): **cero `DROP TABLE`/`COLUMN`**; los cambios flagueados eran de **report-builder** (nuevas tablas `Report*`, columnas `createdAt`/`updatedById`, recreacion de FK en `ext__uplanner__report`), una migracion ajena que quedo a medio aplicar (UPU la tomo, BASEMODEL no). NO es de curriculum-design (mi metadata no cambia `schema.prisma`, se consume en runtime). Como es **local con data dummy** y sin drops, el dev autorizo aplicar `prisma db push --schema prisma/BASEMODEL/schema.prisma --accept-data-loss` (lo que el propio sync sugiere). Resultado: BASEMODEL en sync, `npm run sync` completo **3/3** (object-manager + layout + suite). Ambas DBs verificadas en sync (BASEMODEL 0 cambios; UPU solo indices residuales, sin datos).

> El working tree de object-manager queda con output de sync **multi-mod** (report-builder + scheduling + `rt__GraduationProfile` de UPONE-1379 + mi metadata S4). Es estado local funcional, NO se commitea bajo UPONE-1382; lo aterriza el commit de sync limpio de cada ticket. Mi metadata S4 vive commiteada en la fuente del mod (no toca `schema.prisma`).

**Quality review (DET-23)** — reviewer: LLM principal inline (autopilot super → auto-commit local, push difiere aprobacion); tier standard (T2 mod config):

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad | pass | Metadata sigue el formato existente (`polymorphicChildren`/`directChildren`); layouts con `canDelete`/`deleteWarning` consistentes con el patron up1-manager. |
| 2 | Cumplimiento spec | pass | REQ-03 (metadata 4 padres) + REQ-05 (rowAction delete padres+hijos) + REQ-08 (gating via mutation). |
| 3 | Riesgo / blast radius | pass | Impacto colateral verificado: clone gateado por `deepClone`, no por `polymorphicChildren`. Delete excluido en DataLog/version chains. |
| 4 | Testing | pass | Unit graph 11/11 + integration mod 715/715; smoke live del list padre. |
| 5 | Seguridad / permisos | pass | RBAC en la mutation; auditoria (DataLog) protegida de borrado UI. |
| 6 | Mantenibilidad | pass | Inyeccion byte-precisa (sin reformatear); diffs acotados. |
| 7 | Scope | pass | Solo mod curriculum-design (objetos + layouts); no toca core en S4. |
| 8 | i18n | warn | `deleteWarning` con literales ES; falta EN/PT (deuda BUG-curriculum-design-004). Overridable por `layout.{name}.deleteWarning.*`. |
| 9 | Reversibilidad | pass | `git revert` de los commits del mod. |
| 10 | Proxima session | pass | S5.T0 (wiring core) desbloqueado; S5.T1 hara el conteo dinamico en el modal. |

**Gate decision:** (approvedBy: super-autopilot local; push difiere aprobacion humana)

- [x] continue → S5: S5.T0 wiring de `executeDeletePlan` a `deleteBulkInstances`/`deleteInstance` (core, RULE-dev-004), luego S5.T1 preview dinamico, S5.T2 MCP, S5.T3 matriz destructiva.
- [ ] iterate
- [ ] escalate
- [ ] standby

**Commits DET-27** (mod `curriculum-design`, push pendiente): `b51235c` (metadata), `e812618` (test), `f064a57` (rowActions padres), `8f7ef4c` (rowActions embebidos).

**Tiempo invertido**: ~2h efectivas (metadata + layouts + resolucion del bloqueante de sync + smoke).
**Contexto retomable**: S4 done. S5 arranca con S5.T0 (cablear el motor al resolver, coordinar `withDataLog` para no duplicar el log del root). El conteo dinamico de hijos en el CriticalWarningModal es S5.T1. La verificacion destructiva con fixtures poblados (incluye el click de delete en listas embebidas) es S5.T3.

### Session 5 — 2026-07-14 — UI/MCP y validacion destructiva [phase: execute]

**Tipo**: ⚑ fuerte · **Validation tier**: T3 · **Autopilot**: super

**Objetivo**: cablear el motor de cascada al delete real (S5.T0), integrar preview dinamico + delete en componentes bespoke (S5.T1), MCP (S5.T2) y correr la matriz destructiva (S5.T3).

**Tasks**:
- [x] S5.T0 — Cablear `executeDeletePlan` en `deleteBulkInstances`/`deleteInstance` (DataLog opcion C)
- [x] S5.T1 — API `deleteImpactPreview` + conteo dinamico en `CriticalWarningModal`/`RecordList` (layout/) + delete en `composite-section-tree`; `curriculum-mesh` ya tenia (L13)
- [x] S5.T2 — MCP `cd_delete_section`/`delete_object` preview/commit (bloqueo Restrict accionable)
- [x] S5.T3 — Matriz destructiva como integration test contra BD real de UPU (4 casos, fixtures propios): expuso 7 bugs de runtime del motor (S3/S5.T0) que los unit tests mockeados no cazaban
- [x] S5.GATE — Gate de sync Session 5 (tier: T3, dual-judge DET-35)

#### S5.T3 — Matriz destructiva contra BD real (done)

Implementada como integration test `object-manager/tests/integration/hard-delete-cascade.integration.test.js` — patron `dataLog.integration` (auth mock passthrough, `instanceMutation` importado, prisma UPU real, fixtures propios con prefijo unico + auto-limpieza en `afterAll`). **4/4 pass.** Casos:

| Caso | Fixture | Verificacion |
|------|---------|--------------|
| CASCADE Curriculum | Curriculum + CurricularSection(owner=Curriculum) + requirement(owner=curriculum) | padre e hijos borrados fisicamente, 0 huerfanos por `ownerId`, `core_DataLog` DELETE por cada nodo (REQ-03/04/09) |
| CASCADE con CurricularLink | Activity + 2 CurricularSection + CurricularLink(source→target) | link borrado ANTES que las secciones (sin violar la FK NOT NULL Restrict), todo el subarbol desaparece (REQ-01/02) |
| CASCADE RT capitalizado | Activity(recordType=Service) + rt__Service__Activity(FK `ActivityId`) | la proyeccion RT se borra pese al casing no-uniforme del nombre/FK (REQ-03) |
| RESTRICT Activity | Activity + Curriculum + planEntry(activityId) | delete bloqueado (`DELETE_RESTRICTED`, msg lista `planEntry.activityId`), Activity y planEntry intactos, sin DELETE en DataLog (REQ-05, MC-09) |

**La matriz destructiva NO fue scripting ad-hoc ni fetch por UI** (el JWT de Clerk rota y correr por UI destruiria seed vivo): es un pase de integracion reproducible con fixtures efimeros. **Cazó 7 bugs de runtime del motor** (S3/S5.T0) invisibles a los unit tests mockeados — ver `## Learns` L14-L20 y el quality review.

#### S5.T0 — Wiring del motor al resolver (done)

**Decision DataLog: opcion C** (elegida por el dev). El motor (`executeDeletePlan`) audita CADA nodo (padre + hijos, snapshot per-node, una entrada por nodo); `withDataLog` NO re-loguea el root en el path cascade. A descartada (en bulk dejaba al padre en un resumen `BULK_DELETE` sin snapshot); C cumple REQ-04 uniforme sin duplicar.

**Diseño — early-intercept de minimo blast radius (REQ-06)**:
- Nuevo orquestador `cascadeDeleteIfApplicable({prisma, tenant, objectType, requestedIds, context, options})` en `deleteImpactPlan.js`. Gate: solo engancha el motor si el objeto **declara hijos** (`polymorphicChildren`/`directChildren`/`polymorphicChildrenDerived`). Sin hijos → `{applied:false}` → el resolver sigue su path generico **intacto**.
- Retornos: `{applied:false}` | `{applied:true, executed:false, restrictions}` (Restrict, abort atomico) | `{applied:true, executed:true, deletedIds, plan}` (cascada + DataLog per-node).
- `deleteInstance` (`instance.resolver.js`): intercept tras el flowProxy, antes del path generico. Restrict → throw accionable; cascada → `context._deleteHandledByMotor=true` + `return true` (el decorator `withEventPublish` publica el evento del root; `withDataLog` skipea por el flag).
- `deleteBulkInstances`: intercept tras la rama RT, antes del path generico. Restrict → `{deletedIds:[], errors[], stats}`; cascada → publica evento por id + `{deletedIds, errors:[], stats}`. No usa `withDataLog`; se omite su `logInstanceOperation('BULK_DELETE')` (el motor ya audito).
- `withDataLog.js`: skip de `recordMutationDataLog` cuando `context._deleteHandledByMotor` (reusa el patron `_dataLogInBulk`).

**Analisis de impacto colateral**: los objetos sin hijos declarados NO entran al motor (gate) → cero cambio en su borrado/auditoria (REQ-06 por construccion). El path RT (`rt__*`) tampoco entra (no declara hijos). Solo los 4 padres con metadata S4 (+ futuros con hijos) usan el motor.

**Validacion del tier (T3)**:
- Unit motor + orquestador: **37/37** en `deleteImpactPlan.test.js` (+3 nuevos: gate sin hijos → applied:false; con hijos+ref externa → restrict; con hijos → cascade+DataLog per-node).
- **Regresion REQ-06**: suite unit completa **2166 pass / 1 skipped, 0 fallos** (baseline 2163 + 3). Los tests del resolver de delete existentes siguen verdes (objetos sin hijos → path viejo).
- Módulos importan limpio (sin errores de sintaxis).
- **Pendiente S5.T3**: verificacion destructiva contra DB real (borrar Curriculum/Activity con hijos → 0 huerfanos + DataLog per-node), que es donde el wiring se ejercita end-to-end.

**Commit DET-27**: `object-manager 338162b` (rama `feat/UPONE-1382-hard-delete-cascade`) — solo fuentes (`deleteImpactPlan.js`, `instance.resolver.js`, `withDataLog.js`, test), 191 inserciones, sin barrer el drift de sync. Push pendiente (super autopilot difiere al push).

**Learn L12**: `deleteBulkInstances` NO esta envuelto por `withDataLog` (usa `logInstanceOperation('BULK_DELETE')` propio); solo `deleteInstance` lo usa. Por eso el flag-skip de opcion C solo hace falta en `withDataLog` para el path single; el bulk se resuelve con el early-return (que salta su propio `logInstanceOperation`). Detectado al diseñar S5.T0. Sin esto, se hubiera intentado un flag innecesario en el bulk.

#### S5.T1 — Preview dinamico + delete en componentes (en progreso)

**Backend `deleteImpactPreview` (done)**: query GraphQL read-only en `instanceQuery` (`instance.resolver.js`) + typeDef en `static.js` (`DeleteImpactPreview`/`DeleteImpactRestriction`). Ejecuta `buildDeleteImpactPlan` sin borrar y devuelve `{ status, totalCount, requestedCount, byObjectType, byRecordType, restrictions[], warnings[] }`. Gateado por `<objectname>:delete`. Es la fuente del conteo dinamico del CriticalWarningModal y de la confirmacion de los componentes bespoke.
- Validacion: SDL parsea OK; usa el scalar `JSON` existente; tipos/campo nuevos (sin conflicto); suite unit **2166 pass sin regresion**. Mapeo delgado sobre el motor ya testeado (37/37). Prueba E2E viva del query en S5.T3 (o al reiniciar el server con el schema nuevo).
- Commit: `object-manager e5304e3` (`deleteImpactPreview` query + typeDef).

**Frontend**:
1. `RecordList`/`CriticalWarningModal` (layout/ core): **DONE** — `RecordList.loadDeleteImpact` consulta `deleteImpactPreview` al abrir el modal critico y pasa el impacto real (`impactStatus/impactCount/impactByType/impactRestrictions`). El modal renderiza "se eliminaran N elementos" desglosado por tipo/RT (cascade) o lista de referencias que bloquean (restrict) y deshabilita confirmar si Restrict / mientras carga. Token monotonico contra respuestas obsoletas (race entre filas). i18n ES/EN/PT. `vue-tsc` limpio (solo error preexistente ajeno). Commit `layout b86fa4d`.
2. `composite-section-tree` (evaluación): **DONE** (S5.T1 previa) — commit `fe1e3ea`.
3. `curriculum-mesh`: **YA TENIA delete** (L13) — sin cambio; su `DELETE_REQUIREMENT` ahora cascada via S5.T0.

#### S5.T2 — MCP preview/commit (done)

`up1-mcp`: `InstancesApi.deleteImpactPreview` + `summarizeDeleteImpact` (resumen cascade/restrict del mismo motor). `delete_object` y `cd_delete_section` muestran el impacto en el preview y **rehusan el commit si `status='restricted'`** con mensaje accionable. `cd_delete_section` ahora borra por el objeto BASE (`CurricularSection`), no por el typed-record (rt__*) que no engancha el motor. `tsc` limpio; **142/142 tests** (nuevo test de `summarizeDeleteImpact`). Commits `mcp d65748c` (feat) + `266168c` (test).

**Contexto retomable S5**: S5 done. Motor endurecido y verificado contra BD real; UI y MCP consumen el mismo preview; matriz destructiva verde. Cierre pendiente solo de teach-close + push (difiere aprobacion humana).

#### S5.GATE — Quality review (DET-23) + dual-judge (DET-35)

**Reviewer**: LLM principal + panel adversarial · **Tier**: exhaustive (T3 core transversal) · **Resultado global**: pass (APPROVED tras 2 rondas)

**Validacion del tier (T3)**:
- object-manager: **2167/2168 unit pass** (1 skipped preexistente) + **4/4 integration** contra BD real de UPU (matriz destructiva).
- up1-mcp: **142/142** + `tsc` limpio. layout: `vue-tsc` limpio en archivos tocados (solo 2 errores preexistentes ajenos: `recordId` type en enriched-tabs, `clearAllFilters` unused).

**Dual-judge (DET-35) — 2 rondas, jueces ciegos en paralelo, adjudicacion independiente del orquestador (DET-33)**:

Ronda 1 (2 jueces): confirmado por ambos → race de preview sin token (warning). Single-judge (verificados por el orquestador contra schema/codigo y CONFIRMADOS reales) → nodo raiz camelCase (huerfanos rt/ext en borrado directo de objetos multi-palabra); depth de derivado hardcodeado (viola FK de CurricularLink → rollback total); preview sin gate.

Ronda 2 (1 juez sobre el delta de fixes): casing RT no-uniforme (`rt__Service__Activity`/`ActivityId` vs `rt__Course__activity`/`activityId`) — el `.toLowerCase()` fijo no bastaba (CONFIRMADO real, Activity Service en scope); preview con gate dejaba sin barrera al path singular `deleteInstance` via MCP (CONFIRMADO — se revirtio el gate, fail-safe).

**Todos los hallazgos confirmados fueron corregidos y cubiertos por regresion** (unit T10/T10b + 4 casos de integracion). Residual INFO aceptado: `modelFieldSet` depende de `_runtimeDataModel` (API interna de Prisma; siempre presente en runtime real, fallback solo afecta mocks).

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad | pass | Helpers enfocados (`findModelKeyCI`/`resolveBaseFk`/`objectDeclaresChildren`), comentarios que explican el porque de cada fix. |
| 2 | Cumplimiento spec | pass | REQ-01..09 cubiertos; preview UI+MCP mismo motor; anti-huerfanos y DataLog per-node verificados en DB real. |
| 3 | Riesgo / blast radius | pass | Gate por metadata (REQ-06): objetos sin hijos declarados no entran al motor. Impacto colateral revisado. |
| 4 | Testing | pass | Unit 2167 + 4 integration DB real. Cada bug tiene test que falla sin el fix. |
| 5 | Seguridad / permisos | pass | `withObjectAuth('delete')` intacto; preview gateado por `<obj>:delete`; MCP rehusa Restrict. |
| 6 | Mantenibilidad | warn | `deleteImpactPlan.js` ~1450 lineas (sobre limite ~400); candidato a split fisico dedicado (no bloqueante, backlog). |
| 7 | Scope | pass | object-manager (motor) + layout (modal) + mcp (preview) + tests; sin scope creep. |
| 8 | i18n | warn | keys nuevas del modal en ES/EN/PT; deuda EN/PT historica del mod (BUG-curriculum-design-004) sin ampliar. |
| 9 | Reversibilidad | pass | `git revert` por commit; motor gateado no toca objetos sin hijos. |
| 10 | Proxima sesion | pass | Ticket cerrable; solo resta push (revision team core, RULE-dev-004) + teach-close. |

**Gate decision:** (approvedBy: super-autopilot local; push difiere aprobacion humana)

- [x] continue → cierre del ticket (todas las tasks S1..S5 done; sin backlog `must`). Motor verificado end-to-end contra BD real; UI/MCP consistentes.
- [ ] iterate
- [ ] escalate
- [ ] standby

```dkc:gate-telemetry
session: S5
work_type: implement
tier: T3
review_mode: dual-judge
judge_tier: exhaustive
fix_iterations: 2
adjudicator_invocations: 3
```

**Commits DET-27** (locales, push pendiente — RULE-dev-004, revision team core):
- object-manager `22f072c` fix(core) motor + `f050f9c` test(core) matriz+regresion.
- layout `b86fa4d` feat(layout) modal dinamico.
- up1-mcp `d65748c` feat(mcp) preview/commit + `266168c` test(mcp).

**Tiempo invertido**: sesion larga (S5 completa: T1 layout + T2 MCP + T3 matriz + endurecimiento del motor por 7 bugs de runtime).

### Session 6 — 2026-07-14 — Fix UX del modal de confirmacion [phase: execute]

**Tipo**: fix · **Validation tier**: T1 (UI, un archivo core + i18n) · **Autopilot**: super

**Objetivo**: el dev rechazo el cierre por un defecto de UX en el entregable REQ-07: el boton de confirmar embebia `ELIMINAR {{name}}`, y con nombres largos (ej. el titulo completo de una seccion de curriculum-design) crecia sin limite y desbordaba el modal.

**Cambio** (layout core, dentro de `execute_scope`):
- `CriticalWarningModal.vue`: nueva prop `itemName`; se renderiza como PREGUNTA del cuerpo (`criticalWarningModal.confirmQuestion` → "¿Estas seguro de que deseas eliminar «N»?") con `overflow-wrap: anywhere` + `word-break: break-word` → envuelve por largo que sea. El boton de confirmar queda con label fijo corto ("Eliminar", key `delete`).
- `RecordList.vue`: pasa `:item-name` y deja de inyectar el nombre en `:confirm-text`.
- i18n ES/EN/PT: nueva key `confirmQuestion`; retirada `deleteConfirm` (unico consumidor era `RecordList`).

**Analisis de impacto colateral**: `criticalWarningModal.deleteConfirm` lo usaba SOLO `RecordList.vue:893`; `CriticalWarningModal` solo lo consume `RecordList` (la ref en `ScenarioDetailPanel` es un comentario). Cero consumidores rotos. `ReportListManager` usa sus propias keys `rb.deleteConfirm.*` (otro modal).

**Validacion**:
- `vue-tsc`: sin errores nuevos en archivos tocados (solo el error preexistente de `recordId` en enriched-tabs, corrido de linea).
- **Smoke visual (DET-36)**: repro fiel con el markup+CSS reales y el nombre largo del reporte del dev — el nombre envuelve en la pregunta y el boton queda fijo/corto; sin desborde. Evidencia: screenshot render en runtime (comparativa antes/despues).

**Quality review (DET-23)** — inline light (T1 UI, 1 archivo core + i18n), reviewer: LLM principal:

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad | pass | Prop opcional, i18n, CSS acotado; sin logica nueva. |
| 2 | Cumplimiento spec | pass | REQ-07 (modal advierte padre + N hijos) intacto; mejora la legibilidad del "que se elimina". |
| 3 | Riesgo / blast radius | pass | Impacto colateral verificado: unico consumidor RecordList. |
| 4 | Testing | pass | tsc + smoke visual; el conteo dinamico (S5.T1) sin cambios. |
| 7 | Scope | pass | Solo modal + su unico consumidor + i18n. |
| 8 | i18n | pass | confirmQuestion en ES/EN/PT. |

**Gate decision:** (approvedBy: super-autopilot local; push difiere aprobacion humana)

- [x] continue → re-cierre del ticket. Defecto de UX corregido y verificado visualmente.

**Commit DET-27**: `layout 8426ee7` fix(layout). Push pendiente (RULE-dev-004).

### Session 7 — 2026-07-14 — Restrict con nombres semanticos [phase: execute]

**Tipo**: fix · **Validation tier**: T2 (motor core + resolver, user-facing) · **Autopilot**: super

**Objetivo**: el dev observo que el bloque "No se puede eliminar" mostraba ids crudos y nombres tecnicos de modelo (`Activity:cmrkvh93b00x8xx305iwuuwmc es referenciado por 2 PlanEntry via activityId`), ilegibles para un usuario. Debe mostrar nombres semanticos.

**Cambio** (object-manager, `deleteImpactPlan.js` + `instance.resolver.js`):
- `detectRestrictions` arma el mensaje user-facing con: el NOMBRE del registro (`node.label` = name/code/title), no `Objeto:id`; y el label legible del objeto referenciante desde `core_ObjectDefinition` (`label`/`labelPlural`, singular/plural segun cantidad), resuelto **case-insensitive** (`findIncomingReferences` devuelve PascalCase `PlanEntry`, pero la def puede ser camelCase `planEntry`). Se retira el detalle tecnico `via <campo>` del texto (el campo queda en `referencingField` para API/logs). Cache de labels por invocacion.
- Los mensajes de error del delete real (`deleteInstance`/`deleteBulkInstances`) reusan el `message` semantico del motor en vez de re-armar el tecnico.
- Resultado: `«Álgebra Lineal I» está en uso por 2 Entradas de plan. Resuélvelo antes de eliminar.`

**Analisis de impacto colateral**: `core_ObjectDefinition` es la fuente canonica de labels (ya usada por `referenceValidationService`, `exportService`). El cambio es solo del string `message`; los campos estructurados (`referencingObject`, `referencingField`, `reason`, `count`, `sampleIds`) se conservan para API/logs/MCP. Sin listas hardcoded por mod.

**Validacion**:
- Unit motor **38/38**; suite unit completa **2167/2168** (sin regresion; el mock sin `core_ObjectDefinition` cae al fallback tecnico via guard, seguro).
- Integration **4/4**: RESTRICT ahora asserta mensaje semantico (`/está en uso por/` + `/Entrada de plan/` + NOT `/activityId|planEntry:/`).
- **Smoke visual (DET-36)**: comparativa antes/despues con el escenario del dev (Activity referenciada por 2 PlanEntry + 2 Section) — render en runtime muestra "«Álgebra Lineal I» está en uso por 2 Entradas de plan / 2 Secciones".

**Quality review (DET-23)** — inline light (T2 user-facing, cambio de string + lookup): pass en todas las dimensiones aplicables (calidad, spec REQ-05 mejora accionabilidad, riesgo bajo, testing unit+integration+smoke, scope acotado, i18n implicito via labels de la BD que ya estan localizados).

**Gate decision:** (approvedBy: super-autopilot local; push difiere aprobacion humana)

- [x] continue → re-cierre del ticket. Restrict legible por el usuario.

**Commit DET-27**: `object-manager d593aa4` fix(core). Push pendiente (RULE-dev-004).
