---
id: DOC-kb-sp8-activityline-opcion-a-verificacion-codigo
project: up1
type: doc
---

# Opción A (extender ActivityLine): verificación contra código

> Verificación del blast radius de la **opción A** del análisis de modelado de la actividad de curso
> (`sp7/activity-activityline-modeling-analysis.html`). Contrasta cada afirmación del análisis contra
> el código real de los mods `curriculum-design`, `academic-scheduling` y `uengagement-up1`, más el
> motor de versionado en `object-manager` (core).
>
> **Esquema evaluado:** `ActivityLine` pasa de vínculo neutro Activity↔OrgUnit a **portadora de la
> variante de curso** (RecordType con tipo de actividad, tipo de sala, modalidad, cupo, alcance por
> `Shift`/`Instructor`), y `Section` se re-ancla a la línea-variante para alinear con `Offering`.
>
> **Fecha:** 2026-08-04 · **Base:** código verificado en `uplanner/up1/mods/*` y `object-manager`.

## Veredicto general

El análisis de sp7 es **direccionalmente correcto** (no rompe la malla, es viable), pero la
verificación arroja tres hallazgos que suben el costo real por encima de "un fix del `findFirst`".

## Hallazgos nuevos (no estaban en el análisis)

### H1. El overload de ActivityLine entre mods ya existe en producción, hoy
`curriculum-design` ya crea filas `ActivityLine` con el mismo patrón que engagement:
- `curriculum-design/logic/syllabus-offering.resolver.js:39-72` (`resolveActivityLineId`)
- `uengagement-up1/logic/offering-create.resolver.js:37-70` (mismo patrón, casi idéntico)

Hoy la tabla es neutra (solo `activityId/orgUnitId/code/status`), así que el overload no molesta. El
esquema nuevo no crea el problema de objeto compartido: lo **activa**. Consecuencia directa: cualquier
campo nuevo `not_null` **sin** `static_default` que se agregue a ActivityLine **rompe los dos creates
a la vez**.

### H2. El deep-clone al versionar es estructuralmente imposible hoy, y el motor está en CORE
- `curriculum-design/objects/activity.json:35-38` declara `deepClone: ["sections"]`; `ActivityLine`
  ni siquiera es `polymorphicChild` de Activity (es FK plana `ActivityLine.activityId → Activity`).
- El clonado lo maneja un motor genérico en `object-manager`
  (`src/graphql/resolvers/helpers/deep-clone-polymorphic.js`), que solo clona lo declarado en
  `polymorphicChildren`.

Si ActivityLine porta la variante, **cada v2 de un curso nace sin variantes** y el resolver crea una
genérica, rompiendo el linaje v1→v2. Arreglarlo obliga a **tocar core** (declarar ActivityLine como
polymorphicChild deep-clonable, o un hook ad-hoc). El análisis lo pintaba como trabajo aislado de cd;
en realidad cruza a core.

### H3. Ya existe el patrón exacto para separar los dos usos sin romper engagement
`curriculum-design/objects/Offering.json:24-30` resuelve el mismo problema en el objeto hermano:
`recordType` con enum `[ServiceOffer, Syllabus]`, `not_null` + `static_default` (backfill sin romper),
**fuera de `required`** (no fuerza formularios genéricos), espejo de `Activity.recordType`. La
advertencia del análisis sobre "administrar el recordType explícitamente" tiene plantilla probada; se
replica sobre ActivityLine, no se inventa.

## Lo que se rompe (breaks duros)

| Qué | Dónde | Por qué |
|---|---|---|
| `resolveActivityLineId` | `cd/logic/syllabus-offering.resolver.js:39-72` | "La primera línea" deja de ser correcto. El mutation solo acepta `activityId` (`:91-96`); no hay selector de variante ni en el resolver ni en `config/layouts/default_Offering_syllabus_create.json:18-23`. El auto-create `AL-{code}` no puede satisfacer campos de variante. |
| Resolver gemelo en engagement | `uengagement-up1/logic/offering-create.resolver.js:37-70` | Mismo patrón, mismo problema. |
| Versionado (linaje variante↔versión) | core `deep-clone-polymorphic.js` + `cd/objects/activity.json:35` | Ver H2. |
| Definición base de ActivityLine | `uengagement-up1/objects/ActivityLine.json:13-46` | Cambia el propósito del objeto compartido. |

## Lo que es rework (no rompe, pero hay que rehacer + migrar datos)

- **Re-anclar Section** (`academic-scheduling/objects/Section.json:46`): FK `activityId → Activity` a
  `activityLineId`. Unicidad `[activityId, termId, code]` (`Section.json:10`) y el generador de `code`
  (`section-create.resolver.js:31-43`, `nextSeq` agrupa por activityId+termId) pasan a agrupar por
  `activityLineId`. Rework bajo-medio + **migración de datos** (dedupe si dos secciones del mismo curso
  en distintas líneas colisionaban en `code`).
- **Eligibilidad docente**: `academic-scheduling/logic/assign-instructor.resolver.js` (5 puntos:
  ~122-129, 203-211, 323-328, 452-461, 592-611) hace `activityId = section.activityId` directo; con
  Section en la línea necesita join `section→activityLine→activity`. **Decisión de producto pendiente:**
  eligibilidad por curso o por variante. Si es por variante, `InstructorCourseAssignment` (constraint
  `[instructorId, activityId]`, `InstructorCourseAssignment.json:10`) también se re-ancla.
- **Cobertura**: es un `GROUP BY` en memoria (`Map`), en
  `academic-scheduling/logic/schedule/summaryAggregates.js:194-206` (**no** `:165-181` como decía el
  análisis; esas líneas son `computeInstructorLoads`). Agrupar por variante fragmenta la stat-card
  "cobertura por curso" en N filas: decisión de UX.
- **Layouts**: `default_Offering_syllabus_{view,edit,list}.json` (muestran la línea 1:1 de solo lectura)
  y los layouts genéricos de ActivityLine en engagement (hardcodean copy "servicio").

## Lo que queda intacto (confirmado)

- **Malla** (`modsComponents/CurriculumMesh/CurriculumMeshElement.vue`), **prerrequisitos**
  (`usePrereqRequirements.ts` / `listPrereqs`) y **requisitos**
  (`logic/helpers/requirementActivityGuard.js:59`) operan sobre `Activity` / `planEntry.activityId`,
  no sobre ActivityLine. No se tocan.
- **Cadena `formTemplate`** de feedback en engagement
  (`uengagement-up1/logic/feedback-request.resolver.js:118-141`): intacta, siempre que `formTemplateId`
  siga viviendo en `Activity`.

## Correcciones a los números del análisis sp7

| Afirmación sp7 | Real verificado |
|---|---|
| cd `activityId` = 37 (logic 20 / modsComponents 11 / config 6) | logic **47** ocurrencias; config **8**; modsComponents "11" coincide **por archivo**, no por ocurrencia. Clasificación cualitativa (casi todo intacto) correcta. |
| scheduling `activityId` = 71 en 15 archivos | Los 3 números puntuales (assign-instructor **19**, section-create **12**, summaryAggregates **7**) coinciden exactos. Agregado no reproduce: **76 en 11** archivos de producción (132 con tests/seeds). Omitió `calendarAggregates.js` (**15** refs). |
| engagement ActivityLine = 107 líneas / 17 archivos | **17 archivos** confirmado; "107 líneas" no reproducible (**66** real). |
| Section constraint `recordType=Course` | Es **solo documental** (`Section.json:9,50`); no hay guard en `section-create.resolver.js`. "Romper el constraint" no es riesgo real. |

## Decisiones de producto pendientes antes de codear

1. **Colisión `Section.orgUnitId` vs `ActivityLine.orgUnitId`**: Section ya tiene `orgUnitId`
   (`Section.json:64-72`). Si cuelga de ActivityLine (que también lo tiene), quedan dos caminos a la
   unidad organizacional. Definir cuál manda.
2. **Eligibilidad y cobertura**: ¿por curso o por variante? Determina si `InstructorCourseAssignment`
   y `summaryAggregates` se re-anclan o solo agregan un join.
3. **Grano del sílabo**: la unicidad del `Offering` scoped `(activityLineId, termId, code)`
   (`syllabus-offering.resolver.js:115-118`) pasa de "un sílabo por asignatura y período" a "un sílabo
   por variante y período" sin cambiar una línea. ¿El sílabo documenta el curso completo o la variante?

## Riesgo abierto no verificable en el repo

`uengagement-up1/.ai/CONTEXT.md:99-104` describe un flow n8n **FLOW-11** que recalcula
`Activity.operationalStatus` al cambiar una línea (nombre legacy `ServiceLine`, canal
`*/ServiceLine/upOne-Engagement:*`). No hay archivos de evento `serviceline-*`/`activityline-*` en
`uengagement-up1/events/` (la doc está desactualizada). Como cd **ya crea líneas de Course hoy** (H1),
si ese flow no filtra por `recordType=Service` podría estar disparándose sobre cursos. **Verificar
directamente en n8n.**

## Conclusión

El esquema es viable y no rompe la malla. El costo real: **4 breaks duros** (dos resolvers gemelos,
versionado en core, definición del objeto base), **rework con migración de datos** en scheduling, y
**tres decisiones de producto** pendientes. Lo más caro y menos visible es el **versionado en core** y
el **overload ya activo** entre cd y engagement.
