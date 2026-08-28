---
id: DOC-kb-sp5-sources-historias-malla-v1
project: up1
type: doc
---

# Malla curricular — Historias de usuario + modelo de datos (handoff a desarrollo)

**Producto:** uP1 · mod `curriculum-design`
**Feature:** Malla curricular (diseño del plan de estudios)
**Alcance de este sprint:** **solo planes secuenciales** (con períodos).
**Fecha:** 2026-06-22

---

## 1. Resumen y alcance

Implementar la **edición de la malla curricular** de un `Curriculum(recordType=Plan)`: colocar asignaturas en períodos, agruparlas en líneas de formación, definir prerrequisitos y bloques electivos.

El mod `curriculum-design` **ya implementa** los objetos base (`AcademicProgram`, `Curriculum`, `Activity`, `CurricularSection`, `Offering`, …) pero **no** los objetos de estructura de plan. Este documento define **3 objetos nuevos** + el componente de malla + la pestaña de líneas de formación.

### En alcance
- Objetos nuevos: **`planEntry`**, **`requirementCategory`**, **`requirement`** (motor de reglas; **3 familias / recordTypes en este incremento**, más en iteraciones futuras).
- Componente de malla **secuencial** (ver, editar, agregar, prerrequisitos bloqueantes, electivos, filtros).
- Pestaña **Líneas de formación** (CRUD de `requirementCategory`).

### Fuera de alcance (sprints siguientes)
- **Versionado / clonado del plan** (clonar `planEntry` + `requirementCategory` + `requirement` al versionar el `Curriculum`).
- **Planes no-secuenciales / modulares** (niveles derivados de prerrequisitos).
- `milestone`, `specialization`, `planEntrySpecialization` (tributación / menciones).
- Motor de **ejecución** de reglas (degree-audit, evaluación en vivo del avance del estudiante). Aquí solo se **modela y persiste** `requirement`.

---

## 2. Modelo de datos

> **Convención de RecordTypes (uP1):** un `recordType` es una **variante tipada con campos propios** (extensión `rt__*`). Solo se usa recordType cuando el tipo **agrega/restringe campos**; si todos los tipos comparten el mismo esquema, se modela como un **atributo enum (discriminador)**, no como recordType. En este modelo: **`requirement`** sí tiene recordTypes (cada familia con campos propios, §2.3); **`Curriculum`** tiene el recordType `Plan` con campos propios (abajo); **`planEntry`** usa un discriminador `kind` (sus tipos no agregan campos).

### 2.0 Objetos base ya implementados (anclas — no se crean)

| Objeto | Rol en la malla | Campos relevantes |
|---|---|---|
| `AcademicProgram` | Carrera dueña del plan | `code`, `degree`, `modality`, `institutionId` |
| `Curriculum` (recordType `Plan`) | **Contenedor de la malla** | base: `name`, `code`, `status`, `version`, `ownerId`. **Campos propios del recordType `Plan`:** `progression`, `totalCredits`, `totalPeriods`, `periodType` {Semester/Trimester/Quarter/Annual}. *(El recordType `Minor` no agrega estos campos — sin semántica temporal.)* |
| `Activity` (recordType `Course`) | **Catálogo de asignaturas** que se colocan | `code`, `name`, `credits`, `programLevel` |

> El plan secuencial usa `Curriculum(Plan).periodType` + `totalPeriods` para las columnas (períodos).

---

### 2.1 Objeto nuevo: `planEntry`

**Qué es:** coloca una `Activity` dentro de un `Curriculum(Plan)`, en un período. Es el elemento de la malla.

**Relaciones:** pertenece a un `Curriculum(Plan)`; referencia una `Activity`; pertenece (opcional) a una `requirementCategory` (línea de formación) y a un bloque electivo (`requirement` de tipo Group).

| Campo | Tipo | Req | Notas |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `planId` | UUID | ✅ | FK → `Curriculum` (recordType=Plan) |
| `activityId` | UUID | ✅ | FK → `Activity` |
| `categoryId` | UUID? | ❌ | FK → `requirementCategory` (línea de formación) |
| `blockId` | UUID? | ❌ | FK → `requirement` (recordType=Group). **Si está definido, el entry es electivo** (miembro de ese bloque). La electividad se **deriva** de esta membresía — no hay flag `isElective` |
| `kind` | enum {Course, Internship, Thesis} | ✅ | **Discriminador** de presentación/semántica. **No es un RecordType**: estos tipos comparten el mismo esquema (no agregan campos propios), por eso es un atributo enum y no un recordType con extensión. `ElectiveBlock` **no** es un `kind` — la electividad se deriva de `blockId` |
| `period` | integer | ✅ | Período (semestre). **Requerido** en plan secuencial |
| `position` | integer | ✅ | Orden dentro del período |
| `credits` | number? | ❌ | Override; si `null`, hereda de `Activity.credits` |
| `sourceEntryId` | UUID? | ❌ | FK → `planEntry` (self). Trazabilidad de versión — **lógica de clonado en sprint de versionado** |
| `createdAt` / `updatedAt` | DateTime | ✅ | |

**Reglas de negocio:**
- `credits` efectivo = `planEntry.credits ?? Activity.credits`.
- Un `planEntry` es **obligatorio** si `blockId == null`, **electivo** si `blockId != null`.
- Índices sugeridos: `planId`, `categoryId`, `blockId`, `(planId, period, position)`.

---

### 2.2 Objeto nuevo: `requirementCategory` (línea de formación)

**Qué es:** agrupación de créditos del plan ("Ciencias e Ingeniería", "Formación Transversal", "Electivos", "Práctica y Título"). Es **organización/denominador de créditos, no una condición** (la condición la expresa `requirement`).

**Relaciones:** pertenece a un `Curriculum`; tiene muchos `planEntry`.

| Campo | Tipo | Req | Notas |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `curriculumId` | UUID | ✅ | FK → `Curriculum` |
| `name` | string | ✅ | |
| `code` | string? | ❌ | |
| `minCredits` | number | ✅ | Créditos mínimos requeridos |
| `maxCredits` | number? | ❌ | `null` = sin tope |
| `position` | integer | ✅ | Orden |
| `description` | string? | ❌ | |
| `color` | string? | ❌ | Presentación (UI) |
| `icon` | string? | ❌ | Presentación (UI) |
| `createdAt` / `updatedAt` | DateTime | ✅ | |

**Reglas de negocio:**
- Validación `minCredits ≤ maxCredits` (si `maxCredits` definido).
- **No se puede eliminar** una categoría con `planEntry` asignados (reasignar primero).
- "Créditos actuales" de la categoría = suma de `credits` efectivos de sus `planEntry`.

---

### 2.3 Objeto nuevo: `requirement` (motor de reglas — Composite; 3 familias en este incremento)

**Qué es:** nodo de regla sobre el avance. Patrón **Composite**: árbol cuyos nodos internos (`Group`) combinan con AND/OR/K-de-N y cuyas hojas son **predicados tipados cerrados**. Conjunto de RecordTypes **cerrado** (no es un motor de predicados libre).

**Relaciones:** cuelga de un dueño polimórfico (`ownerType`/`ownerId`); `requirement` → `requirement` (self, `parentId`).

**Campos base:**

| Campo | Tipo | Req | Notas |
|---|---|---|---|
| `id` | UUID | ✅ | PK |
| `ownerType` | enum {curriculum, activity, offering} | ✅ | A qué documento cuelga la regla raíz |
| `ownerId` | UUID | ✅ | FK polimórfica según `ownerType` |
| `parentId` | UUID? | ❌ | FK → `requirement`. `null` = raíz. **Anidamiento solo aquí** |
| `recordType` | enum {Group, RecordState, MetricThreshold} | ✅ | **3 familias en este incremento** (ver abajo). El enum crecerá en iteraciones futuras |
| `effect` | enum {EligibilityToEnroll, ProgressGate, Completion, DiplomaAward} | ✅ | Para qué se evalúa la regla |
| `label` | string | ✅ | **Obligatorio** — etiqueta de dominio legible |
| `isHardRule` | boolean | ✅ | Default `true`. `false` = recomendado/advisory, no bloquea |
| `negate` | boolean | ✅ | Default `false`. Invierte una hoja (anti-requisito en `RecordState`) |
| `overrideMode` | enum? {Replaces, Adds} | ❌ | **Solo `ownerType=offering`** (override de sílabo) |
| `position` | number | ✅ | Orden entre hermanos |
| `createdAt` / `updatedAt` | DateTime | ✅ | |

**RecordTypes — 3 familias en este incremento** (corresponden a los 3 tipos del selector "Agregar requisito": Curso · Electivos K de N · Créditos mínimos):

| RecordType | Tipo en la UI | Campos propios | Cubre |
|---|---|---|---|
| `RecordState` | **Curso** | `targetType` {activity}, `targetId`, `mustBe` {Approved, Taken}, `threshold {minGrade}`?, `timing` {Before, Concurrent, Either}? | Relación con un curso: prereq (`Before`), coreq (`Concurrent`), pre-o-coreq (`Either`); anti-requisito (`negate=true`) |
| `Group` | **Electivos K de N** | `combinator` {AND, OR}, `minToSatisfy`? (K-de-N), `creditsRequired`? | Estructura booleana recursiva; **el bloque electivo / OptionPool** |
| `MetricThreshold` | **Créditos mínimos** | `metric` {Credits}, `scope` {plan, category}?, `scopeId`?, `operator` {>=, >, =, <, <=}, `value` | Cantidad medible vs. umbral (≥ N créditos) |

> **Acotaciones de este incremento:**
> - `RecordState.targetType` se limita a `activity` (cursos). Otros targets (`milestone`, `competency`, `event`) son de iteraciones futuras.
> - `MetricThreshold.metric` se limita a `Credits`. Otras métricas (`GPA`, `PeriodIndex`, `Standing`, `TestScore`…) llegan después.
>
> **Iteraciones futuras — nuevos recordTypes/valores:** `AttributeMatch` (pertenencia: programa/cohorte/grupo/consentimiento — `dimension`, `values[]`, `mode`), más targets de `RecordState` (hito/competencia/evento) y más métricas en `MetricThreshold`. El diseño es un **conjunto cerrado y enumerable**: agregar una condición nueva = un valor de enum dentro de una familia (o una familia nueva como `AttributeMatch`), no un objeto nuevo.

**Mecánica AND/OR:** vive solo en `Group.combinator` (+ `minToSatisfy`). Las hojas son hechos `true/false` planos. `A ∧ (B ∨ C)` = `Group[AND]{ A, Group[OR]{B,C} }` — **la estructura del árbol ES la lógica**.

**Doble dueño en la malla:**
- `ownerType=activity` → **prerrequisitos/correquisitos canónicos** del curso (`effect=EligibilityToEnroll`).
- `ownerType=curriculum` → **bloques electivos** del plan (`Group`, `effect=Completion`).

---

### 2.4 Bloque electivo (OptionPool) — cómo se modela

Un **bloque electivo** = un `requirement` con `recordType=Group`, `ownerType=curriculum`, `combinator=OR`, `minToSatisfy=K` y/o `creditsRequired`. El **nombre del bloque** = `requirement.label`.

La **membresía** se materializa con `planEntry.blockId` apuntando a ese `Group`. Entonces:
- Marcar una asignatura como **electiva** = setear su `blockId`.
- La **electividad se deriva** de la membresía (no hay flag booleano).
- "Electivos de una línea" = `planEntry` con `blockId != null` agrupados por `categoryId`.

---

### 2.5 Ejemplo de instancias de `requirement` — prerrequisito de **un curso** (`EST200`)

Regla: *"Para cursar **EST200**: aprobar **(MAT110 Y MAT120) Ó (MAT210)**, **y** ≥ **60 créditos** del plan. Recomendado: **PROG101**."*

```jsonc
// Todas: ownerType:"activity", ownerId:"act_EST200", effect:"EligibilityToEnroll"
[
  { "id":"req_root",  "parentId":null,        "recordType":"Group",
    "combinator":"AND", "label":"Requisitos para cursar EST200",
    "isHardRule":true, "negate":false, "position":1 },

  { "id":"req_vias",  "parentId":"req_root",  "recordType":"Group",
    "combinator":"OR",  "label":"Vía de cálculo (una de dos)",
    "isHardRule":true, "negate":false, "position":1 },

  { "id":"req_via1",  "parentId":"req_vias",  "recordType":"Group",
    "combinator":"AND", "label":"Vía 1 · Cálculo I + II",
    "isHardRule":true, "negate":false, "position":1 },

  { "id":"req_mat110","parentId":"req_via1",  "recordType":"RecordState",
    "targetType":"activity", "targetId":"act_MAT110", "mustBe":"Approved",
    "timing":"Before", "label":"Aprobar Cálculo I (MAT110)",
    "isHardRule":true, "negate":false, "position":1 },

  { "id":"req_mat120","parentId":"req_via1",  "recordType":"RecordState",
    "targetType":"activity", "targetId":"act_MAT120", "mustBe":"Approved",
    "timing":"Before", "label":"Aprobar Cálculo II (MAT120)",
    "isHardRule":true, "negate":false, "position":2 },

  { "id":"req_mat210","parentId":"req_vias",  "recordType":"RecordState",
    "targetType":"activity", "targetId":"act_MAT210", "mustBe":"Approved",
    "timing":"Before", "label":"Aprobar Cálculo Avanzado (MAT210)",
    "isHardRule":true, "negate":false, "position":2 },

  { "id":"req_cred",  "parentId":"req_root",  "recordType":"MetricThreshold",
    "metric":"Credits", "scope":"plan", "operator":">=", "value":60,
    "label":"≥ 60 créditos aprobados del plan",
    "isHardRule":true, "negate":false, "position":2 },

  { "id":"req_prog101","parentId":"req_root", "recordType":"RecordState",
    "targetType":"activity", "targetId":"act_PROG101", "mustBe":"Taken",
    "timing":"Either", "label":"Recomendado: Programación (PROG101)",
    "isHardRule":false, "negate":false, "position":3 }
]
```

Árbol (la estructura es la lógica):

```
req_root  Group[AND]
├─ req_vias  Group[OR]
│  ├─ req_via1  Group[AND]
│  │  ├─ req_mat110  RecordState(MAT110, Approved, Before)
│  │  └─ req_mat120  RecordState(MAT120, Approved, Before)
│  └─ req_mat210  RecordState(MAT210, Approved, Before)
├─ req_cred    MetricThreshold(Credits, plan, ≥ 60)
└─ req_prog101 RecordState(PROG101, Taken, Either) · advisory (isHardRule=false)
```

### 2.6 Ejemplo de instancias — **bloque electivo** (Group sobre el plan)

```jsonc
// Bloque "Electivo de Especialización: elegir 4, ≥ 24 créditos"
{ "id":"blk_esp", "ownerType":"curriculum", "ownerId":"plan_2026",
  "parentId":null, "recordType":"Group", "combinator":"OR",
  "minToSatisfy":4, "creditsRequired":24, "effect":"Completion",
  "label":"Electivo de Especialización", "isHardRule":true, "position":10 }

// Cada asignatura electiva = planEntry con blockId = "blk_esp"
// { id:"pe_a", planId:"plan_2026", activityId:"act_IN5A1", blockId:"blk_esp",
//   categoryId:"cat_electivos", kind:"Course", period:8, position:1 }
```

---

### 2.7 Relaciones (resumen)

```
AcademicProgram 1──* Curriculum(Plan)
Curriculum(Plan) 1──* planEntry          (planId)
Curriculum(Plan) 1──* requirementCategory (curriculumId)
Curriculum(Plan) 1──* requirement         (ownerType=curriculum  → bloques electivos)
Activity        1──* planEntry            (activityId)
Activity        1──* requirement          (ownerType=activity    → prerrequisitos)
requirementCategory 1──* planEntry        (categoryId)
requirement(Group)  1──* planEntry        (blockId  → membresía electiva)
requirement     1──* requirement          (parentId → árbol Composite)
```

---

## 3. Historias de usuario

> Formato: `Como [rol], quiero [acción], para [beneficio]` + criterios de aceptación.
> Rol por defecto: **Diseñador curricular** (Jefe de carrera / coordinador).

### ÉPICA A — Configuración de objetos
> Habilita B y C. Orden: OBJ-1/2/3 → OBJ-4 → OBJ-5.

**MC-OBJ-1 · Objeto `planEntry`**
Como diseñador, quiero colocar una asignatura en un plan secuencial, para construir la malla.
- [ ] Objeto creado con los campos de §2.1; FKs validadas; `period` requerido.
- [ ] `credits` efectivo = override ?? `Activity.credits`.
- [ ] Electividad derivada de `blockId` (sin flag).
- [ ] Layouts RecordList + RecordDetail; lang ES; seed de ejemplo.
- [ ] CRUD operable vía API/MCP, asociado a un `Curriculum(Plan)`.

**MC-OBJ-2 · Objeto `requirementCategory`**
Como diseñador, quiero líneas de formación (buckets de crédito) por plan.
- [ ] Objeto creado con los campos de §2.2; pertenece al `Curriculum`.
- [ ] Validación `minCredits ≤ maxCredits`.
- [ ] No eliminable si tiene `planEntry` asignados.
- [ ] Conteo de créditos por categoría consultable (actual vs. mínimo).

**MC-OBJ-3 · Objeto `requirement` (Composite; 3 familias en este incremento)**
Como diseñador, quiero expresar prerrequisitos/electivos/umbrales como árbol legible.
- [ ] Objeto creado con base + **3 RecordTypes** de §2.3 (`RecordState`, `Group`, `MetricThreshold`); `parentId` self (anidamiento solo en Group).
- [ ] `RecordState.targetType` limitado a `activity` y `MetricThreshold.metric` a `Credits` (este incremento); enums cerrados; `label` obligatorio.
- [ ] El `recordType` es un enum **extensible**: futuras iteraciones agregan `AttributeMatch` y más targets/métricas (documentar como pendiente, no implementar).
- [ ] Persiste y reconstruye el árbol; seed = ejemplo EST200 (§2.5).
- [ ] (Solo persistencia/lectura — sin motor de evaluación en vivo.)

**MC-OBJ-4 · Bloque electivo + electividad derivada**
Como diseñador, quiero representar un bloque electivo y derivar la electividad de la membresía.
- [ ] Un `requirement(Group, OR, minToSatisfy/creditsRequired)` sobre el plan = bloque.
- [ ] `planEntry.blockId` materializa la membresía; un entry con `blockId` es electivo.
- [ ] Query/derivación documentada (obligatorio vs. electivo) — seed §2.6.

**MC-OBJ-5 · Registro en config del mod**
Como dev, quiero los objetos operables desde UI/MCP.
- [ ] `capabilities.json`, layouts, `lang/es` y tools `cd_*` actualizados.
- [ ] Objetos visibles en object-manager y consumibles por el componente de malla.

---

### ÉPICA B — Componente de malla (secuencial)

**MC-CMP-1 · Ver malla (solo lectura)**
Como usuario, quiero ver la malla de un plan por período.
- [ ] Tarjetas de asignatura agrupadas por `period`; muestran código, créditos, línea de formación y badge "electivo" (derivado de `blockId`).
- [ ] Accesible desde la acción "Malla curricular" del listado y desde la pestaña Malla del detalle (modo Ver = solo lectura).

**MC-CMP-2 · Modo edición**
Como diseñador, quiero editar la malla solo al abrir el plan en edición y si su estado lo permite.
- [ ] Acciones de alta/edición visibles solo en modo edición + estado editable; en solo lectura, ocultas.

**MC-CMP-3 · Barra de resumen del plan**
Como diseñador, quiero el resumen del plan a ancho completo sobre los filtros.
- [ ] Indicadores: créditos del diseño / requeridos, períodos, asignaturas, carga máx. por período.

**MC-CMP-4 · Agregar asignaturas obligatorias (modal 2 pasos)**
Como diseñador, quiero asignar cursos eligiendo primero el tipo y luego los cursos.
- [ ] Paso 1: tipo (Obligatoria / Opcional). Paso 2: picker de `Activity` (buscar + filtrar + multiselección).
- [ ] Crea `planEntry` (recordType=Course) en el período con `categoryId` y créditos heredados.

**MC-CMP-5 · Agregar electivas (bloque OptionPool)**
Como diseñador, al elegir "Opcional" quiero asignarlas a un bloque electivo con nombre.
- [ ] Selección/creación del bloque (autocompletado de bloques existentes del plan).
- [ ] Los `planEntry` quedan con `blockId` = ese `requirement(Group)`; badge y filtro de electivos se derivan.

**MC-CMP-6 · Bloqueo por prerrequisitos al agregar**
Como diseñador, no quiero completar una asignación si faltan prerrequisitos ubicados antes.
- [ ] Al confirmar: si un prereq-curso no está en un período anterior (ausente o "más tarde"), se **bloquea**.
- [ ] Modal lista los faltantes y ofrece solo **Cancelar** o **Volver a la selección**. Sin faltantes → se completa.

**MC-CMP-7 · Editar / quitar un `planEntry`**
Como diseñador, quiero ajustar una asignatura ya colocada.
- [ ] Modal: créditos (override), **línea de formación** (categoría), **Rol** (Obligatoria/Electiva → bloque), "Quitar de la malla".
- [ ] Cambiar Rol a Electiva setea `blockId`; a Obligatoria lo limpia; cambiar categoría no afecta la electividad.

**MC-CMP-8 · Reordenar y estructurar**
Como diseñador, quiero mover asignaturas entre períodos y agregar períodos.
- [ ] Drag&drop entre columnas (actualiza `period`/`position`); botón "Agregar período".

**MC-CMP-9 · Filtros de la malla**
Como diseñador, quiero resaltar por línea de formación y por bloque electivo.
- [ ] Chips de líneas de formación (resaltar/atenuar) y chips de bloques electivos derivados de los electivos añadidos.

---

### ÉPICA C — Pestaña "Líneas de formación"

**MC-LF-1 · Ver líneas del plan (RecordList)**
Como diseñador, quiero ver las `requirementCategory` del plan.
- [ ] RecordList con columnas: línea, código, créditos (actual/mín), obligatorias, electivas; solo lectura fuera de edición.

**MC-LF-2 · Crear / editar línea**
Como diseñador, quiero definir las líneas del plan.
- [ ] Modal: nombre, código, créditos mín/máx, color/ícono → crea/edita `requirementCategory`.

**MC-LF-3 · Eliminar línea (con guard)**
Como diseñador, quiero borrar una línea sin dejar asignaturas huérfanas.
- [ ] Bloquea el borrado si hay `planEntry` asignados ("reasigna primero").

**MC-LF-4 · Usar las líneas en la malla (integración)**
Como diseñador, quiero que las líneas definidas alimenten la malla.
- [ ] El selector "Línea de formación" en alta/edición de `planEntry` y los chips/colores de la malla se nutren de las `requirementCategory` del plan.

---

## 4. Dependencias y notas

- **Secuencia:** Épica A → (B, C). Dentro de A: OBJ-1/2/3 antes de OBJ-4; OBJ-5 cierra.
- **Sprint siguiente:** versionado/clonado del plan (clonar `planEntry`+`requirementCategory`+`requirement`), planes no-secuenciales/modulares.
- **Referencia legacy:** los campos provienen del rediseño v0.28 + el modelo legacy `uc-project-objects` (`ucPlanEntry`, `ucRequirementCategory`, `ucEntryDependency`/`ucElectiveOption` → `requirement`). Útil como fuente de campos, **no** se reusa el namespace `uc*`.
- **Maqueta de referencia funcional:** `mockup_v10.html` (en esta misma carpeta de tarea).
