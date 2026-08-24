# Handoff a Edu — Seed de data dummy UPU (tarea PM #097)

Data de demo cargada en `one.u-planner.com` (tenant **UPU**) que queremos persistir en el **seed del mod `curriculum-design`**, para que sobreviva a los reseed y viaje en el commit.

Exportado desde live el **2026-07-08**. Todo resuelto por **códigos** (FK portables), idempotente, guard UPU — mismo patrón que los `_data-*.js` existentes.

> **Rev. 2 (2026-07-24) — paquete ajustado tras el análisis UPONE-1456.** La respuesta punto por
> punto a las 6 preguntas, el mapeo curado→mesh, los conteos finales y el único punto de decisión
> abierto están en **`RESPUESTA-UPONE-1456.md`** (misma carpeta). Resumen de cambios: offerings +
> syllabus regenerados contra el mesh `C-*`; `executionUnit` corregido a Faculty UPU; 2 Faculties
> propias de `UPU-MAIN` creadas; servicios excluidos (12 líneas / 120 offerings); reconciliado contra
> `origin/develop`. Este documento (abajo) es la guía de integración.

## Qué incluye este paquete

| Archivo | Contenido | Cómo usar |
|---|---|---|
| `programs.array.js` | 20 AcademicProgram `UPU-*` (institución `UPU-MAIN`) | **Pegar** las entradas en el array `PROGRAMS` de `seed/_data-academicprogram.js` |
| `curricula.array.js` | 20 Curriculum (Plan) `UPU-*-PLAN-2026` con satélite Plan | **Pegar** en el array `CURRICULA` de `seed/_data-curriculum.js` |
| `_data-mesh.js` | **Seed nuevo** de mallas: 301 asignaturas (Activity) + 80 líneas de formación (requirementCategory) + 549 cursos de malla (planEntry) | **Copiar** a `seed/` y registrar en `seed.js` (ver abajo) |
| `_data-syllabus-sections.js` | **Seed nuevo**: 374 secciones de syllabus (Modality/LearningOutcome/Content/Session/EvaluationComponent/Bibliography/CustomSection) para 11 cursos **reales del mesh** + sus BibliographyReference | **Copiar** a `seed/` y registrar |
| `_data-offerings.js` | **Seed nuevo**: 120 offerings (secciones de curso, 5 por semestre 2026) + 12 ActivityLine + 2 Faculties UPU. Sin servicios (dominio engagement) | **Copiar** a `seed/` y registrar |
| `_data-changelog.js` | **Seed nuevo**: 162 entradas de ChangeLog (historial de cambios de programas/planes/asignaturas) | **Copiar** a `seed/` y registrar |
| `seed-export.json` | Fuente de verdad de programas/planes/mallas (JSON) | Referencia / regenerar |

## Integración (3 pasos)

**1. Programas** — en `seed/_data-academicprogram.js`, agregar al array `PROGRAMS` las 20 entradas de `programs.array.js`.

**2. Planes** — en `seed/_data-curriculum.js`, agregar al array `CURRICULA` las 20 entradas de `curricula.array.js`. (El loader ya crea el satélite `rt__Plan` anidado.)

**3. Mallas** — copiar `_data-mesh.js` a `seed/` y en `seed.js`:
```js
import { loadMallas } from './_data-mesh.js';
// ... dentro de seed(), DESPUÉS de loadCurricula:
const mesh = await loadMallas(prisma, tenantId);
console.log(`  ✓ Mallas: activities=${mesh.actCreated} categories=${mesh.catCreated} entries=${mesh.entCreated}`);
```

**4. Syllabus, Offerings, ChangeLog** — copiar los 3 archivos a `seed/` y en `seed.js`:
```js
import { loadMallas } from './_data-mesh.js';
import { loadSyllabusSections } from './_data-syllabus-sections.js';
import { loadCourseOfferings } from './_data-offerings.js';
import { loadChangeLog } from './_data-changelog.js';
// ... dentro de seed(), en este orden DESPUÉS de loadCurricula:
const mesh = await loadMallas(prisma, tenantId);
const secs = await loadSyllabusSections(prisma, tenantId);   // secciones de syllabus (necesita las Activities Course)
const offs = await loadCourseOfferings(prisma, tenantId);    // offerings + activity lines (necesita Activities + Term)
const clog = await loadChangeLog(prisma, tenantId);          // historial (necesita programas/planes/activities)
console.log(`  ✓ Mesh:${mesh.entCreated} Sections:${secs.created} Offerings:${offs.created} ChangeLog:${clog.created}`);
```

**Orden obligatorio en `seed()`:** `loadAcademicPrograms` → `loadCurricula` → **`loadMallas`** → **`loadSyllabusSections`** → **`loadCourseOfferings`** → **`loadChangeLog`** (cada uno resuelve por código lo que crearon los anteriores).

⚠️ **Verificar en `_data-syllabus-sections.js`:** el satélite de cada sección se crea con la relación anidada `rt__<RecordType>__curricularsection: { create: {...} }` (mismo patrón que `rt__Plan__curriculum` en `_data-curriculum.js`). Confirmá que el **nombre de la relación** en el schema Prisma actual coincide; si el codegen la nombró distinto, ajustar esa clave.

## Estructura de las mallas

- **Líneas de formación** por plan: Núcleo (NUC), Habilidades Profesionales (HAB), Electivos de Profundización (ELP), Proyecto de Grado (PRG).
- **Cursos por periodo** llenando todos los periodos hasta `totalPeriods`:
  - Bachelor (10 sem): ~5 ramos/sem · básicas (P1-3) → especialidad real (P4-8) → electivos (P9) → Trabajo de Título (P10)
  - Master (4): cursos + Tesis de Magíster · Doctorate (8): cursos + Investigación Doctoral + Tesis Doctoral · Technical (5): + Práctica Profesional y Título
- Asignaturas básicas comunes (Cálculo I-III, Física, Álgebra…) **compartidas** entre carreras afines (idempotente por `code` @unique → se crean una vez y se reutilizan).

## Idempotencia

- Programas: por `(institutionId, code)`. Planes: por `(institutionId, code)`. Asignaturas: por `code` @unique. Categorías: por `(curriculumId, code)`. planEntry: por `(planId, activityId, period, position)`.
- Correr N veces = mismo estado final.

## Idempotencia (syllabus/offerings/changelog)

- Secciones: por `(ownerId, recordType, name)`. Offerings/ActivityLine: por `code` @unique. ChangeLog: por `(entityType, entityId, field, newValue, userId)`. BibliographyReference: por `(title, author, institutionId)`.

## Nota de reconciliación

Este paquete se generó contra un checkout que **no tenía** los objetos `requirementCategory`/`planEntry` (son más nuevos que el mod local). Si tu rama ya tiene un seed de mallas, reconciliá `_data-mesh.js` con esa estructura (los datos —arrays— son lo importante; el loader sigue el patrón `_data-*.js` estándar del mod).
