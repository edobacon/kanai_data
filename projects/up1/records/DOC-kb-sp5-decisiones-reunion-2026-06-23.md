---
id: DOC-kb-sp5-decisiones-reunion-2026-06-23
project: up1
type: doc
---

# Decisiones de la reunión de inicio — SP5 (Malla curricular)

> **Fuente:** transcripción `sources/reunion-inicio-sprint_2026-06-23.pdf` (Notes by Gemini).
> **Fecha:** 2026-06-23 · **Asistentes:** Esteban Cortés Sandoval (producto/modelado), Eduardo Bacon (desarrollo).
> Este documento destila las decisiones accionables de la reunión, con el timestamp donde se discutió cada una. Es complemento del handoff `sources/historias-malla_v1.md` y del `mockup_v10.html`.

---

## 1. Alcance del sprint (cierre acordado)

| Decisión | Detalle | TS |
|---|---|---|
| **Solo planes secuenciales** | La malla del MVP se restringe **estrictamente** a planes de tipo secuencial (con períodos). Los planes modulares quedan fuera, salvo que la capacidad sobre del sprint. | `00:00:00` · `00:55:49` |
| **Sin motor de ejecución** | Solo se **modela y persiste** `requirement`; nada de degree-audit ni evaluación en vivo del avance del estudiante. | doc §1 |
| **3 objetos nuevos** | `planEntry`, `requirementCategory`, `requirement`. | `00:00:00` |

## 2. Modelado de objetos

| Decisión | Detalle | TS |
|---|---|---|
| **`requirement` con RecordTypes** | El concepto de requisito se modela con record types. En esta primera carga, **solo 3** (`RecordState`/Curso, `Group`/Electivos K de N, `MetricThreshold`/Créditos mínimos). Hay más opciones, se implementan a futuro (`AttributeMatch`, etc.). | `00:01:30` |
| **`requirementCategory` = líneas de formación** | Agrupa/categoriza entries del plan. Es organización/denominador de créditos, **no** una condición. Guarda nombre, código, créditos mín/máx, color, ícono. | `00:01:30` · `00:03:22` |
| **Líneas de formación = record type, salen de una vista** | Las líneas del filtro de la malla se nutren de `requirementCategory`. Eduardo confirma viabilidad de manejar color/ícono con el componente `view` en el formulario. | `00:01:30` · `00:03:22` |
| **Color/ícono opcional** | Si recopilar color+ícono resulta muy complejo, se puede simplificar a solo nombre por ahora. | `00:03:22` |
| **Campos PLAN-ONLY del Curriculum** | `progression`, `periodType`, `totalCredits`, `totalPeriods`. `totalPeriods` es necesario junto con `periodType` para definir las columnas de la malla. | `00:33:58` · `00:36:38` |
| **`planEntry.period` = semestre, `position` = orden dentro del período** | `period` es el N.º de período (semestre); `position` el orden entre hermanos del mismo período. | `00:36:38` |
| **`planEntry.period` requerido solo en secuencial** | En planes **modulares** `period` **no es requerido y queda nulo** — el orden se deriva del grafo de prerrequisitos (DAG). En secuencial se mantiene `period` para colocación manual. (Modular fuera de alcance, pero el campo se modela nullable.) | `00:58:50` · `01:02:03` · `01:05:26` |

## 3. Flujo del componente de malla

| Decisión | Detalle | TS |
|---|---|---|
| **Visualización por indicadores** | La malla se simplifica usando indicadores (no datos complejos) para no consumir espacio. | `00:01:30` |
| **Agregar asignaturas: tipo → picker** | Paso 1: elegir Obligatoria / Opcional (+ línea de formación opcional). Paso 2: picker de `Activity` con búsqueda y **filtro por departamento**, multiselección. | `00:04:49` · `00:39:19` |
| **Línea de formación en masa (opcional en paso 1)** | Para evitar asignar línea curso por curso (engorroso con 10+ cursos), la línea se puede fijar **una vez** en el paso 1 y aplica a todos los cursos agregados. | `00:39:19` · `00:40:25` |
| **Bloques electivos: tagging, no edición del bloque** | La acción al agregar electivas es **etiquetar** (tagging) cursos dentro de un bloque (nuevo o existente) durante la edición de la malla. **No** es edición directa del bloque en sí. | `00:17:02` · `00:22:41` |
| **Autocompletado de bloques** | Inconsistencia detectada: hoy no se ven bloques existentes hasta seleccionar una asignatura. Se ajusta para permitir crear/seleccionar bloque de forma lógica (autocompletado de los bloques del plan). | `00:17:02` |
| **Edición se habilita solo al abrir el plan en edición** | Las acciones de alta/edición son visibles solo en modo edición + estado editable; en solo lectura, ocultas. | `00:38:02` |

## 3.1 Detalle fino del flujo de agregación (obligatorias vs. electivas)

> Mecánica detallada en el transcript `00:04:49`–`00:28:18`. Es la base de los tickets B4/B5.

**Modal de 2 pasos** (`00:04:49`, `00:06:10`):
- **Paso 1:** elegir **Obligatoria** o **Electiva** (+ línea de formación opcional, aplicada en masa).
- **Paso 2:** picker de asignaturas con **filtro por departamento** (unidad organizacional = `executionUnitId` → OrgUnit) y multiselección.

**Flujo OBLIGATORIA** (`00:20:02`, `00:22:41`): simple — "si es obligatoria, no tengo que hacer nada más que añadir las obligatorias". Paso 1 obligatoria → paso 2 seleccionar cursos → se crean `planEntry` sin `blockId`.

**Flujo ELECTIVA** (`00:20:02`–`00:28:18`) — más elaborado:
- Al elegir electiva, **seleccionar un bloque existente o crear/nombrar uno nuevo** (`00:23:xx`: "un select… del que creé recién, o el suggest de un nombre nuevo"). Autocompletado de bloques del plan.
- El **bloque electivo es un OptionPool con nombre propio, INDEPENDIENTE de la línea de formación** (`00:20:02`). Son ejes ortogonales: un curso tiene su línea (`categoryId`) **y además** puede pertenecer a un bloque (`blockId`).
- Es **tagging, NO edición del bloque** (`00:22:41`, `00:25:45`): "yo no estoy editando el bloque electivo… estoy agregando un `planEntry` y digo que además es parte de un bloque electivo". El **bloque se crea/crece como consecuencia** de la edición de la malla.
- Al **seleccionar un bloque existente**, se **precargan sus cursos actuales** para sumar o quitar asignaturas (`00:24:35`).
- El **bloque cuelga del currículum** (`requirement(Group, ownerType=curriculum, combinator=OR)`) — "owner time de currículum… un bloque de tipo K de N… relacionado al currículum donde van a estar todos los bloques electivos" (`00:26:58`).
- El **`minToSatisfy` (la "N" de K-de-N) se auto-deriva del conteo** de cursos del bloque ("cada vez que agregue un curso… ese número debería irse aumentando a la cantidad de curso… es total") (`00:28:18`). Ajustable luego; default = total de cursos taggeados.
- El **`label` del requirement = nombre del bloque**; el formulario necesita un input de texto para ese label (`00:18:24`).

**El picker oculta los cursos ya agregados a la malla** (`00:26:58`): "si ya agregué cálculo uno, no debería estar en la lista… van desapareciendo las que ya agregué". Editar la malla = la lista del picker excluye lo ya colocado.

## 3.2 Detalle del filtro de la malla

> `00:01:30`–`00:03:22` + chips de electivos derivados.

- Las **líneas de formación (`requirementCategory`) SON los filtros** de la malla: "este componente tiene estas líneas de formación que son como filtros… salen de esta vista". Se renderizan como chips para **resaltar/atenuar** las tarjetas por `categoryId`. El color/ícono sale del componente `view` del formulario.
- Los **bloques electivos** generan **chips derivados** (de los `blockId` presentes en la malla) — segundo eje de filtro.

## 4. Validaciones y alertas (decisión de diseño clave)

| Decisión | Detalle | TS |
|---|---|---|
| **Alertas informativas, no automatización compleja** | Para el MVP se **evita** la corrección automática de mallas. Se usan **alertas informativas** cuando un prerrequisito no está cubierto en períodos anteriores. | `00:29:22` · `00:31:01` |
| **Bloqueo al agregar si falta prereq** | Al confirmar el alta de una asignatura, si un prereq-curso no está en un período anterior (ausente o "más tarde"), se **bloquea**: el modal lista los faltantes y ofrece solo *Cancelar* o *Volver a la selección*. | `00:06:10` · `00:38:02` · doc MC-CMP-6 |
| **Validación RESTRICTIVA en planes publicados** | Si se intenta **crear/editar requisitos** de un programa de asignatura (`Activity`) que ya está asignado a **planes publicados**, se **restringe**: hay que crear una **nueva versión** del programa de asignatura. Se acuerda que es mejor hacerlo restrictivo **antes** que permitir el error. | `00:48:06` · `00:49:38` · `00:51:07` |
| **Modal de alerta de impacto** | Ante el riesgo de invalidar mallas existentes por cambios en prereqs, se propone un modal de alerta que avise sobre el impacto en los planes de estudio afectados (y sugiera versionar). | `00:46:27` · `00:48:06` |

## 5. Backlog / versionamiento (NO implementar este sprint, registrar)

| Decisión | Detalle | TS |
|---|---|---|
| **Campo `current` (versión vigente)** | El sistema carece de una propiedad para marcar una versión de asignatura como "vigente"/`current`. Para evitar retrasos, se incluye **temporalmente** un **booleano en el backlog** para marcar la versión vigente; la lógica completa de versionamiento queda para un ciclo futuro. | `01:06:46` · `01:09:13` |
| **Versionado/clonado de la malla** | Clonar `planEntry` + `requirementCategory` + `requirement` al versionar el `Curriculum` queda para el **sprint siguiente**. | doc §1 |

## 6. Progresión del plan (tipo secuencial vs modular)

| Decisión | Detalle | TS |
|---|---|---|
| **`progression` como enum cerrado** | La configuración de si un plan es secuencial o modular se almacena en `progression`. Se cierra como **enum** limitado a `Sequential` / `Modular` (hoy es `string` libre con NEEDS CLARIFICATION en `rt__Plan__curriculum.json`). | `00:43:40` · `01:10:58` |
| **El modo de operación se distingue por `progression` + `periodType`** | El sistema ignora el `period` explícito en planes modulares; la fuente de verdad del orden modular es `requirement`. | `01:05:26` |
| **`Minor` permanece básico** | Los `Minor` no han sido modelados en detalle; quedan como registros básicos sin cambios en esta fase. | `00:40:25` |

## 7. Próximos pasos asignados en la reunión

- **[Eduardo]** Revisar el doc de objetos + historias para definir la segmentación de historias. *(este plan)*
- **[Eduardo]** Enviar fix pendiente a Juandi al concluir la reunión.
- **[Eduardo]** Evaluar viabilidad técnica de la lógica de requisitos. → ver Track 0 / Épica A3.
- **[Esteban]** Actualizar formulario: incorporar selección de línea de formación + bloque electivo en el flujo del componente. → Épica B (B4/B5).
- **[Esteban]** Validar requisitos: regla en el programa de asignatura para evitar crear requisitos si hay planes publicados con esa asignatura. → Épica D (D2).
- **[Esteban]** Registrar en backlog la propiedad `current`. → Backlog BL-1.
- **[Eduardo]** Definir enum en `progression` (secuencial/modular). → Track 0 / BE-0.
- **[Eduardo]** Crear tickets: desglosar el trabajo. *(este plan)*
