---
id: SPEC-curriculum-design-overview
project: up1
type: spec
module: curriculum-design
status: draft
fecha: 2026-07-16
tags: [curriculum-design, learning-assurance, overview]
external_refs:
  - UPONE-1033
  - UPONE-1034
  - UPONE-1035
  - UPONE-1038
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1990066183
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989148681
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2002223105
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242
---

# Curriculum Design — Overview

> **Nota historica — rename `AcademicActivity` → `Activity` (UPONE-1100 / TICKET-019, 2026; KB alineado en UPONE-1220 / TICKET-034)**: la entidad raiz del agregado "Programa de asignatura" se llamo originalmente `AcademicActivity`. El codigo la renombro a `Activity` en UPONE-1100; este KB se alineo en UPONE-1220. Las referencias historicas a `AcademicActivity` se preservan en los specs cerrados (SPEC-001/004/005/006/010, SPEC-academic-activity-list) y en las presentaciones — no se reescriben (inmutabilidad del registro). En los docs vivos, la entidad es `Activity`.

## Posicionamiento

Curriculum Design es **una de las 3 apps** que componen Learning Assurance (linea de producto de uP1 dedicada al aseguramiento del aprendizaje en educacion superior). Es el punto de partida del ciclo: define **que se ensena** y **como se organiza** antes de medir si los estudiantes lo logran.

| App | Pregunta clave | Dependencia |
|-----|---------------|-------------|
| **Curriculum Design** | Que ensenamos y como lo organizamos? | Sin requisito previo |
| Curriculum Mapping | Esta alineado con lo que prometimos? | Requiere Curriculum Design |
| Learning Assessment | Lo estan logrando los estudiantes? | Requiere Design + Mapping |

## Areas funcionales

Curriculum Design abarca **66 capacidades** distribuidas en 8+ areas:

| Area | Codigo | Cobertura |
|------|--------|-----------|
| 1.1 Planes de estudio | CAP-CUR-001..010 | Mallas curriculares, prerequisitos, especialidades, workflow |
| 1.2 Configuracion de estructura | CAP-CUR-011..013 | Plantillas para plan/programa/syllabus, wizard institucional |
| **1.3 Programas de curso** | **CAP-CUR-014..022** | **Programa de asignatura** — alcance de UPONE-1033/1034/1035 |
| 1.4 Syllabi | CAP-CUR-023..035 | Herencia programa→syllabus, libertad de catedra, gestion docente |
| 1.5 Catalogos compartidos | CAP-CUR-036..044 | Estrategias, metodos, actividades, tipos curso, idiomas, citas |
| 1.6 Evidencias | CAP-CUR-045..046 | Artefactos que demuestran logro |
| 1.7 IA | CAP-CUR-047..049 | Ingesta documentos, cobertura, coherencia |
| 1.8..1.12 | CAP-CUR-050..065 | Categorias requisitos, taxonomias, mejora continua, auditoria |

## Alcance del SP2 (Sprint Migracion uAssessment)

El sprint **Migracion uAssessment - SP2** (2026-04-27 a 2026-05-08) acoto el inicio de Curriculum Design a tres tickets, **con strict scope**:

| Ticket Jira | Ticket DKC | Cobertura | Foco |
|-------------|------------|-----------|------|
| [UPONE-1033](https://u-planner.atlassian.net/browse/UPONE-1033) | TICKET-006 | **Solo 4 objetos base** | Configurar `Activity`, `CurricularSection` (campos comunes), `CurricularLink`, `BibliographyReference`. **NO incluye RecordTypes**. |
| [UPONE-1034](https://u-planner.atlassian.net/browse/UPONE-1034) | TICKET-007 | Listado | Vista listado de `Activity` con filtros |
| [UPONE-1035](https://u-planner.atlassian.net/browse/UPONE-1035) | TICKET-009 | RTs + Detail | **Crear RecordTypes** (Modality, LearningOutcome, Content + a confirmar) y los layouts del detail. Cargar seed completo |

> **Cambio importante respecto a versiones previas**: los RecordTypes (`Modality`, `LearningOutcome`, `Session`, `EvaluationComponent`, `Content`, `Bibliography`, `CustomSection`) **NO se modelan en TICKET-006**. Se modelan en TICKET-009 segun el subset que el detail layout necesite. Ver [open-questions Q11..Q14](open-questions.md).

Capacidades **fuera del SP2 (planificado entonces)**:
- Catalogo publico (CAP-CUR-020), Compartir (CAP-CUR-021)
- Configuracion de estructura institucional (CAP-CUR-013)
- RecordTypes adicionales no listados en TICKET-009 (ApprovalCondition, GeneralData, GraduationProfile, EntryProfile)

> **Estado actual (2026-07-16)**: Versionar (CAP-CUR-018), Workflow (CAP-CUR-019) y Clonar (CAP-CUR-022) quedaron **fuera del SP2 original pero ya estan implementados** en sprints posteriores (SP5-SP7). Ver [programa-de-asignatura.md](programa-de-asignatura.md#workflow-y-estados-del-programa) y las funcionalidades agregadas mas abajo.

## Funcionalidades agregadas desde SP2

El mod crecio de 4 a **12 objetos** (ver [Modelo del agregado](#modelo-del-agregado)) e incorporo funcionalidades transversales que no existian en el SP2 original:

- **Delete en cascada** (UPONE-1382): metadata `polymorphicChildren`/`directChildren` en las 4 raices (`AcademicProgram`, `Curriculum`, `Activity`, `Offering`) mas `canDelete`/`deleteWarning` en sus listados (incluidos los embebidos). Ver [features/delete-cascade.md](../features/delete-cascade.md).
- **DataLog** (UPONE-1380): `enableDataLog:true` en la metadata de `activity.json` y del resto de objetos auditados; tab "Historial" via `historyKey`. Reemplazo el `ChangeLog` propio del mod. Ver [features/datalog.md](../features/datalog.md).
- **RBAC granular por tab** (UPONE-1393): `requiredCapability` en secciones/tabs de `default_Activity_edit.json`, `default_Curriculum_edit.json` y layouts equivalentes. Ver [features/rbac.md](../features/rbac.md).

## Decision arquitectonica

**Un solo mod `curriculum-design`** que contiene los objetos del agregado (4 en el SP2 original, 12 al 2026-07-16). Justificacion: acoplamiento de dominio fuerte, patron validado en `hello-world-mod` (3 objetos) y `retention-wellbeing` (2+ objetos), capacidades futuras de la epica (versionamiento, workflow, export) operan sobre el agregado completo.

Ver [DECISION-mod-unico-curriculum-design.md](../../decisions/DECISION-mod-unico-curriculum-design.md).

## Dependencias de plataforma

Curriculum Design **consume** infraestructura entregada por la epica [UPONE-939 RecordTypes](https://u-planner.atlassian.net/browse/UPONE-939):

- UPONE-938 (Finalizada): definicion de RecordTypes con campos extra
- UPONE-940 (Finalizada): codegen Prisma + GraphQL con herencia 1:1
- UPONE-941 (Finalizada): layout por defecto por RecordType
- UPONE-944 (Finalizada): RecordDetail usa layout del RecordType
- UPONE-945 (Finalizada): crear eligiendo RecordType primero

**Riesgo identificado**: ningun mod usa todavia los layouts por RecordType (UPONE-941/944). Curriculum Design en UPONE-1035 sera el **primer caso real**. Documentado en [risks/layouts-recordtype-untested.md](risks/layouts-recordtype-untested.md).

## Modelo del agregado

El mod paso de los 4 objetos originales del SP2 a **12 objetos** (2026-07-16), sumados en sprints posteriores (SP5-SP7):

- **Originales (SP2)**: `Activity` (raiz), `CurricularSection` (polimorfica via RecordTypes), `CurricularLink`, `BibliographyReference`
- **Agregados (SP5-SP7)**: `AcademicProgram`, `Curriculum`, `Offering`, `planEntry`, `requirement`, `requirementCategory`, `PlanEnrollment`, `ProgramEnrollment`

Ver [programa-de-asignatura.md](programa-de-asignatura.md): modelo completo del agregado Programa de asignatura, con `Activity` como raiz historica y los objetos agregados que lo relacionan con planes de estudio y carreras.

## Capacidades en alcance — referencias

Cada capacidad tiene su spec dedicada en [capabilities/](capabilities/):

- [CAP-CUR-014](capabilities/CAP-CUR-014.md) — Crear programa de curso
- [CAP-CUR-015](capabilities/CAP-CUR-015.md) — Definir resultados de aprendizaje
- [CAP-CUR-016](capabilities/CAP-CUR-016.md) — Gestionar secciones del programa
- [CAP-CUR-017](capabilities/CAP-CUR-017.md) — Configurar modalidades y actividades
- [CAP-CUR-018](capabilities/CAP-CUR-018.md) — Versionar programa de curso
- [CAP-CUR-019](capabilities/CAP-CUR-019.md) — Gestionar workflow del programa
- [CAP-CUR-020](capabilities/CAP-CUR-020.md) — Publicar catalogo publico
- [CAP-CUR-021](capabilities/CAP-CUR-021.md) — Compartir programa via link
- [CAP-CUR-022](capabilities/CAP-CUR-022.md) — Clonar programa de curso

## Reglas transversales aplicables

Cada BR tiene su spec dedicada en [business-rules/](business-rules/):

- BR-WKF (workflows): BR-WKF-001..004
- BR-VER (versionamiento): BR-VER-001..002
- BR-INT (integraciones): BR-INT-001..003
- BR-MIG (migracion programa→syllabus): BR-MIG-001..003
- BR-TAX (taxonomias): BR-TAX-001..003
- BR-LIB (libertad evaluativa): BR-LIB-001..003
- BR-PRM (permisos): BR-PRM-001..002
- BR-TNT (multi-tenancy): BR-TNT-001..002

## Roles del dominio

| Rol | Responsabilidad en Programa de asignatura |
|-----|------------------------------------------|
| Coordinador / Director de programa | Crea, edita, transiciona workflows, aprueba |
| Docente | Hereda al syllabus, no edita el programa directamente |
| Equipo de acreditacion | Audita workflow, revisa cobertura |
| Super Admin | Configura plantilla institucional, taxonomias |
| Estudiante | Visualiza catalogo publico (cuando se habilite CAP-CUR-020) |
